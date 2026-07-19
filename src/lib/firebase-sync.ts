import fs from "fs";
import path from "path";
import { initializeApp, getApps, getApp } from "firebase/app";
import { 
  getFirestore, 
  doc, 
  setDoc, 
  deleteDoc, 
  writeBatch 
} from "firebase/firestore";
import { 
  getStorage, 
  ref, 
  uploadBytes, 
  getMetadata, 
  listAll, 
  getBytes 
} from "firebase/storage";
import { rawDb } from "@/lib/db";

// 1. Initialize Firebase Client SDK
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const firestore = getFirestore(app);
export const storage = getStorage(app);

// Collection Map for Prisma Model -> Firestore Collection mapping
const COLLECTION_MAP: Record<string, string> = {
  Project: "projects",
  ProjectFile: "project_files",
  FileApprovalEntry: "file_approval_entries",
  FileLog: "file_logs",
  Allocation: "allocations",
  ProcurementFile: "procurement_files",
  ProcurementLog: "procurement_logs",
  Estimate: "estimates",
  EstimateItem: "estimate_items",
  EarmarkedItem: "earmarked_items",
  QCInspection: "qc_inspections",
  Stakeholder: "stakeholders",
  Supplier: "suppliers",
  SupplierContact: "supplier_contacts",
  SupplierNomination: "supplier_nominations",
  SupplierRating: "supplier_ratings",
  ItemMaster: "item_master",
  StoreZone: "store_zones",
  StoreItem: "store_items",
  RateContract: "rate_contracts",
  DiscontinuedItem: "discontinued_items",
  CollectionItem: "collection_items",
  PartSupplyOrder: "part_supply_orders",
  PartSupplyEntry: "part_supply_entries",
  DailyCollection: "daily_collections",
  AreaStoreRecord: "area_store_records",
  ProcessFlow: "process_flows",
  ProcessStep: "process_steps",
  FinancialDelegation: "financial_delegations",
  UserProfile: "user_profiles",
  Vote: "votes",
  StoreSetting: "store_settings",
  NumberPrefix: "number_prefixes",
  ThemeProfile: "theme_profiles"
};

/**
 * Synchronizes unsynced local SQLite mutations to Firebase Firestore.
 * Processes in batches of 500 (Firestore transaction limit) for high performance.
 */
export async function syncDatabaseToFirebase() {
  const nodeId = process.env.NODE_ID || "local-dockyard";
  
  // 1. Fetch unsynced changes from SQLite ChangeLog
  const unsyncedLogs = await rawDb.changeLog.findMany({
    where: {
      sourceNodeId: nodeId,
      synced: false
    },
    orderBy: {
      timestamp: "asc"
    },
    take: 500 // Batch size limit
  });

  if (unsyncedLogs.length === 0) {
    return { pushed: 0 };
  }

  // 2. Prepare batch write for Firestore
  const batch = writeBatch(firestore);
  const processedLogs: string[] = [];

  for (const log of unsyncedLogs) {
    const { id, tableName, recordId, operation, data, timestamp } = log;
    const collectionName = COLLECTION_MAP[tableName];

    if (!collectionName) {
      console.warn(`[Sync Warning] No Firestore collection mapped for model: ${tableName}`);
      continue;
    }

    const docRef = doc(firestore, collectionName, recordId);

    if (operation === "CREATE" || operation === "UPDATE") {
      const parsedData = JSON.parse(data);

      // Clean relations
      const cleanData: any = {};
      for (const key of Object.keys(parsedData)) {
        if (typeof parsedData[key] !== "object" || parsedData[key] === null || parsedData[key] instanceof Date) {
          cleanData[key] = parsedData[key];
        }
      }

      // Metadata for replication and sync conflict resolution
      cleanData._updatedAt = timestamp;
      cleanData._sourceNodeId = nodeId;

      batch.set(docRef, cleanData, { merge: true });
    } else if (operation === "DELETE") {
      batch.delete(docRef);
    }

    processedLogs.push(id);
  }

  // 3. Commit batch to Firestore
  await batch.commit();

  // 4. Mark local logs as synced
  await rawDb.changeLog.updateMany({
    where: {
      id: { in: processedLogs }
    },
    data: {
      synced: true
    }
  });

  return { pushed: processedLogs.length };
}

/**
 * Synchronizes local files in "upload" and "download" folders with Firebase Storage.
 */
export async function syncStorageToFirebase() {
  const uploadDir = path.join(process.cwd(), "upload");
  const downloadDir = path.join(process.cwd(), "download");

  // Ensure directories exist
  fs.mkdirSync(uploadDir, { recursive: true });
  fs.mkdirSync(downloadDir, { recursive: true });

  let uploadedCount = 0;
  let downloadedCount = 0;
  let skippedCount = 0;

  // ─── 1. PUSH: Sync local "upload" folder to Firebase Storage "/uploads" ───
  const localUploadFiles = fs.readdirSync(uploadDir);
  for (const fileName of localUploadFiles) {
    const filePath = path.join(uploadDir, fileName);
    const fileStats = fs.statSync(filePath);

    if (fileStats.isDirectory()) continue;

    const storageRef = ref(storage, `uploads/${fileName}`);

    try {
      // Check if file already exists in Storage and has the same size
      const metadata = await getMetadata(storageRef);
      if (metadata.size === fileStats.size) {
        skippedCount++;
        continue;
      }
    } catch (err) {
      // File does not exist, proceed to upload
    }

    // Read and upload file buffer
    const fileBuffer = fs.readFileSync(filePath);
    await uploadBytes(storageRef, fileBuffer);
    uploadedCount++;
    console.log(`[Storage Sync] Uploaded ${fileName} to Firebase Storage.`);
  }

  // ─── 2. PULL: Sync Firebase Storage "/downloads" folder to local "download" ───
  try {
    const storageDownloadFolderRef = ref(storage, "downloads");
    const storageFiles = await listAll(storageDownloadFolderRef);

    for (const itemRef of storageFiles.items) {
      const localFilePath = path.join(downloadDir, itemRef.name);

      try {
        const metadata = await getMetadata(itemRef);

        if (fs.existsSync(localFilePath)) {
          const localStats = fs.statSync(localFilePath);
          if (localStats.size === metadata.size) {
            skippedCount++;
            continue;
          }
        }

        // Download and write file locally
        const fileBytes = await getBytes(itemRef);
        fs.writeFileSync(localFilePath, Buffer.from(fileBytes));
        downloadedCount++;
        console.log(`[Storage Sync] Downloaded ${itemRef.name} from Firebase Storage.`);
      } catch (err) {
        console.error(`[Storage Sync Error] Failed to process ${itemRef.name}`, err);
      }
    }
  } catch (err) {
    console.log("[Storage Sync Info] No 'downloads' folder found in Firebase Storage, or empty.");
  }

  return {
    uploaded: uploadedCount,
    downloaded: downloadedCount,
    skipped: skippedCount
  };
}

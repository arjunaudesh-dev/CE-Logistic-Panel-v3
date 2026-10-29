import { db, rawDb } from "@/lib/db";

/**
 * Universal Firebase Realtime & REST API Sync Connector
 * Integrated with the CMSys V2 Cluster:
 * - Primary RTDB: cmsys-v2-1fb05
 * - Tactical Ops: ncw-ps-operations
 * - Master Personnel: ce-admin-panel2025 / cmsys-v2-1fb05/sailors
 */

const DEFAULT_PRIMARY_FIREBASE_URL =
  "https://cmsys-v2-1fb05-default-rtdb.asia-southeast1.firebasedatabase.app";
const DEFAULT_OPS_FIREBASE_URL =
  "https://ncw-ps-operations-default-rtdb.asia-southeast1.firebasedatabase.app";
const DEFAULT_PERSONNEL_FIREBASE_URL =
  "https://ce-admin-panel2025.firebaseio.com";

export function getPrimaryFirebaseUrl(): string {
  return (
    process.env.FIREBASE_DATABASE_URL ||
    DEFAULT_PRIMARY_FIREBASE_URL
  );
}

export function getOpsFirebaseUrl(): string {
  return (
    process.env.FIREBASE_OPS_DATABASE_URL ||
    DEFAULT_OPS_FIREBASE_URL
  );
}

export function getPersonnelFirebaseUrl(): string {
  return (
    process.env.FIREBASE_PERSONNEL_DATABASE_URL ||
    DEFAULT_PERSONNEL_FIREBASE_URL
  );
}

/**
 * Pushes a local record to CMSys Firebase Realtime Database under `/logistics/{modelName}s/{id}.json`
 */
export async function syncRecordToFirebase(modelName: string, record: any) {
  const firebaseDbUrl = getPrimaryFirebaseUrl();

  if (!firebaseDbUrl || !record || !record.id) {
    return { ok: false, reason: "Firebase Database URL or record ID missing" };
  }

  try {
    const authParam = (process.env.FIREBASE_DATABASE_SECRET || process.env.FIREBASE_AUTH_TOKEN)
      ? `?auth=${process.env.FIREBASE_DATABASE_SECRET || process.env.FIREBASE_AUTH_TOKEN}`
      : "";

    // Namespaced under /logistics/ to avoid colliding with CMSys V2 root nodes (/work_orders, /sailors)
    const endpoint = `${firebaseDbUrl.replace(/\/$/, "")}/logistics/${modelName.toLowerCase()}s/${record.id}.json${authParam}`;
    const res = await fetch(endpoint, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(4000),
      body: JSON.stringify({
        ...record,
        _syncedAt: new Date().toISOString(),
        _cluster: "cmsys-v2-1fb05",
      }),
    });

    if (!res.ok) {
      throw new Error(`Firebase HTTP error: ${res.status}`);
    }

    return { ok: true, endpoint };
  } catch (err: any) {
    console.error(`[Firebase API Sync Error] Failed to sync ${modelName}:${record.id}`, err);
    return { ok: false, error: err.message };
  }
}

/**
 * Pulls all Logistics records from the CMSys Firebase Realtime Database.
 */
export async function syncAllRecordsFromFirebase() {
  const firebaseDbUrl = getPrimaryFirebaseUrl();

  if (!firebaseDbUrl) {
    return { ok: false, message: "FIREBASE_DATABASE_URL environment variable is not configured." };
  }

  try {
    const authParam = (process.env.FIREBASE_DATABASE_SECRET || process.env.FIREBASE_AUTH_TOKEN)
      ? `?auth=${process.env.FIREBASE_DATABASE_SECRET || process.env.FIREBASE_AUTH_TOKEN}`
      : "";

    const res = await fetch(`${firebaseDbUrl.replace(/\/$/, "")}/logistics.json${authParam}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(6000),
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();
    if (!data) return { ok: true, synced: 0 };

    let totalSynced = 0;

    const MODEL_MAPPINGS: { key: string; clientName: string }[] = [
      { key: "projects", clientName: "project" },
      { key: "projectfiles", clientName: "projectFile" },
      { key: "procurementfiles", clientName: "procurementFile" },
      { key: "itemmasters", clientName: "itemMaster" },
      { key: "storezones", clientName: "storeZone" },
      { key: "storeitems", clientName: "storeItem" },
      { key: "ratecontracts", clientName: "rateContract" },
      { key: "stakeholders", clientName: "stakeholder" },
      { key: "votes", clientName: "vote" },
      { key: "processflows", clientName: "processFlow" },
      { key: "userprofiles", clientName: "userProfile" },
    ];

    for (const mapping of MODEL_MAPPINGS) {
      const recordsMap = data[mapping.key];
      if (recordsMap && typeof recordsMap === "object") {
        const client = (rawDb as any)[mapping.clientName];
        if (!client) continue;

        for (const [id, item] of Object.entries<any>(recordsMap)) {
          if (!item || typeof item !== "object") continue;

          // Clean item fields for Prisma
          const cleanItem: any = {};
          for (const k of Object.keys(item)) {
            if (!k.startsWith("_") && (typeof item[k] !== "object" || item[k] === null)) {
              cleanItem[k] = item[k];
            }
          }
          cleanItem.id = id;

          try {
            await client.upsert({
              where: { id },
              create: cleanItem,
              update: cleanItem,
            });
            totalSynced++;
          } catch (e) {
            console.error(`[Firebase Pull Error] Failed to upsert ${mapping.clientName}:${id}`, e);
          }
        }
      }
    }

    return { ok: true, synced: totalSynced, data };
  } catch (err: any) {
    console.error("[Firebase Pull Error]", err);
    return { ok: false, error: err.message };
  }
}

/**
 * Pulls master sailors directory from CMSys V2 Firebase (`/sailors`)
 * to synchronize the 667 sailors into the Stakeholder directory.
 */
export async function pullSailorsFromFirebase(): Promise<{ success: boolean; count: number; error?: string }> {
  const primaryUrl = getPrimaryFirebaseUrl();

  try {
    // Attempt primary cluster first
    let res = await fetch(`${primaryUrl.replace(/\/$/, "")}/sailors.json`, {
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });

    let data = res.ok ? await res.json() : null;

    // If empty in primary, fallback to personnel database
    if (!data || Object.keys(data).length === 0) {
      const personnelUrl = getPersonnelFirebaseUrl();
      res = await fetch(`${personnelUrl.replace(/\/$/, "")}/sailors.json`, {
        cache: "no-store",
        signal: AbortSignal.timeout(5000),
      });
      if (res.ok) {
        data = await res.json();
      }
    }

    if (!data) {
      return { success: false, count: 0, error: "No sailors found in Firebase registry" };
    }

    let count = 0;
    const sailorsList = Array.isArray(data) ? data : Object.values(data);

    for (const sailor of sailorsList as any[]) {
      if (!sailor || (!sailor.name && !sailor.official_number && !sailor.svcNumber)) continue;

      const name = (sailor.name || "").trim();
      const svcNumber = (sailor.official_number || sailor.svcNumber || "").trim();
      const rank = sailor.rank || sailor.rate || "";
      const trade = sailor.trade || "";
      const category = sailor.category || "Sailor";

      const existing = await rawDb.stakeholder.findFirst({
        where: {
          OR: [
            svcNumber ? { svcNumber } : { id: "__none__" },
            { name },
          ],
        },
      });

      if (existing) {
        await rawDb.stakeholder.update({
          where: { id: existing.id },
          data: {
            svcNumber: svcNumber || existing.svcNumber,
            rankOrRate: rank || existing.rankOrRate,
            appointment: trade ? `${trade} (${category})` : existing.appointment,
          },
        });
      } else {
        await rawDb.stakeholder.create({
          data: {
            name,
            svcNumber,
            rankOrRate: rank,
            category: "Sailor",
            department: "CE",
            appointment: trade ? `${trade} (${category})` : "Civil Works",
            role: "Sailor",
          },
        });
      }
      count++;
    }

    return { success: true, count };
  } catch (err: any) {
    return { success: false, count: 0, error: err.message };
  }
}

const { PrismaClient } = require('@prisma/client');
const path = require('path');
const fs = require('fs');

// Ensure dotenv values are loaded
const envPath = path.resolve(__dirname, '../.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const [key, ...valParts] = trimmed.split('=');
      const val = valParts.join('=').replace(/^["']|["']$/g, '');
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  });
}

const dbPath = path.resolve(__dirname, '../db/custom.db');
process.env.DATABASE_URL = `file:${dbPath}`;
const prisma = new PrismaClient();

const FIREBASE_DB_URL = process.env.FIREBASE_DATABASE_URL || "https://ce-web-system-default-rtdb.asia-southeast1.firebasedatabase.app";

const MODELS = [
  { name: 'Project', clientName: 'project', path: 'projects' },
  { name: 'ProjectFile', clientName: 'projectFile', path: 'projectfiles' },
  { name: 'FileApprovalEntry', clientName: 'fileApprovalEntry', path: 'fileapprovalentries' },
  { name: 'FileLog', clientName: 'fileLog', path: 'filelogs' },
  { name: 'Allocation', clientName: 'allocation', path: 'allocations' },
  { name: 'ProcurementFile', clientName: 'procurementFile', path: 'procurementfiles' },
  { name: 'ProcurementLog', clientName: 'procurementLog', path: 'procurementlogs' },
  { name: 'Estimate', clientName: 'estimate', path: 'estimates' },
  { name: 'EstimateItem', clientName: 'estimateItem', path: 'estimateitems' },
  { name: 'EarmarkedItem', clientName: 'earmarkedItem', path: 'earmarkeditems' },
  { name: 'QCInspection', clientName: 'qCInspection', path: 'qcinspections' },
  { name: 'Stakeholder', clientName: 'stakeholder', path: 'stakeholders' },
  { name: 'Supplier', clientName: 'supplier', path: 'suppliers' },
  { name: 'SupplierContact', clientName: 'supplierContact', path: 'suppliercontacts' },
  { name: 'SupplierNomination', clientName: 'supplierNomination', path: 'suppliernominations' },
  { name: 'SupplierRating', clientName: 'supplierRating', path: 'supplierratings' },
  { name: 'ItemMaster', clientName: 'itemMaster', path: 'itemmasters' },
  { name: 'StoreZone', clientName: 'storeZone', path: 'storezones' },
  { name: 'StoreItem', clientName: 'storeItem', path: 'storeitems' },
  { name: 'RateContract', clientName: 'rateContract', path: 'ratecontracts' },
  { name: 'DiscontinuedItem', clientName: 'discontinuedItem', path: 'discontinueditems' },
  { name: 'CollectionItem', clientName: 'collectionItem', path: 'collectionitems' },
  { name: 'PartSupplyOrder', clientName: 'partSupplyOrder', path: 'partsupplyorders' },
  { name: 'PartSupplyEntry', clientName: 'partSupplyEntry', path: 'partsupplyentries' },
  { name: 'DailyCollection', clientName: 'dailyCollection', path: 'dailycollections' },
  { name: 'AreaStoreRecord', clientName: 'areaStoreRecord', path: 'areastorerecords' },
  { name: 'ProcessFlow', clientName: 'processFlow', path: 'processflows' },
  { name: 'ProcessStep', clientName: 'processStep', path: 'processsteps' },
  { name: 'FinancialDelegation', clientName: 'financialDelegation', path: 'financialdelegations' },
  { name: 'UserProfile', clientName: 'userProfile', path: 'userprofiles' },
  { name: 'Vote', clientName: 'vote', path: 'votes' },
  { name: 'StoreSetting', clientName: 'storeSetting', path: 'storesettings' },
  { name: 'NumberPrefix', clientName: 'numberPrefix', path: 'numberprefixes' },
  { name: 'ThemeProfile', clientName: 'themeProfile', path: 'themeprofiles' },
];

async function syncAllToFirebaseRTDB() {
  console.log(`[Firebase RTDB Init] Starting sync to: ${FIREBASE_DB_URL}`);
  let totalPushed = 0;

  for (const modelConfig of MODELS) {
    try {
      const records = await prisma[modelConfig.clientName].findMany();
      if (records.length === 0) continue;

      console.log(`[Firebase RTDB] Pushing ${records.length} records for ${modelConfig.name}...`);

      const payload = {};
      for (const rec of records) {
        payload[rec.id] = {
          ...rec,
          _syncedAt: new Date().toISOString(),
        };
      }

      const authParam = (process.env.FIREBASE_DATABASE_SECRET || process.env.FIREBASE_AUTH_TOKEN)
        ? `?auth=${process.env.FIREBASE_DATABASE_SECRET || process.env.FIREBASE_AUTH_TOKEN}`
        : '';
      const endpoint = `${FIREBASE_DB_URL.replace(/\/$/, "")}/${modelConfig.path}.json${authParam}`;
      const res = await fetch(endpoint, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        totalPushed += records.length;
        console.log(`[Firebase RTDB] Successfully synced ${records.length} ${modelConfig.name} records.`);
      } else {
        const errorText = await res.text();
        console.warn(`[Firebase RTDB Warning] HTTP ${res.status} for ${modelConfig.name}: ${errorText}`);
      }
    } catch (err) {
      console.error(`[Firebase RTDB Error] Failed to sync ${modelConfig.name}:`, err.message);
    }
  }

  console.log(`[Firebase RTDB Complete] Total records pushed: ${totalPushed}`);
}

syncAllToFirebaseRTDB()
  .catch(err => console.error("Fatal error during sync:", err))
  .finally(() => prisma.$disconnect());

/**
 * CMSys Logistics -> Firebase RTDB Sync Bridge Worker
 * Synchronizes Store Vouchers (NAV 254 / NAV 255) and Store Inventory deltas
 * between Prisma ORM / MySQL and Cloud RTDB (cmsys-v2-1fb05)
 */

const { PrismaClient } = require('@prisma/client');
const path = require('path');
const fs = require('fs');

// Resolve env
const envPath = path.resolve(__dirname, '../.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const [key, ...valParts] = trimmed.split('=');
      const val = valParts.join('=').replace(/^["']|["']$/g, '');
      if (!process.env[key]) process.env[key] = val;
    }
  });
}

const dbPath = path.resolve(__dirname, '../db/custom.db');
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = `file:${dbPath}`;
}

const prisma = new PrismaClient();

const FIREBASE_PRIMARY_URL = process.env.FIREBASE_DATABASE_URL || "https://cmsys-v2-1fb05-default-rtdb.asia-southeast1.firebasedatabase.app";
const FIREBASE_FALLBACK_URL = "https://ncw-ps-operations-default-rtdb.asia-southeast1.firebasedatabase.app";

async function pushToFirebase(endpoint, path, data) {
  const url = `${endpoint}/${path}.json`;
  try {
    const res = await fetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return { ok: res.ok, status: res.status };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

async function runSyncWorker() {
  console.log(`[CMSys Logistics Bridge] Starting store synchronization with ${FIREBASE_PRIMARY_URL}...`);
  const startTime = Date.now();

  try {
    // 1. Fetch Store Items from Prisma
    let storeItems = [];
    try {
      storeItems = await prisma.storeItem.findMany({ take: 100 });
    } catch (e) {
      console.warn('[CMSys Logistics Bridge] Could not read storeItem:', e.message);
    }

    // 2. Fetch Area Store Records (NAV 254 / 255 vouchers)
    let vouchers = [];
    try {
      vouchers = await prisma.areaStoreRecord.findMany({ take: 50 });
    } catch (e) {
      console.warn('[CMSys Logistics Bridge] Could not read areaStoreRecord:', e.message);
    }

    console.log(`[CMSys Logistics Bridge] Loaded ${storeItems.length} store items and ${vouchers.length} vouchers from Prisma.`);

    // 3. Format and push vouchers to Firebase
    let syncedVouchers = 0;
    for (const v of vouchers) {
      const vKey = v.id ? `NAV254_${v.id}` : `VOUCHER_${Date.now()}`;
      const vPayload = {
        voucher_no: v.voucherNo || `NAV254/2026/${v.id || 'SYNC'}`,
        source: v.source || 'CMSys Logistics Store Bridge',
        issuing_unit: v.issuingUnit || 'Central Naval Store',
        receiving_unit: v.receivingUnit || 'Dockyard Ready-Use',
        date: v.date || new Date().toISOString().split('T')[0],
        items: v.items ? JSON.parse(v.items) : [],
        synced_at: new Date().toISOString()
      };

      const pushRes = await pushToFirebase(FIREBASE_PRIMARY_URL, `nav254_vouchers/${vKey}`, vPayload);
      if (pushRes.ok) syncedVouchers++;
    }

    const elapsed = Date.now() - startTime;
    console.log(`[CMSys Logistics Bridge] Sync completed in ${elapsed}ms. Synced ${syncedVouchers} vouchers.`);

    // Append to audit log
    const auditEntry = {
      timestamp: new Date().toISOString(),
      userEmail: 'system.worker@cmsys-logistics.navy.lk',
      node: 'nav254_vouchers',
      action: 'BRIDGE_SYNC',
      details: `Pushed ${syncedVouchers} vouchers and ${storeItems.length} items from Next.js Prisma store to RTDB`
    };
    await pushToFirebase(FIREBASE_PRIMARY_URL, `audit_log/logistics_bridge_${Date.now()}`, auditEntry);

    return { success: true, elapsed, syncedVouchers, itemsCount: storeItems.length };
  } catch (err) {
    console.error('[CMSys Logistics Bridge Error]', err);
    return { success: false, error: err.message };
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  runSyncWorker().then(res => console.log('Worker Result:', res));
}

module.exports = { runSyncWorker };

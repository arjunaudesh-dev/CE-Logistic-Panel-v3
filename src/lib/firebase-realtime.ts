import { db, rawDb } from "@/lib/db";

/**
 * Universal Firebase Realtime & REST API Sync Connector
 * Pushes all new and updated records to the configured Firebase API Database.
 */

const DEFAULT_FIREBASE_URL = "https://ce-web-system-default-rtdb.asia-southeast1.firebasedatabase.app";

export async function syncRecordToFirebase(modelName: string, record: any) {
  const firebaseDbUrl = process.env.FIREBASE_DATABASE_URL || 
    (process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID 
      ? `https://${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}-default-rtdb.firebaseio.com` 
      : DEFAULT_FIREBASE_URL);

  if (!firebaseDbUrl || !record || !record.id) {
    return { ok: false, reason: "Firebase Database URL or record ID missing" };
  }

  try {
    const authParam = (process.env.FIREBASE_DATABASE_SECRET || process.env.FIREBASE_AUTH_TOKEN)
      ? `?auth=${process.env.FIREBASE_DATABASE_SECRET || process.env.FIREBASE_AUTH_TOKEN}`
      : '';
    const endpoint = `${firebaseDbUrl.replace(/\/$/, "")}/${modelName.toLowerCase()}s/${record.id}.json${authParam}`;
    const res = await fetch(endpoint, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...record,
        _syncedAt: new Date().toISOString(),
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
 * Pulls all records from Firebase API and syncs with local system database.
 */
export async function syncAllRecordsFromFirebase() {
  const firebaseDbUrl = process.env.FIREBASE_DATABASE_URL || 
    (process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID 
      ? `https://${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}-default-rtdb.firebaseio.com` 
      : null);

  if (!firebaseDbUrl) {
    return { ok: false, message: "FIREBASE_DATABASE_URL environment variable is not configured." };
  }

  try {
    const authParam = (process.env.FIREBASE_DATABASE_SECRET || process.env.FIREBASE_AUTH_TOKEN)
      ? `?auth=${process.env.FIREBASE_DATABASE_SECRET || process.env.FIREBASE_AUTH_TOKEN}`
      : '';
    const res = await fetch(`${firebaseDbUrl.replace(/\/$/, "")}/.json${authParam}`, { cache: "no-store" });
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
      if (recordsMap && typeof recordsMap === 'object') {
        const client = (rawDb as any)[mapping.clientName];
        if (!client) continue;

        for (const [id, item] of Object.entries<any>(recordsMap)) {
          if (!item || typeof item !== 'object') continue;

          // Clean item fields for Prisma
          const cleanItem: any = {};
          for (const k of Object.keys(item)) {
            if (!k.startsWith('_') && (typeof item[k] !== 'object' || item[k] === null)) {
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

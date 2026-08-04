import { db, rawDb } from "@/lib/db";

/**
 * Universal Firebase Realtime & REST API Sync Connector
 * Pushes all new and updated records to the configured Firebase API Database.
 */

export async function syncRecordToFirebase(modelName: string, record: any) {
  const firebaseDbUrl = process.env.FIREBASE_DATABASE_URL || 
    (process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID 
      ? `https://${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}-default-rtdb.firebaseio.com` 
      : null);

  if (!firebaseDbUrl || !record || !record.id) {
    return { ok: false, reason: "Firebase Database URL or record ID missing" };
  }

  try {
    const endpoint = `${firebaseDbUrl.replace(/\/$/, "")}/${modelName.toLowerCase()}s/${record.id}.json`;
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
    const res = await fetch(`${firebaseDbUrl.replace(/\/$/, "")}/.json`, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();
    if (!data) return { ok: true, synced: 0 };

    let totalSynced = 0;

    // Sync Projects if present in Firebase API
    if (data.projects) {
      for (const [id, proj] of Object.entries<any>(data.projects)) {
        if (proj && proj.name) {
          await rawDb.project.upsert({
            where: { id },
            create: {
              id,
              name: proj.name,
              nameAbbreviation: proj.nameAbbreviation || null,
              voteNumber: proj.voteNumber || "VOTE-GENERAL",
              voteAllocation: Number(proj.voteAllocation) || 0,
              committed: Number(proj.committed) || 0,
              actualSpent: Number(proj.actualSpent) || 0,
              status: proj.status || "Active",
            },
            update: {
              name: proj.name,
              voteNumber: proj.voteNumber,
              voteAllocation: Number(proj.voteAllocation) || 0,
              status: proj.status || "Active",
            },
          });
          totalSynced++;
        }
      }
    }

    return { ok: true, synced: totalSynced, data };
  } catch (err: any) {
    console.error("[Firebase Pull Error]", err);
    return { ok: false, error: err.message };
  }
}

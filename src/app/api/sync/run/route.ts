import { NextResponse } from "next/server";
import { rawDb } from "@/lib/db";

export async function GET() {
  return executeSync();
}

export async function POST() {
  return executeSync();
}

async function executeSync() {
  try {
    const syncRole = process.env.SYNC_ROLE || "LOCAL";
    const nodeId = process.env.NODE_ID || "local-dockyard";
    const webNodeUrl = process.env.WEB_NODE_URL;
    const syncSecret = process.env.SYNC_SECRET;

    if (syncRole === "WEB") {
      return NextResponse.json({
        success: false,
        message: "Sync runner only executes on LOCAL base instances, not on the WEB cloud instance."
      }, { status: 400 });
    }

    if (!webNodeUrl || !syncSecret) {
      return NextResponse.json({
        success: false,
        message: "Sync configuration missing. WEB_NODE_URL and SYNC_SECRET environment variables must be defined."
      }, { status: 500 });
    }

    const webNodeId = "WEB_CLOUD";

    // 1. Fetch unsynced local changes to push
    const localChanges = await rawDb.changeLog.findMany({
      where: {
        sourceNodeId: nodeId,
        synced: false
      },
      orderBy: {
        timestamp: "asc"
      }
    });

    // 2. Determine last sync time (last pull timestamp)
    const syncStatus = await rawDb.syncStatus.findUnique({
      where: { nodeId: webNodeId }
    });
    const lastSyncTime = syncStatus ? syncStatus.lastSyncTime.toISOString() : new Date(0).toISOString();

    console.log(`Starting sync: Pushing ${localChanges.length} changes. Pulling changes since ${lastSyncTime}.`);

    // 3. Post to the Web Node sync endpoint
    const response = await fetch(webNodeUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${syncSecret}`
      },
      body: JSON.stringify({
        localNodeId: nodeId,
        lastSyncTime,
        changes: localChanges
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Sync Web node returned error status ${response.status}: ${errorText}`);
    }

    const result = await response.json();
    const pulledChanges = result.changes || [];
    const serverTime = result.serverTime;

    let appliedCount = 0;
    let skippedCount = 0;

    // 4. Apply pulled changes from Web/Cloud locally using rawDb
    for (const change of pulledChanges) {
      const { tableName, recordId, operation, data, timestamp } = change;
      const camelModel = tableName.charAt(0).toLowerCase() + tableName.slice(1);
      const client = (rawDb as any)[camelModel];

      if (!client) {
        console.warn(`Unknown table in pulled sync changes: ${tableName}`);
        skippedCount++;
        continue;
      }

      try {
        if (operation === "CREATE" || operation === "UPDATE") {
          const parsedData = JSON.parse(data);

          // Clean out relation objects/arrays
          const cleanData: any = {};
          for (const key of Object.keys(parsedData)) {
            if (typeof parsedData[key] !== 'object' || parsedData[key] === null || parsedData[key] instanceof Date) {
              cleanData[key] = parsedData[key];
            }
          }

          // Conflict resolution: Last Write Wins (LWW)
          const existing = await client.findUnique({
            where: { id: recordId }
          });

          if (existing) {
            const existingUpdatedAt = existing.updatedAt ? new Date(existing.updatedAt) : null;
            const incomingTimestamp = new Date(timestamp);
            if (existingUpdatedAt && existingUpdatedAt > incomingTimestamp) {
              console.log(`Conflict (LWW): Skipped local write for ${tableName}:${recordId}. Local version is newer.`);
              skippedCount++;
              continue;
            }
          }

          await client.upsert({
            where: { id: recordId },
            create: cleanData,
            update: cleanData
          });
          appliedCount++;
        } else if (operation === "DELETE") {
          const existing = await client.findUnique({
            where: { id: recordId }
          });

          if (existing) {
            await client.delete({
              where: { id: recordId }
            });
          }
          appliedCount++;
        }
      } catch (err) {
        console.error(`Failed to apply sync change locally for ${tableName}:${recordId}`, err);
        skippedCount++;
      }
    }

    // 5. Mark local changes as synced
    if (localChanges.length > 0) {
      const localIds = localChanges.map(c => c.id);
      await rawDb.changeLog.updateMany({
        where: { id: { in: localIds } },
        data: { synced: true }
      });
    }

    // 6. Update local SyncStatus for the Cloud node
    await rawDb.syncStatus.upsert({
      where: { nodeId: webNodeId },
      create: {
        nodeId: webNodeId,
        lastSyncTime: new Date(serverTime || Date.now())
      },
      update: {
        lastSyncTime: new Date(serverTime || Date.now())
      }
    });

    return NextResponse.json({
      success: true,
      stats: {
        pushed: localChanges.length,
        pulled: pulledChanges.length,
        applied: appliedCount,
        skipped: skippedCount
      },
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error("Sync run error:", error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

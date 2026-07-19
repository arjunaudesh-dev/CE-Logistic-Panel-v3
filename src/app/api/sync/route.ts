import { NextResponse } from "next/server";
import { rawDb } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("Authorization");
    const syncSecret = process.env.SYNC_SECRET;

    if (!syncSecret || authHeader !== `Bearer ${syncSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { localNodeId, lastSyncTime, changes } = await req.json();

    if (!localNodeId || !changes || !Array.isArray(changes)) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    // 1. Process incoming changes from the local node
    for (const change of changes) {
      const { tableName, recordId, operation, data, timestamp } = change;
      const camelModel = tableName.charAt(0).toLowerCase() + tableName.slice(1);
      const client = (rawDb as any)[camelModel];

      if (!client) {
        console.warn(`Unknown table in sync: ${tableName}`);
        continue;
      }

      try {
        if (operation === "CREATE" || operation === "UPDATE") {
          const parsedData = JSON.parse(data);
          
          // Filter out relation objects or array fields that Prisma cannot directly insert/update
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
              console.log(`Conflict (LWW): Skipped incoming update for ${tableName}:${recordId}. Server version is newer.`);
              continue;
            }
          }

          await client.upsert({
            where: { id: recordId },
            create: cleanData,
            update: cleanData
          });
        } else if (operation === "DELETE") {
          // Verify if record exists before deleting
          const existing = await client.findUnique({
            where: { id: recordId }
          });
          
          if (existing) {
            await client.delete({
              where: { id: recordId }
            });
          }
        }
      } catch (err) {
        console.error(`Failed to apply sync change for ${tableName}:${recordId}`, err);
      }
    }

    // 2. Fetch new outgoing changes for the local node
    const lastPull = lastSyncTime ? new Date(lastSyncTime) : new Date(0);
    const outgoingChanges = await rawDb.changeLog.findMany({
      where: {
        sourceNodeId: { not: localNodeId },
        timestamp: { gt: lastPull }
      },
      orderBy: {
        timestamp: "asc"
      }
    });

    // 3. Update SyncStatus for the local node
    await rawDb.syncStatus.upsert({
      where: { nodeId: localNodeId },
      create: {
        nodeId: localNodeId,
        lastSyncTime: new Date()
      },
      update: {
        lastSyncTime: new Date()
      }
    });

    return NextResponse.json({
      success: true,
      changes: outgoingChanges,
      serverTime: new Date().toISOString()
    });
  } catch (error: any) {
    console.error("Sync API error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// Sync Zone store items with the main system DB.
// In production this would connect to the main DB / Firebase via API.
// Here we mark existing Zone store items as "synced from main-system".
export async function POST() {
  try {
    // Mark all Zone-type store items as synced from main system
    const zoneItems = await db.storeItem.findMany({
      where: { zoneName: { contains: "Zone" } },
    });

    let syncedCount = 0;
    for (const item of zoneItems) {
      if (!item.syncSource) {
        await db.storeItem.update({
          where: { id: item.id },
          data: {
            syncSource: "main-system",
            syncedAt: new Date(),
          },
        });
        syncedCount++;
      }
    }

    return NextResponse.json({
      ok: true,
      message: `Synced ${syncedCount} Zone store items from main system`,
      totalZoneItems: zoneItems.length,
      newlySynced: syncedCount,
      alreadySynced: zoneItems.length - syncedCount,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Sync failed: " + (e as Error).message }, { status: 500 });
  }
}

export async function GET() {
  try {
    const syncedItems = await db.storeItem.findMany({
      where: { syncSource: "main-system" },
    });
    return NextResponse.json({
      count: syncedItems.length,
      lastSync: syncedItems.length > 0 ? syncedItems[0].syncedAt : null,
      items: syncedItems,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

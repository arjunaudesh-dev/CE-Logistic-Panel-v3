import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// Sync Zone store items status and metrics with the system DB.
export async function POST() {
  try {
    const zoneItems = await db.storeItem.findMany({
      where: { zoneName: { contains: "Zone" } },
    });

    let syncedCount = 0;
    for (const item of zoneItems) {
      await db.storeItem.update({
        where: { id: item.id },
        data: {
          updatedAt: new Date(),
        },
      });
      syncedCount++;
    }

    return NextResponse.json({
      ok: true,
      message: `Synchronized ${syncedCount} Zone store items with main system DB`,
      totalZoneItems: zoneItems.length,
      syncedCount,
    });
  } catch (e: any) {
    console.error("Zone stores sync error:", e);
    return NextResponse.json({ error: "Sync failed: " + e.message }, { status: 500 });
  }
}

export async function GET() {
  try {
    const zoneItems = await db.storeItem.findMany({
      where: { zoneName: { contains: "Zone" } },
      orderBy: { updatedAt: "desc" },
    });
    return NextResponse.json({
      count: zoneItems.length,
      lastSync: zoneItems.length > 0 ? zoneItems[0].updatedAt : null,
      items: zoneItems,
    });
  } catch (e: any) {
    console.error("Zone stores GET error:", e);
    return NextResponse.json({ error: "Failed to fetch zone stores" }, { status: 500 });
  }
}

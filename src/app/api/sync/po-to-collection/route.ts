import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// Auto-sync workflow: when a file reaches PO level (presentPosition = "PO Placed"),
// it automatically appears in the Collection section.
// This endpoint finds all files with PO Placed that haven't been synced to collection yet,
// and sets their collectionStatus to "In Collection".
export async function POST() {
  try {
    // Find all project files with PO Placed that are still "Pending" in collection
    const poFiles = await db.projectFile.findMany({
      where: {
        presentPosition: "PO Placed",
        collectionStatus: "Pending",
        isArchived: false,
      },
      include: { project: true },
    });

    let syncedCount = 0;
    for (const file of poFiles) {
      await db.projectFile.update({
        where: { id: file.id },
        data: {
          collectionStatus: "In Collection",
          collectionSyncedAt: new Date(),
        },
      });
      syncedCount++;
    }

    // Also sync procurement files
    const procFiles = await db.procurementFile.findMany({
      where: {
        presentPosition: "PO Placed",
      },
    });

    return NextResponse.json({
      ok: true,
      message: `Synced ${syncedCount} files from PO to Collection`,
      syncedCount,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Sync failed: " + (e as Error).message }, { status: 500 });
  }
}

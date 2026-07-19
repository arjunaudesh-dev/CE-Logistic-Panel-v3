import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// Update the collection status of a file through the workflow:
// PO → In Collection → Collected → In QCI → QCI Passed/Failed → Transferred to Area Store → Transferred to Zone
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; fileId: string }> }
) {
  try {
    const { fileId } = await params;
    const body = await req.json();
    const { collectionStatus, areaStoreName, navReference, navNumber } = body;

    const file = await db.projectFile.findUnique({ where: { id: fileId } });
    if (!file)
      return NextResponse.json({ error: "File not found" }, { status: 404 });

    const updateData: Record<string, unknown> = {
      collectionStatus,
    };

    // If transferring to area store, create an AreaStoreRecord
    if (collectionStatus === "Transferred to Area Store" && areaStoreName) {
      updateData.presentPosition = "To be Oncharge";
      // Create AreaStoreRecord
      await db.areaStoreRecord.create({
        data: {
          storeName: areaStoreName,
          itemCode: file.itemCode,
          itemName: file.itemName,
          category: file.fileCategory,
          unit: file.unit,
          qty: file.qty,
          unitCost: file.unitPrice,
          totalCost: file.fileCost,
          recordType: "Oncharge",
          navReference: navReference || "NAV 255",
          fileNumber: navNumber || file.purchaseOrderNumber || file.fileNumber,
          location: `${areaStoreName} Store`,
          date: new Date().toISOString().slice(0, 10),
          remarks: `Transferred from QCI for file ${file.prNumber}`,
        },
      });
    }

    // If transferring to Zone (final step), update the store item qty
    if (collectionStatus === "Transferred to Zone") {
      updateData.presentPosition = "Complete";
      // Find or create a store item in the Zone and add qty
      const existingItem = await db.storeItem.findFirst({
        where: { itemCode: file.itemCode, zoneName: { contains: "Zone" } },
      });
      if (existingItem) {
        await db.storeItem.update({
          where: { id: existingItem.id },
          data: {
            qty: { increment: file.qty },
            totalCost: { increment: file.fileCost },
            lastMovement: new Date().toISOString().slice(0, 10),
          },
        });
      } else {
        // Create new store item in Zone A
        await db.storeItem.create({
          data: {
            zoneName: "Zone A",
            description: file.itemName,
            category: file.fileCategory,
            unit: file.unit,
            qty: file.qty,
            unitCost: file.unitPrice,
            totalCost: file.fileCost,
            location: "Zone A",
            itemCode: file.itemCode,
            supplier: file.supplier,
            lastMovement: new Date().toISOString().slice(0, 10),
          },
        });
      }
    }

    const updated = await db.projectFile.update({
      where: { id: fileId },
      data: updateData,
    });

    // Log the collection status change
    await db.fileLog.create({
      data: {
        fileId,
        oldPosition: file.presentPosition,
        newPosition: updateData.presentPosition as string || file.presentPosition,
        changedBy: body.changedBy || "System Sync",
        comment: `Collection status → ${collectionStatus}`,
      },
    });

    return NextResponse.json(updated);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed: " + (e as Error).message }, { status: 500 });
  }
}

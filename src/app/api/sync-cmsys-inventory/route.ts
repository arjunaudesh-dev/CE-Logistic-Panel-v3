import { NextResponse } from "next/server";
import { collection, getDocs } from "firebase/firestore";
import { db as firestoreDb } from "@/lib/firebase";
import { db as localDb } from "@/lib/db";

export async function GET() {
  try {
    // 1. Fetch from Firestore
    let collectionName = "materials";
    let snapshot;
    
    try {
      snapshot = await getDocs(collection(firestoreDb, "materials"));
      if (snapshot.empty) {
        collectionName = "inventory";
        snapshot = await getDocs(collection(firestoreDb, "inventory"));
      }
    } catch (e) {
      console.warn("Failed fetching from materials collection, falling back to inventory:", e);
      collectionName = "inventory";
      snapshot = await getDocs(collection(firestoreDb, "inventory"));
    }

    if (snapshot.empty) {
      return NextResponse.json({
        success: true,
        message: "No documents found in external Firestore materials/inventory collections.",
        syncedItemsCount: 0,
        collectionUsed: collectionName
      });
    }

    const docs = snapshot.docs;
    const syncedItemsCount = docs.length;

    // We will collect the unique zone names and create/update them
    const zoneNames = new Set<string>();
    
    const mappedItems = docs.map((doc) => {
      const docData = doc.data();
      const itemCode = docData.itemCode || docData.materialCode || docData.code || doc.id;
      const description = docData.description || docData.itemName || docData.name || "Unnamed Material";
      const category = docData.category || "General";
      const unit = docData.unit || docData.deno || "NOS";
      const qty = Number(docData.qty ?? docData.quantity ?? docData.stock ?? 0);
      const unitCost = Number(docData.unitCost ?? docData.price ?? docData.cost ?? 0);
      const totalCost = qty * unitCost;
      const location = docData.location || docData.zone || docData.warehouse || "CMSys Sync";
      const zoneName = docData.zoneName || location;
      const supplier = docData.supplier || null;
      const ilmsCode = docData.ilmsCode || null;
      const position = docData.position || docData.movementStatus || docData.status || null;

      zoneNames.add(zoneName);

      return {
        itemCode,
        description,
        category,
        unit,
        qty,
        unitCost,
        totalCost,
        location,
        zoneName,
        supplier,
        ilmsCode,
        position,
        syncSource: "cmsys-firebase",
        syncedAt: new Date(),
      };
    });

    // 2. Perform updates in local SQLite via Prisma transaction
    await localDb.$transaction(async (tx) => {
      // Create/Ensure all StoreZones exist first
      const zonesMap = new Map<string, string>(); // name -> id
      for (const zoneName of zoneNames) {
        const zone = await tx.storeZone.upsert({
          where: { name: zoneName },
          update: {},
          create: {
            name: zoneName,
            type: "Zone",
          },
        });
        zonesMap.set(zoneName, zone.id);
      }

      // Upsert each item
      for (const item of mappedItems) {
        const zoneId = zonesMap.get(item.zoneName) || null;

        // Try to find if item already exists by itemCode or description+zoneName
        const existing = await tx.storeItem.findFirst({
          where: {
            OR: [
              { itemCode: item.itemCode },
              { description: item.description, zoneName: item.zoneName },
            ],
          },
        });

        if (existing) {
          // Update existing item
          await tx.storeItem.update({
            where: { id: existing.id },
            data: {
              zoneId,
              zoneName: item.zoneName,
              description: item.description,
              category: item.category,
              unit: item.unit,
              qty: item.qty,
              unitCost: item.unitCost,
              totalCost: item.totalCost,
              location: item.location,
              supplier: item.supplier,
              itemCode: item.itemCode,
              ilmsCode: item.ilmsCode,
              position: item.position,
              syncSource: item.syncSource,
              syncedAt: item.syncedAt,
            },
          });
        } else {
          // Create new item (as 'On-Charge' item)
          await tx.storeItem.create({
            data: {
              zoneId,
              zoneName: item.zoneName,
              description: item.description,
              category: item.category,
              unit: item.unit,
              qty: item.qty,
              unitCost: item.unitCost,
              totalCost: item.totalCost,
              location: item.location,
              supplier: item.supplier,
              itemCode: item.itemCode,
              ilmsCode: item.ilmsCode,
              position: item.position,
              syncSource: item.syncSource,
              syncedAt: item.syncedAt,
            },
          });
        }
      }

      // 3. Recalculate and update the metrics of all affected StoreZones
      for (const zoneName of zoneNames) {
        const itemsInZone = await tx.storeItem.findMany({
          where: { zoneName },
        });
        const zone = await tx.storeZone.findFirst({
          where: { name: zoneName },
        });
        if (zone) {
          await tx.storeZone.update({
            where: { id: zone.id },
            data: {
              totalValue: itemsInZone.reduce((sum, item) => sum + item.totalCost, 0),
              itemCount: itemsInZone.length,
              lowStockCount: itemsInZone.filter((item) => item.minStock > 0 && item.qty <= item.minStock).length,
            },
          });
        }
      }
    });

    return NextResponse.json({
      success: true,
      message: `Successfully synchronized items from CMSys v2.2 Firebase Firestore.`,
      syncedItemsCount,
      collectionUsed: collectionName,
      items: mappedItems.map(i => ({ code: i.itemCode, name: i.description, qty: i.qty }))
    });
  } catch (error) {
    console.error("Error during CMSys Firebase sync:", error);
    return NextResponse.json(
      {
        success: false,
        error: (error as Error).message || "Internal Server Error during sync",
      },
      { status: 500 }
    );
  }
}

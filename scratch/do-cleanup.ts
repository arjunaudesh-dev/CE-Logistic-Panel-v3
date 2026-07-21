import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

const ZONE_REMAP: Record<string, string> = {
  "A Zone": "Zone A",
  "A-ZONE": "Zone A",
  "C Zone": "Zone C",
  "C zone": "Zone C",
  "D Zone": "Zone D",
  "D-zone": "Zone D",
  "E Zone": "Zone E",
  "E zone": "Zone E",
  "G Zone": "Zone G",
  "G - ZONE": "Zone G",
  "Genaral-Zone": "Zone G",
  "General Zone": "Zone G",
  "OTW": "OTW Site",
  "s/school": "Supply School",
  "Supply-School": "Supply School",
  "Balance-Stores": "Balance Stores",
};

async function main() {
  console.log("Starting store consolidation and cleanup...");

  // 1. Update StoreItem zoneName according to ZONE_REMAP
  for (const [oldName, newName] of Object.entries(ZONE_REMAP)) {
    const updated = await db.storeItem.updateMany({
      where: { zoneName: oldName },
      data: { zoneName: newName },
    });
    if (updated.count > 0) {
      console.log(`Updated ${updated.count} StoreItems from "${oldName}" to "${newName}"`);
    }
  }

  // 2. Fetch all unique zoneNames currently used in StoreItem
  const activeZones = await db.storeItem.groupBy({
    by: ["zoneName"],
    _count: { id: true },
  });
  const activeZoneNames = new Set(activeZones.map(z => z.zoneName));

  console.log("\nActive StoreZone names present in StoreItem:", Array.from(activeZoneNames));

  // 3. Delete StoreZone entries that have no items in StoreItem or are repeated/unused
  const allZones = await db.storeZone.findMany();
  let deletedCount = 0;

  for (const z of allZones) {
    const itemCount = await db.storeItem.count({
      where: { zoneName: z.name },
    });

    if (itemCount === 0 || !activeZoneNames.has(z.name)) {
      await db.storeZone.delete({ where: { id: z.id } });
      console.log(`Deleted 0-item / unused StoreZone: "${z.name}" (id: ${z.id})`);
      deletedCount++;
    }
  }

  console.log(`\nDeleted ${deletedCount} 0-item / duplicate StoreZone records.`);

  // 4. Upsert/Update remaining StoreZones with exact recalculated stats
  for (const zName of activeZoneNames) {
    const items = await db.storeItem.findMany({ where: { zoneName: zName } });
    const totalValue = items.reduce((sum, i) => sum + (i.totalCost || 0), 0);
    const itemCount = items.length;
    const lowStockCount = items.filter(i => i.qty > 0 && i.qty < (i.minStock || 5)).length;
    const nonMovingCount = items.filter(i => i.qty === 0).length;
    const type = zName.includes("Ready") ? "Ready-Use" : zName.includes("Balance") ? "Balance" : zName.includes("Project") ? "Project" : "Zone";

    await db.storeZone.upsert({
      where: { name: zName },
      create: {
        name: zName,
        type,
        totalValue,
        itemCount,
        lowStockCount,
        nonMovingCount,
      },
      update: {
        type,
        totalValue,
        itemCount,
        lowStockCount,
        nonMovingCount,
      },
    });

    console.log(`Updated StoreZone "${zName}": ${itemCount} items, totalValue: Rs. ${totalValue.toLocaleString("en-US")}`);
  }

  // 5. Final summary of remaining StoreZones
  const finalZones = await db.storeZone.findMany({ orderBy: { name: "asc" } });
  console.log(`\nConsolidated StoreZones count: ${finalZones.length}`);
  console.table(finalZones.map(z => ({
    name: z.name,
    type: z.type,
    itemCount: z.itemCount,
    totalValue: z.totalValue,
    lowStock: z.lowStockCount,
    nonMoving: z.nonMovingCount,
  })));
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });

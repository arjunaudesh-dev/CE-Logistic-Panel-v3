import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  const zones = await db.storeZone.findMany({
    orderBy: { name: "asc" },
  });

  console.log(`Total StoreZones in DB: ${zones.length}\n`);

  for (const z of zones) {
    const itemCountInStoreItem = await db.storeItem.count({
      where: { zoneName: z.name },
    });
    console.log(`Zone ID: ${z.id} | Name: "${z.name}" | Type: ${z.type} | Stats itemCount: ${z.itemCount} | Actual StoreItem count: ${itemCountInStoreItem}`);
  }

  await db.$disconnect();
}

main();

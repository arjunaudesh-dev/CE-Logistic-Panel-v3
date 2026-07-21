import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function check() {
  const zones = await db.storeZone.findMany();
  console.log("Current StoreZone count:", zones.length);
  console.log("Sample StoreZone names:", zones.slice(0, 15).map(z => z.name));
  await db.$disconnect();
}

check();

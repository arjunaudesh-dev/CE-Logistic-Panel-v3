import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function check() {
  const itemsWithBookNo = await db.storeItem.findMany({
    where: { bookNo: { not: null } },
    take: 5,
  });

  console.log("Count of items with Book No:", await db.storeItem.count({ where: { bookNo: { not: null } } }));
  console.log("Sample items with Book No:", itemsWithBookNo.map(i => ({
    description: i.description,
    zoneName: i.zoneName,
    location: i.location,
    bookNo: i.bookNo,
    itemCode: i.itemCode,
  })));

  await db.$disconnect();
}

check();

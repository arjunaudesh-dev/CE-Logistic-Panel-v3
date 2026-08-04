const { PrismaClient } = require('@prisma/client');
const path = require('path');

const dbPath = path.resolve(__dirname, '../prisma/custom.db');
process.env.DATABASE_URL = `file:${dbPath}`;
const prisma = new PrismaClient();

async function main() {
  console.log(`Cleaning dummy data from database at ${dbPath}...`);

  // Purge sample files & logs
  await prisma.fileApprovalEntry.deleteMany({});
  await prisma.fileLog.deleteMany({});
  await prisma.projectFile.deleteMany({});
  
  // Purge sample estimates & earmarks
  await prisma.estimateItem.deleteMany({});
  await prisma.estimate.deleteMany({});
  await prisma.earmarkedItem.deleteMany({});
  await prisma.allocation.deleteMany({});
  
  // Purge sample projects
  await prisma.project.deleteMany({});
  
  // Purge sample stakeholders & suppliers
  await prisma.stakeholder.deleteMany({});
  await prisma.supplierContact.deleteMany({});
  await prisma.supplierNomination.deleteMany({});
  await prisma.supplierRating.deleteMany({});
  await prisma.supplier.deleteMany({});

  // Purge sample collection / stores / rates entries
  await prisma.dailyCollection.deleteMany({});
  await prisma.partSupplyEntry.deleteMany({});
  await prisma.partSupplyOrder.deleteMany({});
  await prisma.collectionItem.deleteMany({});
  await prisma.procurementLog.deleteMany({});
  await prisma.procurementFile.deleteMany({});
  await prisma.qCInspection.deleteMany({});

  console.log("SUCCESS: All dummy & sample records cleared!");
  console.log("Database is clean and ready for real data input.");
}

main()
  .catch((e) => {
    console.error("Error clearing dummy data:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

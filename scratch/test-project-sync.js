const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();

const FIREBASE_WORK_ORDERS_URL = "https://ncw-ps-operations-default-rtdb.asia-southeast1.firebasedatabase.app/work_orders.json";

async function testProjectSync() {
  console.log("=== Testing Project Sync between Firebase DB and SQLite ===");

  // 1. Fetch from Firebase
  const res = await fetch(FIREBASE_WORK_ORDERS_URL);
  const data = await res.json();
  const allOrders = Object.entries(data || {}).map(([k, v]) => ({ _fbKey: k, ...v }));
  const fbProjects = allOrders.filter(wo => wo.type === 'PROJECT');
  console.log(`Fetched ${allOrders.length} work orders from Firebase. ${fbProjects.length} are type 'PROJECT'.`);

  let pulledCount = 0;
  for (const p of fbProjects) {
    const recordId = p.id || p._fbKey;
    const name = p.description || p.name || "Unnamed Project";
    const voteNumber = p.voteNumber || p.reference_no || p.zone_id || "GENERAL";
    const voteAllocation = Number(p.budget_allocation || p.voteAllocation || 0);
    const committed = Number(p.committed || 0);
    const actualSpent = Number(p.actualSpent || 0);
    const startDate = p.startDate || (p.created_at ? new Date(p.created_at).toISOString().split('T')[0] : null);
    const endDate = p.endDate || null;
    const department = p.department || null;
    const benefactor = p.benefactor || p.zone_id || null;
    const reference = p.reference || p.reference_no || null;
    const projectType = p.projectType || "New Construction";
    const financialMean = p.financialMean || "Vote";
    const projectOfficer = p.projectOfficer || p.incharge || null;
    const status = p.status === 'Hold' ? 'On Hold' : (p.status || 'Active');
    const description = p.description || null;

    await db.project.upsert({
      where: { id: recordId },
      create: {
        id: recordId,
        name,
        voteNumber,
        voteAllocation,
        committed,
        actualSpent,
        startDate,
        endDate,
        department,
        benefactor,
        reference,
        projectType,
        financialMean,
        projectOfficer,
        status,
        description,
      },
      update: {
        name,
        voteNumber,
        voteAllocation,
        committed,
        actualSpent,
        startDate,
        endDate,
        department,
        benefactor,
        reference,
        projectType,
        financialMean,
        projectOfficer,
        status,
        description,
        updatedAt: new Date(),
      },
    });
    pulledCount++;
  }

  console.log(`Successfully pulled and upserted ${pulledCount} projects from Firebase into SQLite.`);

  const localProjects = await db.project.findMany();
  console.log(`Total projects in SQLite now: ${localProjects.length}`);

  let pushedCount = 0;
  for (const lp of localProjects) {
    const fbKey = lp.id;
    const fbItem = {
      id: fbKey,
      type: "PROJECT",
      description: lp.name || lp.description || "",
      budget_allocation: lp.voteAllocation,
      committed: lp.committed,
      actualSpent: lp.actualSpent,
      status: lp.status === "On Hold" ? "Hold" : lp.status,
      voteNumber: lp.voteNumber,
      zone_id: lp.benefactor || "General Zone",
      projectType: lp.projectType,
      financialMean: lp.financialMean,
      projectOfficer: lp.projectOfficer,
      startDate: lp.startDate,
      endDate: lp.endDate,
      reference_no: lp.reference || lp.voteNumber,
      created_at: new Date(lp.createdAt).getTime(),
    };

    const updateRes = await fetch(`https://ncw-ps-operations-default-rtdb.asia-southeast1.firebasedatabase.app/work_orders/${fbKey}.json`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fbItem),
    });

    if (updateRes.ok) {
      pushedCount++;
    }
  }

  console.log(`Successfully pushed ${pushedCount} projects to Firebase DB!`);
}

testProjectSync()
  .catch(console.error)
  .finally(() => db.$disconnect());

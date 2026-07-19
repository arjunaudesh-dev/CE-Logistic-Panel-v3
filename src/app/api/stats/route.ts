import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const [
      projects,
      procurementFiles,
      storeItems,
      rateContracts,
      partSupply,
      dailyCollection,
      estimates,
      earmarks,
      qcInspections,
    ] = await Promise.all([
      db.project.findMany({ include: { files: { select: { id: true, fileCost: true } } } }),
      db.procurementFile.findMany(),
      db.storeItem.findMany(),
      db.rateContract.findMany(),
      db.partSupplyOrder.findMany(),
      db.dailyCollection.findMany(),
      db.estimate.findMany({ include: { items: true } }),
      db.earmarkedItem.findMany(),
      db.qCInspection.findMany(),
    ]);

    const totalVoteAllocation = projects.reduce(
      (s, p) => s + (p.voteAllocation || 0),
      0
    );
    const totalCommitted = projects.reduce((s, p) => s + (p.committed || 0), 0);
    const totalActualSpent = projects.reduce(
      (s, p) => s + (p.actualSpent || 0),
      0
    );
    const activeProjects = projects.filter((p) => p.status === "Active").length;

    const stockValue = storeItems.reduce((s, i) => s + (i.totalCost || 0), 0);
    const lowStock = storeItems.filter(
      (i) => i.minStock > 0 && i.qty <= i.minStock
    ).length;

    const pendingCollection = procurementFiles.filter((f) =>
      ["Order Placed", "Items Dispatched", "In Transit", "Part Supply"].includes(
        f.presentPosition
      )
    ).length;

    const activePartSupply = partSupply.filter(
      (o) => o.status === "Active"
    ).length;

    return NextResponse.json({
      projects: {
        total: projects.length,
        active: activeProjects,
        voteAllocation: totalVoteAllocation,
        committed: totalCommitted,
        actualSpent: totalActualSpent,
        balance: totalVoteAllocation - totalActualSpent,
      },
      procurement: {
        total: procurementFiles.length,
        pendingCollection,
      },
      stores: {
        totalItems: storeItems.length,
        stockValue,
        lowStock,
        zones: new Set(storeItems.map((i) => i.zoneName)).size,
      },
      rateFinder: {
        rcCount: rateContracts.length,
      },
      collection: {
        partSupplyActive: activePartSupply,
        dailyToday: dailyCollection.filter(
          (d) => d.date === new Date().toISOString().slice(0, 10)
        ).length,
        dailyTotal: dailyCollection.length,
      },
      estimates: {
        total: estimates.length,
        pendingItems: estimates.reduce(
          (s, e) => s + e.items.filter((i) => i.status === "Pending").length,
          0
        ),
        initiatedItems: estimates.reduce(
          (s, e) => s + e.items.filter((i) => i.status === "Initiated").length,
          0
        ),
      },
      earmarks: earmarks.length,
      qc: {
        total: qcInspections.length,
        passed: qcInspections.filter((q) =>
          ["Satisfactory", "Good", "Excellent"].includes(q.qcLevel)
        ).length,
        failed: qcInspections.filter((q) => q.qcLevel === "Fail").length,
      },
      // Most active/valued projects (by actualSpent desc)
      topProjects: projects
        .map((p) => ({
          id: p.id,
          name: p.name,
          voteNumber: p.voteNumber,
          voteAllocation: p.voteAllocation,
          committed: p.committed,
          actualSpent: p.actualSpent,
          balance: p.voteAllocation - p.actualSpent,
          utilization: p.voteAllocation > 0 ? (p.actualSpent / p.voteAllocation) * 100 : 0,
          fileCount: p.files.length,
          fileValue: p.files.reduce((s, f) => s + f.fileCost, 0),
          status: p.status,
        }))
        .sort((a, b) => b.actualSpent - a.actualSpent)
        .slice(0, 5),
      net: totalVoteAllocation,
      task: procurementFiles.length,
      avail: totalVoteAllocation - totalActualSpent,
      team: activeProjects,
    });
  } catch (e) {
    console.error("stats error", e);
    return NextResponse.json(
      { error: "Failed to load stats" },
      { status: 500 }
    );
  }
}

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
    ] = await Promise.all([
      db.project.findMany(),
      db.procurementFile.findMany(),
      db.storeItem.findMany(),
      db.rateContract.findMany(),
      db.partSupplyOrder.findMany(),
      db.dailyCollection.findMany(),
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

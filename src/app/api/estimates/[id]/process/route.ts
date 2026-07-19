import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { processEstimateWithAI } from "@/lib/ai";

// Process an estimate with AI: match each line item to RC list + store inventory
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const estimate = await db.estimate.findUnique({
      where: { id },
      include: { items: { orderBy: { srNo: "asc" } } },
    });
    if (!estimate)
      return NextResponse.json({ error: "Not found" }, { status: 404 });

    const lines = estimate.items.map((it) => ({
      srNo: it.srNo,
      itemName: it.itemName,
      qty: it.qty,
      unit: it.unit,
      estimateCost: it.estimateCost,
    }));

    const results = await processEstimateWithAI(lines);

    // Persist the AI-processed data back into each EstimateItem
    for (const r of results) {
      const item = estimate.items.find((it) => it.srNo === r.srNo);
      if (!item) continue;
      await db.estimateItem.update({
        where: { id: item.id },
        data: {
          itemCode: r.itemCode,
          isRC: r.isRC,
          rcNumber: r.rcNumber,
          rcRate: r.rcRate || 0,
          rcSupplier: r.rcSupplier,
          approxCost: r.approxCost || 0,
          lastPurchasePrice: r.lastPurchasePrice || 0,
          availableStock: r.availableStock || 0,
          stockLocation: r.stockLocation,
          nonMovingStock: r.nonMovingStock || 0,
        },
      });
    }

    await db.estimate.update({
      where: { id },
      data: { status: "Processed", processedAt: new Date() },
    });

    const updated = await db.estimate.findUnique({
      where: { id },
      include: { items: { orderBy: { srNo: "asc" } } },
    });
    return NextResponse.json(updated);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Processing failed: " + (e as Error).message },
      { status: 500 }
    );
  }
}

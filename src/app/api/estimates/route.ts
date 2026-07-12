import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");
    const where: Record<string, unknown> = {};
    if (projectId) where.projectId = projectId;
    const estimates = await db.estimate.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: { items: { orderBy: { srNo: "asc" } } },
    });
    return NextResponse.json(estimates);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    // body: { projectId, name, items: [{itemName, qty, unit, estimateCost}] }
    const estimate = await db.estimate.create({
      data: {
        projectId: body.projectId,
        name: body.name || "Material Estimate",
        status: "Draft",
      },
    });
    if (Array.isArray(body.items) && body.items.length > 0) {
      await db.estimateItem.createMany({
        data: body.items.map((it: { itemName: string; qty: number; unit: string; estimateCost: number }, idx: number) => ({
          estimateId: estimate.id,
          srNo: idx + 1,
          itemName: it.itemName,
          qty: Number(it.qty) || 0,
          unit: it.unit || "NOS",
          estimateCost: Number(it.estimateCost) || 0,
          approxCost: Number(it.estimateCost) || 0,
        })),
      });
    }
    const full = await db.estimate.findUnique({
      where: { id: estimate.id },
      include: { items: { orderBy: { srNo: "asc" } } },
    });
    return NextResponse.json(full, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

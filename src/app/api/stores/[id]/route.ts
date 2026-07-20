import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

async function syncZone(zoneName: string) {
  const items = await db.storeItem.findMany({ where: { zoneName } });
  const zone = await db.storeZone.findFirst({ where: { name: zoneName } });
  if (zone) {
    await db.storeZone.update({
      where: { id: zone.id },
      data: {
        totalValue: items.reduce((s, i) => s + i.totalCost, 0),
        itemCount: items.length,
        lowStockCount: items.filter((i) => i.minStock > 0 && i.qty <= i.minStock).length,
      },
    });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const existing = await db.storeItem.findUnique({ where: { id } });
    if (!existing)
      return NextResponse.json({ error: "Not found" }, { status: 404 });

    const qty = body.qty != null ? Number(body.qty) : existing.qty;
    const unitCost =
      body.unitCost != null ? Number(body.unitCost) : existing.unitCost;
    const updated = await db.storeItem.update({
      where: { id },
      data: {
        description: body.description ?? existing.description,
        category: body.category ?? existing.category,
        unit: body.unit ?? existing.unit,
        qty,
        unitCost,
        totalCost: qty * unitCost,
        location: body.location ?? existing.location,
        bookNo: body.bookNo ?? existing.bookNo,
        minStock: body.minStock != null ? Number(body.minStock) : existing.minStock,
        maxStock: body.maxStock != null ? Number(body.maxStock) : existing.maxStock,
        supplier: body.supplier ?? existing.supplier,
        itemCode: body.itemCode ?? existing.itemCode,
        zoneName: body.zoneName ?? existing.zoneName,
        lastMovement: new Date().toISOString().slice(0, 10),
      },
    });
    await syncZone(updated.zoneName);
    return NextResponse.json(updated);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const item = await db.storeItem.findUnique({ where: { id } });
    if (!item)
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    await db.storeItem.delete({ where: { id } });
    await syncZone(item.zoneName);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const zone = searchParams.get("zone");
    const category = searchParams.get("category");
    const stock = searchParams.get("stock"); // in | low | out | over
    const search = searchParams.get("search");

    const where: Record<string, unknown> = {};
    if (zone && zone !== "all") where.zoneName = zone;
    if (category && category !== "all") where.category = category;
    if (search) where.description = { contains: search };

    let items = await db.storeItem.findMany({
      where,
      orderBy: { description: "asc" },
    });

    if (stock && stock !== "all") {
      items = items.filter((i) => {
        if (stock === "out") return i.qty <= 0;
        if (stock === "low") return i.minStock > 0 && i.qty > 0 && i.qty <= i.minStock;
        if (stock === "in") return i.qty > i.minStock;
        if (stock === "over") return i.maxStock > 0 && i.qty >= i.maxStock;
        return true;
      });
    }
    return NextResponse.json(items);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const qty = Number(body.qty) || 0;
    const unitCost = Number(body.unitCost) || 0;
    const item = await db.storeItem.create({
      data: {
        zoneName: body.zoneName || "Zone A",
        description: body.description,
        category: body.category || "General",
        unit: body.unit || "NOS",
        qty,
        unitCost,
        totalCost: qty * unitCost,
        location: body.location || body.zoneName || null,
        bookNo: body.bookNo || null,
        minStock: Number(body.minStock) || 0,
        maxStock: Number(body.maxStock) || 0,
        supplier: body.supplier || null,
        itemCode: body.itemCode || null,
        ilmsCode: body.ilmsCode || null,
        lastMovement: new Date().toISOString().slice(0, 10),
      },
    });
    // update zone aggregate
    await syncZone(item.zoneName);
    return NextResponse.json(item, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

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

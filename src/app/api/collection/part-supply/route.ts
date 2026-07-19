import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const orders = await db.partSupplyOrder.findMany({
      orderBy: { createdAt: "desc" },
      include: { entries: { orderBy: { srNo: "asc" } } },
    });
    return NextResponse.json(orders);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const order = await db.partSupplyOrder.create({
      data: {
        itemName: body.itemName,
        orderedQty: Number(body.orderedQty) || 0,
        receivedQty: 0,
        balance: Number(body.orderedQty) || 0,
        startDate: body.startDate || new Date().toISOString().slice(0, 10),
        expectedEndDate: body.expectedEndDate || null,
        status: "Active",
        supplier: body.supplier || null,
      },
    });
    return NextResponse.json(order, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

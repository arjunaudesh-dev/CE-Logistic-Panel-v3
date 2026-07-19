import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const orders = await db.splitOrder.findMany({
      orderBy: { createdAt: "desc" },
      include: { entries: { orderBy: { createdAt: "asc" } } },
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
    const order = await db.splitOrder.create({
      data: {
        fileNumber: body.fileNumber,
        prNumber: body.prNumber || null,
        itemName: body.itemName,
        totalQty: Number(body.totalQty) || 0,
        supplier: body.supplier || null,
        linkedPOs: body.linkedPOs || null,
      },
    });
    // create entries for each PO
    if (Array.isArray(body.entries)) {
      for (const entry of body.entries) {
        await db.splitOrderEntry.create({
          data: {
            splitOrderId: order.id,
            poNumber: entry.poNumber,
            qty: Number(entry.qty) || 0,
            balance: Number(entry.qty) || 0,
            date: entry.date || new Date().toISOString().slice(0, 10),
          },
        });
      }
    }
    const full = await db.splitOrder.findUnique({
      where: { id: order.id },
      include: { entries: true },
    });
    return NextResponse.json(full, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

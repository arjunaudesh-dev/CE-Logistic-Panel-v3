import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// GET: list all split order headers with their sub-orders and entries
export async function GET() {
  try {
    const headers = await db.splitOrderHeader.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        splits: {
          orderBy: { createdAt: "asc" },
          include: {
            entries: { orderBy: { createdAt: "asc" } },
          },
        },
      },
    });
    return NextResponse.json(headers);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

// POST: create a new split order header (with optional sub-orders/POs)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const header = await db.splitOrderHeader.create({
      data: {
        fileNumber: body.fileNumber,
        itemName: body.itemName,
        totalQty: Number(body.totalQty) || 0,
        supplier: body.supplier || null,
      },
    });

    // Create sub-orders (one per PO)
    if (Array.isArray(body.splits)) {
      for (const sub of body.splits) {
        await db.splitOrderSub.create({
          data: {
            headerId: header.id,
            poNumber: sub.poNumber,
            allocatedQty: Number(sub.allocatedQty) || 0,
            receivedQty: 0,
          },
        });
      }
    }

    const full = await db.splitOrderHeader.findUnique({
      where: { id: header.id },
      include: {
        splits: {
          include: { entries: true },
        },
      },
    });
    return NextResponse.json(full, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

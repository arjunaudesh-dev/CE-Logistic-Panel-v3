import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const order = await db.partSupplyOrder.findUnique({ where: { id } });
    if (!order)
      return NextResponse.json({ error: "Not found" }, { status: 404 });

    const qty = Number(body.qty) || 0;
    const lastEntry = await db.partSupplyEntry.findFirst({
      where: { orderId: id },
      orderBy: { srNo: "desc" },
    });
    const srNo = (lastEntry?.srNo || 0) + 1;
    const cumulativeBalance = (lastEntry?.cumulativeBalance || 0) + qty;
    const newReceivedQty = order.receivedQty + qty;
    const newBalance = order.orderedQty - newReceivedQty;

    const entry = await db.partSupplyEntry.create({
      data: {
        orderId: id,
        srNo,
        date: body.date || new Date().toISOString().slice(0, 10),
        vehicleNumber: body.vehicleNumber || null,
        qty,
        qcCheckedBy: body.qcCheckedBy || null,
        sailorCount: Number(body.sailorCount) || 0,
        driverName: body.driverName || null,
        driverLicense: body.driverLicense || null,
        driverPhone: body.driverPhone || null,
        cumulativeBalance,
      },
    });

    await db.partSupplyOrder.update({
      where: { id },
      data: {
        receivedQty: newReceivedQty,
        balance: newBalance,
        status: newBalance <= 0 ? "Completed" : "Active",
      },
    });

    return NextResponse.json(entry, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

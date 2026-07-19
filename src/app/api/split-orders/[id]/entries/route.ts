import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// Add a collection entry to a split order (records collection for one PO)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const qty = Number(body.qty) || 0;
    const entry = await db.splitOrderEntry.create({
      data: {
        splitOrderId: id,
        poNumber: body.poNumber,
        qty,
        receivedQty: qty,
        balance: 0,
        status: "Collected",
        date: body.date || new Date().toISOString().slice(0, 10),
        vehicleType: body.vehicleType || null,
        vehicleNumber: body.vehicleNumber || null,
        gatePassNumber: body.gatePassNumber || null,
        driverName: body.driverName || null,
        provostCheckedBy: body.provostCheckedBy || null,
        ceSailorInvolved: body.ceSailorInvolved || null,
        cslogSailorInvolved: body.cslogSailorInvolved || null,
      },
    });
    return NextResponse.json(entry, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

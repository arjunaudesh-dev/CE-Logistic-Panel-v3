import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// POST: Add a collection entry to a SplitOrderSub (records a delivery for one PO)
// [id] here = SplitOrderSub.id
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: subId } = await params;
    const body = await req.json();
    const receivedQty = Number(body.receivedQty || body.qty) || 0;

    const entry = await db.splitOrderEntry.create({
      data: {
        subId,
        date: body.date || new Date().toISOString().slice(0, 10),
        receivedQty,
        vehicleType: body.vehicleType || "SLN",
        vehicleNumber: body.vehicleNumber || null,
        gatePassNumber: body.gatePassNumber || null,
        driverName: body.driverName || null,
        driverLicense: body.driverLicense || null,
        driverPhone: body.driverPhone || null,
        provostCheckedBy: body.provostCheckedBy || null,
        ceSailorInvolved: body.ceSailorInvolved || null,
        cslogSailorInvolved: body.cslogSailorInvolved || null,
      },
    });

    // Update receivedQty aggregate on the parent sub-order
    const sub = await db.splitOrderSub.findUnique({ where: { id: subId } });
    if (sub) {
      await db.splitOrderSub.update({
        where: { id: subId },
        data: { receivedQty: sub.receivedQty + receivedQty },
      });
    }

    return NextResponse.json(entry, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: subId } = await params;
    const body = await req.json();
    const { action, entryId, vehicleNumber, qty, driverName, qcOfficer } = body;

    const sub = await db.splitOrderSub.findUnique({
      where: { id: subId },
      include: { header: true, entries: true },
    });
    if (!sub) return NextResponse.json({ error: "Sub PO not found" }, { status: 404 });

    if (action === "send-qci") {
      if (!entryId) return NextResponse.json({ error: "entryId required" }, { status: 400 });

      const entry = await db.splitOrderEntry.findUnique({ where: { id: entryId } });
      if (!entry) return NextResponse.json({ error: "Entry not found" }, { status: 404 });

      // Count existing QC Inspections to generate QCI number
      const count = await db.qCInspection.count();
      const qciNumber = `QCI-${String(count + 1).padStart(4, "0")}`;

      const qc = await db.qCInspection.create({
        data: {
          qciNumber,
          refType: "Split Order Entry",
          refId: entry.id,
          fileNumber: sub.header.fileNumber,
          poNumber: sub.poNumber,
          itemName: sub.header.itemName,
          supplier: sub.supplier || "—",
          qty: entry.qty,
          qcLevel: "Satisfactory",
          qcOfficer: qcOfficer || "QC Inspector",
          remarks: `Sent from Split Order ${sub.header.fileNumber} (${sub.poNumber})`,
        },
      });

      const updatedEntry = await db.splitOrderEntry.update({
        where: { id: entryId },
        data: {
          sentToQCI: true,
          sentToQCIAt: new Date(),
        },
      });

      return NextResponse.json({ entry: updatedEntry, qc });
    }

    // Default action: Add new entry under sub-PO
    const srNo = sub.entries.length + 1;
    const newEntry = await db.splitOrderEntry.create({
      data: {
        subId,
        srNo,
        date: body.date || new Date().toISOString().slice(0, 10),
        vehicleNumber: vehicleNumber || null,
        qty: Number(qty) || 0,
        driverName: driverName || null,
        sentToQCI: false,
      },
    });

    return NextResponse.json(newEntry, { status: 201 });
  } catch (e) {
    console.error("split-orders entries error", e);
    return NextResponse.json({ error: "Failed to process entry" }, { status: 500 });
  }
}

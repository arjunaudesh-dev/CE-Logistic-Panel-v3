import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    if (body.qcLevel === "Fail" && (!body.remarks || !body.remarks.trim())) {
      return NextResponse.json(
        { error: "Remarks are mandatory when QC level is Fail" },
        { status: 400 }
      );
    }
    const updated = await db.qCInspection.update({
      where: { id },
      data: {
        qcLevel: body.qcLevel,
        qcOfficer: body.qcOfficer,
        qcOfficerDetails: body.qcOfficerDetails,
        remarks: body.remarks,
      },
    });
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
    await db.qCInspection.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

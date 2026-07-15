import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const refType = searchParams.get("refType");
    const refId = searchParams.get("refId");
    const where: Record<string, unknown> = {};
    if (refType) where.refType = refType;
    if (refId) where.refId = refId;
    const items = await db.qCInspection.findMany({
      where,
      orderBy: { inspectedAt: "desc" },
    });
    return NextResponse.json(items);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (body.qcLevel === "Fail" && (!body.remarks || !body.remarks.trim())) {
      return NextResponse.json(
        { error: "Remarks are mandatory when QC level is Fail" },
        { status: 400 }
      );
    }
    // Auto-generate QCI number if not provided
    let qciNumber = body.qciNumber;
    if (!qciNumber) {
      const count = await db.qCInspection.count();
      qciNumber = `QCI/${new Date().getFullYear()}/${String(count + 1).padStart(4, "0")}`;
    }
    const item = await db.qCInspection.create({
      data: {
        qciNumber,
        refType: body.refType, // daily | partsupply | splitorder | collection
        refId: body.refId,
        itemName: body.itemName,
        supplier: body.supplier || null,
        qty: Number(body.qty) || 0,
        qcLevel: body.qcLevel,
        qcOfficer: body.qcOfficer || null, // CCED officer name
        qcOfficerDetails: body.qcOfficerDetails || null,
        remarks: body.remarks || null,
        fileNumber: body.fileNumber || null,
        poNumber: body.poNumber || null,
      },
    });
    return NextResponse.json(item, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

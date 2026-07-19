import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const storeName = searchParams.get("storeName");
    const recordType = searchParams.get("recordType");
    const navReference = searchParams.get("navReference");
    const search = searchParams.get("search");

    const where: Record<string, unknown> = {};
    if (storeName && storeName !== "all") where.storeName = storeName;
    if (recordType && recordType !== "all") where.recordType = recordType;
    if (navReference && navReference !== "all") where.navReference = navReference;
    if (search) where.itemName = { contains: search };

    const records = await db.areaStoreRecord.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(records);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (Array.isArray(body)) {
      const created = await db.areaStoreRecord.createMany({
        data: body.map((b) => ({
          storeName: b.storeName,
          itemCode: b.itemCode || null,
          itemName: b.itemName,
          category: b.category || "General",
          unit: b.unit || "NOS",
          qty: Number(b.qty) || 0,
          unitCost: Number(b.unitCost) || 0,
          totalCost: (Number(b.qty) || 0) * (Number(b.unitCost) || 0),
          recordType: b.recordType,
          navReference: b.navReference || null,
          qcInspectionId: b.qcInspectionId || null,
          fileNumber: b.fileNumber || null,
          location: b.location || null,
          date: b.date || new Date().toISOString().slice(0, 10),
          remarks: b.remarks || null,
        })),
      });
      return NextResponse.json(created, { status: 201 });
    }
    const qty = Number(body.qty) || 0;
    const unitCost = Number(body.unitCost) || 0;
    const record = await db.areaStoreRecord.create({
      data: {
        storeName: body.storeName,
        itemCode: body.itemCode || null,
        itemName: body.itemName,
        category: body.category || "General",
        unit: body.unit || "NOS",
        qty,
        unitCost,
        totalCost: qty * unitCost,
        recordType: body.recordType,
        navReference: body.navReference || null,
        qcInspectionId: body.qcInspectionId || null,
        fileNumber: body.fileNumber || null,
        location: body.location || null,
        date: body.date || new Date().toISOString().slice(0, 10),
        remarks: body.remarks || null,
      },
    });
    return NextResponse.json(record, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

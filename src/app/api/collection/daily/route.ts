import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date");
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const oldOnly = searchParams.get("old") === "true";
    const qciOnly = searchParams.get("qci") === "true";

    const where: Record<string, unknown> = {};
    if (date) where.date = date;
    if (from && to) where.date = { gte: from, lte: to };
    if (oldOnly) where.isOld = true;
    if (qciOnly) where.sentToQCI = true;

    const items = await db.dailyCollection.findMany({
      where,
      orderBy: { date: "desc" },
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
    if (Array.isArray(body)) {
      const created = await db.dailyCollection.createMany({
        data: body.map((b) => ({
          date: b.date || new Date().toISOString().slice(0, 10),
          itemName: b.itemName,
          qty: Number(b.qty) || 0,
          receivedFrom: b.receivedFrom || null,
          recordedBy: b.recordedBy || "Clerk",
          vehicleType: b.vehicleType || null,
          vehicleNumber: b.vehicleNumber || null,
          gatePassNumber: b.gatePassNumber || null,
          driverName: b.driverName || null,
          driverLicense: b.driverLicense || null,
          driverPhone: b.driverPhone || null,
          provostCheckedBy: b.provostCheckedBy || null,
          ceSailorInvolved: b.ceSailorInvolved || null,
          cslogSailorInvolved: b.cslogSailorInvolved || null,
        })),
      });
      return NextResponse.json(created, { status: 201 });
    }
    const item = await db.dailyCollection.create({
      data: {
        date: body.date || new Date().toISOString().slice(0, 10),
        itemName: body.itemName,
        qty: Number(body.qty) || 0,
        receivedFrom: body.receivedFrom || null,
        recordedBy: body.recordedBy || "Clerk",
        vehicleType: body.vehicleType || null,
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
    return NextResponse.json(item, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

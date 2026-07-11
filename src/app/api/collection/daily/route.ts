import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date");
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const where: Record<string, unknown> = {};
    if (date) where.date = date;
    if (from && to) where.date = { gte: from, lte: to };

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
      },
    });
    return NextResponse.json(item, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

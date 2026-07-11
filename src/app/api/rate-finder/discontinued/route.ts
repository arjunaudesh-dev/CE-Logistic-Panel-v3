import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const items = await db.discontinuedItem.findMany({
      orderBy: { discontinuedDate: "desc" },
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
      const created = await db.discontinuedItem.createMany({
        data: body.map((b) => ({
          itemCode: b.itemCode,
          description: b.description,
          unit: b.unit || "NOS",
          lastRCPrice: Number(b.lastRCPrice) || 0,
          lastRCYear: b.lastRCYear || null,
          discontinuedDate: b.discontinuedDate || null,
          reason: b.reason || null,
          alternatives: b.alternatives || null,
        })),
      });
      return NextResponse.json(created, { status: 201 });
    }
    const item = await db.discontinuedItem.create({
      data: {
        itemCode: body.itemCode,
        description: body.description,
        unit: body.unit || "NOS",
        lastRCPrice: Number(body.lastRCPrice) || 0,
        lastRCYear: body.lastRCYear || null,
        discontinuedDate: body.discontinuedDate || null,
        reason: body.reason || null,
        alternatives: body.alternatives || null,
      },
    });
    return NextResponse.json(item, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

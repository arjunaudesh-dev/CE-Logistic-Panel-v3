import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");
    const year = searchParams.get("year");
    const search = searchParams.get("search");

    const where: Record<string, unknown> = {};
    if (category && category !== "all") where.category = category;
    if (year && year !== "all") where.rcYear = year;
    if (search) where.description = { contains: search };

    const items = await db.rateContract.findMany({
      where,
      orderBy: { rcYear: "desc" },
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
    // support single or bulk
    if (Array.isArray(body)) {
      const created = await db.rateContract.createMany({
        data: body.map((b) => ({
          itemCode: b.itemCode,
          description: b.description,
          unit: b.unit || "NOS",
          rcPrice: Number(b.rcPrice) || 0,
          supplier: b.supplier || null,
          rcYear: b.rcYear || String(new Date().getFullYear()),
          validFrom: b.validFrom || null,
          validUntil: b.validUntil || null,
          category: b.category || "General",
        })),
      });
      return NextResponse.json(created, { status: 201 });
    }
    const item = await db.rateContract.create({
      data: {
        itemCode: body.itemCode,
        description: body.description,
        unit: body.unit || "NOS",
        rcPrice: Number(body.rcPrice) || 0,
        supplier: body.supplier || null,
        rcYear: body.rcYear || String(new Date().getFullYear()),
        validFrom: body.validFrom || null,
        validUntil: body.validUntil || null,
        category: body.category || "General",
      },
    });
    return NextResponse.json(item, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

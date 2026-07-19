import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");
    const status = searchParams.get("status");
    const search = searchParams.get("search");

    const where: Record<string, unknown> = {};
    if (category && category !== "all") where.category = category;
    if (status && status !== "all") where.status = status;
    if (search) {
      where.OR = [
        { canonicalCode: { contains: search } },
        { description: { contains: search } },
        { alternateCodes: { contains: search } },
        { alternateNames: { contains: search } },
      ];
    }
    const items = await db.itemMaster.findMany({
      where,
      orderBy: { canonicalCode: "asc" },
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
      // bulk upload (item code + description)
      const created = await db.itemMaster.createMany({
        data: body.map((b) => ({
          canonicalCode: b.canonicalCode || b.itemCode,
          description: b.description,
          category: b.category || "General",
          unit: b.unit || "NOS",
          alternateCodes: b.alternateCodes || null,
          alternateNames: b.alternateNames || null,
        })),
        skipDuplicates: true,
      });
      return NextResponse.json(created, { status: 201 });
    }
    const item = await db.itemMaster.create({
      data: {
        canonicalCode: body.canonicalCode,
        description: body.description,
        category: body.category || "General",
        unit: body.unit || "NOS",
        alternateCodes: body.alternateCodes || null,
        alternateNames: body.alternateNames || null,
      },
    });
    return NextResponse.json(item, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

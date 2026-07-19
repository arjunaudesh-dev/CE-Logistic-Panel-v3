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
          rateCode: b.rateCode || b["Rate code"] || b.ratecode || null,
          itemCode: b.itemCode || b.itemcode || "",
          description: b.description || b.item || "",
          unit: b.unit || "NOS",
          rcPrice: Number(b.rcPrice ?? b.rate ?? b["rate(Rs)"] ?? 0) || 0,
          vat: Number(b.vat ?? b.VAT ?? 0) || 0,
          warranty: b.warranty || null,
          brand: b.brand || b.Brand || null,
          makeModel: b.makeModel || b["make model"] || b.makeModel || null,
          category: b.category || b.Category || "General",
          subCategory: b.subCategory || b["sub category"] || b.subcategory || null,
          supplier: b.supplier || b["RC supplier"] || b.rcSupplier || null,
          rcYear: b.rcYear || String(new Date().getFullYear()),
          validFrom: b.validFrom || null,
          validUntil: b.validUntil || b["validity up to"] || b.validity || null,
        })),
      });
      return NextResponse.json(created, { status: 201 });
    }
    const item = await db.rateContract.create({
      data: {
        rateCode: body.rateCode || null,
        itemCode: body.itemCode,
        description: body.description,
        unit: body.unit || "NOS",
        rcPrice: Number(body.rcPrice) || 0,
        vat: Number(body.vat) || 0,
        warranty: body.warranty || null,
        brand: body.brand || null,
        makeModel: body.makeModel || null,
        category: body.category || "General",
        subCategory: body.subCategory || null,
        supplier: body.supplier || null,
        rcYear: body.rcYear || String(new Date().getFullYear()),
        validFrom: body.validFrom || null,
        validUntil: body.validUntil || null,
      },
    });
    return NextResponse.json(item, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

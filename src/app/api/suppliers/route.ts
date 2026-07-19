import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search");
    const where: Record<string, unknown> = {};
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { contactPerson: { contains: search } },
        { telephone: { contains: search } },
      ];
    }
    const suppliers = await db.supplier.findMany({
      where,
      orderBy: { name: "asc" },
      include: {
        contacts: true,
        nominations: true,
        ratings: { orderBy: { ratedAt: "desc" } },
      },
    });
    // compute aggregate rating per supplier
    const result = suppliers.map((s) => {
      const ratings = s.ratings;
      const avg =
        ratings.length > 0
          ? ratings.reduce((sum, r) => sum + r.overallScore, 0) / ratings.length
          : 0;
      return { ...s, avgRating: avg, ratingCount: ratings.length };
    });
    return NextResponse.json(result);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const supplier = await db.supplier.create({
      data: {
        name: body.name,
        contactPerson: body.contactPerson || null,
        telephone: body.telephone || null,
        whatsapp: body.whatsapp || null,
        email: body.email || null,
        address: body.address || null,
        contractDetails: body.contractDetails || null,
        registrationNo: body.registrationNo || null,
        vatNo: body.vatNo || null,
        bankDetails: body.bankDetails || null,
      },
    });
    return NextResponse.json(supplier, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

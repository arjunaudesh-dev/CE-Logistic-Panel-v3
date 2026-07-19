import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    // support bulk
    if (Array.isArray(body)) {
      const created = await db.supplierNomination.createMany({
        data: body.map((b) => ({
          supplierId: id,
          itemCode: b.itemCode || null,
          itemName: b.itemName,
          category: b.category || "General",
        })),
      });
      return NextResponse.json(created, { status: 201 });
    }
    const nom = await db.supplierNomination.create({
      data: {
        supplierId: id,
        itemCode: body.itemCode || null,
        itemName: body.itemName,
        category: body.category || "General",
      },
    });
    return NextResponse.json(nom, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const qci = Number(body.qciScore) || 0;
    const loyalty = Number(body.loyalty) || 0;
    const professionalism = Number(body.professionalism) || 0;
    const activeEngagement = Number(body.activeEngagement) || 0;
    const values = Number(body.values) || 0;
    const overall =
      [qci, loyalty, professionalism, activeEngagement, values].filter((v) => v > 0)
        .reduce((s, v, _i, arr) => s + v / arr.length, 0);
    const rating = await db.supplierRating.create({
      data: {
        supplierId: id,
        qciScore: qci,
        loyalty,
        professionalism,
        activeEngagement,
        values,
        overallScore: Math.round(overall * 100) / 100,
        remarks: body.remarks || null,
        ratedBy: body.ratedBy || null,
      },
    });
    return NextResponse.json(rating, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

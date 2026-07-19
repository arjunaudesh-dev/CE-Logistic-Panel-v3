import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const votes = await db.vote.findMany({ orderBy: { voteNumber: "asc" } });
    return NextResponse.json(votes);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const vote = await db.vote.create({
      data: {
        voteNumber: body.voteNumber,
        description: body.description,
        voteType: body.voteType || "Capital",
        department: body.department || null,
        allocation: Number(body.allocation) || 0,
        financialYear: body.financialYear || null,
        active: body.active !== false,
      },
    });
    return NextResponse.json(vote, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

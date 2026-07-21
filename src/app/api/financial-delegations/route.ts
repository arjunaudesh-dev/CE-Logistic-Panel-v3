import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const items = await db.financialDelegation.findMany({
      orderBy: { value: "asc" },
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
    const value = Number(body.value) || 0;
    const authority = body.authority || "";
    const label = `Up to Rs. ${value.toLocaleString("en-US")} — ${authority}`;
    const item = await db.financialDelegation.create({
      data: { value, authority, label, active: body.active !== false },
    });
    return NextResponse.json(item, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

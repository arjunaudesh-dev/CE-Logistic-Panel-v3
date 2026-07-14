import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const prefixes = await db.numberPrefix.findMany({ orderBy: { docType: "asc" } });
    return NextResponse.json(prefixes);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const prefix = await db.numberPrefix.create({
      data: {
        docType: body.docType,
        prefix: body.prefix || "",
        suffix: body.suffix || null,
        nextNumber: Number(body.nextNumber) || 1,
        description: body.description || null,
      },
    });
    return NextResponse.json(prefix, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

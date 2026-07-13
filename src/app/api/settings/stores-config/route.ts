import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const stores = await db.storeSetting.findMany({
      orderBy: { storeName: "asc" },
    });
    return NextResponse.json(stores);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const store = await db.storeSetting.create({
      data: {
        storeName: body.storeName,
        storeType: body.storeType || "Zone",
        responsiblePerson: body.responsiblePerson || null,
        location: body.location || null,
        active: body.active !== false,
      },
    });
    return NextResponse.json(store, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

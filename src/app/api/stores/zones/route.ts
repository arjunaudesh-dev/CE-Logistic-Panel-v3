import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const zones = await db.storeZone.findMany({
      orderBy: { name: "asc" },
    });
    return NextResponse.json(zones);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

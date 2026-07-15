import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const profiles = await db.themeProfile.findMany({ orderBy: { name: "asc" } });
    return NextResponse.json(profiles);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    // if setting as default, unset others
    if (body.isDefault) {
      await db.themeProfile.updateMany({ data: { isDefault: false } });
    }
    const profile = await db.themeProfile.create({
      data: {
        name: body.name,
        mode: body.mode || "dark",
        primary: body.primary || "#3b82f6",
        accent: body.accent || "#8b5cf6",
        isDefault: !!body.isDefault,
      },
    });
    return NextResponse.json(profile, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    if (body.isDefault) {
      await db.themeProfile.updateMany({ data: { isDefault: false } });
    }
    const updated = await db.themeProfile.update({
      where: { id },
      data: {
        name: body.name,
        mode: body.mode || "dark",
        primary: body.primary || "#3b82f6",
        accent: body.accent || "#8b5cf6",
        isDefault: !!body.isDefault,
      },
    });
    return NextResponse.json(updated);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await db.themeProfile.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

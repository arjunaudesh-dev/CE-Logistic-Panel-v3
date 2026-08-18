import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const header = await db.splitOrderHeader.findUnique({
      where: { id },
      include: {
        splits: {
          orderBy: { createdAt: "asc" },
          include: {
            entries: { orderBy: { createdAt: "asc" } },
          },
        },
      },
    });
    if (!header) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(header);
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
    await db.splitOrderHeader.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

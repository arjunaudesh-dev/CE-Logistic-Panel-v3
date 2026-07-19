import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const logs = await db.procurementLog.findMany({
      where: { fileId: id },
      orderBy: { changedAt: "desc" },
    });
    return NextResponse.json(logs);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const existing = await db.procurementFile.findUnique({ where: { id } });
    if (!existing)
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    const oldPosition = existing.presentPosition;
    const newPosition = body.newPosition;

    const log = await db.procurementLog.create({
      data: {
        fileId: id,
        oldPosition,
        newPosition,
        changedBy: body.changedBy || "Officer",
        comment: body.comment || `Position changed: ${oldPosition} → ${newPosition}`,
      },
    });
    await db.procurementFile.update({
      where: { id },
      data: { presentPosition: newPosition },
    });
    return NextResponse.json(log, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

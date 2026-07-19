import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; cid: string }> }
) {
  try {
    const { cid } = await params;
    const body = await req.json();
    const updated = await db.supplierContact.update({
      where: { id: cid },
      data: {
        name: body.name,
        designation: body.designation || null,
        telephone: body.telephone || null,
        whatsapp: body.whatsapp || null,
        email: body.email || null,
        isPrimary: !!body.isPrimary,
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
  { params }: { params: Promise<{ id: string; cid: string }> }
) {
  try {
    const { cid } = await params;
    await db.supplierContact.delete({ where: { id: cid } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

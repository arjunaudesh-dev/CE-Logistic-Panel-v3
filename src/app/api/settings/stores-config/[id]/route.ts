import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const updated = await db.storeSetting.update({
      where: { id },
      data: {
        storeName: body.storeName,
        storeType: body.storeType || "Zone",
        department: body.department || null,
        responsiblePersons: body.responsiblePersons
          ? JSON.stringify(body.responsiblePersons)
          : null,
        responsibleOfficers: body.responsibleOfficers
          ? JSON.stringify(body.responsibleOfficers)
          : null,
        responsiblePerson: body.responsiblePerson || null,
        location: body.location || null,
        active: body.active !== false,
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
    await db.storeSetting.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const updated = await db.stakeholder.update({
      where: { id },
      data: {
        name: body.name,
        rankOrRate: body.rankOrRate || null,
        svcNumber: body.svcNumber || null,
        appointment: body.appointment || null,
        department: body.department || "CSLOG",
        category: body.category || "Officer",
        seniority:
          body.seniority !== undefined && body.seniority !== null && body.seniority !== ""
            ? Number(body.seniority)
            : null,
        areaStoreLocation: body.areaStoreLocation || null,
        subjectClerk: body.subjectClerk || null,
        ilmsCced: body.ilmsCced || null,
        officeNumber: body.officeNumber || null,
        telephone: body.telephone || null,
        whatsapp: body.whatsapp || null,
        email: body.email || null,
        availability: body.availability || "Available",
        role: body.role || "Officer",
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
    await db.stakeholder.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const project = await db.project.findUnique({
      where: { id },
      include: {
        files: { orderBy: { createdAt: "desc" } },
        allocations: { orderBy: { date: "desc" } },
      },
    });
    if (!project)
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(project);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const updated = await db.project.update({
      where: { id },
      data: {
        name: body.name,
        nameAbbreviation: body.nameAbbreviation ?? undefined,
        voteNumber: body.voteNumber,
        voteAllocation: Number(body.voteAllocation) || 0,
        committed: Number(body.committed) || 0,
        actualSpent: Number(body.actualSpent) || 0,
        startDate: body.startDate || null,
        endDate: body.endDate || null,
        department: body.department || null,
        benefactor: body.benefactor || null,
        reference: body.reference || null,
        projectType: body.projectType || "New Construction",
        financialMean: body.financialMean || null,
        projectOfficer: body.projectOfficer || null,
        status: body.status || "Active",
        description: body.description || null,
        showOnDashboard: body.showOnDashboard !== undefined ? body.showOnDashboard : undefined,
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
    await db.project.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

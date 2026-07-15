import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; sid: string }> }
) {
  try {
    const { sid } = await params;
    const body = await req.json();
    const updated = await db.processStep.update({
      where: { id: sid },
      data: {
        stepOrder: body.stepOrder != null ? Number(body.stepOrder) : null,
        positionName: body.positionName || null,
        predefinedStage: body.predefinedStage || null,
        description: body.description || null,
        beforeStepId: body.beforeStepId || null,
        afterStepId: body.afterStepId || null,
        department: body.department || null,
        responsibleOfficers: body.responsibleOfficers
          ? JSON.stringify(body.responsibleOfficers)
          : null,
        responsibleSailors: body.responsibleSailors
          ? JSON.stringify(body.responsibleSailors)
          : null,
        defaultResponsiblePerson: body.defaultResponsiblePerson || null,
        financialDelegationLevel: body.financialDelegationLevel || null,
        isTenderStage: !!body.isTenderStage,
        isEvaluationStage: !!body.isEvaluationStage,
        prefixedNumber: body.prefixedNumber || null,
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
  { params }: { params: Promise<{ id: string; sid: string }> }
) {
  try {
    const { sid } = await params;
    await db.processStep.delete({ where: { id: sid } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

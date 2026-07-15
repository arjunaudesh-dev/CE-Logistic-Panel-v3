import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const step = await db.processStep.create({
      data: {
        flowId: id,
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
    // If afterStepId is set, update the before-step's afterStepId to point to this new step
    if (body.beforeStepId) {
      await db.processStep.update({
        where: { id: body.beforeStepId },
        data: { afterStepId: step.id },
      }).catch(() => {});
    }
    return NextResponse.json(step, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

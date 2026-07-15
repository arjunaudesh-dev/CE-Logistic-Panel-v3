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
        stepOrder: Number(body.stepOrder) || 1,
        positionName: body.positionName,
        description: body.description || null,
        department: body.department || null,
        responsibleOfficers: body.responsibleOfficers
          ? JSON.stringify(body.responsibleOfficers)
          : null,
        responsibleSailors: body.responsibleSailors
          ? JSON.stringify(body.responsibleSailors)
          : null,
        financialDelegationId: body.financialDelegationId || null,
        defaultResponsiblePerson: body.defaultResponsiblePerson || null,
        financialDelegationLevel: body.financialDelegationLevel || null,
        isTenderStage: !!body.isTenderStage,
        isEvaluationStage: !!body.isEvaluationStage,
        prefixedNumber: body.prefixedNumber || null,
      },
    });
    return NextResponse.json(step, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

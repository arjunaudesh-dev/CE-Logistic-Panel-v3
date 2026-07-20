import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { resolveProcessFlowAndProgress } from "@/lib/process-logic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const includeArchived = searchParams.get("includeArchived") === "true";
    const archivedOnly = searchParams.get("archivedOnly") === "true";

    const where: Record<string, unknown> = { projectId: id };
    if (archivedOnly) {
      where.isArchived = true;
    } else if (!includeArchived) {
      where.isArchived = false;
    }

    const files = await db.projectFile.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        logs: { orderBy: { changedAt: "desc" } },
        approvals: { orderBy: { createdAt: "desc" } },
      },
    });
    return NextResponse.json(files);
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
    const qty = Number(body.qty) || 0;
    const unitPrice = Number(body.unitPrice) || 0;
    const fileCost = Number(body.fileCost) || qty * unitPrice;
    const position = body.presentPosition || "PR Raised";

    const { processFlowId, currentProgress } = await resolveProcessFlowAndProgress(
      body.fileCategory || "General",
      fileCost,
      position,
      body.processFlowId || null
    );

    const progressPercentage = body.progressPercentage != null ? Number(body.progressPercentage) : currentProgress;

    const file = await db.projectFile.create({
      data: {
        projectId: id,
        prNumber: body.prNumber,
        itemCode: body.itemCode,
        itemName: body.itemName,
        unit: body.unit || "NOS",
        qty,
        unitPrice,
        fileCost,
        supplier: body.supplier || null,
        presentPosition: position,
        progressPercentage,
        processFlowId,
        fileCategory: body.fileCategory || "General",
        fileNumber: body.fileNumber || null,
        createdBy: body.createdBy || "Officer",
        authorizedBy: body.authorizedBy || null,
        responsiblePerson: body.responsiblePerson || null,
        logs: {
          create: {
            newPosition: position,
            changedBy: body.createdBy || "Officer",
            comment: "File created",
          },
        },
      },
      include: { logs: true },
    });
    return NextResponse.json(file, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

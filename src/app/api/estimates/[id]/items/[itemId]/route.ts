import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// Initiate a file (PR) from an estimate item.
// Creates a ProjectFile + ProcurementFile mirror and marks the estimate item as Initiated.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const { id, itemId } = await params;
    const body = await req.json();
    // body: { prNumber, fileNumber, createdBy }
    const item = await db.estimateItem.findUnique({
      where: { id: itemId },
      include: { estimate: { include: { project: true } } },
    });
    if (!item || item.estimateId !== id)
      return NextResponse.json({ error: "Item not found" }, { status: 404 });

    const project = item.estimate.project;
    const prNumber = body.prNumber || `PR-${new Date().getFullYear()}-${Math.floor(Math.random() * 9000 + 1000)}`;
    const fileNumber = body.fileNumber || `FILE/${new Date().toISOString().slice(0, 10)}`;
    // fileGroupKey defaults to prNumber so multiple items initiated under the same PR get grouped
    const fileGroupKey =
      typeof body.fileGroupKey === "string" && body.fileGroupKey.trim()
        ? body.fileGroupKey.trim()
        : prNumber;
    const unitPrice = item.isRC ? item.rcRate : item.approxCost;
    const fileCost = item.qty * unitPrice;
    const position = "PR Raised";

    // Create ProjectFile
    const file = await db.projectFile.create({
      data: {
        projectId: project.id,
        prNumber,
        itemCode: item.itemCode || "TBC",
        itemName: item.itemName,
        unit: item.unit,
        qty: item.qty,
        unitPrice,
        fileCost,
        supplier: item.rcSupplier,
        presentPosition: position,
        fileCategory: "General",
        fileNumber: fileNumber,
        fileGroupKey,
        createdBy: body.createdBy || "Officer",
        authorizedBy: body.authorizedBy || null,
        responsiblePerson: body.responsiblePerson || null,
        logs: {
          create: {
            newPosition: position,
            changedBy: body.createdBy || "Officer",
            comment: `File initiated from estimate (RC: ${item.isRC ? "Yes" : "No"})${body.authorizedBy ? ` · Authorized by ${body.authorizedBy}` : ""}`,
          },
        },
      },
    });

    // Mirror into procurement files
    await db.procurementFile.create({
      data: {
        projectName: project.name,
        voteNumber: project.voteNumber,
        prNumber,
        itemCode: item.itemCode || "TBC",
        itemName: item.itemName,
        unit: item.unit,
        qty: item.qty,
        unitPrice,
        fileCost,
        supplier: item.rcSupplier,
        presentPosition: position,
        fileCategory: "General",
        createdBy: body.createdBy || "Officer",
        authorizedBy: body.authorizedBy || null,
        logs: {
          create: {
            newPosition: position,
            changedBy: body.createdBy || "Officer",
            comment: "Initiated from estimate",
          },
        },
      },
    });

    // Mark estimate item as initiated
    await db.estimateItem.update({
      where: { id: itemId },
      data: {
        status: "Initiated",
        prNumber,
        fileNumber,
        fileId: file.id,
      },
    });

    return NextResponse.json({ ok: true, fileId: file.id, prNumber }, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed: " + (e as Error).message }, { status: 500 });
  }
}

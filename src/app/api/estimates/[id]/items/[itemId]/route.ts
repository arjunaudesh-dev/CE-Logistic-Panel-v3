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

    // File Group Key: prefix = project name abbreviation; auto-number sequence within project
    // If body.fileGroupKey is provided (adding to existing file), use it.
    // Otherwise generate: {ABBREV}-{SEQ}
    let fileGroupKey: string;
    let fileGroupSeq = 0;
    if (typeof body.fileGroupKey === "string" && body.fileGroupKey.trim()) {
      fileGroupKey = body.fileGroupKey.trim();
      // find existing seq for this key
      const existing = await db.projectFile.findFirst({
        where: { projectId: project.id, fileGroupKey },
        orderBy: { fileGroupSeq: "desc" },
      });
      fileGroupSeq = (existing?.fileGroupSeq || 0) + 1;
    } else {
      // auto-generate using project abbreviation
      const abbrev = project.nameAbbreviation || "PRJ";
      // count existing files in project to get next sequence
      const count = await db.projectFile.count({
        where: { projectId: project.id, fileGroupKey: { startsWith: `${abbrev}-` } },
      });
      fileGroupSeq = count + 1;
      fileGroupKey = `${abbrev}-${String(fileGroupSeq).padStart(3, "0")}`;
    }

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
        fileGroupSeq,
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
        // auto-create approval entries if provided
        approvals: body.approvalEntries && Array.isArray(body.approvalEntries) && body.approvalEntries.length > 0
          ? {
              create: body.approvalEntries.map((ae: { category?: string; roleStatus?: string; personnel?: string; dateTime?: string }) => ({
                category: ae.category || "General Order Request",
                roleStatus: ae.roleStatus || "Approved By",
                personnel: ae.personnel || "",
                dateTime: ae.dateTime || new Date().toLocaleString("en-GB"),
              })),
            }
          : undefined,
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

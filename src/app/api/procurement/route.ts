import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const supplier = searchParams.get("supplier");
    const position = searchParams.get("position");
    const category = searchParams.get("category");
    const project = searchParams.get("project");
    const spCode = searchParams.get("spCode");
    const projectId = searchParams.get("projectId");

    const where: Record<string, unknown> = {};
    if (supplier && supplier !== "all") where.supplier = supplier;
    if (position && position !== "all") where.presentPosition = position;
    if (category && category !== "all") where.fileCategory = category;
    if (project && project !== "all") where.projectName = project;
    if (spCode && spCode !== "all") where.spCode = spCode;
    if (projectId && projectId !== "all") where.projectId = projectId;

    const files = await db.procurementFile.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: { logs: { orderBy: { changedAt: "desc" }, take: 20 } },
    });
    return NextResponse.json(files);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const qty = Number(body.qty) || 0;
    const unitPrice = Number(body.unitPrice) || 0;
    const fileCost = Number(body.fileCost) || qty * unitPrice;
    const position = body.presentPosition || "PR Raised";

    const file = await db.procurementFile.create({
      data: {
        projectId: body.projectId || null,
        projectName: body.projectName || null,
        voteNumber: body.voteNumber || null,
        prNumber: body.prNumber,
        itemCode: body.itemCode,
        itemName: body.itemName,
        unit: body.unit || "NOS",
        qty,
        unitPrice,
        fileCost,
        supplier: body.supplier || null,
        presentPosition: position,
        fileCategory: body.fileCategory || "General",
        fileGroupKey: body.fileGroupKey || null,
        fileNumber: body.fileNumber || null,
        createdBy: body.createdBy || "Officer",
        authorizedBy: body.authorizedBy || null,
        responsiblePerson: body.responsiblePerson || null,
        spCode: body.spCode || null,
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

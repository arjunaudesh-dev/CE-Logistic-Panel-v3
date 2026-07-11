import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const files = await db.projectFile.findMany({
      where: { projectId: id },
      orderBy: { createdAt: "desc" },
      include: { logs: { orderBy: { changedAt: "desc" } } },
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
        fileCategory: body.fileCategory || "General",
        createdBy: body.createdBy || "Officer",
        authorizedBy: body.authorizedBy || null,
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

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; fileId: string }> }
) {
  try {
    const { id, fileId } = await params;
    const body = await req.json();
    const existing = await db.projectFile.findUnique({ where: { id: fileId } });
    if (!existing)
      return NextResponse.json({ error: "Not found" }, { status: 404 });

    const qty = body.qty != null ? Number(body.qty) : existing.qty;
    const unitPrice =
      body.unitPrice != null ? Number(body.unitPrice) : existing.unitPrice;
    const fileCost = body.fileCost != null ? Number(body.fileCost) : qty * unitPrice;
    const newPosition = body.presentPosition || existing.presentPosition;
    const oldPosition = existing.presentPosition;

    const updated = await db.projectFile.update({
      where: { id: fileId },
      data: {
        prNumber: body.prNumber ?? existing.prNumber,
        itemCode: body.itemCode ?? existing.itemCode,
        itemName: body.itemName ?? existing.itemName,
        unit: body.unit ?? existing.unit,
        qty,
        unitPrice,
        fileCost,
        supplier: body.supplier ?? existing.supplier,
        presentPosition: newPosition,
        fileCategory: body.fileCategory ?? existing.fileCategory,
        fileNumber: body.fileNumber ?? existing.fileNumber,
        authorizedBy: body.authorizedBy ?? existing.authorizedBy,
        responsiblePerson: body.responsiblePerson ?? existing.responsiblePerson,
      },
    });

    // log if position changed
    if (newPosition !== oldPosition) {
      await db.fileLog.create({
        data: {
          fileId,
          oldPosition,
          newPosition,
          changedBy: body.changedBy || "Officer",
          comment: body.comment || `Position changed: ${oldPosition} → ${newPosition}`,
        },
      });
    }

    // sync procurement mirror if exists
    await db.procurementFile
      .updateMany({
        where: { prNumber: existing.prNumber, itemCode: existing.itemCode },
        data: { presentPosition: newPosition },
      })
      .catch(() => {});

    return NextResponse.json(updated);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; fileId: string }> }
) {
  try {
    const { fileId } = await params;
    await db.projectFile.delete({ where: { id: fileId } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

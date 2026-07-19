import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const existing = await db.procurementFile.findUnique({ where: { id } });
    if (!existing)
      return NextResponse.json({ error: "Not found" }, { status: 404 });

    const newPosition = body.presentPosition || existing.presentPosition;
    const oldPosition = existing.presentPosition;

    const updated = await db.procurementFile.update({
      where: { id },
      data: {
        prNumber: body.prNumber ?? existing.prNumber,
        itemCode: body.itemCode ?? existing.itemCode,
        itemName: body.itemName ?? existing.itemName,
        unit: body.unit ?? existing.unit,
        qty: body.qty != null ? Number(body.qty) : existing.qty,
        unitPrice:
          body.unitPrice != null ? Number(body.unitPrice) : existing.unitPrice,
        fileCost:
          body.fileCost != null
            ? Number(body.fileCost)
            : (body.qty != null ? Number(body.qty) : existing.qty) *
              (body.unitPrice != null ? Number(body.unitPrice) : existing.unitPrice),
        supplier: body.supplier ?? existing.supplier,
        presentPosition: newPosition,
        fileCategory: body.fileCategory ?? existing.fileCategory,
        authorizedBy: body.authorizedBy ?? existing.authorizedBy,
      },
    });

    if (newPosition !== oldPosition) {
      await db.procurementLog.create({
        data: {
          fileId: id,
          oldPosition,
          newPosition,
          changedBy: body.changedBy || "Officer",
          comment: body.comment || `Position changed: ${oldPosition} → ${newPosition}`,
        },
      });
    }
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
    await db.procurementFile.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

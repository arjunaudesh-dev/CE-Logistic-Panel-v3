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

    // Support restore-from-archive: when body.isArchived === false explicitly,
    // clear the archive fields and bring the file back into active view.
    // When body.isArchived === true, mark as archived (with optional reason).
    const archiveUpdate: Record<string, unknown> = {};
    if (body.isArchived === false) {
      archiveUpdate.isArchived = false;
      archiveUpdate.archivedReason = null;
      archiveUpdate.archivedAt = null;
    } else if (body.isArchived === true) {
      archiveUpdate.isArchived = true;
      archiveUpdate.archivedReason = body.archivedReason || existing.archivedReason || "NFA — Archived";
      archiveUpdate.archivedAt = existing.archivedAt || new Date();
    }

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
        purchaseOrderNumber: body.purchaseOrderNumber ?? existing.purchaseOrderNumber,
        authorizedBy: body.authorizedBy ?? existing.authorizedBy,
        responsiblePerson: body.responsiblePerson ?? existing.responsiblePerson,
        ...archiveUpdate,
      },
    });

    // Auto-sync: when position changes to "PO Placed", auto-set collection status
    if (newPosition === "PO Placed" && existing.collectionStatus === "Pending") {
      await db.projectFile.update({
        where: { id: fileId },
        data: {
          collectionStatus: "In Collection",
          collectionSyncedAt: new Date(),
          purchaseOrderNumber: body.purchaseOrderNumber || existing.purchaseOrderNumber,
        },
      });
    }

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
  req: NextRequest,
  { params }: { params: Promise<{ id: string; fileId: string }> }
) {
  try {
    const { fileId } = await params;
    // Archive (NFA) instead of hard delete — unless force=true query param
    const { searchParams } = new URL(req.url);
    const force = searchParams.get("force") === "true";
    if (force) {
      await db.projectFile.delete({ where: { id: fileId } });
    } else {
      const body = await req.json().catch(() => ({}));
      await db.projectFile.update({
        where: { id: fileId },
        data: {
          isArchived: true,
          archivedReason: body.reason || "NFA — Archived",
          archivedAt: new Date(),
        },
      });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

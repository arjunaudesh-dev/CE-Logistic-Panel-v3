import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// Bulk upload files into a project from parsed CSV rows
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const project = await db.project.findUnique({ where: { id } });
    if (!project)
      return NextResponse.json({ error: "Project not found" }, { status: 404 });

    const body = await req.json();
    // body: { files: [{prNumber, itemCode, itemName, unit, qty, unitPrice, fileCost, supplier, presentPosition, fileCategory, fileGroupKey, fileNumber}] }
    if (!Array.isArray(body.files)) {
      return NextResponse.json({ error: "files array required" }, { status: 400 });
    }

    const abbrev = project.nameAbbreviation || "PRJ";
    // Count existing files with a key starting with the abbreviation so any
    // auto-generated keys for rows without a provided fileGroupKey continue
    // the sequence (don't collide with previously-imported files).
    const existingCount = await db.projectFile.count({
      where: { projectId: id, fileGroupKey: { startsWith: `${abbrev}-` } },
    });

    // Walk the rows and resolve each row's fileGroupKey:
    //  - If the row provides a fileGroupKey, use it as-is (multiple rows may
    //    share the same key — they collapse into a single grouped file).
    //  - If not, auto-generate {ABBREV}-{SEQ} (incrementing per ungrouped row).
    let autoSeq = existingCount;
    const created: any[] = [];
    for (let i = 0; i < body.files.length; i++) {
      const f = body.files[i];
      const qty = Number(f.qty) || 0;
      const unitPrice = Number(f.unitPrice) || 0;
      const fileCost = Number(f.fileCost) || qty * unitPrice;
      const position = f.presentPosition || "PR Raised";
      const fileCategory = f.fileCategory || "General";

      let fileGroupKey: string;
      if (typeof f.fileGroupKey === "string" && f.fileGroupKey.trim()) {
        fileGroupKey = f.fileGroupKey.trim();
      } else {
        autoSeq += 1;
        fileGroupKey = `${abbrev}-${String(autoSeq).padStart(3, "0")}`;
      }
      const seq = autoSeq;

      const file = await db.projectFile.create({
        data: {
          projectId: id,
          prNumber: f.prNumber || `PR-${seq}`,
          itemCode: f.itemCode || "TBC",
          itemName: f.itemName || "",
          unit: f.unit || "NOS",
          qty,
          unitPrice,
          fileCost,
          supplier: f.supplier || null,
          presentPosition: position,
          fileCategory,
          fileNumber: f.fileNumber || null,
          fileGroupKey,
          fileGroupSeq: seq,
          createdBy: f.createdBy || "Bulk Upload",
          authorizedBy: f.authorizedBy || null,
          responsiblePerson: f.responsiblePerson || null,
          logs: {
            create: {
              newPosition: position,
              changedBy: "Bulk Upload",
              comment: "File created via bulk upload",
            },
          },
        },
      });
      created.push(file);

      // Mirror into procurement
      await db.procurementFile.create({
        data: {
          projectName: project.name,
          voteNumber: project.voteNumber,
          prNumber: file.prNumber,
          itemCode: file.itemCode,
          itemName: file.itemName,
          unit: file.unit,
          qty: file.qty,
          unitPrice: file.unitPrice,
          fileCost: file.fileCost,
          supplier: file.supplier,
          presentPosition: position,
          fileCategory,
          createdBy: "Bulk Upload",
          logs: { create: { newPosition: position, changedBy: "Bulk Upload", comment: "Bulk upload" } },
        },
      }).catch(() => {});
    }

    return NextResponse.json({ ok: true, count: created.length }, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Bulk upload failed: " + (e as Error).message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { matchBulkUploadVariations, BulkMatchInputRow } from "@/lib/ai";

// AI variation matching for the file-level bulk upload.
// Accepts the parsed CSV rows (File Group Key, PR Number, File Number,
// Item Name, Deno, Qty, Unit Cost, Present Position, Supplier) and returns
// AI-matched canonical values (item name + code, present position, supplier)
// with per-field confidence levels. The frontend uses the matched results
// to preview the import before POSTing to /files/bulk.
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
    // body: { rows: BulkMatchInputRow[] }
    if (!Array.isArray(body.rows) || body.rows.length === 0) {
      return NextResponse.json(
        { error: "rows array (parsed CSV) required" },
        { status: 400 }
      );
    }

    // Coerce + validate each row before sending to the AI matcher
    const rows: BulkMatchInputRow[] = body.rows.map(
      (r: {
        fileGroupKey?: string;
        prNumber?: string;
        fileNumber?: string;
        itemName?: string;
        deno?: string;
        qty?: number | string;
        unitCost?: number | string;
        presentPosition?: string;
        supplier?: string;
      }) => ({
        fileGroupKey: String(r.fileGroupKey || "").trim(),
        prNumber: String(r.prNumber || "").trim(),
        fileNumber: String(r.fileNumber || "").trim(),
        itemName: String(r.itemName || "").trim(),
        deno: String(r.deno || "NOS").trim(),
        qty: Number(r.qty) || 0,
        unitCost: Number(r.unitCost) || 0,
        presentPosition: String(r.presentPosition || "").trim(),
        supplier: String(r.supplier || "").trim(),
      })
    );

    const matched = await matchBulkUploadVariations(rows);
    return NextResponse.json({ ok: true, matched });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Bulk match failed: " + (e as Error).message },
      { status: 500 }
    );
  }
}

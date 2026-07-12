import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// Merge multiple ItemMaster records into one canonical code.
// Body: { canonicalId: string, mergeIds: string[] }
// - The canonical record keeps its code; merged records get status=Merged,
//   mergedInto=canonicalCode, and their alternate codes/names appended to canonical.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const canonicalId = body.canonicalId || id;
    const mergeIds: string[] = body.mergeIds || [];
    if (mergeIds.length === 0) {
      return NextResponse.json({ error: "No items selected to merge" }, { status: 400 });
    }

    const canonical = await db.itemMaster.findUnique({ where: { id: canonicalId } });
    if (!canonical)
      return NextResponse.json({ error: "Canonical item not found" }, { status: 404 });

    const toMerge = await db.itemMaster.findMany({ where: { id: { in: mergeIds } } });

    // gather all alternate codes & names
    const allCodes = new Set<string>();
    const allNames = new Set<string>();
    if (canonical.alternateCodes) canonical.alternateCodes.split(",").forEach((c) => c.trim() && allCodes.add(c.trim()));
    if (canonical.alternateNames) canonical.alternateNames.split(",").forEach((n) => n.trim() && allNames.add(n.trim()));
    for (const m of toMerge) {
      if (m.id === canonical.id) continue;
      allCodes.add(m.canonicalCode);
      if (m.alternateCodes) m.alternateCodes.split(",").forEach((c) => c.trim() && allCodes.add(c.trim()));
      allNames.add(m.description);
      if (m.alternateNames) m.alternateNames.split(",").forEach((n) => n.trim() && allNames.add(n.trim()));
    }

    const alternateCodes = Array.from(allCodes).join(", ") || null;
    const alternateNames = Array.from(allNames).join(", ") || null;

    // update canonical
    await db.itemMaster.update({
      where: { id: canonicalId },
      data: { alternateCodes, alternateNames },
    });

    // mark merged records
    await db.itemMaster.updateMany({
      where: { id: { in: mergeIds.filter((mid) => mid !== canonicalId) } },
      data: { status: "Merged", mergedInto: canonical.canonicalCode },
    });

    // also update StoreItems that used the merged codes → repoint to canonical code
    for (const m of toMerge) {
      if (m.id === canonical.id) continue;
      await db.storeItem.updateMany({
        where: { itemCode: m.canonicalCode },
        data: { itemCode: canonical.canonicalCode },
      });
    }

    return NextResponse.json({
      ok: true,
      canonicalCode: canonical.canonicalCode,
      mergedCount: toMerge.filter((m) => m.id !== canonical.id).length,
      alternateCodes,
      alternateNames,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Merge failed: " + (e as Error).message }, { status: 500 });
  }
}

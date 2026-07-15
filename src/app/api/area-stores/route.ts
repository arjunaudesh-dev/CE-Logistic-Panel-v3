import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const storeName = searchParams.get("storeName");
    const recordType = searchParams.get("recordType");
    const navReference = searchParams.get("navReference");
    const search = searchParams.get("search");

    const where: Record<string, unknown> = {};
    if (storeName && storeName !== "all") where.storeName = storeName;
    if (recordType && recordType !== "all") where.recordType = recordType;
    if (navReference && navReference !== "all") where.navReference = navReference;
    if (search) where.itemName = { contains: search };

    const records = await db.areaStoreRecord.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(records);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

// Destination stores for Stage 2 (FinalOffCharge — to CCED Stores / Zone / Project / RU).
// These mirror the StoreZone names managed in /api/stores/zones.
const DESTINATION_STORES = new Set([
  "Zone A",
  "Zone B",
  "Zone C",
  "Zone D",
  "Project Stores",
  "Ready-Use Stores",
  "Balance Stores",
]);

// When a Stage 2 (FinalOffCharge) off-charge record is created, the qty is
// also added to the destination store's matching StoreItem (increment existing
// or create new). This keeps the Zone/Project/Ready-Use/Balance store inventory
// in sync with the area-store off-charge flow.
async function applyStage2DestinationUpdate(opts: {
  destinationStore: string;
  itemName: string;
  itemCode?: string | null;
  category?: string | null;
  unit?: string | null;
  qty: number;
  unitCost: number;
  fileNumber?: string | null;
  remarks?: string | null;
  date?: string | null;
}) {
  const zoneName = opts.destinationStore;
  if (!DESTINATION_STORES.has(zoneName)) return;
  const qty = Number(opts.qty) || 0;
  const unitCost = Number(opts.unitCost) || 0;
  if (!opts.itemName) return;

  // Try to find an existing item with the same itemCode (preferred) or
  // description + zoneName.
  let existing = null;
  if (opts.itemCode) {
    existing = await db.storeItem.findFirst({
      where: { zoneName, itemCode: opts.itemCode },
    });
  }
  if (!existing) {
    existing = await db.storeItem.findFirst({
      where: { zoneName, description: opts.itemName },
    });
  }

  if (existing) {
    const newQty = (existing.qty ?? 0) + qty;
    const newTotal = newQty * (existing.unitCost || unitCost);
    await db.storeItem.update({
      where: { id: existing.id },
      data: {
        qty: newQty,
        totalCost: newTotal,
        lastMovement: opts.date || new Date().toISOString().slice(0, 10),
      },
    });
  } else {
    await db.storeItem.create({
      data: {
        zoneName,
        description: opts.itemName,
        category: opts.category || "General",
        unit: opts.unit || "NOS",
        qty,
        unitCost,
        totalCost: qty * unitCost,
        location: zoneName,
        minStock: 0,
        maxStock: 0,
        supplier: null,
        itemCode: opts.itemCode || null,
        ilmsCode: null,
        lastMovement: opts.date || new Date().toISOString().slice(0, 10),
      },
    });
  }

  // Update the zone aggregate (best-effort — zone may not exist for RU/Balance)
  try {
    const items = await db.storeItem.findMany({ where: { zoneName } });
    const zone = await db.storeZone.findFirst({ where: { name: zoneName } });
    if (zone) {
      await db.storeZone.update({
        where: { id: zone.id },
        data: {
          totalValue: items.reduce((s, i) => s + i.totalCost, 0),
          itemCount: items.length,
          lowStockCount: items.filter(
            (i) => i.minStock > 0 && i.qty <= i.minStock
          ).length,
        },
      });
    }
  } catch {
    // zone sync is best-effort
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (Array.isArray(body)) {
      const created = await db.areaStoreRecord.createMany({
        data: body.map((b) => ({
          storeName: b.storeName,
          itemCode: b.itemCode || null,
          itemName: b.itemName,
          category: b.category || "General",
          unit: b.unit || "NOS",
          qty: Number(b.qty) || 0,
          unitCost: Number(b.unitCost) || 0,
          totalCost: (Number(b.qty) || 0) * (Number(b.unitCost) || 0),
          recordType: b.recordType,
          navReference: b.navReference || null,
          qcInspectionId: b.qcInspectionId || null,
          fileNumber: b.fileNumber || null,
          location: b.location || null,
          destinationStore: b.destinationStore || null,
          offChargeStage: b.offChargeStage || null,
          date: b.date || new Date().toISOString().slice(0, 10),
          remarks: b.remarks || null,
        })),
      });
      return NextResponse.json(created, { status: 201 });
    }
    const qty = Number(body.qty) || 0;
    const unitCost = Number(body.unitCost) || 0;
    const record = await db.areaStoreRecord.create({
      data: {
        storeName: body.storeName,
        itemCode: body.itemCode || null,
        itemName: body.itemName,
        category: body.category || "General",
        unit: body.unit || "NOS",
        qty,
        unitCost,
        totalCost: qty * unitCost,
        recordType: body.recordType,
        navReference: body.navReference || null,
        qcInspectionId: body.qcInspectionId || null,
        fileNumber: body.fileNumber || null,
        location: body.location || null,
        destinationStore: body.destinationStore || null,
        offChargeStage: body.offChargeStage || null,
        date: body.date || new Date().toISOString().slice(0, 10),
        remarks: body.remarks || null,
      },
    });

    // Stage 2 (FinalOffCharge — to CCED Stores / Zone / Project / RU) — also
    // update the destination StoreItem qty so the receiving store's inventory
    // reflects the off-charge.
    if (
      body.recordType === "FinalOffCharge" &&
      body.destinationStore &&
      body.itemName
    ) {
      await applyStage2DestinationUpdate({
        destinationStore: body.destinationStore,
        itemName: body.itemName,
        itemCode: body.itemCode || null,
        category: body.category || "General",
        unit: body.unit || "NOS",
        qty,
        unitCost,
        fileNumber: body.fileNumber || null,
        remarks: body.remarks || null,
        date: body.date || null,
      });
    }

    return NextResponse.json(record, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

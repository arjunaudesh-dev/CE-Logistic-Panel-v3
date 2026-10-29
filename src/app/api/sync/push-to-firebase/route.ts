import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

const FIREBASE_PRIMARY_URL = process.env.FIREBASE_DATABASE_URL || "https://cmsys-v2-1fb05-default-rtdb.asia-southeast1.firebasedatabase.app";

export async function POST(req: NextRequest) {
  try {
    const vouchers = await db.areaStoreRecord.findMany({ take: 50 });
    const storeItems = await db.storeItem.findMany({ take: 100 });

    let synced = 0;
    for (const v of vouchers) {
      const vKey = v.id ? `NAV254_${v.id}` : `VOUCHER_${Date.now()}`;
      try {
        const res = await fetch(`${FIREBASE_PRIMARY_URL}/nav254_vouchers/${vKey}.json`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            voucher_no: v.voucherNo || `NAV254/2026/${v.id}`,
            source: v.source || 'Logistics Store Engine',
            issuing_unit: v.issuingUnit,
            receiving_unit: v.receivingUnit,
            date: v.date || new Date().toISOString().split('T')[0],
            synced_at: new Date().toISOString()
          })
        });
        if (res.ok) synced++;
      } catch (e) {
        // Continue loop
      }
    }

    return NextResponse.json({
      success: true,
      syncedVouchers: synced,
      totalItems: storeItems.length,
      target: FIREBASE_PRIMARY_URL,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    status: "ready",
    bridge: "CMSys Logistics (Port 8000) -> Firebase RTDB (cmsys-v2-1fb05)",
    version: "2.4.0",
    lastHeartbeat: new Date().toISOString()
  });
}

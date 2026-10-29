import { NextRequest, NextResponse } from "next/server";
import {
  getMysqlHealth,
  importSailorsFromMysql,
  importWorkOrdersFromMysql,
  syncInventoryFromMysql,
} from "@/lib/mysql-bridge";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const health = await getMysqlHealth();
    return NextResponse.json({
      success: true,
      health,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const target = body.target || "all"; // "all" | "sailors" | "work_orders" | "inventory"

    const results: Record<string, any> = {};

    if (target === "all" || target === "sailors") {
      results.sailors = await importSailorsFromMysql();
    }

    if (target === "all" || target === "work_orders") {
      results.workOrders = await importWorkOrdersFromMysql();
    }

    if (target === "all" || target === "inventory") {
      results.inventory = await syncInventoryFromMysql();
    }

    const health = await getMysqlHealth();

    return NextResponse.json({
      success: true,
      message: "CMSys V2 MySQL Synchronization completed successfully.",
      results,
      health,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error("[CMSys MySQL Sync Error]", err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { getMysqlHealth } from "@/lib/mysql-bridge";
import { getPrimaryFirebaseUrl, getOpsFirebaseUrl } from "@/lib/firebase-realtime";
import { rawDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const start = Date.now();

  // 1. Local SQLite metrics
  let sqliteStatus: any = { connected: false };
  try {
    const [projectCount, fileCount, storeCount, rateCount, stakeholderCount] =
      await Promise.all([
        rawDb.project.count(),
        rawDb.projectFile.count(),
        rawDb.storeItem.count(),
        rawDb.rateContract.count(),
        rawDb.stakeholder.count(),
      ]);

    sqliteStatus = {
      connected: true,
      records: {
        projects: projectCount,
        files: fileCount,
        storeItems: storeCount,
        rateContracts: rateCount,
        stakeholders: stakeholderCount,
      },
    };
  } catch (err: any) {
    sqliteStatus = { connected: false, error: err.message };
  }

  // 2. MySQL ncw_ps_db status
  const mysqlStatus = await getMysqlHealth();

  // 3. Firebase RTDB cmsys-v2-1fb05 status
  let firebaseStatus: any = { connected: false };
  const fbUrl = getPrimaryFirebaseUrl();
  try {
    const fbStart = Date.now();
    const res = await fetch(`${fbUrl.replace(/\/$/, "")}/.json?shallow=true`, {
      signal: AbortSignal.timeout(3000),
      cache: "no-store",
    });
    firebaseStatus = {
      connected: res.ok,
      latencyMs: Date.now() - fbStart,
      url: fbUrl,
      project: "cmsys-v2-1fb05",
      httpStatus: res.status,
    };
  } catch (err: any) {
    firebaseStatus = {
      connected: false,
      url: fbUrl,
      project: "cmsys-v2-1fb05",
      error: err.message,
    };
  }

  // Overall readiness
  const isFullyIntegrated = sqliteStatus.connected && mysqlStatus.connected;

  return NextResponse.json({
    success: true,
    isFullyIntegrated,
    summary: {
      mode: isFullyIntegrated ? "Combined CMSys Ecosystem" : "Degraded / Local-Only",
      totalLatencyMs: Date.now() - start,
    },
    services: {
      sqliteLocal: sqliteStatus,
      mysqlNcwPsDb: mysqlStatus,
      firebasePrimary: firebaseStatus,
      firebaseOps: {
        url: getOpsFirebaseUrl(),
        project: "ncw-ps-operations",
      },
    },
    timestamp: new Date().toISOString(),
  });
}

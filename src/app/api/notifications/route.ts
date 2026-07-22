import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";

// In-memory read tracking for notifications during session
const readNotificationIds = new Set<string>();

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get("ce_session")?.value || null;
    const session = getSession(token);

    // Fetch recent file logs (last 10 updates)
    const recentLogs = await db.fileLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      include: {
        file: {
          select: {
            prNumber: true,
            itemName: true,
            presentPosition: true,
          },
        },
      },
    });

    // Fetch recent QC inspections (last 5)
    const recentQC = await db.qCInspection.findMany({
      orderBy: { inspectedAt: "desc" },
      take: 5,
    });

    // Fetch recent split order entries (last 5)
    const recentSplitEntries = await db.splitOrderEntry.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      include: {
        sub: {
          include: {
            header: true,
          },
        },
      },
    });

    const notifications: Array<{
      id: string;
      title: string;
      message: string;
      time: string;
      type: "procurement" | "qc" | "split" | "system";
      read: boolean;
      link?: string;
    }> = [];

    // System Welcome / User notification
    notifications.push({
      id: "sys-welcome",
      title: `Welcome back, ${session ? session.displayName : "User"}`,
      message: `Role: ${session ? session.role : "Officer"} · Active session verified.`,
      time: "Just now",
      type: "system",
      read: readNotificationIds.has("sys-welcome"),
    });

    // Map QC Inspection alerts
    recentQC.forEach((qc) => {
      const id = `qc-${qc.id}`;
      notifications.push({
        id,
        title: `QC Inspection: ${qc.itemName}`,
        message: `Status rated '${qc.qcLevel}' by ${qc.qcOfficer || "Officer"}${
          qc.remarks ? ` — ${qc.remarks}` : ""
        }`,
        time: qc.inspectedAt
          ? new Date(qc.inspectedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
          : "Recently",
        type: "qc",
        read: readNotificationIds.has(id),
      });
    });

    // Map Procurement file log notifications
    recentLogs.forEach((log) => {
      const id = `log-${log.id}`;
      notifications.push({
        id,
        title: `Procurement Update: ${log.file.prNumber}`,
        message: `${log.file.itemName} moved from '${log.oldPosition || "Raised"}' → '${log.newPosition}'`,
        time: new Date(log.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        type: "procurement",
        read: readNotificationIds.has(id),
      });
    });

    // Map Split Order entry notifications
    recentSplitEntries.forEach((e) => {
      const id = `split-${e.id}`;
      notifications.push({
        id,
        title: `Delivery Entry: ${e.sub.header.fileNumber}`,
        message: `Received ${e.receivedQty} units under PO ${e.sub.poNumber}${
          e.vehicleNumber ? ` (Vehicle: ${e.vehicleNumber})` : ""
        }`,
        time: new Date(e.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        type: "split",
        read: readNotificationIds.has(id),
      });
    });

    const unreadCount = notifications.filter((n) => !n.read).length;

    return NextResponse.json({
      notifications,
      unreadCount,
    });
  } catch (e) {
    console.error("Notifications GET error:", e);
    return NextResponse.json({ notifications: [], unreadCount: 0 }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (body.action === "mark-read" && body.id) {
      readNotificationIds.add(body.id);
    } else if (body.action === "mark-all-read" && Array.isArray(body.ids)) {
      body.ids.forEach((id: string) => readNotificationIds.add(id));
    } else if (body.action === "clear") {
      readNotificationIds.clear();
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Notifications POST error:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

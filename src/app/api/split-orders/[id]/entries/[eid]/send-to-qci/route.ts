import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// Send a split order entry to QCI
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; eid: string }> }
) {
  try {
    const { eid } = await params;
    const updated = await db.splitOrderEntry.update({
      where: { id: eid },
      data: {
        sentToQCI: true,
        sentToQCIAt: new Date(),
        status: "In QCI",
      },
    });
    return NextResponse.json(updated);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

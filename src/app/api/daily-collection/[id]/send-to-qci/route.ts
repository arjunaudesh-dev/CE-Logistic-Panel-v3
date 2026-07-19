import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// Send a daily collection record to QCI
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const updated = await db.dailyCollection.update({
      where: { id },
      data: {
        sentToQCI: true,
        sentToQCIAt: new Date(),
      },
    });
    return NextResponse.json(updated);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

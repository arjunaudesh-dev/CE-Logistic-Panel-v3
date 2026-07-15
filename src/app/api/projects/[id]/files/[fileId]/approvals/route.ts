import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; fileId: string }> }
) {
  try {
    const { fileId } = await params;
    const approvals = await db.fileApprovalEntry.findMany({
      where: { fileId },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(approvals);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; fileId: string }> }
) {
  try {
    const { fileId } = await params;
    const body = await req.json();
    // support bulk (array) or single
    if (Array.isArray(body)) {
      const created = await db.fileApprovalEntry.createMany({
        data: body.map((b) => ({
          fileId,
          category: b.category || "General Order Request",
          roleStatus: b.roleStatus || "Approved By",
          personnel: b.personnel || "",
          dateTime: b.dateTime || new Date().toLocaleString("en-GB"),
        })),
      });
      return NextResponse.json(created, { status: 201 });
    }
    const entry = await db.fileApprovalEntry.create({
      data: {
        fileId,
        category: body.category || "General Order Request",
        roleStatus: body.roleStatus || "Approved By",
        personnel: body.personnel || "",
        dateTime: body.dateTime || new Date().toLocaleString("en-GB"),
      },
    });
    return NextResponse.json(entry, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

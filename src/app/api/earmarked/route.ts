import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");
    const where: Record<string, unknown> = {};
    if (projectId) where.projectId = projectId;
    const items = await db.earmarkedItem.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(items);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    // body: { storeItemId?, itemDescription, itemCode?, projectId, projectName, qty, unit, authority, remarks }
    const item = await db.earmarkedItem.create({
      data: {
        storeItemId: body.storeItemId || null,
        itemDescription: body.itemDescription,
        itemCode: body.itemCode || null,
        projectId: body.projectId,
        projectName: body.projectName,
        qty: Number(body.qty) || 0,
        unit: body.unit || "NOS",
        authority: body.authority || null,
        remarks: body.remarks || null,
      },
    });
    return NextResponse.json(item, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const flows = await db.processFlow.findMany({
      orderBy: { createdAt: "asc" },
      include: { steps: { orderBy: { stepOrder: "asc" } } },
    });
    return NextResponse.json(flows);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const flow = await db.processFlow.create({
      data: {
        name: body.name,
        description: body.description || null,
      },
    });
    return NextResponse.json(flow, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const flow = await db.processFlow.findUnique({
      where: { id },
      include: { steps: { orderBy: { stepOrder: "asc" } } },
    });
    if (!flow) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(flow);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const baseData = {
      name: body.name,
      description: body.description || null,
    };
    // Defensive: try with financialDelegationId (new schema); fall back without
    // it if the running Prisma client doesn't yet know about the field.
    try {
      const updated = await db.processFlow.update({
        where: { id },
        data: {
          ...baseData,
          financialDelegationId: body.financialDelegationId || null,
        },
      });
      return NextResponse.json(updated);
    } catch (innerErr) {
      if (
        innerErr instanceof Error &&
        innerErr.message.includes("financialDelegationId")
      ) {
        const updated = await db.processFlow.update({
          where: { id },
          data: baseData,
        });
        return NextResponse.json(updated);
      }
      throw innerErr;
    }
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await db.processFlow.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

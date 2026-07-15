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
    // Defensive: try with financialDelegationId (new schema); fall back without
    // it if the running Prisma client doesn't yet know about the field.
    const baseData = {
      name: body.name,
      description: body.description || null,
    };
    try {
      const flow = await db.processFlow.create({
        data: {
          ...baseData,
          financialDelegationId: body.financialDelegationId || null,
        },
      });
      return NextResponse.json(flow, { status: 201 });
    } catch (innerErr) {
      if (
        innerErr instanceof Error &&
        innerErr.message.includes("financialDelegationId")
      ) {
        const flow = await db.processFlow.create({ data: baseData });
        return NextResponse.json(flow, { status: 201 });
      }
      throw innerErr;
    }
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const allocations = await db.allocation.findMany({
      where: { projectId: id },
      orderBy: { date: "desc" },
    });
    return NextResponse.json(allocations);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const amount = Number(body.amount) || 0;
    const allocation = await db.allocation.create({
      data: {
        projectId: id,
        date: body.date || new Date().toISOString().slice(0, 10),
        description: body.description,
        amount,
        type: body.type || "Commitment",
        authorizedBy: body.authorizedBy || null,
      },
    });

    // update project committed/actual
    if (body.type === "Commitment") {
      await db.project.update({
        where: { id },
        data: { committed: { increment: amount } },
      });
    } else if (body.type === "Actual") {
      await db.project.update({
        where: { id },
        data: { actualSpent: { increment: amount } },
      });
    } else if (body.type === "Release") {
      await db.project.update({
        where: { id },
        data: { committed: { decrement: amount } },
      });
    }

    return NextResponse.json(allocation, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

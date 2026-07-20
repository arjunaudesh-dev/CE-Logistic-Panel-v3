import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; allocId: string }> }
) {
  try {
    const { id, allocId } = await params;
    const body = await req.json();
    
    // Find the original to reverse its project impact
    const orig = await db.allocation.findUnique({ where: { id: allocId } });
    if (!orig || orig.projectId !== id) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Revert old project values
    if (orig.type === "Commitment") {
      await db.project.update({ where: { id }, data: { committed: { decrement: orig.amount } } });
    } else if (orig.type === "Actual") {
      await db.project.update({ where: { id }, data: { actualSpent: { decrement: orig.amount } } });
    } else if (orig.type === "Release") {
      await db.project.update({ where: { id }, data: { committed: { increment: orig.amount } } });
    }

    const amount = Number(body.amount) || 0;
    const type = body.type || orig.type;

    const allocation = await db.allocation.update({
      where: { id: allocId },
      data: {
        date: body.date,
        description: body.description,
        amount,
        type,
      },
    });

    // Apply new project values
    if (type === "Commitment") {
      await db.project.update({ where: { id }, data: { committed: { increment: amount } } });
    } else if (type === "Actual") {
      await db.project.update({ where: { id }, data: { actualSpent: { increment: amount } } });
    } else if (type === "Release") {
      await db.project.update({ where: { id }, data: { committed: { decrement: amount } } });
    }

    return NextResponse.json(allocation);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; allocId: string }> }
) {
  try {
    const { id, allocId } = await params;
    
    const orig = await db.allocation.findUnique({ where: { id: allocId } });
    if (!orig || orig.projectId !== id) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Revert old project values
    if (orig.type === "Commitment") {
      await db.project.update({ where: { id }, data: { committed: { decrement: orig.amount } } });
    } else if (orig.type === "Actual") {
      await db.project.update({ where: { id }, data: { actualSpent: { decrement: orig.amount } } });
    } else if (orig.type === "Release") {
      await db.project.update({ where: { id }, data: { committed: { increment: orig.amount } } });
    }

    await db.allocation.delete({ where: { id: allocId } });

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

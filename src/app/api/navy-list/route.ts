import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const records = await db.navyListImport.findMany({
      orderBy: [{ seniority: "asc" }, { name: "asc" }],
    });
    return NextResponse.json(records);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    // body can be an array (bulk import) or single object
    if (Array.isArray(body)) {
      await db.navyListImport.deleteMany();
      const created = await db.navyListImport.createMany({
        data: body.map((b) => ({
          name: b.name,
          rank: b.rank || null,
          svcNumber: b.svcNumber || null,
          appointment: b.appointment || null,
          seniority: Number(b.seniority) || 999,
          department: b.department || null,
          category: b.category || null,
        })),
      });
      // also update stakeholders seniority where name matches
      for (const r of body) {
        if (r.name && r.seniority != null) {
          await db.stakeholder
            .updateMany({
              where: { name: r.name },
              data: { seniority: Number(r.seniority) },
            })
            .catch(() => {});
        }
      }
      return NextResponse.json(created, { status: 201 });
    }
    const record = await db.navyListImport.create({
      data: {
        name: body.name,
        rank: body.rank || null,
        svcNumber: body.svcNumber || null,
        appointment: body.appointment || null,
        seniority: Number(body.seniority) || 999,
        department: body.department || null,
        category: body.category || null,
      },
    });
    return NextResponse.json(record, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    await db.navyListImport.deleteMany();
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

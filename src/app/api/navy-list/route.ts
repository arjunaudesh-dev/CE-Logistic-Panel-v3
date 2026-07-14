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
      // also update stakeholders (seniority / category / department) where name matches
      for (const r of body) {
        if (!r.name) continue;
        const data: Record<string, unknown> = {};
        if (r.seniority != null && !isNaN(Number(r.seniority))) {
          data.seniority = Number(r.seniority);
        }
        if (r.category) {
          data.category = r.category;
        }
        if (r.department) {
          data.department = r.department;
        }
        // For sailors, infer the area-store location from the appointment
        // (best-effort hint — falls back to "General" when nothing matches).
        if (
          r.category &&
          (r.category === "CCED Sailor" || r.category === "CSLOG Sailor") &&
          r.appointment
        ) {
          const appt = String(r.appointment).toLowerCase();
          if (appt.includes("bms") || appt.includes("plumb")) {
            data.areaStoreLocation = "BMS";
          } else if (appt.includes("metal") || appt.includes("alum")) {
            data.areaStoreLocation = "Metal";
          } else if (appt.includes("paint")) {
            data.areaStoreLocation = "Paint";
          } else if (appt.includes("oil") || appt.includes("lub")) {
            data.areaStoreLocation = "Oil & Lubricant";
          } else if (appt.includes("station")) {
            data.areaStoreLocation = "Stationary";
          } else {
            data.areaStoreLocation = "General";
          }
        }
        if (Object.keys(data).length === 0) continue;
        await db.stakeholder
          .updateMany({
            where: { name: r.name },
            data,
          })
          .catch(() => {});
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
    // single-object path: also update stakeholder if name matches
    if (body.name) {
      const data: Record<string, unknown> = {};
      if (body.seniority != null && !isNaN(Number(body.seniority))) {
        data.seniority = Number(body.seniority);
      }
      if (body.category) data.category = body.category;
      if (body.department) data.department = body.department;
      if (Object.keys(data).length > 0) {
        await db.stakeholder
          .updateMany({ where: { name: body.name }, data })
          .catch(() => {});
      }
    }
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

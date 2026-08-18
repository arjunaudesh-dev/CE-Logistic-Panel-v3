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
      // also upsert stakeholders (seniority / category / department / appointment) so they appear in Stakeholders Directory
      for (const r of body) {
        if (!r.name) continue;
        let areaStoreLoc: string | null = null;
        if (
          r.category &&
          (r.category === "CCED Sailor" || r.category === "CSLOG Sailor") &&
          r.appointment
        ) {
          const appt = String(r.appointment).toLowerCase();
          if (appt.includes("bms") || appt.includes("plumb")) areaStoreLoc = "BMS";
          else if (appt.includes("metal") || appt.includes("alum")) areaStoreLoc = "Metal";
          else if (appt.includes("paint")) areaStoreLoc = "Paint";
          else if (appt.includes("oil") || appt.includes("lub")) areaStoreLoc = "Oil & Lubricant";
          else if (appt.includes("station")) areaStoreLoc = "Stationary";
          else areaStoreLoc = "General";
        }

        const existing = await db.stakeholder.findFirst({
          where: {
            OR: [
              { name: { equals: r.name } },
              ...(r.svcNumber ? [{ svcNumber: { equals: r.svcNumber } }] : [])
            ]
          }
        });

        if (existing) {
          await db.stakeholder.update({
            where: { id: existing.id },
            data: {
              rankOrRate: r.rank || existing.rankOrRate,
              svcNumber: r.svcNumber || existing.svcNumber,
              appointment: r.appointment || existing.appointment,
              department: r.department || existing.department,
              category: r.category || existing.category,
              seniority: r.seniority != null ? Number(r.seniority) : existing.seniority,
              areaStoreLocation: areaStoreLoc || existing.areaStoreLocation,
            }
          }).catch(() => {});
        } else {
          await db.stakeholder.create({
            data: {
              name: r.name,
              rankOrRate: r.rank || null,
              svcNumber: r.svcNumber || null,
              appointment: r.appointment || null,
              department: r.department || "CSLOG",
              category: r.category || "Officer",
              seniority: r.seniority != null ? Number(r.seniority) : 999,
              areaStoreLocation: areaStoreLoc,
              availability: "Available",
              role: r.category && r.category.includes("Officer") ? "Officer" : "Sailor",
            }
          }).catch(() => {});
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

    if (body.name) {
      const existing = await db.stakeholder.findFirst({
        where: {
          OR: [
            { name: { equals: body.name } },
            ...(body.svcNumber ? [{ svcNumber: { equals: body.svcNumber } }] : [])
          ]
        }
      });

      if (existing) {
        await db.stakeholder.update({
          where: { id: existing.id },
          data: {
            rankOrRate: body.rank || existing.rankOrRate,
            svcNumber: body.svcNumber || existing.svcNumber,
            appointment: body.appointment || existing.appointment,
            department: body.department || existing.department,
            category: body.category || existing.category,
            seniority: body.seniority != null ? Number(body.seniority) : existing.seniority,
          }
        }).catch(() => {});
      } else {
        await db.stakeholder.create({
          data: {
            name: body.name,
            rankOrRate: body.rank || null,
            svcNumber: body.svcNumber || null,
            appointment: body.appointment || null,
            department: body.department || "CSLOG",
            category: body.category || "Officer",
            seniority: body.seniority != null ? Number(body.seniority) : 999,
            availability: "Available",
            role: body.category && body.category.includes("Officer") ? "Officer" : "Sailor",
          }
        }).catch(() => {});
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

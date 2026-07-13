import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const department = searchParams.get("department");
    const appointment = searchParams.get("appointment");
    const role = searchParams.get("role");
    const category = searchParams.get("category");
    const search = searchParams.get("search");

    const where: Record<string, unknown> = {};
    if (department && department !== "all") where.department = department;
    if (appointment && appointment !== "all") where.appointment = appointment;
    if (role && role !== "all") where.role = role;
    if (category && category !== "all") where.category = category;
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { svcNumber: { contains: search } },
        { appointment: { contains: search } },
      ];
    }

    const items = await db.stakeholder.findMany({
      where,
      orderBy: [{ department: "asc" }, { name: "asc" }],
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
    const item = await db.stakeholder.create({
      data: {
        name: body.name,
        rankOrRate: body.rankOrRate || null,
        svcNumber: body.svcNumber || null,
        appointment: body.appointment || null,
        department: body.department || "CSLOG",
        category: body.category || "Officer",
        seniority:
          body.seniority !== undefined && body.seniority !== null && body.seniority !== ""
            ? Number(body.seniority)
            : null,
        areaStoreLocation: body.areaStoreLocation || null,
        subjectClerk: body.subjectClerk || null,
        ilmsCced: body.ilmsCced || null,
        officeNumber: body.officeNumber || null,
        telephone: body.telephone || null,
        whatsapp: body.whatsapp || null,
        email: body.email || null,
        availability: body.availability || "Available",
        role: body.role || "Officer",
      },
    });
    return NextResponse.json(item, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

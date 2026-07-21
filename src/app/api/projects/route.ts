import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const projects = await db.project.findMany({
      orderBy: { createdAt: "desc" },
      include: { files: { select: { id: true, fileCost: true, presentPosition: true } } },
    });
    const result = projects.map((p) => {
      const files = p.files;
      const fileCount = files.length;
      const committedFiles = files.reduce((s, f) => s + (f.fileCost || 0), 0);
      return {
        ...p,
        fileCount,
        committedFiles,
        balance: p.voteAllocation - p.actualSpent,
        utilization: p.voteAllocation > 0 ? (p.actualSpent / p.voteAllocation) * 100 : 0,
      };
    });

    const response = NextResponse.json(result);
    response.headers.set("x-custom-ver", "v25-projects");
    return response;
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: e.message || "Failed" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const project = await db.project.create({
      data: {
        name: body.name,
        nameAbbreviation: body.nameAbbreviation || null,
        voteNumber: body.voteNumber,
        voteAllocation: Number(body.voteAllocation) || 0,
        committed: Number(body.committed) || 0,
        actualSpent: Number(body.actualSpent) || 0,
        startDate: body.startDate || null,
        endDate: body.endDate || null,
        department: body.department || null,
        benefactor: body.benefactor || null,
        reference: body.reference || null,
        projectType: body.projectType || "New Construction",
        financialMean: body.financialMean || null,
        projectOfficer: body.projectOfficer || null,
        status: body.status || "Active",
        description: body.description || null,
        showOnDashboard: body.showOnDashboard !== false,
      },
    });
    return NextResponse.json(project, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

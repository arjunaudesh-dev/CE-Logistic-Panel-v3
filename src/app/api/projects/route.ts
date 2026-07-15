import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const projects = await db.project.findMany({
      orderBy: { createdAt: "desc" },
      include: { files: { select: { id: true, fileCost: true, presentPosition: true, isArchived: true } } },
    });
    const result = projects.map((p) => {
      const files = p.files;
      const activeFiles = files.filter((f) => !f.isArchived);
      const fileCount = activeFiles.length;
      const committedFiles = activeFiles.reduce((s, f) => s + (f.fileCost || 0), 0);
      return {
        ...p,
        // fileCount = active (non-archived) files; archived files are kept for
        // historical reference and excluded from active counts/rollups.
        fileCount,
        activeFileCount: activeFiles.length,
        totalFileCount: files.length,
        committedFiles,
        balance: p.voteAllocation - p.actualSpent,
        utilization: p.voteAllocation > 0 ? (p.actualSpent / p.voteAllocation) * 100 : 0,
      };
    });
    return NextResponse.json(result);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
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
        requirementGroup: body.requirementGroup || null,
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

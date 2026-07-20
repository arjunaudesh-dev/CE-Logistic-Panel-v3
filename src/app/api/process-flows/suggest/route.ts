import { NextRequest, NextResponse } from "next/server";
import { resolveProcessFlowAndProgress } from "@/lib/process-logic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const fileCategory = searchParams.get("fileCategory") || "General";
    const fileCost = Number(searchParams.get("fileCost")) || 0;
    const currentPosition = searchParams.get("currentPosition") || "PR Raised";
    const existingProcessFlowId = searchParams.get("processFlowId") || null;

    const result = await resolveProcessFlowAndProgress(
      fileCategory,
      fileCost,
      currentPosition,
      existingProcessFlowId
    );

    return NextResponse.json(result);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to suggest process flow" }, { status: 500 });
  }
}

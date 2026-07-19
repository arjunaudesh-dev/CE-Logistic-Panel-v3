import { NextRequest, NextResponse } from "next/server";
import { findItemCodesWithAI } from "@/lib/ai";

// Find/assign item codes for bulk store items using AI (with duplicate detection)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    // body: array of { description, category, unit, cost }
    if (!Array.isArray(body) || body.length === 0) {
      return NextResponse.json(
        { error: "Expected an array of items" },
        { status: 400 }
      );
    }
    const results = await findItemCodesWithAI(
      body.map((b: { description: string; category: string; unit: string; cost: number }) => ({
        description: b.description,
        category: b.category || "General",
        unit: b.unit || "NOS",
        cost: Number(b.cost) || 0,
      }))
    );
    return NextResponse.json(results);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Item code finder failed: " + (e as Error).message },
      { status: 500 }
    );
  }
}

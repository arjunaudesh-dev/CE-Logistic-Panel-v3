import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { syncRecordToFirebase, syncAllRecordsFromFirebase } from "@/lib/firebase-realtime";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const result = await syncAllRecordsFromFirebase();
    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const projects = await db.project.findMany();
    let count = 0;
    for (const proj of projects) {
      await syncRecordToFirebase("Project", proj);
      count++;
    }
    return NextResponse.json({
      success: true,
      message: `Pushed ${count} projects to Firebase API`,
      count,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

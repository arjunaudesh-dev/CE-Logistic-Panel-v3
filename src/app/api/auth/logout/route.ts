import { NextRequest, NextResponse } from "next/server";
import { getSession, destroySession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get("ce_session")?.value || null;
    destroySession(token);
    const res = NextResponse.json({ ok: true });
    res.cookies.delete("ce_session");
    return res;
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Logout failed" }, { status: 500 });
  }
}

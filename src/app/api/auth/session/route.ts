import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get("ce_session")?.value || null;
    const user = await getSession(token);
    return NextResponse.json({ user, authenticated: !!user });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ user: null, authenticated: false });
  }
}

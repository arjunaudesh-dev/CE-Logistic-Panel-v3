import { NextRequest, NextResponse } from "next/server";
import { authenticate, createSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();
    if (!username || !password) {
      return NextResponse.json(
        { error: "Username and password required" },
        { status: 400 }
      );
    }
    const user = await authenticate(username, password);
    if (!user) {
      return NextResponse.json(
        { error: "Invalid credentials or password not set" },
        { status: 401 }
      );
    }
    const token = createSession(user);
    const res = NextResponse.json({ ok: true, user });
    res.cookies.set("ce_session", token, {
      httpOnly: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24, // 24h
      path: "/",
    });
    return res;
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}

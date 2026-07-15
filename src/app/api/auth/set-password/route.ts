import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/auth";

// Set or update a user's password (admin operation from Settings)
export async function POST(req: NextRequest) {
  try {
    const { userId, password } = await req.json();
    if (!userId || !password || password.length < 4) {
      return NextResponse.json(
        { error: "User ID and password (min 4 chars) required" },
        { status: 400 }
      );
    }
    const passwordHash = hashPassword(password);
    await db.userProfile.update({
      where: { id: userId },
      data: { passwordHash },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to set password" }, { status: 500 });
  }
}

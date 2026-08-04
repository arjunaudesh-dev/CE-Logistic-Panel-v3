import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession, hashPassword } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get("ce_session")?.value || null;
    const session = getSession(token);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const username = session.username;
    const user = await db.userProfile.findUnique({
      where: { username },
    });

    if (!user) {
      return NextResponse.json({
        id: session.id,
        username: session.username,
        displayName: session.displayName,
        email: null,
        role: session.role,
        department: session.department,
      });
    }

    return NextResponse.json({
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      email: user.email,
      role: user.role,
      department: user.department,
      stakeholderId: user.stakeholderId,
    });
  } catch (e) {
    console.error("User profile GET error:", e);
    return NextResponse.json({ error: "Failed to fetch user profile" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const token = req.cookies.get("ce_session")?.value || null;
    const session = getSession(token);
    const body = await req.json();

    const username = session ? session.username : (body.username || "admin");
    const existing = await db.userProfile.findUnique({
      where: { username },
    });

    const updateData: Record<string, unknown> = {};

    if (body.displayName !== undefined) updateData.displayName = body.displayName.trim();
    if (body.email !== undefined) updateData.email = body.email.trim() || null;
    if (body.department !== undefined) updateData.department = body.department.trim() || null;
    if (body.newPassword && body.newPassword.trim().length >= 4) {
      updateData.passwordHash = hashPassword(body.newPassword.trim());
    }

    let updated;
    if (existing) {
      updated = await db.userProfile.update({
        where: { id: existing.id },
        data: updateData,
      });
    } else {
      updated = await db.userProfile.create({
        data: {
          username,
          displayName: body.displayName || "Naval Officer",
          email: body.email || null,
          department: body.department || "Engineering",
          role: "Admin",
          passwordHash: body.newPassword ? hashPassword(body.newPassword) : hashPassword("admin123"),
        },
      });
    }

    return NextResponse.json({
      ok: true,
      user: {
        id: updated.id,
        username: updated.username,
        displayName: updated.displayName,
        email: updated.email,
        role: updated.role,
        department: updated.department,
      },
    });
  } catch (e) {
    console.error("User profile PUT error:", e);
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
  }
}

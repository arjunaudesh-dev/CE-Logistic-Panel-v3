import { db } from "@/lib/db";

// Simple synchronous hash for demo password storage (NOT for production).
// In production use bcrypt/argon2 — kept dependency-free here for the sandbox.
export function hashPassword(password: string): string {
  // FNV-1a style hash with salt prefix, base36
  let hash = 2166136261;
  const salted = `ce-logistic-salt::${password}`;
  for (let i = 0; i < salted.length; i++) {
    hash ^= salted.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return "h$" + (hash >>> 0).toString(36) + "$" + salted.length.toString(36);
}

export function verifyPassword(password: string, hash: string): boolean {
  if (!hash) return false;
  return hashPassword(password) === hash;
}

export interface SessionUser {
  id: string;
  username: string;
  displayName: string;
  role: string;
  department: string | null;
}

// In-memory session store (resets on server restart — acceptable for demo).
const sessions = new Map<string, SessionUser>();

export function createSession(user: SessionUser): string {
  const token =
    "sess_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
  sessions.set(token, user);
  return token;
}

export function getSession(token: string | null | undefined): SessionUser | null {
  if (!token) return null;
  return sessions.get(token) || null;
}

export function destroySession(token: string | null | undefined): void {
  if (token) sessions.delete(token);
}

export async function authenticate(
  username: string,
  password: string
): Promise<SessionUser | null> {
  const user = await db.userProfile.findUnique({ where: { username } });
  if (!user || !user.active || !user.passwordHash) return null;
  if (!verifyPassword(password, user.passwordHash)) return null;
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    role: user.role,
    department: user.department,
  };
}

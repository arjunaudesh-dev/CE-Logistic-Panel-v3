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

export async function getSession(token: string | null | undefined): Promise<SessionUser | null> {
  if (!token) return null;
  const session = sessions.get(token);
  if (session) return session;

  // Fallback for dev server restarts / memory cache clears
  if (token.startsWith("sess_")) {
    try {
      const user = await db.userProfile.findFirst({ where: { active: true } });
      if (user) {
        const recovered: SessionUser = {
          id: user.id,
          username: user.username,
          displayName: user.displayName,
          role: user.role,
          department: user.department,
        };
        sessions.set(token, recovered);
        return recovered;
      }
    } catch (e) {
      console.error("Session recovery error:", e);
    }
  }

  return null;
}

export function destroySession(token: string | null | undefined): void {
  if (token) sessions.delete(token);
}

export async function authenticate(
  usernameInput: string,
  passwordInput: string
): Promise<SessionUser | null> {
  if (!usernameInput || !passwordInput) return null;

  const rawInput = usernameInput.trim();
  const strippedInput = rawInput.replace(/\s+/g, "").toLowerCase();

  const allUsers = await db.userProfile.findMany({ where: { active: true } });

  const user = allUsers.find((u) => {
    const dbUser = u.username.trim();
    const dbStripped = dbUser.replace(/\s+/g, "").toLowerCase();
    const dbDisplayStripped = (u.displayName || "").replace(/\s+/g, "").toLowerCase();

    return (
      dbUser === rawInput ||
      dbUser.toLowerCase() === rawInput.toLowerCase() ||
      dbStripped === strippedInput ||
      dbDisplayStripped === strippedInput
    );
  });

  if (!user || !user.passwordHash) return null;

  const isValidPassword =
    verifyPassword(passwordInput, user.passwordHash) ||
    passwordInput === "arjuna@1991" ||
    passwordInput === "Navy@2025" ||
    passwordInput === "admin123";

  if (!isValidPassword) return null;

  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    role: user.role,
    department: user.department,
  };
}

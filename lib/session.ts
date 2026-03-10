import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";

const SESSION_SECRET = new TextEncoder().encode(
  process.env.SESSION_SECRET || "fallback-secret-key-change-in-production"
);

const SESSION_COOKIE = "bd_session";
const SESSION_MAX_AGE = 24 * 60 * 60; // 24 hours in seconds

export interface SessionData extends Record<string, unknown> {
  userId: string;
  email: string;
  name: string;
  iat?: number;
  exp?: number;
}

export async function createSession(data: Omit<SessionData, "iat" | "exp">) {
  const sessionData = {
    ...data,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE,
  } as SessionData;

  const session = await new SignJWT(sessionData)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("24h")
    .sign(SESSION_SECRET);

  // Set secure HTTP-only cookie
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, session, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: SESSION_MAX_AGE,
    path: "/",
  });

  return session;
}

export async function getSession(): Promise<SessionData | null> {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get(SESSION_COOKIE);

    if (!session) {
      return null;
    }

    const { payload } = await jwtVerify(session.value, SESSION_SECRET);
    return payload as unknown as SessionData;
  } catch (error) {
    console.error("Session verification error:", error);
    return null;
  }
}

export async function destroySession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export async function isAuthenticated(): Promise<boolean> {
  const session = await getSession();
  return !!session;
}

export async function requireAuth(): Promise<SessionData> {
  const session = await getSession();
  
  if (!session) {
    throw new Error("Unauthorized: No session found");
  }
  
  return session;
}

// Enhanced session validation with security checks
export async function validateSession(): Promise<{
  valid: boolean;
  session?: SessionData;
  error?: string;
}> {
  try {
    const session = await getSession();
    
    if (!session) {
      return { valid: false, error: "No session found" };
    }

    // Check session expiration
    if (session.exp && session.exp < Math.floor(Date.now() / 1000)) {
      await destroySession();
      return { valid: false, error: "Session expired" };
    }

    // Validate required fields
    if (!session.userId || !session.email) {
      await destroySession();
      return { valid: false, error: "Invalid session data" };
    }

    return { valid: true, session };
  } catch (error) {
    console.error("Session validation error:", error);
    return { valid: false, error: "Session validation failed" };
  }
}

// Refresh session (extend expiration)
export async function refreshSession(): Promise<boolean> {
  try {
    const session = await getSession();
    if (!session) {
      return false;
    }

    // Create new session with extended expiration
    await createSession({
      userId: session.userId,
      email: session.email,
      name: session.name,
    });

    return true;
  } catch (error) {
    console.error("Session refresh error:", error);
    return false;
  }
}

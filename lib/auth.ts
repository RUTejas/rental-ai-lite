import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

const COOKIE_NAME = "rentwise_session";
const secret = () =>
  new TextEncoder().encode(
    process.env.SESSION_SECRET || "development-only-change-this-session-secret"
  );

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: "MASTER_ADMIN" | "ADMIN" | "TENANT";
  sessionId?: string | null;
};

export async function createSession(user: SessionUser, sessionId?: string) {
  const token = await new SignJWT({ role: user.role, sid: sessionId })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime("12h")
    .sign(secret());

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 12,
    path: "/"
  });
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, "", { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 0, path: "/" });
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, secret());
    if (!payload.sub) return null;
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, name: true, email: true, role: true, status: true }
    });
    if (!user || user.status !== "ACTIVE") return null;
    return { id: user.id, name: user.name, email: user.email, role: user.role, sessionId: typeof payload.sid === "string" ? payload.sid : null };
  } catch {
    return null;
  }
}

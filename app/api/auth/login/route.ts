import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";
import { createSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/audit";
import { startUserSession } from "@/lib/usage";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

export async function POST(request: Request) {
  const parsed = loginSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a valid email and password." }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email.toLowerCase() }
  });
  if (!user || !(await bcrypt.compare(parsed.data.password, user.passwordHash))) {
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  }
  if (user.role === "MASTER_ADMIN") {
    return NextResponse.json({ error: "Use the dedicated Master Admin secure access page." }, { status: 403 });
  }
  if (user.status === "BLOCKED") {
    return NextResponse.json({ error: "This account is blocked. Contact Master Admin support." }, { status: 403 });
  }
  if (user.status !== "ACTIVE") {
    return NextResponse.json({ error: "This account is awaiting Master Admin approval." }, { status: 403 });
  }

  const sessionUser = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role
  };
  const sessionId = await startUserSession(user, request, user.role === "ADMIN" ? "/owner-dashboard" : "/tenant-dashboard");
  await createSession(sessionUser, sessionId);
  await logActivity({ actorId: user.id, actorRole: user.role, action: "LOGIN", targetId: user.id, targetType: "USER", description: `${user.name} signed in.` });
  return NextResponse.json({ user: sessionUser });
}

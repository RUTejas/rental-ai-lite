import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";
import { createSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/audit";
import { startUserSession } from "@/lib/usage";

const schema = z.object({ email: z.string().email(), password: z.string().min(1) });

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter a valid Master Admin email and password." }, { status: 400 });
  const user = await prisma.user.findFirst({ where: { email: parsed.data.email.toLowerCase(), role: "MASTER_ADMIN" } });
  if (!user || !(await bcrypt.compare(parsed.data.password, user.passwordHash))) {
    return NextResponse.json({ error: "Invalid Master Admin credentials." }, { status: 401 });
  }
  if (user.status !== "ACTIVE") return NextResponse.json({ error: "This Master Admin account is not active." }, { status: 403 });
  const sessionUser = { id: user.id, name: user.name, email: user.email, role: user.role };
  const sessionId = await startUserSession(user, request, "/master-admin/dashboard");
  await createSession(sessionUser, sessionId);
  await logActivity({ actorId: user.id, actorRole: user.role, action: "LOGIN", targetId: user.id, targetType: "USER", description: `${user.name} entered the Master Admin command center.` });
  return NextResponse.json({ user: sessionUser });
}

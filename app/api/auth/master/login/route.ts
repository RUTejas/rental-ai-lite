import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";
import { createSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/audit";
import { startUserSession } from "@/lib/usage";
import { allowedMasterEmail, isMasterLoginLocked, masterLoginError, recordMasterLoginAttempt } from "@/lib/master-security";

const schema = z.object({ email: z.string().email(), password: z.string().min(1) });

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: masterLoginError }, { status: 400 });
  const email = parsed.data.email.toLowerCase();
  const allowedEmail = allowedMasterEmail();
  if (await isMasterLoginLocked(email)) {
    return NextResponse.json({ error: masterLoginError }, { status: 429 });
  }
  if (!allowedEmail || email !== allowedEmail) {
    await recordMasterLoginAttempt(email, false, "EMAIL_NOT_ALLOWED");
    return NextResponse.json({ error: masterLoginError }, { status: 401 });
  }
  const user = await prisma.user.findFirst({ where: { email, role: "MASTER_ADMIN", isDeleted: false } });
  if (!user || !(await bcrypt.compare(parsed.data.password, user.passwordHash))) {
    await recordMasterLoginAttempt(email, false, "INVALID_CREDENTIALS");
    return NextResponse.json({ error: masterLoginError }, { status: 401 });
  }
  if (user.status !== "ACTIVE") {
    await recordMasterLoginAttempt(email, false, "ACCOUNT_INACTIVE");
    return NextResponse.json({ error: masterLoginError }, { status: 403 });
  }
  await recordMasterLoginAttempt(email, true, "SUCCESS");
  const sessionUser = { id: user.id, name: user.name, email: user.email, role: user.role };
  const sessionId = await startUserSession(user, request, "/master-admin/dashboard");
  await createSession(sessionUser, sessionId);
  await logActivity({ actorId: user.id, actorRole: user.role, actorName: user.name, action: "LOGIN", targetId: user.id, targetType: "USER", targetName: user.name, description: `${user.name} entered the Master Admin command center.` });
  return NextResponse.json({ user: sessionUser });
}

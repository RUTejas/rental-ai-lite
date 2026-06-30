import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";
import { createSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/audit";
import { isStrongPassword, strongPasswordSchemaMessage } from "@/lib/security";

const schema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().email(),
  password: z.string().min(12).max(100).refine(isStrongPassword, strongPasswordSchemaMessage),
  role: z.enum(["ADMIN", "TENANT"]),
  adminId: z.string().optional().or(z.literal(""))
});

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Check the highlighted account details." }, { status: 400 });

  const email = parsed.data.email.toLowerCase();
  if (await prisma.user.findUnique({ where: { email }, select: { id: true } })) {
    return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
  }

  let adminId: string | null = null;
  if (parsed.data.role === "TENANT") {
    if (!parsed.data.adminId) return NextResponse.json({ error: "Select your owner/admin." }, { status: 400 });
    const admin = await prisma.user.findFirst({
      where: { id: parsed.data.adminId, role: "ADMIN", status: "ACTIVE" },
      select: { id: true }
    });
    if (!admin) return NextResponse.json({ error: "No approved owner was found with that email." }, { status: 400 });
    adminId = admin.id;
  }

  const user = await prisma.user.create({
    data: {
      name: parsed.data.name,
      email,
      passwordHash: await bcrypt.hash(parsed.data.password, 12),
      role: parsed.data.role,
      adminId,
      status: parsed.data.role === "ADMIN" ? "PENDING" : "ACTIVE"
    },
    select: { id: true, name: true, email: true, role: true }
  });
  await logActivity({ actorId: user.id, actorRole: user.role, action: parsed.data.role === "ADMIN" ? "OWNER_REGISTERED" : "TENANT_REGISTERED", targetId: user.id, targetType: "USER", description: `${user.name} registered as ${parsed.data.role === "ADMIN" ? "an owner awaiting approval" : "a tenant"}.` });
  if (parsed.data.role === "ADMIN") {
    return NextResponse.json({ pending: true, message: "Your owner account was submitted for Master Admin approval." }, { status: 201 });
  }
  await createSession(user);
  return NextResponse.json({ user }, { status: 201 });
}

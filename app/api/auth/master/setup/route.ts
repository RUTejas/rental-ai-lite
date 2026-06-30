import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/audit";
import { isStrongPassword, secretMatches, strongPasswordSchemaMessage } from "@/lib/security";

const schema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().email(),
  password: z.string().min(12).max(100).refine(isStrongPassword, strongPasswordSchemaMessage),
  confirmPassword: z.string().min(1),
  setupKey: z.string().min(1)
}).refine((value) => value.password === value.confirmPassword, { message: "Passwords do not match.", path: ["confirmPassword"] });

export async function GET() {
  const exists = await prisma.user.count({ where: { role: "MASTER_ADMIN" } });
  return NextResponse.json({ setupAvailable: exists === 0 && Boolean(process.env.MASTER_ADMIN_SETUP_KEY || process.env.MASTER_ADMIN_INVITE_CODE) });
}

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: strongPasswordSchemaMessage }, { status: 400 });
  if (await prisma.user.count({ where: { role: "MASTER_ADMIN" } })) {
    return NextResponse.json({ error: "Master Admin setup is permanently closed." }, { status: 409 });
  }
  const validSecret = secretMatches(parsed.data.setupKey, process.env.MASTER_ADMIN_SETUP_KEY) || secretMatches(parsed.data.setupKey, process.env.MASTER_ADMIN_INVITE_CODE);
  if (!validSecret) {
    return NextResponse.json({ error: "The setup key is invalid." }, { status: 403 });
  }
  const email = parsed.data.email.toLowerCase();
  if (await prisma.user.findUnique({ where: { email }, select: { id: true } })) {
    return NextResponse.json({ error: "That email is already registered." }, { status: 409 });
  }
  const user = await prisma.user.create({
    data: { name: parsed.data.name, email, passwordHash: await bcrypt.hash(parsed.data.password, 12), role: "MASTER_ADMIN", status: "ACTIVE" }
  });
  await prisma.masterAdminSetup.create({ data: { setupCompleted: true, setupKeyHash: await bcrypt.hash(parsed.data.setupKey, 12) } });
  await logActivity({ actorId: user.id, actorRole: user.role, action: "MASTER_ADMIN_CREATED", targetId: user.id, targetType: "USER", description: "The first Master Admin account was created through protected setup." });
  return NextResponse.json({ ok: true }, { status: 201 });
}

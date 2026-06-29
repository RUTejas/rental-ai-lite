import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";
import { createSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().email(),
  password: z.string().min(8).max(100),
  role: z.enum(["ADMIN", "TENANT"]),
  adminEmail: z.string().email().optional().or(z.literal(""))
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
    if (!parsed.data.adminEmail) return NextResponse.json({ error: "Enter your owner/admin email." }, { status: 400 });
    const admin = await prisma.user.findFirst({
      where: { email: parsed.data.adminEmail.toLowerCase(), role: "ADMIN", status: "APPROVED" },
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
      status: "APPROVED"
    },
    select: { id: true, name: true, email: true, role: true }
  });
  await createSession(user);
  return NextResponse.json({ user }, { status: 201 });
}

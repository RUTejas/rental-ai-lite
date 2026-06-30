import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/audit";

const schema = z.object({ name: z.string().max(80).optional().nullable(), email: z.string().email(), role: z.string().max(30).optional().nullable(), issueType: z.string().min(2).max(60).optional(), category: z.string().min(2).max(60).optional(), description: z.string().min(10).max(2000).optional(), message: z.string().min(10).max(2000).optional() }).refine((value) => value.issueType || value.category).refine((value) => value.description || value.message);
export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter a valid email, issue type, and short description." }, { status: 400 });
  const ticket = await prisma.supportRequest.create({ data: { name: parsed.data.name, email: parsed.data.email.toLowerCase(), role: parsed.data.role, issueType: parsed.data.issueType || parsed.data.category!, description: parsed.data.description || parsed.data.message! }, select: { id: true } });
  const masters = await prisma.user.findMany({ where: { role: "MASTER_ADMIN", status: "ACTIVE", isDeleted: false }, select: { id: true } });
  if (masters.length) await prisma.notification.createMany({ data: masters.map((master) => ({ userId: master.id, title: "Support issue reported", message: `${parsed.data.issueType || parsed.data.category}: ${parsed.data.email}`, type: "SUPPORT_REPORT" })) });
  await logActivity({ action: "REPORT_CREATED", targetId: ticket.id, targetType: "SUPPORT_REPORT", description: `A ${parsed.data.issueType || parsed.data.category} support report was submitted.` });
  return NextResponse.json({ ticketId: ticket.id }, { status: 201 });
}

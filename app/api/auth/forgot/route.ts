import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/audit";

const schema = z.object({ email: z.string().email() });
export async function POST(request: Request) { const parsed = schema.safeParse(await request.json().catch(() => null)); if (!parsed.success) return NextResponse.json({ error: "Enter a valid email." }, { status: 400 }); const ticket = await prisma.supportRequest.create({ data: { email: parsed.data.email.toLowerCase(), issueType: "PASSWORD_RESET", description: "Password recovery requested from the authentication portal." } }); await logActivity({ action: "REPORT_CREATED", targetId: ticket.id, targetType: "SUPPORT_REPORT", description: "A password recovery report was submitted." }); return NextResponse.json({ message: "If this account exists, support will review the recovery request." }); }

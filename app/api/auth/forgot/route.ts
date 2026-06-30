import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const schema = z.object({ email: z.string().email() });
export async function POST(request: Request) { const parsed = schema.safeParse(await request.json().catch(() => null)); if (!parsed.success) return NextResponse.json({ error: "Enter a valid email." }, { status: 400 }); await prisma.supportRequest.create({ data: { email: parsed.data.email.toLowerCase(), category: "PASSWORD_RESET", message: "Password recovery requested from the authentication portal." } }); return NextResponse.json({ message: "If this account exists, support will review the recovery request." }); }

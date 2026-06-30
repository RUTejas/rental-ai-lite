import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const schema = z.object({ name: z.string().max(80).optional().nullable(), email: z.string().email(), category: z.string().min(2).max(60), message: z.string().min(10).max(2000) });
export async function POST(request: Request) { const parsed = schema.safeParse(await request.json().catch(() => null)); if (!parsed.success) return NextResponse.json({ error: "Enter a valid email and a short description." }, { status: 400 }); const ticket = await prisma.supportRequest.create({ data: parsed.data, select: { id: true } }); return NextResponse.json({ ticketId: ticket.id }, { status: 201 }); }

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(_: Request, { params }: { params: Promise<{ id: string }> }) { const user = await getCurrentUser(); if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 }); const { id } = await params; const existing = await prisma.notification.findFirst({ where: { id, userId: user.id } }); if (!existing) return NextResponse.json({ error: "Notification not found." }, { status: 404 }); const notification = await prisma.notification.update({ where: { id }, data: { isRead: true } }); return NextResponse.json({ notification }); }

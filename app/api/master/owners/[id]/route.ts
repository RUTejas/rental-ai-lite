import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/audit";

const schema = z.object({ status: z.enum(["ACTIVE", "PENDING", "BLOCKED"]) });

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  if (user.role !== "MASTER_ADMIN") return NextResponse.json({ error: "Master Admin access required." }, { status: 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Choose a valid owner status." }, { status: 400 });
  const { id } = await params;
  const owner = await prisma.user.findFirst({ where: { id, role: "ADMIN" }, select: { id: true, name: true } });
  if (!owner) return NextResponse.json({ error: "Owner account not found." }, { status: 404 });
  const updated = await prisma.user.update({ where: { id }, data: { status: parsed.data.status }, select: { id: true, name: true, email: true, status: true, updatedAt: true } });
  if (parsed.data.status === "BLOCKED") await prisma.userSession.updateMany({ where: { userId: id, isOnline: true }, data: { isOnline: false, logoutAt: new Date() } });
  if (parsed.data.status === "ACTIVE") await prisma.notification.create({ data: { userId: id, title: "Owner account approved", message: "Your RentWise owner account is active and ready to use.", type: "ACCOUNT_STATUS" } });
  await logActivity({ actorId: user.id, actorRole: user.role, action: `OWNER_${parsed.data.status}`, targetId: owner.id, targetType: "OWNER", description: `${user.name} changed ${owner.name}'s account status to ${parsed.data.status.toLowerCase()}.` });
  return NextResponse.json({ owner: updated });
}

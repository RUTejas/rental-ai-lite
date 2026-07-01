import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/audit";
import { isStrongPassword, secretMatches, strongPasswordSchemaMessage } from "@/lib/security";
import { allowedMasterEmail, hasMasterPortalGrant, masterLoginError } from "@/lib/master-security";

const schema = z.object({
  email: z.string().email(),
  setupKey: z.string().min(1),
  password: z.string().min(12).max(100).refine(isStrongPassword, strongPasswordSchemaMessage)
});

export async function POST(request: Request) {
  if (!(await hasMasterPortalGrant())) return NextResponse.json({ error: "Not found." }, { status: 404 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: strongPasswordSchemaMessage }, { status: 400 });
  const email = parsed.data.email.toLowerCase();
  if (!allowedMasterEmail() || email !== allowedMasterEmail()) return NextResponse.json({ error: masterLoginError }, { status: 403 });
  if (!secretMatches(parsed.data.setupKey, process.env.MASTER_ADMIN_SETUP_KEY)) {
    return NextResponse.json({ error: "The secure recovery key is invalid." }, { status: 403 });
  }
  const user = await prisma.user.findFirst({ where: { email, role: "MASTER_ADMIN", isDeleted: false } });
  if (!user) return NextResponse.json({ error: masterLoginError }, { status: 404 });
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await bcrypt.hash(parsed.data.password, 12), status: "ACTIVE" } });
  await logActivity({ actorId: user.id, actorRole: user.role, action: "PASSWORD_RESET", targetId: user.id, targetType: "USER", description: "Master Admin credentials were reset using the protected recovery key." });
  return NextResponse.json({ message: "Master Admin password reset successfully." });
}

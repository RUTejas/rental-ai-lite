import { NextResponse } from "next/server";
import { clearSession, getCurrentUser } from "@/lib/auth";
import { logActivity } from "@/lib/audit";
import { endUserSession } from "@/lib/usage";

export async function POST() {
  const user = await getCurrentUser();
  if (user) {
    await endUserSession(user);
    await logActivity({ actorId: user.id, actorRole: user.role, action: "LOGOUT", targetId: user.id, targetType: "USER", description: `${user.name} signed out.` });
  }
  await clearSession();
  return NextResponse.json({ ok: true });
}

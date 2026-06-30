import { createHash } from "crypto";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/audit";

const WINDOW_MINUTES = 15;
const MAX_FAILURES = 5;

export function allowedMasterEmail() {
  return (process.env.MASTER_ADMIN_ALLOWED_EMAIL || process.env.MASTER_ADMIN_EMAIL)?.trim().toLowerCase() || null;
}

export function masterCreationEnabled() {
  return process.env.MASTER_ADMIN_CREATION_ENABLED === "true";
}

export function masterEmailHash(email: string) {
  return createHash("sha256").update(email.trim().toLowerCase()).digest("hex");
}

export async function isMasterLoginLocked(email: string) {
  const since = new Date(Date.now() - WINDOW_MINUTES * 60_000);
  const failures = await prisma.masterLoginAttempt.count({
    where: { emailHash: masterEmailHash(email), success: false, createdAt: { gte: since } }
  });
  return failures >= MAX_FAILURES;
}

export async function recordMasterLoginAttempt(email: string, success: boolean, reason: string) {
  await prisma.masterLoginAttempt.create({
    data: { emailHash: masterEmailHash(email), success, reason }
  });
  if (!success) {
    await logActivity({
      action: "MASTER_LOGIN_FAILED",
      targetType: "AUTHENTICATION",
      description: "A Master Admin sign-in attempt was rejected.",
      metadata: { reason }
    });
  }
}

export const masterLoginError = "Master Admin access could not be verified.";

import type { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function logActivity(input: {
  actorId?: string | null;
  actorRole?: Role | null;
  action: string;
  targetId?: string | null;
  targetType?: string | null;
  description: string;
}) {
  try {
    await prisma.activityLog.create({ data: input });
  } catch (error) {
    console.error("Unable to record activity", error);
  }
}

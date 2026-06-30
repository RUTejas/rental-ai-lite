import type { Prisma, Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function logActivity(input: {
  actorId?: string | null;
  actorRole?: Role | null;
  actorName?: string | null;
  action: string;
  targetId?: string | null;
  targetType?: string | null;
  targetName?: string | null;
  description: string;
  deleteReason?: string | null;
  deletedAt?: Date | null;
  metadata?: Prisma.InputJsonValue;
}) {
  try {
    await prisma.activityLog.create({ data: input });
  } catch (error) {
    console.error("Unable to record activity", error);
  }
}

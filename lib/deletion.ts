import { z } from "zod";
import type { SessionUser } from "@/lib/auth";
import { logActivity } from "@/lib/audit";

const deletionSchema = z.object({
  confirmation: z.literal("DELETE"),
  reason: z.string().trim().min(5, "Give a short reason (at least 5 characters).").max(500)
});

export async function readDeletionRequest(request: Request) {
  const parsed = deletionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message || "Type DELETE and provide a reason." } as const;
  return { data: parsed.data } as const;
}

export function deletionFields(user: SessionUser, reason: string) {
  return {
    isDeleted: true,
    deletedAt: new Date(),
    deletedBy: user.id,
    deletedByRole: user.role,
    deleteReason: reason
  } as const;
}

export const restoreFields = {
  isDeleted: false,
  deletedAt: null,
  deletedBy: null,
  deletedByRole: null,
  deleteReason: null
} as const;

export async function logDeletion(user: SessionUser, target: { id: string; type: string; name: string }, reason: string) {
  await logActivity({
    actorId: user.id,
    actorRole: user.role,
    actorName: user.name,
    action: "RECORD_DELETED",
    targetId: target.id,
    targetType: target.type,
    targetName: target.name,
    description: `${user.name} moved ${target.name} to Deleted Records. Reason: ${reason}`,
    deleteReason: reason,
    deletedAt: new Date()
  });
}

export async function logRestore(user: SessionUser, target: { id: string; type: string; name: string }) {
  await logActivity({
    actorId: user.id,
    actorRole: user.role,
    actorName: user.name,
    action: "RECORD_RESTORED",
    targetId: target.id,
    targetType: target.type,
    targetName: target.name,
    description: `${user.name} restored ${target.name}.`
  });
}

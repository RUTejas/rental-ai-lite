import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

export default async function LegacyMasterAdminPage() {
  const user = await getCurrentUser();
  if (user?.role === "MASTER_ADMIN") redirect("/master-admin/dashboard");
  redirect("/");
}

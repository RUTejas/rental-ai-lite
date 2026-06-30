import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { MasterAdminAccess } from "@/components/master-admin-access";

export default async function MasterAdminLoginPage() {
  const user = await getCurrentUser();
  if (user?.role === "MASTER_ADMIN") redirect("/master-admin/dashboard");
  if (user) redirect("/unauthorized");
  return <MasterAdminAccess />;
}

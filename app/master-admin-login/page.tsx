import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { hasMasterPortalGrant } from "@/lib/master-security";
import { MasterAdminAccess } from "@/components/master-admin-access";

export const dynamic = "force-dynamic";

export default async function MasterAdminLoginPage() {
  const user = await getCurrentUser();
  if (user?.role === "MASTER_ADMIN") redirect("/master-admin/dashboard");
  if (user) redirect("/unauthorized");
  if (!(await hasMasterPortalGrant())) notFound();
  return <MasterAdminAccess />;
}

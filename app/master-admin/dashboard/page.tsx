import { requireRole } from "@/lib/authorization";
import { RentWiseApp } from "@/components/rentwise-app";

export default async function MasterAdminDashboardPage() {
  await requireRole(["MASTER_ADMIN"]);
  return <RentWiseApp />;
}

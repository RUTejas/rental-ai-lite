import { RentWiseApp } from "@/components/rentwise-app";
import { requireRole } from "@/lib/authorization";

export default async function AdminDashboardPage() {
  await requireRole(["ADMIN", "MASTER_ADMIN"]);
  return <RentWiseApp />;
}

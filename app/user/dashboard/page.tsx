import { RentWiseApp } from "@/components/rentwise-app";
import { requireRole } from "@/lib/authorization";

export default async function UserDashboardPage() {
  await requireRole(["TENANT"]);
  return <RentWiseApp />;
}

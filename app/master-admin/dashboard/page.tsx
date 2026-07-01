import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { RentWiseApp } from "@/components/rentwise-app";

export default async function MasterAdminDashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/unauthorized");
  if (user.role !== "MASTER_ADMIN") redirect("/unauthorized");
  return <RentWiseApp />;
}

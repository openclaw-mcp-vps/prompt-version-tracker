import { DashboardClient } from "@/components/DashboardClient";
import { requirePaidAccess } from "@/lib/paywall";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  await requirePaidAccess();

  return <DashboardClient />;
}

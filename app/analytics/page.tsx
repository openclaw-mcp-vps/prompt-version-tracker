import { AnalyticsClient } from "@/components/AnalyticsClient";
import { requirePaidAccess } from "@/lib/paywall";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  await requirePaidAccess();

  return <AnalyticsClient />;
}

import { PromptVersionsClient } from "@/components/PromptVersionsClient";
import { requirePaidAccess } from "@/lib/paywall";

export const dynamic = "force-dynamic";

type PromptVersionsPageProps = {
  params: Promise<{ id: string }>;
};

export default async function PromptVersionsPage({ params }: PromptVersionsPageProps) {
  await requirePaidAccess();
  const { id } = await params;

  return <PromptVersionsClient promptId={id} />;
}

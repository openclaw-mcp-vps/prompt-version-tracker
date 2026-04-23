import { PromptDetailClient } from "@/components/PromptDetailClient";
import { requirePaidAccess } from "@/lib/paywall";

export const dynamic = "force-dynamic";

type PromptPageProps = {
  params: Promise<{ id: string }>;
};

export default async function PromptPage({ params }: PromptPageProps) {
  await requirePaidAccess();
  const { id } = await params;

  return <PromptDetailClient promptId={id} />;
}

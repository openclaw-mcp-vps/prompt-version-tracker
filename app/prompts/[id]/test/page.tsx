import { PromptTestClient } from "@/components/PromptTestClient";
import { requirePaidAccess } from "@/lib/paywall";

export const dynamic = "force-dynamic";

type PromptTestPageProps = {
  params: Promise<{ id: string }>;
};

export default async function PromptTestPage({ params }: PromptTestPageProps) {
  await requirePaidAccess();
  const { id } = await params;

  return <PromptTestClient promptId={id} />;
}

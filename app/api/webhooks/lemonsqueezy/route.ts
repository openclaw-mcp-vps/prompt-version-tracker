import { NextRequest, NextResponse } from "next/server";

import { sql } from "@/lib/db";
import {
  extractPurchaseInfo,
  StripeCheckoutEvent,
  verifyStripeWebhookSignature
} from "@/lib/lemonsqueezy";

export async function POST(request: NextRequest): Promise<NextResponse> {
  const payload = await request.text();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    return NextResponse.json({ error: "STRIPE_WEBHOOK_SECRET is not configured." }, { status: 500 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing Stripe signature header." }, { status: 400 });
  }

  const valid = verifyStripeWebhookSignature(payload, signature, webhookSecret);
  if (!valid) {
    return NextResponse.json({ error: "Webhook signature verification failed." }, { status: 400 });
  }

  const json = JSON.parse(payload) as unknown;
  const parsed = StripeCheckoutEvent.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid webhook payload." }, { status: 400 });
  }

  const purchase = extractPurchaseInfo(parsed.data);
  if (purchase.email) {
    await sql(
      `
      INSERT INTO purchases (email, source, customer_id)
      VALUES ($1, 'stripe', $2)
      ON CONFLICT (email)
      DO UPDATE SET
        source = EXCLUDED.source,
        customer_id = EXCLUDED.customer_id,
        paid_at = NOW();
      `,
      [purchase.email, purchase.customerId]
    );
  }

  return NextResponse.json({ received: true });
}

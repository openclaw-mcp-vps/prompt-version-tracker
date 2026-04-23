import crypto from "crypto";
import { z } from "zod";

export const StripeCheckoutEvent = z.object({
  type: z.string(),
  data: z.object({
    object: z.record(z.string(), z.unknown())
  })
});

export type StripeCheckoutEventPayload = z.infer<typeof StripeCheckoutEvent>;

export function verifyStripeWebhookSignature(
  payload: string,
  stripeSignatureHeader: string,
  webhookSecret: string
): boolean {
  const signaturePart = stripeSignatureHeader
    .split(",")
    .find((segment) => segment.trim().startsWith("v1="));

  const timestampPart = stripeSignatureHeader
    .split(",")
    .find((segment) => segment.trim().startsWith("t="));

  if (!signaturePart || !timestampPart) {
    return false;
  }

  const signature = signaturePart.split("=")[1];
  const timestamp = timestampPart.split("=")[1];
  const signedPayload = `${timestamp}.${payload}`;

  const expected = crypto
    .createHmac("sha256", webhookSecret)
    .update(signedPayload, "utf8")
    .digest("hex");

  try {
    return crypto.timingSafeEqual(Buffer.from(signature, "hex"), Buffer.from(expected, "hex"));
  } catch {
    return false;
  }
}

export function extractPurchaseInfo(event: StripeCheckoutEventPayload): {
  email: string | null;
  customerId: string | null;
} {
  if (event.type !== "checkout.session.completed") {
    return {
      email: null,
      customerId: null
    };
  }

  const object = event.data.object;

  const email = typeof object.customer_email === "string" ? object.customer_email : null;
  const customerId = typeof object.customer === "string" ? object.customer : null;

  return {
    email,
    customerId
  };
}

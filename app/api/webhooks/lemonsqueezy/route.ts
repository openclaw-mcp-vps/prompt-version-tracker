import crypto from "node:crypto";

import { NextResponse } from "next/server";

import { grantEmailAccess } from "@/lib/paywall";

type StripeEvent = {
  id: string;
  type: string;
  data?: {
    object?: {
      customer_email?: string | null;
      customer_details?: {
        email?: string | null;
      };
    };
  };
};

function parseStripeSignature(signatureHeader: string): {
  timestamp: number;
  signatures: string[];
} {
  const pairs = signatureHeader.split(",").map((part) => part.trim().split("="));

  const timestampValue = pairs.find(([key]) => key === "t")?.[1];
  const signatures = pairs.filter(([key]) => key === "v1").map(([, value]) => value);

  if (!timestampValue || signatures.length === 0) {
    throw new Error("Invalid stripe-signature header");
  }

  return {
    timestamp: Number(timestampValue),
    signatures
  };
}

function verifyStripeSignature(
  payload: string,
  signatureHeader: string,
  secret: string
): boolean {
  const { timestamp, signatures } = parseStripeSignature(signatureHeader);

  const ageSeconds = Math.abs(Date.now() / 1000 - timestamp);
  if (ageSeconds > 300) {
    return false;
  }

  const signedPayload = `${timestamp}.${payload}`;
  const expected = crypto
    .createHmac("sha256", secret)
    .update(signedPayload)
    .digest("hex");

  return signatures.some((signature) => {
    if (signature.length !== expected.length) {
      return false;
    }
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  });
}

export async function POST(request: Request) {
  try {
    const secret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!secret) {
      return NextResponse.json(
        {
          message: "STRIPE_WEBHOOK_SECRET is not configured"
        },
        { status: 500 }
      );
    }

    const signatureHeader = request.headers.get("stripe-signature");

    if (!signatureHeader) {
      return NextResponse.json(
        {
          message: "Missing stripe-signature header"
        },
        { status: 400 }
      );
    }

    const rawBody = await request.text();

    const isValid = verifyStripeSignature(rawBody, signatureHeader, secret);
    if (!isValid) {
      return NextResponse.json(
        {
          message: "Invalid webhook signature"
        },
        { status: 401 }
      );
    }

    const event = JSON.parse(rawBody) as StripeEvent;

    if (event.type === "checkout.session.completed") {
      const email =
        event.data?.object?.customer_details?.email ??
        event.data?.object?.customer_email ??
        null;

      if (email) {
        await grantEmailAccess({
          email,
          source: "stripe_webhook",
          eventId: event.id
        });
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Webhook processing failed unexpectedly"
      },
      { status: 500 }
    );
  }
}

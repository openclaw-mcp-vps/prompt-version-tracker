import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { sql } from "@/lib/db";
import { setAccessCookie } from "@/lib/paywall";

const activateSchema = z.object({
  email: z.string().email()
});

export async function POST(request: NextRequest): Promise<NextResponse> {
  const body = await request.json();
  const parsed = activateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const purchase = await sql<{ email: string }>(
    `
    SELECT email
    FROM purchases
    WHERE LOWER(email) = LOWER($1)
    LIMIT 1;
    `,
    [parsed.data.email]
  );

  if (!purchase.rows[0]) {
    return NextResponse.json(
      {
        error:
          "No completed Stripe payment found for that email yet. Wait for webhook sync or check the email used at checkout."
      },
      { status: 403 }
    );
  }

  const response = NextResponse.json({ unlocked: true });
  return setAccessCookie(response);
}

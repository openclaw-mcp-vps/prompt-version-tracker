import { NextResponse } from "next/server";
import { z } from "zod";

import {
  ACCESS_COOKIE_NAME,
  createAccessToken,
  emailHasAccess,
  getAccessCookieMaxAge
} from "@/lib/paywall";

const claimSchema = z.object({
  email: z.string().email().min(3)
});

export async function POST(request: Request) {
  try {
    const payload = claimSchema.parse(await request.json());
    const normalizedEmail = payload.email.toLowerCase().trim();

    const hasAccess = await emailHasAccess(normalizedEmail);

    if (!hasAccess) {
      return NextResponse.json(
        {
          message:
            "No paid access found for that email yet. Complete checkout first, then retry."
        },
        { status: 403 }
      );
    }

    const response = NextResponse.json({
      message: "Purchase verified. Access granted for this browser session."
    });

    response.cookies.set({
      name: ACCESS_COOKIE_NAME,
      value: createAccessToken(normalizedEmail),
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: getAccessCookieMaxAge(),
      path: "/"
    });

    return response;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          message: "Enter a valid email address."
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Unable to verify purchase access"
      },
      { status: 500 }
    );
  }
}

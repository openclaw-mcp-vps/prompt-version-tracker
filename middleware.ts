import { NextRequest, NextResponse } from "next/server";

import { ACCESS_COOKIE } from "@/lib/paywall";

export function middleware(request: NextRequest): NextResponse {
  const hasAccess = request.cookies.get(ACCESS_COOKIE)?.value === "granted";

  if (hasAccess) {
    return NextResponse.next();
  }

  const path = request.nextUrl.pathname;

  if (path.startsWith("/api/")) {
    return NextResponse.json(
      {
        error: "Paywall locked. Complete checkout and unlock access."
      },
      { status: 401 }
    );
  }

  const redirectUrl = new URL("/", request.url);
  redirectUrl.searchParams.set("paywall", "locked");

  return NextResponse.redirect(redirectUrl);
}

export const config = {
  matcher: ["/dashboard/:path*", "/prompts/:path*", "/api/prompts/:path*", "/api/tests/:path*"]
};

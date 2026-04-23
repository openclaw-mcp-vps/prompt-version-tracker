import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export const ACCESS_COOKIE = "pvt_access";
const ACCESS_COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

export async function hasAccessCookie(): Promise<boolean> {
  const cookieStore = await cookies();
  return cookieStore.get(ACCESS_COOKIE)?.value === "granted";
}

export function setAccessCookie(response: NextResponse): NextResponse {
  response.cookies.set(ACCESS_COOKIE, "granted", {
    httpOnly: true,
    maxAge: ACCESS_COOKIE_MAX_AGE,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production"
  });

  return response;
}

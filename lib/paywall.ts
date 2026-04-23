import crypto from "node:crypto";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { initDatabase, query } from "@/lib/database";

export const ACCESS_COOKIE_NAME = "prompt_tracker_access";
const ACCESS_COOKIE_TTL_SECONDS = 60 * 60 * 24 * 30;

type AccessPayload = {
  email: string;
  expiresAt: number;
};

function getSecret(): string {
  return process.env.STRIPE_WEBHOOK_SECRET || "dev-secret-change-me";
}

function base64UrlEncode(value: string): string {
  return Buffer.from(value, "utf8").toString("base64url");
}

function base64UrlDecode(value: string): string {
  return Buffer.from(value, "base64url").toString("utf8");
}

function sign(value: string): string {
  return crypto.createHmac("sha256", getSecret()).update(value).digest("base64url");
}

export function createAccessToken(email: string): string {
  const payload: AccessPayload = {
    email: email.toLowerCase().trim(),
    expiresAt: Date.now() + ACCESS_COOKIE_TTL_SECONDS * 1000
  };

  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = sign(encodedPayload);

  return `${encodedPayload}.${signature}`;
}

export function verifyAccessToken(token: string): AccessPayload | null {
  const [encodedPayload, signature] = token.split(".");

  if (!encodedPayload || !signature) {
    return null;
  }

  const expected = sign(encodedPayload);
  if (signature.length !== expected.length) {
    return null;
  }
  const isMatch = crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  );

  if (!isMatch) {
    return null;
  }

  try {
    const payload = JSON.parse(base64UrlDecode(encodedPayload)) as AccessPayload;

    if (!payload.email || typeof payload.expiresAt !== "number") {
      return null;
    }

    if (payload.expiresAt < Date.now()) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export async function emailHasAccess(email: string): Promise<boolean> {
  await initDatabase();

  const result = await query<{ email: string }>(
    `
    SELECT email
    FROM access_grants
    WHERE email = $1
    LIMIT 1
    `,
    [email.toLowerCase().trim()]
  );

  return (result.rowCount ?? 0) > 0;
}

export async function grantEmailAccess(input: {
  email: string;
  source: string;
  eventId?: string | null;
}): Promise<void> {
  await initDatabase();

  await query(
    `
    INSERT INTO access_grants (email, source, last_event_id)
    VALUES ($1, $2, $3)
    ON CONFLICT (email)
    DO UPDATE SET
      source = EXCLUDED.source,
      last_event_id = EXCLUDED.last_event_id,
      granted_at = NOW()
    `,
    [input.email.toLowerCase().trim(), input.source, input.eventId ?? null]
  );
}

export async function getPaidAccessEmail(): Promise<string | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ACCESS_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  const payload = verifyAccessToken(token);
  return payload?.email ?? null;
}

export async function requirePaidAccess(): Promise<string> {
  const email = await getPaidAccessEmail();

  if (!email) {
    redirect("/unlock");
  }

  return email;
}

export async function requireApiAccess(): Promise<string> {
  const email = await getPaidAccessEmail();
  if (!email) {
    throw new Error("Access denied. Unlock your workspace first.");
  }
  return email;
}

export function getAccessCookieMaxAge(): number {
  return ACCESS_COOKIE_TTL_SECONDS;
}

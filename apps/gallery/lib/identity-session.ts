import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import type { UserRole } from "@prisma/client";

const IDENTITY_COOKIE = "rr_identity";
const IDENTITY_TTL_SECONDS = 60 * 60 * 8;

export type IdentitySession = {
  userId: string;
  authUserId: string;
  email: string;
  name?: string | null;
  role: UserRole;
  exp: number;
};

function secret() {
  const value = process.env.AUTH_SESSION_SECRET || process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET;
  if (value) return value;
  if (process.env.NODE_ENV === "production") {
    throw new Error("AUTH_SESSION_SECRET, JWT_SECRET, or NEXTAUTH_SECRET must be set.");
  }
  return "rooh-auth-development-secret-change-me";
}

function sign(payload: string) {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

function encode(session: IdentitySession) {
  const payload = Buffer.from(JSON.stringify(session)).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

function decode(token: string): IdentitySession | null {
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;
  const expected = Buffer.from(sign(payload));
  const actual = Buffer.from(signature);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;

  const session = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as IdentitySession;
  return session.userId && session.authUserId && session.email && session.exp > Math.floor(Date.now() / 1000)
    ? session
    : null;
}

export function identityCookie(user: Omit<IdentitySession, "exp">) {
  return {
    name: IDENTITY_COOKIE,
    value: encode({
      ...user,
      exp: Math.floor(Date.now() / 1000) + IDENTITY_TTL_SECONDS
    }),
    options: {
      httpOnly: true,
      sameSite: "lax" as const,
      secure: process.env.NODE_ENV === "production",
      maxAge: IDENTITY_TTL_SECONDS,
      path: "/"
    }
  };
}

export async function getIdentitySession() {
  const value = (await cookies()).get(IDENTITY_COOKIE)?.value;
  if (!value) return null;
  try {
    return decode(value);
  } catch {
    return null;
  }
}

export async function clearIdentitySession() {
  (await cookies()).delete(IDENTITY_COOKIE);
}

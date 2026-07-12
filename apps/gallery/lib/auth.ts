import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";

const GALLERY_SESSION_COOKIE = "rr_gallery_session";
const GALLERY_SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;

export type GallerySession = {
  eventId: string;
  visitorId: string;
  exp: number;
};

function sessionSecret() {
  const secret = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET;
  if (secret) return secret;
  if (process.env.NODE_ENV === "production") {
    throw new Error("JWT_SECRET or NEXTAUTH_SECRET must be set in production.");
  }
  return "gallery-development-secret-change-me";
}

function sign(payload: string) {
  return createHmac("sha256", sessionSecret()).update(payload).digest("base64url");
}

function createToken(session: GallerySession) {
  const payload = Buffer.from(JSON.stringify(session)).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

function readToken(token: string): GallerySession | null {
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;

  const expected = Buffer.from(sign(payload));
  const actual = Buffer.from(signature);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;

  const session = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as GallerySession;
  if (!session.eventId || !session.visitorId || session.exp < Math.floor(Date.now() / 1000)) return null;
  return session;
}

export async function hashSecret(value: string) {
  return bcrypt.hash(value, 12);
}

export async function verifySecret(value: string, hash: string) {
  return bcrypt.compare(value, hash);
}

export async function createGallerySession(eventId: string) {
  const session: GallerySession = {
    eventId,
    visitorId: randomUUID(),
    exp: Math.floor(Date.now() / 1000) + GALLERY_SESSION_TTL_SECONDS
  };
  const cookieStore = await cookies();
  cookieStore.set(GALLERY_SESSION_COOKIE, createToken(session), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: GALLERY_SESSION_TTL_SECONDS,
    path: "/"
  });
  return session;
}

export async function getGallerySession(eventId: string) {
  const token = (await cookies()).get(GALLERY_SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const session = readToken(token);
    return session?.eventId === eventId ? session : null;
  } catch {
    return null;
  }
}

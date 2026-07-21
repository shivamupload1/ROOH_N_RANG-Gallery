import { createHmac, timingSafeEqual } from "node:crypto";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import type { GalleryViewer } from "@/lib/viewer-auth";

const GALLERY_SESSION_COOKIE = "rr_gallery_session";
const GALLERY_SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;

export type GallerySession = {
  eventId: string;
  visitorId: string;
  authUserId: string;
  accessKey: string;
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
  if (!session.eventId || !session.visitorId || !session.authUserId || !session.accessKey || session.exp < Math.floor(Date.now() / 1000)) return null;
  return session;
}

function galleryAccessKey(pinHash: string) {
  return createHmac("sha256", sessionSecret()).update(`gallery-access:${pinHash}`).digest("base64url").slice(0, 32);
}

export function galleryVisitorId(authUserId: string) {
  return `google:${authUserId}`;
}

export async function hashSecret(value: string) {
  return bcrypt.hash(value, 12);
}

export async function verifySecret(value: string, hash: string) {
  return bcrypt.compare(value, hash);
}

export function createGallerySessionCookie(eventId: string, viewer: GalleryViewer, pinHash: string) {
  const session: GallerySession = {
    eventId,
    visitorId: galleryVisitorId(viewer.id),
    authUserId: viewer.id,
    accessKey: galleryAccessKey(pinHash),
    exp: Math.floor(Date.now() / 1000) + GALLERY_SESSION_TTL_SECONDS
  };

  return {
    session,
    cookie: {
      name: GALLERY_SESSION_COOKIE,
      value: createToken(session),
      options: {
        httpOnly: true,
        sameSite: "lax" as const,
        secure: process.env.NODE_ENV === "production",
        maxAge: GALLERY_SESSION_TTL_SECONDS,
        path: "/"
      }
    }
  };
}

export async function getGallerySession(eventId: string, authUserId: string, pinHash: string) {
  const token = (await cookies()).get(GALLERY_SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const session = readToken(token);
    return session?.eventId === eventId &&
      session.authUserId === authUserId &&
      session.accessKey === galleryAccessKey(pinHash)
      ? session
      : null;
  } catch {
    return null;
  }
}

export async function clearGallerySession() {
  (await cookies()).delete(GALLERY_SESSION_COOKIE);
}

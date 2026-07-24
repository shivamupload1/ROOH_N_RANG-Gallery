import { createClient as createSupabaseServerClient } from "@/lib/supabase/server";
import { getIdentitySession } from "@/lib/identity-session";

export const GALLERY_AUTH_NEXT_COOKIE = "rr_gallery_auth_next";

export type GalleryViewer = {
  id: string;
  email: string;
  userId?: string;
  name?: string | null;
  role?: "ADMIN" | "CLIENT" | "GUEST";
};

export function safeInternalPath(candidate: string | null | undefined, fallback = "/client-login") {
  const value = String(candidate || "").trim();
  return value.startsWith("/") && !value.startsWith("//") && !value.includes("\\") ? value : fallback;
}

export function gallerySignInHref(nextPath: string) {
  const websiteFallback = process.env.NODE_ENV === "production"
    ? "https://rooh-n-rang.vercel.app"
    : "http://localhost:3000";
  const galleryFallback = process.env.NODE_ENV === "production"
    ? "https://rooh-n-rang-gallery.vercel.app"
    : "http://localhost:3002";
  const websiteUrl = process.env.WEBSITE_URL || process.env.NEXT_PUBLIC_WEBSITE_URL || websiteFallback;
  const galleryUrl = process.env.GALLERY_URL || process.env.NEXT_PUBLIC_GALLERY_URL || galleryFallback;
  const returnUrl = new URL(safeInternalPath(nextPath), galleryUrl).toString();
  const loginUrl = new URL("/main.html", websiteUrl);
  loginUrl.searchParams.set("next", returnUrl);
  loginUrl.hash = "login";
  return loginUrl.toString();
}

export function galleryPublicOrigin(requestOrigin: string) {
  const configuredUrl = process.env.GALLERY_URL || process.env.NEXT_PUBLIC_GALLERY_URL;

  try {
    return new URL(configuredUrl || requestOrigin).origin;
  } catch {
    return new URL(requestOrigin).origin;
  }
}

export async function getGalleryViewer(): Promise<GalleryViewer | null> {
  const identity = await getIdentitySession();
  if (identity) {
    return {
      id: identity.authUserId,
      email: identity.email,
      userId: identity.userId,
      name: identity.name,
      role: identity.role
    };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getClaims();
  const claims = data?.claims;
  const id = typeof claims?.sub === "string" ? claims.sub : "";
  const email = typeof claims?.email === "string" ? claims.email.toLowerCase() : "";

  if (!error && id && email) {
    return { id, email };
  }

  const { data: userData, error: userError } = await supabase.auth.getUser();
  const userId = userData.user?.id || "";
  const userEmail = userData.user?.email?.toLowerCase() || "";

  return userError || !userId || !userEmail ? null : { id: userId, email: userEmail };
}

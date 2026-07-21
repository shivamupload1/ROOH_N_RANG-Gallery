import { createClient as createSupabaseServerClient } from "@/lib/supabase/server";

export const GALLERY_AUTH_NEXT_COOKIE = "rr_gallery_auth_next";

export type GalleryViewer = {
  id: string;
  email: string;
};

export function safeInternalPath(candidate: string | null | undefined, fallback = "/client-login") {
  const value = String(candidate || "").trim();
  return value.startsWith("/") && !value.startsWith("//") && !value.includes("\\") ? value : fallback;
}

export function gallerySignInHref(nextPath: string) {
  return `/auth/sign-in?next=${encodeURIComponent(safeInternalPath(nextPath))}`;
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

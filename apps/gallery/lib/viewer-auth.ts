import { createClient as createSupabaseServerClient } from "@/lib/supabase/server";

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

export async function getGalleryViewer(): Promise<GalleryViewer | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getClaims();
  const claims = data?.claims;
  const id = typeof claims?.sub === "string" ? claims.sub : "";
  const email = typeof claims?.email === "string" ? claims.email.toLowerCase() : "";

  return error || !id || !email ? null : { id, email };
}

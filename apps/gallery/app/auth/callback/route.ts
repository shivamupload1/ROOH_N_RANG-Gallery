import { NextRequest, NextResponse } from "next/server";
import { createSupabaseRouteClient } from "@/lib/supabase/route";
import { GALLERY_AUTH_NEXT_COOKIE, galleryPublicOrigin, safeInternalPath } from "@/lib/viewer-auth";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const nextPath = safeInternalPath(
    request.cookies.get(GALLERY_AUTH_NEXT_COOKIE)?.value || request.nextUrl.searchParams.get("next")
  );
  const publicOrigin = galleryPublicOrigin(request.nextUrl.origin);
  const { supabase, applyAuthCookies } = createSupabaseRouteClient(request);

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const response = NextResponse.redirect(new URL(nextPath, publicOrigin));
      response.cookies.delete(GALLERY_AUTH_NEXT_COOKIE);
      return applyAuthCookies(response);
    }
  }

  const signInUrl = new URL("/auth/sign-in", publicOrigin);
  signInUrl.searchParams.set("next", nextPath);
  signInUrl.searchParams.set("error", "callback");
  const response = NextResponse.redirect(signInUrl);
  response.cookies.delete(GALLERY_AUTH_NEXT_COOKIE);
  return applyAuthCookies(response);
}

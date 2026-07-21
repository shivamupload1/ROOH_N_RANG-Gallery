import { NextRequest, NextResponse } from "next/server";
import { createSupabaseRouteClient } from "@/lib/supabase/route";
import { GALLERY_AUTH_NEXT_COOKIE, galleryPublicOrigin, safeInternalPath } from "@/lib/viewer-auth";

export async function GET(request: NextRequest) {
  const nextPath = safeInternalPath(request.nextUrl.searchParams.get("next"));
  const publicOrigin = galleryPublicOrigin(request.nextUrl.origin);
  const callbackUrl = new URL("/auth/callback", publicOrigin);

  const { supabase, applyAuthCookies } = createSupabaseRouteClient(request);
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: callbackUrl.toString(),
      queryParams: {
        prompt: "select_account"
      }
    }
  });

  if (error || !data.url) {
    const signInUrl = new URL("/auth/sign-in", publicOrigin);
    signInUrl.searchParams.set("next", nextPath);
    signInUrl.searchParams.set("error", "google");
    return applyAuthCookies(NextResponse.redirect(signInUrl));
  }

  const response = NextResponse.redirect(data.url);
  response.cookies.set(GALLERY_AUTH_NEXT_COOKIE, nextPath, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 10,
    path: "/"
  });
  return applyAuthCookies(response);
}

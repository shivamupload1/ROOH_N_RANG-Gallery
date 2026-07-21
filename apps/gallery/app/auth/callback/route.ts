import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseServerClient } from "@/lib/supabase/server";
import { GALLERY_AUTH_NEXT_COOKIE, galleryPublicOrigin, safeInternalPath } from "@/lib/viewer-auth";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const nextPath = safeInternalPath(
    request.cookies.get(GALLERY_AUTH_NEXT_COOKIE)?.value || request.nextUrl.searchParams.get("next")
  );
  const publicOrigin = galleryPublicOrigin(request.nextUrl.origin);

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const response = NextResponse.redirect(new URL(nextPath, publicOrigin));
      response.cookies.delete(GALLERY_AUTH_NEXT_COOKIE);
      return response;
    }
  }

  const signInUrl = new URL("/auth/sign-in", publicOrigin);
  signInUrl.searchParams.set("next", nextPath);
  signInUrl.searchParams.set("error", "callback");
  const response = NextResponse.redirect(signInUrl);
  response.cookies.delete(GALLERY_AUTH_NEXT_COOKIE);
  return response;
}

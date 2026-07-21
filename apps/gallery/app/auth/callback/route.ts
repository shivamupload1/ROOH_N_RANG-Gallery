import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseServerClient } from "@/lib/supabase/server";
import { safeInternalPath } from "@/lib/viewer-auth";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const nextPath = safeInternalPath(request.nextUrl.searchParams.get("next"));

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(new URL(nextPath, request.nextUrl.origin));
    }
  }

  const signInUrl = new URL("/auth/sign-in", request.nextUrl.origin);
  signInUrl.searchParams.set("next", nextPath);
  signInUrl.searchParams.set("error", "callback");
  return NextResponse.redirect(signInUrl);
}

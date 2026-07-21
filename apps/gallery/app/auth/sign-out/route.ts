import { NextRequest, NextResponse } from "next/server";
import { clearGallerySession } from "@/lib/auth";
import { createClient as createSupabaseServerClient } from "@/lib/supabase/server";
import { safeInternalPath } from "@/lib/viewer-auth";

export async function GET(request: NextRequest) {
  const nextPath = safeInternalPath(request.nextUrl.searchParams.get("next"), "/client-login");
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  await clearGallerySession();
  return NextResponse.redirect(new URL(nextPath, request.nextUrl.origin));
}

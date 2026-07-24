import { NextRequest, NextResponse } from "next/server";
import { clearGallerySession } from "@/lib/auth";
import { clearIdentitySession } from "@/lib/identity-session";
import { createClient as createSupabaseServerClient } from "@/lib/supabase/server";
import { gallerySignInHref, safeInternalPath } from "@/lib/viewer-auth";

export async function GET(request: NextRequest) {
  const nextPath = safeInternalPath(request.nextUrl.searchParams.get("next"), "/client-login");
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  await clearGallerySession();
  await clearIdentitySession();
  return NextResponse.redirect(gallerySignInHref(nextPath));
}

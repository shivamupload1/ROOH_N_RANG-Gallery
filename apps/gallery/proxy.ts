import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

function galleryCanonicalOrigin(requestOrigin: string) {
  const configuredUrl = process.env.GALLERY_URL || process.env.NEXT_PUBLIC_GALLERY_URL;

  try {
    return new URL(configuredUrl || requestOrigin).origin;
  } catch {
    return new URL(requestOrigin).origin;
  }
}

export async function proxy(request: NextRequest) {
  const canonicalOrigin = galleryCanonicalOrigin(request.nextUrl.origin);

  if (process.env.NODE_ENV === "production" && request.nextUrl.origin !== canonicalOrigin) {
    const canonicalUrl = new URL(`${request.nextUrl.pathname}${request.nextUrl.search}`, canonicalOrigin);
    return NextResponse.redirect(canonicalUrl, 308);
  }

  return updateSession(request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"]
};

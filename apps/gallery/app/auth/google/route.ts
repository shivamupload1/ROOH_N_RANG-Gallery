import { NextRequest, NextResponse } from "next/server";
import { gallerySignInHref, safeInternalPath } from "@/lib/viewer-auth";

export async function GET(request: NextRequest) {
  const nextPath = safeInternalPath(request.nextUrl.searchParams.get("next"));
  return NextResponse.redirect(gallerySignInHref(nextPath));
}

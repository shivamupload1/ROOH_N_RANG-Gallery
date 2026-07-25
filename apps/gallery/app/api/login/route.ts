import { NextRequest, NextResponse } from "next/server";
import { gallerySignInHref, safeInternalPath } from "@/lib/viewer-auth";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const next = safeInternalPath(String(formData.get("next") || ""), "/");
  return NextResponse.redirect(gallerySignInHref(next), 303);
}

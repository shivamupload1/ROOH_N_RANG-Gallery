import { NextRequest, NextResponse } from "next/server";
import { clearGallerySession } from "@/lib/auth";

export async function GET(request: NextRequest, { params }: { params: Promise<{ eventSlug: string }> }) {
  const { eventSlug } = await params;
  await clearGallerySession();
  return NextResponse.redirect(new URL(`/gallery/${eventSlug}`, request.nextUrl.origin));
}

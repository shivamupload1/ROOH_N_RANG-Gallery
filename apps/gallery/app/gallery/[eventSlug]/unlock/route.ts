import { NextRequest, NextResponse } from "next/server";
import { createGallerySessionCookie, verifySecret } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { galleryPinSchema } from "@/lib/validators";
import { galleryPublicOrigin, gallerySignInHref, getGalleryViewer, safeInternalPath } from "@/lib/viewer-auth";

function redirectWithError(origin: string, returnPath: string, error: string) {
  const url = new URL(returnPath, origin);
  url.searchParams.set("error", error);
  return NextResponse.redirect(url, 303);
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ eventSlug: string }> }) {
  const { eventSlug } = await params;
  const formData = await request.formData();
  const returnPath = safeInternalPath(String(formData.get("returnPath") || ""), `/gallery/${eventSlug}`);
  const publicOrigin = galleryPublicOrigin(request.nextUrl.origin);
  const viewer = await getGalleryViewer();

  if (!viewer) {
    return NextResponse.redirect(new URL(gallerySignInHref(returnPath), publicOrigin), 303);
  }

  const parsedResult = galleryPinSchema.safeParse(Object.fromEntries(formData));
  if (!parsedResult.success) {
    return redirectWithError(publicOrigin, returnPath, "pin");
  }

  const event = await prisma.event.findUnique({
    where: { id: parsedResult.data.eventId },
    select: { id: true, slug: true, pinHash: true, isPublished: true }
  });

  if (!event || event.slug !== eventSlug || !event.isPublished) {
    return redirectWithError(publicOrigin, returnPath, "unavailable");
  }

  const matches = await verifySecret(parsedResult.data.pin, event.pinHash);
  if (!matches) {
    return redirectWithError(publicOrigin, returnPath, "pin");
  }

  const { cookie } = createGallerySessionCookie(event.id, viewer, event.pinHash);
  const response = NextResponse.redirect(new URL(returnPath, publicOrigin), 303);
  response.cookies.set(cookie.name, cookie.value, cookie.options);
  response.headers.set("Cache-Control", "private, no-cache, no-store, must-revalidate, max-age=0");
  return response;
}

import { NextRequest, NextResponse } from "next/server";
import { galleryVisitorId, getGallerySession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getGalleryViewer } from "@/lib/viewer-auth";

const MAX_FAVORITES_PER_REQUEST = 150;

export async function POST(request: NextRequest, { params }: { params: Promise<{ eventSlug: string }> }) {
  const viewer = await getGalleryViewer();
  if (!viewer) {
    return NextResponse.json({ error: "google_sign_in_required" }, { status: 401 });
  }

  const { eventSlug } = await params;
  const event = await prisma.event.findUnique({
    where: { slug: eventSlug },
    select: { id: true, accessMode: true, expiryDate: true, isPublished: true, pinHash: true }
  });

  if (!event || !event.isPublished || (event.expiryDate && event.expiryDate.getTime() < Date.now())) {
    return NextResponse.json({ error: "gallery_unavailable" }, { status: 404 });
  }

  const session = await getGallerySession(event.id, viewer.id, event.pinHash);
  if (!session && event.accessMode === "PIN") {
    return NextResponse.json({ error: "gallery_pin_required" }, { status: 403 });
  }

  const body = await request.json().catch(() => null) as { mediaIds?: unknown; favorite?: unknown } | null;
  const mediaIds = Array.isArray(body?.mediaIds)
    ? [...new Set(body.mediaIds.filter((value): value is string => typeof value === "string" && value.length > 0))]
    : [];

  if (mediaIds.length === 0 || mediaIds.length > MAX_FAVORITES_PER_REQUEST || typeof body?.favorite !== "boolean") {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const matchingMediaCount = await prisma.mediaFile.count({
    where: { eventId: event.id, id: { in: mediaIds } }
  });
  if (matchingMediaCount !== mediaIds.length) {
    return NextResponse.json({ error: "invalid_media" }, { status: 400 });
  }

  const visitorId = session?.visitorId || galleryVisitorId(viewer.id);
  if (body.favorite) {
    await prisma.favorite.createMany({
      data: mediaIds.map((mediaFileId) => ({ eventId: event.id, mediaFileId, visitorId })),
      skipDuplicates: true
    });
  } else {
    await prisma.favorite.deleteMany({
      where: { eventId: event.id, visitorId, mediaFileId: { in: mediaIds } }
    });
  }

  return NextResponse.json(
    { mediaIds, favorite: body.favorite },
    { headers: { "cache-control": "no-store" } }
  );
}

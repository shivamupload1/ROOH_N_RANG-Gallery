import { NextRequest, NextResponse } from "next/server";
import { galleryVisitorId, getGallerySession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { fetchDriveFileAsset } from "@/lib/google-drive";
import { getGalleryViewer } from "@/lib/viewer-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, { params }: { params: Promise<{ mediaId: string }> }) {
  const { mediaId } = await params;
  const media = await prisma.mediaFile.findUnique({
    where: { id: mediaId },
    include: { event: true }
  });

  if (!media || !media.event.isPublished || !media.event.downloadAllowed || !media.downloadAllowed) {
    return new NextResponse("Download not allowed", { status: 403 });
  }

  const viewer = await getGalleryViewer();
  if (!viewer) {
    return new NextResponse("Google sign-in required", { status: 401 });
  }

  const session = await getGallerySession(media.eventId, viewer.id, media.event.pinHash);

  if (!session && media.event.accessMode !== "PUBLIC") {
    return new NextResponse("Gallery PIN required", { status: 401 });
  }

  await prisma.download.create({
    data: {
      eventId: media.eventId,
      mediaFileId: media.id,
      visitorId: session?.visitorId || galleryVisitorId(viewer.id),
      ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0] || null,
      userAgent: request.headers.get("user-agent")
    }
  });

  try {
    const assetResponse = await fetchDriveFileAsset({
      driveAccountId: media.driveAccountId,
      fileId: media.driveFileId,
      preferThumbnail: false
    });
    const assetBody = await assetResponse.arrayBuffer();
    const safeFileName = media.fileName.replace(/"/g, "");

    return new NextResponse(assetBody, {
      headers: {
        "content-type": assetResponse.headers.get("content-type") || media.mimeType || "application/octet-stream",
        "content-disposition": `attachment; filename="${safeFileName}"`,
        "cache-control": "private, no-store, max-age=0"
      }
    });
  } catch {
    return new NextResponse("Could not download this Google Drive file right now.", { status: 502 });
  }
}

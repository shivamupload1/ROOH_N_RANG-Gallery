"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { galleryVisitorId, getGallerySession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { selectionSubmissionKey } from "@/lib/selection-submissions";
import { gallerySignInHref, getGalleryViewer } from "@/lib/viewer-auth";

function galleryReturnPath(eventSlug: string, candidate: string) {
  if (candidate.startsWith("/") && !candidate.startsWith("//") && !candidate.includes("?") && !candidate.includes("#")) {
    return candidate;
  }

  return `/gallery/${eventSlug}`;
}

function galleryReturnUrl(path: string, query: Record<string, string>) {
  const params = new URLSearchParams(query);
  return params.size > 0 ? `${path}?${params.toString()}` : path;
}

export async function toggleFavoriteAction(eventSlug: string, returnPath: string, mediaFileId: string) {
  const safeReturnPath = galleryReturnPath(eventSlug, returnPath);
  const viewer = await getGalleryViewer();
  if (!viewer) {
    redirect(gallerySignInHref(safeReturnPath));
  }

  const event = await prisma.event.findUnique({ where: { slug: eventSlug }, select: { id: true, accessMode: true, pinHash: true } });

  if (!event) {
    redirect(safeReturnPath);
  }

  const session = await getGallerySession(event.id, viewer.id, event.pinHash);
  if (!session && event.accessMode === "PIN") {
    redirect(safeReturnPath);
  }
  const visitorId = session?.visitorId || galleryVisitorId(viewer.id);

  const existing = await prisma.favorite.findFirst({
    where: {
      eventId: event.id,
      mediaFileId,
      visitorId
    },
    select: { id: true }
  });

  if (existing) {
    await prisma.favorite.delete({ where: { id: existing.id } });
  } else {
    await prisma.favorite.create({
      data: {
        eventId: event.id,
        mediaFileId,
        visitorId
      }
    });
  }

  revalidatePath(`/gallery/${eventSlug}`);
  revalidatePath(safeReturnPath);
  revalidatePath("/admin/favorites");
}

export async function submitSelectionAction(eventSlug: string, returnPath: string) {
  const safeReturnPath = galleryReturnPath(eventSlug, returnPath);
  const event = await prisma.event.findUnique({
    where: { slug: eventSlug },
    include: { client: true }
  });

  if (!event) {
    redirect(safeReturnPath);
  }

  const viewer = await getGalleryViewer();
  if (!viewer) {
    redirect(gallerySignInHref(safeReturnPath));
  }

  const session = await getGallerySession(event.id, viewer.id, event.pinHash);
  if (!session && event.accessMode === "PIN") {
    redirect(safeReturnPath);
  }
  const visitorId = session?.visitorId || galleryVisitorId(viewer.id);

  const favorites = await prisma.favorite.findMany({
    where: {
      eventId: event.id,
      visitorId
    },
    include: {
      mediaFile: {
        select: {
          id: true,
          fileName: true
        }
      }
    },
    orderBy: { createdAt: "asc" }
  });

  if (favorites.length === 0) {
    redirect(galleryReturnUrl(safeReturnPath, { selection: "empty" }));
  }

  const submissionValue = {
    eventId: event.id,
    eventSlug: event.slug,
    eventName: event.name,
    clientName: event.client.name,
    visitorId,
    submittedAt: new Date().toISOString(),
    favoriteCount: favorites.length,
    mediaFileIds: favorites.map((favorite) => favorite.mediaFile.id),
    fileNames: favorites.map((favorite) => favorite.mediaFile.fileName)
  };

  await prisma.settings.upsert({
    where: {
      key: selectionSubmissionKey(event.id, visitorId)
    },
    update: {
      value: submissionValue
    },
    create: {
      key: selectionSubmissionKey(event.id, visitorId),
      value: submissionValue
    }
  });

  revalidatePath(`/gallery/${eventSlug}`);
  revalidatePath(safeReturnPath);
  revalidatePath("/admin/favorites");
  revalidatePath("/admin/galleries");
  revalidatePath("/admin/events");
  redirect(galleryReturnUrl(safeReturnPath, { selection: "submitted" }));
}

"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createGallerySession, getGallerySession, verifySecret } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { selectionSubmissionKey } from "@/lib/selection-submissions";
import { galleryPinSchema } from "@/lib/validators";

export async function verifyGalleryPinAction(eventSlug: string, formData: FormData) {
  const parsed = galleryPinSchema.parse(Object.fromEntries(formData));
  const event = await prisma.event.findUnique({ where: { id: parsed.eventId } });

  if (!event || event.slug !== eventSlug || !event.isPublished) {
    redirect(`/gallery/${eventSlug}?error=unavailable`);
  }

  const matches = await verifySecret(parsed.pin, event.pinHash);

  if (!matches) {
    redirect(`/gallery/${eventSlug}?error=pin`);
  }

  await createGallerySession(event.id);
  redirect(`/gallery/${eventSlug}`);
}

export async function toggleFavoriteAction(eventSlug: string, mediaFileId: string) {
  const event = await prisma.event.findUnique({ where: { slug: eventSlug }, select: { id: true, accessMode: true } });

  if (!event) {
    redirect(`/gallery/${eventSlug}`);
  }

  let session = await getGallerySession(event.id);

  if (!session && event.accessMode === "PUBLIC") {
    session = await createGallerySession(event.id);
  }

  if (!session) {
    redirect(`/gallery/${eventSlug}`);
  }

  const existing = await prisma.favorite.findFirst({
    where: {
      eventId: event.id,
      mediaFileId,
      visitorId: session.visitorId
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
        visitorId: session.visitorId
      }
    });
  }

  revalidatePath(`/gallery/${eventSlug}`);
  revalidatePath("/admin/favorites");
}

export async function submitSelectionAction(eventSlug: string) {
  const event = await prisma.event.findUnique({
    where: { slug: eventSlug },
    include: { client: true }
  });

  if (!event) {
    redirect(`/gallery/${eventSlug}`);
  }

  let session = await getGallerySession(event.id);

  if (!session && event.accessMode === "PUBLIC") {
    session = await createGallerySession(event.id);
  }

  if (!session) {
    redirect(`/gallery/${eventSlug}`);
  }

  const favorites = await prisma.favorite.findMany({
    where: {
      eventId: event.id,
      visitorId: session.visitorId
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
    redirect(`/gallery/${eventSlug}?selection=empty`);
  }

  const submissionValue = {
    eventId: event.id,
    eventSlug: event.slug,
    eventName: event.name,
    clientName: event.client.name,
    visitorId: session.visitorId,
    submittedAt: new Date().toISOString(),
    favoriteCount: favorites.length,
    mediaFileIds: favorites.map((favorite) => favorite.mediaFile.id),
    fileNames: favorites.map((favorite) => favorite.mediaFile.fileName)
  };

  await prisma.settings.upsert({
    where: {
      key: selectionSubmissionKey(event.id, session.visitorId)
    },
    update: {
      value: submissionValue
    },
    create: {
      key: selectionSubmissionKey(event.id, session.visitorId),
      value: submissionValue
    }
  });

  revalidatePath(`/gallery/${eventSlug}`);
  revalidatePath("/admin/favorites");
  revalidatePath("/admin/galleries");
  revalidatePath("/admin/events");
  redirect(`/gallery/${eventSlug}?selection=submitted`);
}

import { notFound } from "next/navigation";
import GalleryPage from "@/app/gallery/[eventSlug]/page";
import { prisma } from "@/lib/db";
import { galleryShareCodeKey, parseGalleryShareValue } from "@/lib/gallery-share";

type GallerySearchParams = {
  error?: string;
  selection?: string;
  view?: string;
  media?: string;
  page?: string;
  __base?: string;
};

export const dynamic = "force-dynamic";

export default async function SharedGalleryPage({
  params,
  searchParams
}: {
  params: Promise<{ clientSegment: string; dateSegment: string; shareCode: string }>;
  searchParams: Promise<GallerySearchParams>;
}) {
  const { clientSegment, dateSegment, shareCode } = await params;
  const record = await prisma.settings.findUnique({
    where: { key: galleryShareCodeKey(shareCode) },
    select: { value: true }
  });
  const share = parseGalleryShareValue(record?.value);

  if (!share || share.code !== shareCode) {
    notFound();
  }

  const event = await prisma.event.findUnique({ where: { id: share.eventId }, select: { slug: true } });

  if (!event) {
    notFound();
  }

  const resolvedSearchParams = await searchParams;
  const basePath = `/${clientSegment}/${dateSegment}/${shareCode}`;

  return GalleryPage({
    params: Promise.resolve({ eventSlug: event.slug }),
    searchParams: Promise.resolve({ ...resolvedSearchParams, __base: basePath })
  });
}

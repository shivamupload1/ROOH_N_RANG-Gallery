import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowDown, ChevronLeft, ChevronRight, Download, Heart, LockKeyhole, Play, Send, X } from "lucide-react";
import type { CSSProperties } from "react";
import { submitSelectionAction, toggleFavoriteAction } from "@/app/gallery/[eventSlug]/actions";
import { GalleryMasonryGrid } from "@/components/gallery-masonry-grid";
import { GalleryShareButton } from "@/components/gallery-share-button";
import { GalleryPinOverlay } from "@/components/gallery-pin-overlay";
import { galleryVisitorId, getGallerySession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { eventCoverKey, parseEventCover } from "@/lib/event-cover";
import { parseSelectionSubmission, selectionSubmissionKey } from "@/lib/selection-submissions";
import { getSiteBrand } from "@/lib/site-content";
import { gallerySignInHref, getGalleryViewer } from "@/lib/viewer-auth";

export const dynamic = "force-dynamic";
const GALLERY_PAGE_SIZE = 150;

function isExpired(expiryDate?: Date | null) {
  return Boolean(expiryDate && expiryDate.getTime() < Date.now());
}

function formatEventDate(value?: Date | null) {
  if (!value) {
    return "Private gallery";
  }

  return value.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric"
  });
}

function compareMediaByFileName(a: { fileName: string }, b: { fileName: string }) {
  return a.fileName.localeCompare(b.fileName, "en", { numeric: true, sensitivity: "base" });
}

function galleryHref(basePath: string, view: string, mediaId?: string | null, page?: number) {
  const params = new URLSearchParams();

  if (view !== "all") {
    params.set("view", view);
  }

  if (mediaId) {
    params.set("media", mediaId);
  }

  if (page && page > 1) {
    params.set("page", String(page));
  }

  const suffix = params.size > 0 ? `?${params.toString()}` : "";
  return `${basePath}${suffix}`;
}

function galleryBasePath(eventSlug: string, candidate?: string) {
  if (candidate && /^\/[a-z0-9-]+\/(?:\d{4}-\d{2}-\d{2}|undated)\/[a-z0-9]{10}$/.test(candidate)) {
    return candidate;
  }

  return `/gallery/${eventSlug}`;
}

export default async function GalleryPage({
  params,
  searchParams
}: {
  params: Promise<{ eventSlug: string }>;
  searchParams: Promise<{ error?: string; selection?: string; view?: string; media?: string; page?: string; __base?: string }>;
}) {
  const { eventSlug } = await params;
  const { error, selection, view, media, page, __base } = await searchParams;
  const basePath = galleryBasePath(eventSlug, __base);
  const brand = await getSiteBrand();
  const event = await prisma.event.findUnique({
    where: { slug: eventSlug },
    include: {
      client: true,
      mediaFiles: {
        where: { albumId: null },
        orderBy: { createdAt: "asc" }
      },
      albums: {
        include: {
          mediaFiles: {
            orderBy: { createdAt: "asc" }
          }
        },
        orderBy: { sortOrder: "asc" }
      }
    }
  });

  if (!event || !event.isPublished) {
    return (
      <main className="min-h-screen bg-ivory px-4 py-16 text-ink">
        <div className="mx-auto max-w-xl rounded-lg bg-white p-8 text-center shadow-soft">
          <LockKeyhole className="mx-auto text-rust" />
          <h1 className="mt-4 text-3xl font-semibold">Gallery unavailable</h1>
          <p className="mt-3 text-sm leading-6 text-ink/65">This gallery is not published yet. Please contact the studio.</p>
        </div>
      </main>
    );
  }

  if (isExpired(event.expiryDate)) {
    return (
      <main className="min-h-screen bg-ivory px-4 py-16 text-ink">
        <div className="mx-auto max-w-xl rounded-lg bg-white p-8 text-center shadow-soft">
          <LockKeyhole className="mx-auto text-rust" />
          <h1 className="mt-4 text-3xl font-semibold">Gallery expired</h1>
          <p className="mt-3 text-sm leading-6 text-ink/65">This private gallery has passed its expiry date. Ask the studio to reopen it.</p>
        </div>
      </main>
    );
  }

  const viewer = await getGalleryViewer();
  if (!viewer) {
    redirect(gallerySignInHref(basePath));
  }

  const coverRecord = await prisma.settings.findUnique({
    where: { key: eventCoverKey(event.id) },
    select: { value: true }
  });
  const cover = parseEventCover(coverRecord?.value);
  const session = await getGallerySession(event.id, viewer.id, event.pinHash);

  if (!session && event.accessMode === "PIN") {
    const pinMedia = [...event.mediaFiles, ...event.albums.flatMap((album) => album.mediaFiles)];
    const coverMedia =
      pinMedia.find((mediaFile) => mediaFile.id === cover.mediaFileId) ||
      pinMedia.find((mediaFile) => mediaFile.isFeatured && mediaFile.mediaType === "PHOTO") ||
      pinMedia.find((mediaFile) => mediaFile.mediaType === "PHOTO");
    const meta = [event.city, formatEventDate(event.eventDate)].filter(Boolean).join(" / ");

    return (
      <GalleryPinOverlay
        action={`/gallery/${event.slug}/unlock`}
        eventId={event.id}
        returnPath={basePath}
        galleryName={event.name}
        clientName={event.client.name}
        meta={meta}
        viewerEmail={viewer.email}
        signOutHref={`/auth/sign-out?next=${encodeURIComponent(basePath)}`}
        backgroundSrc={coverMedia ? `/api/media/${coverMedia.id}` : null}
        desktopPosition={`${cover.desktopPositionX}% ${cover.desktopPositionY}%`}
        mobilePosition={`${cover.mobilePositionX}% ${cover.mobilePositionY}%`}
        hasError={error === "pin"}
      />
    );
  }

  const visitorId = session?.visitorId || galleryVisitorId(viewer.id);
  const [favorites, selectionRecord] = await Promise.all([
    prisma.favorite.findMany({
      where: { eventId: event.id, visitorId },
      select: { mediaFileId: true }
    }),
    prisma.settings.findUnique({
      where: { key: selectionSubmissionKey(event.id, visitorId) },
      select: { value: true }
    })
  ]);
  const favoriteIds = new Set(favorites.map((favorite) => favorite.mediaFileId));
  const savedSelection = parseSelectionSubmission(selectionRecord?.value);
  const coverMediaId = cover.mediaFileId;

  const rootMedia = [...event.mediaFiles].sort(compareMediaByFileName);
  const visibleAlbums = event.albums
    .map((album) => ({
      ...album,
      mediaFiles: [...album.mediaFiles].sort(compareMediaByFileName)
    }))
    .filter((album) => album.mediaFiles.length > 0);
  const albumNameById = new Map(visibleAlbums.map((album) => [album.id, album.name]));
  const allMedia = [...rootMedia, ...visibleAlbums.flatMap((album) => album.mediaFiles)].sort(compareMediaByFileName);
  const highlightMedia = allMedia.filter((mediaFile) => mediaFile.isFeatured);
  const favoriteMedia = allMedia.filter((mediaFile) => favoriteIds.has(mediaFile.id));
  const tabs = [
    { key: "all", label: "All Photos", count: allMedia.length },
    { key: "favorites", label: "Favorites", count: favoriteMedia.length },
    ...(highlightMedia.length > 0 ? [{ key: "highlights", label: "Highlights", count: highlightMedia.length }] : []),
    ...visibleAlbums.map((album) => ({
      key: album.slug,
      label: album.name,
      count: album.mediaFiles.length
    }))
  ];
  const selectedView = tabs.some((tab) => tab.key === view) ? String(view) : "all";
  const activeTab = tabs.find((tab) => tab.key === selectedView) || tabs[0];
  const activeMedia =
    selectedView === "favorites"
      ? favoriteMedia
      : selectedView === "highlights"
        ? highlightMedia
        : selectedView === "all"
          ? allMedia
          : visibleAlbums.find((album) => album.slug === selectedView)?.mediaFiles || [];
  const parsedPage = Number.parseInt(page || "1", 10);
  const requestedPage = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1;
  const totalPages = Math.max(1, Math.ceil(activeMedia.length / GALLERY_PAGE_SIZE));
  const currentPage = Math.min(requestedPage, totalPages);
  const galleryMedia = activeMedia.map((mediaFile) => ({
    id: mediaFile.id,
    fileName: mediaFile.fileName,
    width: mediaFile.width,
    height: mediaFile.height,
    mediaType: mediaFile.mediaType,
    thumbnailUrl: mediaFile.thumbnailUrl,
    downloadAllowed: mediaFile.downloadAllowed
  }));
  const pageMedia = galleryMedia.slice(
    (currentPage - 1) * GALLERY_PAGE_SIZE,
    currentPage * GALLERY_PAGE_SIZE
  );
  const heroMedia =
    allMedia.find((mediaFile) => mediaFile.id === coverMediaId) ||
    highlightMedia.find((mediaFile) => mediaFile.mediaType === "PHOTO") ||
    allMedia.find((mediaFile) => mediaFile.mediaType === "PHOTO") ||
    allMedia[0];
  const selectedMedia = media ? allMedia.find((mediaFile) => mediaFile.id === media) || null : null;
  const heroImageSrc = heroMedia ? `/api/media/${heroMedia.id}` : null;
  const selectedMediaHref = selectedMedia ? `/api/media/${selectedMedia.id}` : null;
  const heroMeta = [event.city, formatEventDate(event.eventDate)].filter(Boolean).join(" / ");

  return (
    <main className="min-h-screen bg-[#fbfbf9] text-ink">
      <section className="relative isolate h-[100svh] min-h-[620px] overflow-hidden bg-[#171414]">
        {heroImageSrc ? (
          <Image
            src={heroImageSrc}
            alt={event.name}
            fill
            priority
            unoptimized
            sizes="100vw"
            className="gallery-cover-position absolute inset-0 object-cover"
            style={{
              "--cover-desktop-x": `${cover.desktopPositionX}%`,
              "--cover-desktop-y": `${cover.desktopPositionY}%`,
              "--cover-mobile-x": `${cover.mobilePositionX}%`,
              "--cover-mobile-y": `${cover.mobilePositionY}%`
            } as CSSProperties}
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-[#171414] via-[#40372f] to-[#74765c]" />
        )}
        <div className="absolute inset-0 bg-black/20" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-transparent to-black/75" />

        <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between px-5 py-6 text-white sm:px-8 lg:px-12">
          <a href="#story-grid" className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-white/[0.85] transition hover:text-white">
            <ArrowDown size={16} />
            View Gallery
          </a>
          <p className="absolute left-1/2 hidden -translate-x-1/2 text-[11px] font-semibold uppercase tracking-[0.26em] text-white/[0.85] sm:block">
            {brand.name}
          </p>
          <GalleryShareButton
            title={`${event.name} - ${brand.name}`}
            className="grid h-10 w-10 place-items-center rounded-full border border-white/[0.45] bg-black/10 text-white backdrop-blur-md transition hover:bg-white hover:text-ink"
          />
        </div>

        <div className="absolute inset-x-0 bottom-0 z-10 px-5 pb-10 text-white sm:px-8 sm:pb-12 lg:px-12 lg:pb-16">
          <div className="mx-auto flex max-w-[2200px] items-end justify-between gap-8">
            <div className="max-w-4xl">
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/80">Private Archive</p>
              <h1 className="mt-3 font-serif text-5xl italic leading-[0.92] sm:text-7xl lg:text-8xl">{event.name}</h1>
              <p className="mt-5 text-sm text-white/[0.78] sm:text-base">{heroMeta}</p>
            </div>
            <div className="hidden items-center gap-5 text-[11px] font-semibold uppercase tracking-[0.12em] text-white/75 md:flex">
              <span>{favorites.length} favorites</span>
              <span className="h-4 w-px bg-white/[0.35]" />
              <span>{event.downloadAllowed ? "Downloads enabled" : "Downloads off"}</span>
            </div>
          </div>
        </div>
      </section>

      <section id="story-grid" className="sticky top-0 z-30 border-b border-black/10 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[2400px] items-center gap-6 px-4 sm:px-7 lg:px-10">
          <nav className="flex min-w-0 flex-1 items-center gap-7 overflow-x-auto py-5">
              {tabs.map((tab) => {
                const isActive = tab.key === selectedView;

                return (
                  <Link
                    key={tab.key}
                    href={galleryHref(basePath, tab.key)}
                    className={`relative inline-flex shrink-0 items-baseline gap-1.5 pb-1 text-[11px] font-bold uppercase tracking-[0.08em] transition after:absolute after:inset-x-0 after:-bottom-1 after:h-px after:origin-left after:bg-ink after:transition-transform ${
                      isActive
                        ? "text-ink after:scale-x-100"
                        : "text-ink/[0.48] after:scale-x-0 hover:text-ink hover:after:scale-x-100"
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span className="text-[9px] font-medium text-ink/[0.38]">{tab.count}</span>
                  </Link>
                );
              })}
          </nav>
          <div className="hidden shrink-0 items-center gap-2 sm:flex">
            <GalleryShareButton
              title={`${event.name} - ${brand.name}`}
              className="grid h-9 w-9 place-items-center text-ink/60 transition hover:text-ink"
            />
            <Link href={galleryHref(basePath, "favorites")} className="grid h-9 w-9 place-items-center text-ink/60 transition hover:text-rust" title="Favorites">
              <Heart size={18} />
            </Link>
          </div>
        </div>
      </section>

      <section className="w-full py-8 lg:py-12">
        <div className="mx-auto mb-8 flex max-w-[2400px] flex-wrap items-end justify-between gap-4 px-5 sm:px-8 lg:px-12">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-rust">{brand.name} Stories</p>
            <h2 className="mt-2 font-serif text-3xl text-ink sm:text-4xl">{activeTab?.label || "Gallery"}</h2>
            <p className="mt-2 text-xs uppercase tracking-[0.1em] text-ink/[0.45]">{activeMedia.length} photographs</p>
          </div>
          {selectedView === "favorites" ? (
            <p className="max-w-md text-sm leading-6 text-ink/55">Save favorites as you browse, then submit once your shortlist is done.</p>
          ) : null}
        </div>

        {activeMedia.length === 0 ? (
          <div className="mx-5 rounded-lg border border-ink/10 bg-ivory px-5 py-10 text-center text-sm text-ink/60 sm:mx-8 lg:mx-12">
            {selectedView === "favorites"
              ? "No favorites saved yet. Tap the heart on any photo to keep it here."
              : "No photos are available in this section yet. Sync the Drive folder from the admin panel after adding subfolders and images."}
          </div>
        ) : (
          <GalleryMasonryGrid
            key={`${selectedView}-${currentPage}`}
            media={pageMedia}
            navigationMedia={galleryMedia}
            favoriteIds={[...favoriteIds]}
            eventSlug={event.slug}
            basePath={basePath}
            eventDownloadsAllowed={event.downloadAllowed}
          />
        )}

        {activeMedia.length > 0 && totalPages > 1 ? (
          <nav className="mx-auto mt-12 flex max-w-[2400px] items-center justify-center gap-3 overflow-x-auto px-4 pb-2" aria-label="Gallery pages">
            {currentPage > 1 ? (
              <Link
                href={`${galleryHref(basePath, selectedView, null, currentPage - 1)}#gallery-grid`}
                className="group grid h-10 w-10 shrink-0 place-items-center rounded-full border border-ink/15 text-ink/60 transition hover:border-ink hover:bg-ink hover:text-white"
                title="Previous page"
              >
                <ChevronLeft className="transition-transform group-hover:-translate-x-0.5" size={19} />
              </Link>
            ) : (
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-ink/10 text-ink/20" aria-hidden="true">
                <ChevronLeft size={19} />
              </span>
            )}

            <div className="flex items-center gap-2">
              {Array.from({ length: totalPages }, (_, index) => index + 1).map((pageNumber) => {
                const isCurrent = pageNumber === currentPage;

                return (
                  <Link
                    key={pageNumber}
                    href={`${galleryHref(basePath, selectedView, null, pageNumber)}#gallery-grid`}
                    aria-current={isCurrent ? "page" : undefined}
                    className={`grid shrink-0 place-items-center rounded-full font-semibold transition ${
                      isCurrent
                        ? "h-11 w-11 bg-[#6f7350] text-base text-white shadow-[0_8px_24px_rgba(76,79,53,0.22)]"
                        : "h-9 w-9 text-xs text-ink/50 hover:bg-ink/5 hover:text-ink"
                    }`}
                  >
                    {pageNumber}
                  </Link>
                );
              })}
            </div>

            {currentPage < totalPages ? (
              <Link
                href={`${galleryHref(basePath, selectedView, null, currentPage + 1)}#gallery-grid`}
                className="group grid h-10 w-10 shrink-0 place-items-center rounded-full border border-ink/15 text-ink/60 transition hover:border-ink hover:bg-ink hover:text-white"
                title="Next page"
              >
                <ChevronRight className="transition-transform group-hover:translate-x-0.5" size={19} />
              </Link>
            ) : (
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-ink/10 text-ink/20" aria-hidden="true">
                <ChevronRight size={19} />
              </span>
            )}
          </nav>
        ) : null}
      </section>

      <section className="border-t border-ink/10 bg-[#f1eee6]">
        <div className="mx-auto max-w-[1760px] px-5 py-14 sm:px-8 lg:px-12 lg:py-20">
          <div>
            <div className="flex flex-wrap items-start justify-between gap-5">
              <div className="max-w-2xl">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-rust">Your edit</p>
                <h2 className="mt-2 font-serif text-3xl text-ink">Submit your shortlist</h2>
                <p className="mt-2 text-sm leading-6 text-ink/60">
                  Favorites are saved automatically for this visitor session. Submit once when your shortlist is final so the studio can review it.
                </p>
                {selection === "submitted" ? (
                  <p className="mt-4 rounded-md bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
                    Selection submitted successfully. The studio can now review your favorites.
                  </p>
                ) : null}
                {selection === "empty" ? (
                  <p className="mt-4 rounded-md bg-rust/10 px-4 py-3 text-sm font-medium text-rust">
                    Please save at least one favorite before submitting your selection.
                  </p>
                ) : null}
                {savedSelection ? (
                  <p className="mt-4 text-sm text-ink/60">
                    Last submitted: {new Date(savedSelection.submittedAt).toLocaleString("en-IN")} with {savedSelection.favoriteCount} favorites.
                  </p>
                ) : null}
              </div>

              <form action={submitSelectionAction.bind(null, event.slug, basePath)}>
                <button type="submit" className="inline-flex items-center gap-2 border border-ink bg-ink px-5 py-3 text-sm font-semibold text-white transition hover:bg-transparent hover:text-ink">
                  <Send size={17} />
                  {savedSelection ? "Resubmit Selection" : "Submit Selection"}
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>

      {selectedMedia && selectedMediaHref ? (
        <div className="fixed inset-0 z-50 bg-black/30 text-white backdrop-blur-[12px]">
          <div className="relative flex h-[100svh] w-full items-center justify-center overflow-hidden p-3 sm:p-6">
              {selectedMedia.mediaType === "PHOTO" ? (
                <Image
                  src={selectedMediaHref}
                  alt=""
                  fill
                  unoptimized
                  sizes="100vw"
                  className="pointer-events-none absolute inset-0 scale-110 object-cover opacity-20 blur-2xl"
                />
              ) : null}
              <div className="pointer-events-none absolute inset-0 bg-black/30" />
              <div className="absolute right-4 top-4 z-20 flex items-center gap-2 sm:right-6 sm:top-6">
                {event.downloadAllowed && selectedMedia.downloadAllowed ? (
                  <a
                    href={`/download/${selectedMedia.id}`}
                    download
                    className="inline-flex h-10 items-center gap-2 rounded-full border border-white/25 bg-black/25 px-4 text-xs font-semibold text-white backdrop-blur-md transition hover:bg-white hover:text-ink"
                  >
                    <Download size={16} />
                    <span className="hidden sm:inline">Download</span>
                  </a>
                ) : null}
                <Link
                  href={galleryHref(basePath, selectedView, null, currentPage)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/25 bg-black/25 text-white backdrop-blur-md transition hover:bg-white hover:text-ink"
                  title="Close preview"
                >
                  <X size={18} />
                </Link>
              </div>

              <div className="relative z-10 flex h-full w-full items-center justify-center">
                  {selectedMedia.mediaType === "PHOTO" ? (
                    <Image
                      src={selectedMediaHref}
                      alt={selectedMedia.fileName}
                      width={selectedMedia.width || 2000}
                      height={selectedMedia.height || 1400}
                      sizes="92vw"
                      unoptimized
                      priority
                      className="h-auto max-h-[90svh] w-auto max-w-[92vw] object-contain shadow-[0_28px_90px_rgba(0,0,0,0.45)]"
                    />
                  ) : (
                    <div className="flex min-h-[60vh] min-w-[70vw] items-center justify-center text-white">
                      <div className="text-center">
                        <Play className="mx-auto" size={40} />
                        <p className="mt-4 text-sm font-medium">Video preview</p>
                      </div>
                    </div>
                  )}
              </div>

              <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/70 to-transparent px-5 pb-5 pt-20 sm:px-8 sm:pb-8">
                <div className="mx-auto flex max-w-[2200px] items-end justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/70">
                      {selectedMedia.albumId ? albumNameById.get(selectedMedia.albumId) : "My Photos"}
                    </p>
                    <h3 className="mt-2 max-w-[70vw] truncate font-serif text-xl sm:text-2xl">{selectedMedia.fileName}</h3>
                  </div>
                  <div className="pointer-events-auto shrink-0">
                    <form action={toggleFavoriteAction.bind(null, event.slug, basePath, selectedMedia.id)}>
                      <button
                        type="submit"
                        className="inline-flex h-10 items-center gap-2 rounded-full border border-white/30 bg-black/[0.28] px-4 text-xs font-semibold text-white backdrop-blur-md transition hover:bg-black/45"
                      >
                        <Heart
                          className={favoriteIds.has(selectedMedia.id) ? "text-[#e0444f]" : "text-white"}
                          size={16}
                          fill={favoriteIds.has(selectedMedia.id) ? "currentColor" : "none"}
                        />
                        {favoriteIds.has(selectedMedia.id) ? "Saved" : "Save Favorite"}
                      </button>
                    </form>
                  </div>
                </div>
            </div>
        </div>
        </div>
      ) : null}
    </main>
  );
}

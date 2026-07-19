import Image from "next/image";
import Link from "next/link";
import { ArrowDown, Download, Heart, LockKeyhole, Play, Send, X } from "lucide-react";
import { submitSelectionAction, toggleFavoriteAction, verifyGalleryPinAction } from "@/app/gallery/[eventSlug]/actions";
import { FormField } from "@/components/admin/form-field";
import { GalleryShareButton } from "@/components/gallery-share-button";
import { getGallerySession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { eventCoverKey, parseEventCoverMediaId } from "@/lib/event-cover";
import { parseSelectionSubmission, selectionSubmissionKey } from "@/lib/selection-submissions";
import { getSiteBrand } from "@/lib/site-content";

export const dynamic = "force-dynamic";

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

function galleryHref(eventSlug: string, view: string, mediaId?: string | null) {
  const params = new URLSearchParams();

  if (view !== "all") {
    params.set("view", view);
  }

  if (mediaId) {
    params.set("media", mediaId);
  }

  const suffix = params.size > 0 ? `?${params.toString()}` : "";
  return `/gallery/${eventSlug}${suffix}`;
}

export default async function GalleryPage({
  params,
  searchParams
}: {
  params: Promise<{ eventSlug: string }>;
  searchParams: Promise<{ error?: string; selection?: string; view?: string; media?: string }>;
}) {
  const { eventSlug } = await params;
  const { error, selection, view, media } = await searchParams;
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

  const session = await getGallerySession(event.id);

  if (!session && event.accessMode === "PIN") {
    return (
      <main className="min-h-screen bg-ivory px-4 py-16 text-ink">
        <div className="mx-auto max-w-md rounded-lg border border-marigold/30 bg-white p-8 shadow-soft">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-rust">{brand.name}</p>
          <h1 className="mt-3 text-3xl font-semibold">{event.name}</h1>
          <p className="mt-2 text-sm text-ink/60">{event.client.name} private gallery</p>
          <form action={verifyGalleryPinAction.bind(null, event.slug)} className="mt-7 grid gap-4">
            <input type="hidden" name="eventId" value={event.id} />
            <FormField label="4 digit gallery PIN" name="pin" type="password" inputMode="numeric" minLength={4} maxLength={4} required />
            {error === "pin" ? <p className="rounded-md bg-rust/10 px-3 py-2 text-sm font-semibold text-rust">Wrong PIN. Please try again.</p> : null}
            <button type="submit" className="inline-flex items-center justify-center gap-2 rounded-md bg-ink px-5 py-3 text-sm font-semibold text-ivory transition hover:bg-rust">
              <LockKeyhole size={17} />
              Open Gallery
            </button>
          </form>
        </div>
      </main>
    );
  }

  const [favorites, selectionRecord, coverRecord] = await Promise.all([
    session ? prisma.favorite.findMany({
      where: { eventId: event.id, visitorId: session.visitorId },
      select: { mediaFileId: true }
    }) : Promise.resolve([]),
    session ? prisma.settings.findUnique({
      where: { key: selectionSubmissionKey(event.id, session.visitorId) },
      select: { value: true }
    }) : Promise.resolve(null),
    prisma.settings.findUnique({
      where: { key: eventCoverKey(event.id) },
      select: { value: true }
    })
  ]);
  const favoriteIds = new Set(favorites.map((favorite) => favorite.mediaFileId));
  const savedSelection = parseSelectionSubmission(selectionRecord?.value);
  const coverMediaId = parseEventCoverMediaId(coverRecord?.value);

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
  const heroMedia =
    allMedia.find((mediaFile) => mediaFile.id === coverMediaId) ||
    highlightMedia.find((mediaFile) => mediaFile.mediaType === "PHOTO") ||
    allMedia.find((mediaFile) => mediaFile.mediaType === "PHOTO") ||
    allMedia[0];
  const heroImageSrc = heroMedia ? `/api/media/${heroMedia.id}` : null;
  const selectedMedia = media ? allMedia.find((mediaFile) => mediaFile.id === media) || null : null;
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
            className="absolute inset-0 object-cover object-center"
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
                    href={galleryHref(event.slug, tab.key)}
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
            <Link href={galleryHref(event.slug, "favorites")} className="grid h-9 w-9 place-items-center text-ink/60 transition hover:text-rust" title="Favorites">
              <Heart size={18} />
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[2400px] px-2 py-8 sm:px-3 lg:px-5 lg:py-12">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4 px-2 sm:px-4">
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
          <div className="rounded-lg border border-ink/10 bg-ivory px-5 py-10 text-center text-sm text-ink/60">
            {selectedView === "favorites"
              ? "No favorites saved yet. Tap the heart on any photo to keep it here."
              : "No photos are available in this section yet. Sync the Drive folder from the admin panel after adding subfolders and images."}
          </div>
        ) : (
          <div className="columns-2 md:columns-3 xl:columns-4 2xl:columns-5 min-[2400px]:columns-6 [column-gap:6px]">
            {activeMedia.map((mediaFile) => {
              const isFavorite = favoriteIds.has(mediaFile.id);
              const canDownload = event.downloadAllowed && mediaFile.downloadAllowed;
              const imageSrc = mediaFile.mediaType === "PHOTO" || mediaFile.thumbnailUrl ? `/api/media/${mediaFile.id}` : null;
              const albumLabel = mediaFile.albumId ? albumNameById.get(mediaFile.albumId) : "My Photos";

              return (
                <article key={mediaFile.id} className="group relative mb-[6px] break-inside-avoid overflow-hidden bg-[#ecebe7]">
                    <Link href={galleryHref(event.slug, selectedView, mediaFile.id)} className="block bg-ink/10">
                      {imageSrc ? (
                        <Image
                          src={imageSrc}
                          alt={mediaFile.fileName}
                          width={mediaFile.width || 1600}
                          height={mediaFile.height || 1200}
                          sizes="(min-width: 2400px) 16vw, (min-width: 1536px) 20vw, (min-width: 1280px) 25vw, (min-width: 768px) 33vw, 50vw"
                          unoptimized
                          className="block h-auto w-full object-cover transition duration-700 ease-out group-hover:scale-[1.015]"
                        />
                      ) : (
                        <div className="flex aspect-[4/3] items-center justify-center bg-ink text-white">
                          <Play size={28} />
                        </div>
                      )}
                      <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent opacity-0 transition duration-300 group-hover:opacity-100" />
                      <span className="pointer-events-none absolute bottom-3 left-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-white opacity-0 transition group-hover:opacity-100">
                        {albumLabel}
                      </span>
                    </Link>

                    <div className="absolute right-2 top-2 flex gap-1.5 opacity-100 transition md:opacity-0 md:group-hover:opacity-100">
                      <form action={toggleFavoriteAction.bind(null, event.slug, mediaFile.id)}>
                        <button
                          type="submit"
                          className={`grid h-9 w-9 place-items-center rounded-full border border-white/[0.35] backdrop-blur-md transition ${
                            isFavorite ? "bg-rust text-white" : "bg-black/[0.35] text-white hover:bg-white hover:text-ink"
                          }`}
                          title={isFavorite ? "Remove favorite" : "Save favorite"}
                        >
                          <Heart size={16} />
                        </button>
                      </form>
                      {canDownload ? (
                        <Link
                          href={`/download/${mediaFile.id}`}
                          className="grid h-9 w-9 place-items-center rounded-full border border-white/[0.35] bg-black/[0.35] text-white backdrop-blur-md transition hover:bg-white hover:text-ink"
                          title="Download"
                        >
                          <Download size={16} />
                        </Link>
                      ) : null}
                    </div>
                </article>
              );
            })}
          </div>
        )}
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

              <form action={submitSelectionAction.bind(null, event.slug)}>
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
        <div className="fixed inset-0 z-50 bg-black/[0.96] text-white">
          <div className="relative flex h-[100svh] w-full items-center justify-center overflow-hidden p-2 sm:p-5">
              <div className="absolute right-4 top-4 z-20 flex items-center gap-2 sm:right-6 sm:top-6">
                {event.downloadAllowed && selectedMedia.downloadAllowed ? (
                  <Link
                    href={`/download/${selectedMedia.id}`}
                    className="inline-flex h-10 items-center gap-2 rounded-full border border-white/25 bg-black/25 px-4 text-xs font-semibold text-white backdrop-blur-md transition hover:bg-white hover:text-ink"
                  >
                    <Download size={16} />
                    <span className="hidden sm:inline">Download</span>
                  </Link>
                ) : null}
                <Link
                  href={galleryHref(event.slug, selectedView)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/25 bg-black/25 text-white backdrop-blur-md transition hover:bg-white hover:text-ink"
                  title="Close preview"
                >
                  <X size={18} />
                </Link>
              </div>

              <div className="flex h-full w-full items-center justify-center">
                  {selectedMedia.mediaType === "PHOTO" ? (
                    <Image
                      src={selectedMediaHref}
                      alt={selectedMedia.fileName}
                      width={selectedMedia.width || 2000}
                      height={selectedMedia.height || 1400}
                      sizes="96vw"
                      unoptimized
                      className="h-auto max-h-[96svh] w-auto max-w-[96vw] object-contain"
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
                    <form action={toggleFavoriteAction.bind(null, event.slug, selectedMedia.id)}>
                      <button
                        type="submit"
                        className={`inline-flex h-10 items-center gap-2 rounded-full border border-white/30 px-4 text-xs font-semibold backdrop-blur-md transition ${
                          favoriteIds.has(selectedMedia.id) ? "bg-rust text-white" : "bg-black/25 text-white hover:bg-white hover:text-ink"
                        }`}
                      >
                        <Heart size={16} />
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

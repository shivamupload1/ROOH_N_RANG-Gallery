"use client";

import Image from "next/image";
import { CheckSquare2, ChevronLeft, ChevronRight, Download, Heart, Play, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { toggleFavoriteAction } from "@/app/gallery/[eventSlug]/actions";
import { GalleryMediaCard, type GalleryMediaItem } from "@/components/gallery-media-card";

function columnsForWidth(width: number) {
  if (width >= 2000) return 6;
  if (width >= 1600) return 5;
  if (width >= 1280) return 4;
  if (width >= 768) return 3;
  return 2;
}

export function GalleryMasonryGrid({
  media,
  navigationMedia,
  favoriteIds,
  eventSlug,
  basePath,
  eventDownloadsAllowed
}: {
  media: GalleryMediaItem[];
  navigationMedia: GalleryMediaItem[];
  favoriteIds: string[];
  eventSlug: string;
  basePath: string;
  eventDownloadsAllowed: boolean;
}) {
  const gridRef = useRef<HTMLDivElement>(null);
  const [columnCount, setColumnCount] = useState(2);
  const [favoriteMediaIds, setFavoriteMediaIds] = useState(() => new Set(favoriteIds));
  const [selectedMediaIds, setSelectedMediaIds] = useState(() => new Set<string>());
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [slideDirection, setSlideDirection] = useState<"left" | "right">("right");
  const [isFavoritePending, startFavoriteTransition] = useTransition();
  const activeMedia = activeIndex == null ? null : navigationMedia[activeIndex] || null;
  const activeImageSrc = activeMedia && (activeMedia.mediaType === "PHOTO" || activeMedia.thumbnailUrl)
    ? `/api/media/${activeMedia.id}`
    : null;
  const canDownloadActive = Boolean(activeMedia && eventDownloadsAllowed && activeMedia.downloadAllowed);

  useEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;

    const updateColumns = () => setColumnCount(columnsForWidth(grid.clientWidth));
    updateColumns();
    const resizeObserver = new ResizeObserver(updateColumns);
    resizeObserver.observe(grid);
    return () => resizeObserver.disconnect();
  }, []);

  const movePreview = useCallback((offset: -1 | 1) => {
    setSlideDirection(offset > 0 ? "right" : "left");
    setActiveIndex((index) => {
      if (index == null || navigationMedia.length === 0) return index;
      return (index + offset + navigationMedia.length) % navigationMedia.length;
    });
  }, [navigationMedia.length]);

  useEffect(() => {
    if (activeIndex == null) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setActiveIndex(null);
      if (event.key === "ArrowLeft") movePreview(-1);
      if (event.key === "ArrowRight") movePreview(1);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [activeIndex, movePreview]);

  function openPreview(mediaId: string) {
    const nextIndex = navigationMedia.findIndex((item) => item.id === mediaId);
    if (nextIndex < 0) return;
    setSlideDirection("right");
    setActiveIndex(nextIndex);
  }

  function toggleFavorite(mediaId: string) {
    const wasFavorite = favoriteMediaIds.has(mediaId);
    setFavoriteMediaIds((current) => {
      const next = new Set(current);
      if (wasFavorite) next.delete(mediaId);
      else next.add(mediaId);
      return next;
    });

    startFavoriteTransition(async () => {
      try {
        await toggleFavoriteAction(eventSlug, basePath, mediaId);
      } catch {
        setFavoriteMediaIds((current) => {
          const next = new Set(current);
          if (wasFavorite) next.add(mediaId);
          else next.delete(mediaId);
          return next;
        });
      }
    });
  }

  function toggleSelection(mediaId: string) {
    setSelectedMediaIds((current) => {
      const next = new Set(current);
      if (next.has(mediaId)) next.delete(mediaId);
      else next.add(mediaId);
      return next;
    });
  }

  function favoriteSelected() {
    const mediaIds = [...selectedMediaIds].filter((mediaId) => !favoriteMediaIds.has(mediaId));
    if (mediaIds.length === 0) return;

    setFavoriteMediaIds((current) => new Set([...current, ...mediaIds]));
    startFavoriteTransition(async () => {
      const results = await Promise.allSettled(
        mediaIds.map((mediaId) => toggleFavoriteAction(eventSlug, basePath, mediaId))
      );
      const failedMediaIds = new Set(
        results.flatMap((result, index) => result.status === "rejected" ? [mediaIds[index]] : [])
      );

      if (failedMediaIds.size > 0) {
        setFavoriteMediaIds((current) => {
          const next = new Set(current);
          failedMediaIds.forEach((mediaId) => next.delete(mediaId));
          return next;
        });
      }
    });
  }

  function toggleCurrentPageSelection() {
    const allCurrentSelected = media.length > 0 && media.every((item) => selectedMediaIds.has(item.id));
    setSelectedMediaIds((current) => {
      const next = new Set(current);
      media.forEach((item) => {
        if (allCurrentSelected) next.delete(item.id);
        else next.add(item.id);
      });
      return next;
    });
  }

  function downloadSelected() {
    const downloadableMedia = navigationMedia.filter(
      (item) => selectedMediaIds.has(item.id) && eventDownloadsAllowed && item.downloadAllowed
    );

    downloadableMedia.forEach((item, index) => {
      window.setTimeout(() => {
        const link = document.createElement("a");
        link.href = `/download/${item.id}`;
        link.download = item.fileName;
        document.body.appendChild(link);
        link.click();
        link.remove();
      }, index * 120);
    });
  }

  const columns = useMemo(() => {
    const nextColumns = Array.from({ length: columnCount }, () => [] as GalleryMediaItem[]);
    const estimatedHeights = Array.from({ length: columnCount }, () => 0);
    const mediaOrder = new Map(media.map((item, index) => [item.id, index]));
    const normalizedHeight = (item: GalleryMediaItem) => {
      const width = item.width && item.width > 0 ? item.width : 4;
      const height = item.height && item.height > 0 ? item.height : 3;
      return height / width;
    };

    media.slice(0, columnCount).forEach((item, index) => {
      nextColumns[index].push(item);
      estimatedHeights[index] += normalizedHeight(item);
    });

    [...media.slice(columnCount)]
      .sort((a, b) => normalizedHeight(b) - normalizedHeight(a))
      .forEach((item) => {
        const targetColumn = estimatedHeights.indexOf(Math.min(...estimatedHeights));
        nextColumns[targetColumn].push(item);
        estimatedHeights[targetColumn] += normalizedHeight(item);
      });

    nextColumns.forEach((column) => {
      column.sort((a, b) => (mediaOrder.get(a.id) || 0) - (mediaOrder.get(b.id) || 0));
    });

    return nextColumns;
  }, [columnCount, media]);

  const lightbox = activeMedia
    ? createPortal(
        <div className="fixed inset-0 z-[100] bg-black/30 text-white backdrop-blur-[12px]" role="dialog" aria-modal="true" aria-label={activeMedia.fileName}>
          {activeImageSrc ? (
            <Image src={activeImageSrc} alt="" fill unoptimized sizes="100vw" className="pointer-events-none absolute inset-0 scale-110 object-cover opacity-20 blur-2xl" />
          ) : null}
          <div className="pointer-events-none absolute inset-0 bg-black/30" />

          <div className="absolute right-4 top-4 z-30 flex items-center gap-2 sm:right-6 sm:top-6">
            <button
              type="button"
              onClick={() => toggleFavorite(activeMedia.id)}
              disabled={isFavoritePending}
              aria-pressed={favoriteMediaIds.has(activeMedia.id)}
              className="grid h-11 w-11 place-items-center rounded-full border border-white/30 bg-black/[0.28] text-white backdrop-blur-md transition hover:bg-black/45"
              title={favoriteMediaIds.has(activeMedia.id) ? "Remove favorite" : "Save favorite"}
            >
              <Heart
                className={favoriteMediaIds.has(activeMedia.id) ? "text-[#e0444f]" : "text-white"}
                size={17}
                fill={favoriteMediaIds.has(activeMedia.id) ? "currentColor" : "none"}
              />
            </button>
            {canDownloadActive ? (
              <a href={`/download/${activeMedia.id}`} download className="grid h-11 w-11 place-items-center rounded-full border border-white/30 bg-black/[0.28] text-white backdrop-blur-md transition hover:bg-white hover:text-ink" title="Download original">
                <Download size={17} />
              </a>
            ) : null}
            <button type="button" onClick={() => setActiveIndex(null)} className="grid h-11 w-11 place-items-center rounded-full border border-white/30 bg-black/[0.28] text-white backdrop-blur-md transition hover:bg-white hover:text-ink" title="Close preview">
              <X size={19} />
            </button>
          </div>

          <button
            type="button"
            onClick={() => movePreview(-1)}
            className="group absolute left-3 top-1/2 z-30 grid h-12 w-12 -translate-y-1/2 place-items-center rounded-full border border-white/30 bg-black/[0.28] text-white backdrop-blur-md transition hover:bg-white hover:text-ink sm:left-6"
            title="Previous photo"
          >
            <ChevronLeft className="transition-transform duration-300 group-hover:-translate-x-1" size={24} />
          </button>
          <button
            type="button"
            onClick={() => movePreview(1)}
            className="group absolute right-3 top-1/2 z-30 grid h-12 w-12 -translate-y-1/2 place-items-center rounded-full border border-white/30 bg-black/[0.28] text-white backdrop-blur-md transition hover:bg-white hover:text-ink sm:right-6"
            title="Next photo"
          >
            <ChevronRight className="transition-transform duration-300 group-hover:translate-x-1" size={24} />
          </button>

          <div className="relative z-10 flex h-[100svh] w-full items-center justify-center px-16 py-4 sm:px-24 sm:py-7">
            {activeImageSrc ? (
              <Image
                key={activeMedia.id}
                src={activeImageSrc}
                alt={activeMedia.fileName}
                width={activeMedia.width || 2000}
                height={activeMedia.height || 1400}
                sizes="90vw"
                unoptimized
                priority
                className={`h-auto max-h-[92svh] w-auto max-w-[92vw] object-contain shadow-[0_28px_90px_rgba(0,0,0,0.45)] ${
                  slideDirection === "right" ? "gallery-slide-in-right" : "gallery-slide-in-left"
                }`}
              />
            ) : (
              <div className="text-center">
                <Play className="mx-auto" size={40} />
                <p className="mt-4 text-sm font-medium">Video preview</p>
              </div>
            )}
          </div>

          <p className="pointer-events-none absolute inset-x-20 bottom-5 z-20 truncate text-center text-xs font-semibold uppercase tracking-[0.12em] text-white/70">
            {activeMedia.fileName}
          </p>
        </div>,
        document.body
      )
    : null;

  return (
    <>
      <div
        ref={gridRef}
        id="gallery-grid"
        className="grid w-full items-start gap-[4px] px-[4px]"
        style={{ gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))` }}
      >
        {columns.map((column, columnIndex) => (
          <div key={columnIndex} className="flex min-w-0 flex-col gap-[4px]">
            {column.map((mediaFile) => (
              <GalleryMediaCard
                key={mediaFile.id}
                media={mediaFile}
                eventDownloadsAllowed={eventDownloadsAllowed}
                isFavorite={favoriteMediaIds.has(mediaFile.id)}
                isSelected={selectedMediaIds.has(mediaFile.id)}
                isFavoritePending={isFavoritePending}
                onPreview={openPreview}
                onToggleFavorite={toggleFavorite}
                onToggleSelection={toggleSelection}
              />
            ))}
          </div>
        ))}
      </div>
      {selectedMediaIds.size > 0 ? (
        <div className="fixed bottom-4 left-1/2 z-[60] flex max-w-[calc(100vw-20px)] -translate-x-1/2 items-center gap-1.5 overflow-x-auto rounded-full border border-white/30 bg-[#171414]/45 px-3.5 py-2 text-white shadow-[0_14px_45px_rgba(0,0,0,0.3)] backdrop-blur-[18px] sm:gap-3 sm:px-4">
          <span className="whitespace-nowrap text-xs font-medium">{selectedMediaIds.size} Selected</span>
          <button
            type="button"
            onClick={() => setSelectedMediaIds(new Set())}
            className="inline-flex h-7 shrink-0 items-center gap-1 rounded-full border border-white/25 px-2.5 text-[11px] text-white/80 transition hover:bg-white hover:text-ink"
          >
            <X size={12} />
            Clear
          </button>
          <span className="h-5 w-px shrink-0 bg-white/25" />
          <button
            type="button"
            onClick={toggleCurrentPageSelection}
            className="inline-flex h-8 shrink-0 items-center gap-1.5 px-1.5 text-xs text-white/85 transition hover:text-white"
          >
            Current page
            <CheckSquare2 size={15} />
          </button>
          <button
            type="button"
            onClick={downloadSelected}
            disabled={!navigationMedia.some((item) => selectedMediaIds.has(item.id) && eventDownloadsAllowed && item.downloadAllowed)}
            className="inline-flex h-8 shrink-0 items-center gap-1.5 px-1.5 text-xs text-white/85 transition hover:text-white disabled:opacity-35"
          >
            Download
            <Download size={15} />
          </button>
          <button
            type="button"
            onClick={favoriteSelected}
            disabled={isFavoritePending || [...selectedMediaIds].every((mediaId) => favoriteMediaIds.has(mediaId))}
            className="inline-flex h-8 shrink-0 items-center gap-1.5 px-1.5 text-xs text-white/85 transition hover:text-[#e0444f] disabled:opacity-35"
            title="Add selected photos to favorites"
          >
            Favorite
            <Heart size={15} />
          </button>
        </div>
      ) : null}
      {lightbox}
    </>
  );
}

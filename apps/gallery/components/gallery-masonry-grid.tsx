"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { GalleryMediaCard } from "@/components/gallery-media-card";

type GalleryMedia = {
  id: string;
  fileName: string;
  width: number | null;
  height: number | null;
  mediaType: "PHOTO" | "VIDEO";
  thumbnailUrl: string | null;
  downloadAllowed: boolean;
};

const LOAD_BATCH_SIZE = 48;

function columnsForWidth(width: number) {
  if (width >= 2000) return 6;
  if (width >= 1600) return 5;
  if (width >= 1280) return 4;
  if (width >= 768) return 3;
  return 2;
}

export function GalleryMasonryGrid({
  media,
  favoriteIds,
  eventSlug,
  basePath,
  eventDownloadsAllowed
}: {
  media: GalleryMedia[];
  favoriteIds: string[];
  eventSlug: string;
  basePath: string;
  eventDownloadsAllowed: boolean;
}) {
  const gridRef = useRef<HTMLDivElement>(null);
  const loadSentinelRef = useRef<HTMLDivElement>(null);
  const [columnCount, setColumnCount] = useState(2);
  const [visibleCount, setVisibleCount] = useState(() => Math.min(LOAD_BATCH_SIZE, media.length));
  const visibleMedia = media.slice(0, visibleCount);
  const isComplete = visibleCount >= media.length;
  const favorites = useMemo(() => new Set(favoriteIds), [favoriteIds]);

  useEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;

    const updateColumns = () => setColumnCount(columnsForWidth(grid.clientWidth));
    updateColumns();
    const resizeObserver = new ResizeObserver(updateColumns);
    resizeObserver.observe(grid);
    return () => resizeObserver.disconnect();
  }, []);

  useEffect(() => {
    const sentinel = loadSentinelRef.current;
    if (!sentinel || isComplete) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) return;
        setVisibleCount((count) => Math.min(count + LOAD_BATCH_SIZE, media.length));
      },
      { rootMargin: "900px 0px" }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [isComplete, media.length, visibleCount]);

  const columns = useMemo(() => {
    const nextColumns = Array.from({ length: columnCount }, () => [] as GalleryMedia[]);
    const estimatedHeights = Array.from({ length: columnCount }, () => 0);

    visibleMedia.forEach((item, index) => {
      const targetColumn = index < columnCount
        ? index
        : estimatedHeights.indexOf(Math.min(...estimatedHeights));
      const width = item.width && item.width > 0 ? item.width : 4;
      const height = item.height && item.height > 0 ? item.height : 3;

      nextColumns[targetColumn].push(item);
      estimatedHeights[targetColumn] += height / width;
    });
    return nextColumns;
  }, [columnCount, visibleMedia]);

  return (
    <>
      <div
        ref={gridRef}
        id="gallery-grid"
        className="grid w-full items-start gap-[4px] px-[4px]"
        style={{ gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))` }}
      >
        {columns.map((column, columnIndex) => (
          <div
            key={columnIndex}
            className="flex min-w-0 flex-col gap-[4px]"
          >
            {column.map((mediaFile) => (
              <GalleryMediaCard
                key={mediaFile.id}
                media={mediaFile}
                eventSlug={eventSlug}
                basePath={basePath}
                eventDownloadsAllowed={eventDownloadsAllowed}
                initialFavorite={favorites.has(mediaFile.id)}
              />
            ))}
          </div>
        ))}
      </div>
      {!isComplete ? <div ref={loadSentinelRef} className="h-px w-full" aria-hidden="true" /> : null}
    </>
  );
}

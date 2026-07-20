"use client";

import Image from "next/image";
import { Check, Download, Heart, Play } from "lucide-react";

export type GalleryMediaItem = {
  id: string;
  fileName: string;
  width: number | null;
  height: number | null;
  mediaType: "PHOTO" | "VIDEO";
  thumbnailUrl: string | null;
  downloadAllowed: boolean;
};

export function GalleryMediaCard({
  media,
  eventDownloadsAllowed,
  isFavorite,
  isSelected,
  isFavoritePending,
  onPreview,
  onToggleFavorite,
  onToggleSelection
}: {
  media: GalleryMediaItem;
  eventDownloadsAllowed: boolean;
  isFavorite: boolean;
  isSelected: boolean;
  isFavoritePending: boolean;
  onPreview: (mediaId: string) => void;
  onToggleFavorite: (mediaId: string) => void;
  onToggleSelection: (mediaId: string) => void;
}) {
  const imageSrc = media.mediaType === "PHOTO" || media.thumbnailUrl ? `/api/media/${media.id}` : null;
  const canDownload = eventDownloadsAllowed && media.downloadAllowed;

  return (
    <article className={`group relative w-full overflow-hidden bg-[#ecebe7] ${isSelected ? "ring-2 ring-inset ring-white" : ""}`}>
      <button type="button" onClick={() => imageSrc && onPreview(media.id)} className="block w-full overflow-hidden bg-ink/10 text-left" aria-label={`Preview ${media.fileName}`}>
        {imageSrc ? (
          <Image
            src={imageSrc}
            alt={media.fileName}
            width={media.width || 1600}
            height={media.height || 1200}
            sizes="(min-width: 2000px) 17vw, (min-width: 1600px) 20vw, (min-width: 1280px) 25vw, (min-width: 768px) 33vw, 50vw"
            unoptimized
            loading="lazy"
            decoding="async"
            className="block h-auto w-full object-cover transition-transform duration-1000 ease-out will-change-transform group-hover:scale-[1.055]"
          />
        ) : (
          <div className="flex aspect-[4/3] items-center justify-center bg-ink text-white"><Play size={28} /></div>
        )}
        <span className="pointer-events-none absolute inset-0 bg-black/10 opacity-0 transition duration-500 group-hover:opacity-100" />
      </button>

      <button
        type="button"
        onClick={() => onToggleSelection(media.id)}
        aria-pressed={isSelected}
        className="absolute bottom-2 left-2 z-20 grid h-7 w-7 place-items-center drop-shadow-[0_2px_5px_rgba(0,0,0,0.9)] transition hover:scale-110"
        title={isSelected ? "Remove from selection" : "Select photo"}
      >
        <span className={`grid h-4 w-4 place-items-center rounded-full border transition ${isSelected ? "border-white bg-white text-ink" : "border-white bg-black/10 text-transparent"}`}>
          {isSelected ? <Check size={11} strokeWidth={3} /> : null}
        </span>
      </button>

      <div className="absolute bottom-2 right-2 z-20 flex gap-0.5 opacity-100 transition md:opacity-0 md:group-hover:opacity-100">
        <button
          type="button"
          onClick={() => onToggleFavorite(media.id)}
          disabled={isFavoritePending}
          aria-pressed={isFavorite}
          className="grid h-9 w-9 place-items-center text-white drop-shadow-[0_2px_5px_rgba(0,0,0,0.9)] transition hover:scale-110"
          title={isFavorite ? "Remove favorite" : "Save favorite"}
        >
          <Heart className={isFavorite ? "text-[#e0444f]" : "text-white"} size={16} fill={isFavorite ? "currentColor" : "none"} />
        </button>
        {canDownload ? (
          <a href={`/download/${media.id}`} download className="grid h-9 w-9 place-items-center text-white drop-shadow-[0_2px_5px_rgba(0,0,0,0.9)] transition hover:scale-110" title="Download">
            <Download size={16} />
          </a>
        ) : null}
      </div>
    </article>
  );
}

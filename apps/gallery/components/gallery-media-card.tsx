"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { Download, Heart, Play, X } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { toggleFavoriteAction } from "@/app/gallery/[eventSlug]/actions";

type GalleryMedia = {
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
  eventSlug,
  basePath,
  eventDownloadsAllowed,
  initialFavorite
}: {
  media: GalleryMedia;
  eventSlug: string;
  basePath: string;
  eventDownloadsAllowed: boolean;
  initialFavorite: boolean;
}) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isFavorite, setIsFavorite] = useState(initialFavorite);
  const [isPending, startTransition] = useTransition();
  const imageSrc = media.mediaType === "PHOTO" || media.thumbnailUrl ? `/api/media/${media.id}` : null;
  const canDownload = eventDownloadsAllowed && media.downloadAllowed;

  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen]);

  function toggleFavorite() {
    const nextValue = !isFavorite;
    setIsFavorite(nextValue);
    startTransition(async () => {
      try {
        await toggleFavoriteAction(eventSlug, basePath, media.id);
        router.refresh();
      } catch {
        setIsFavorite(!nextValue);
      }
    });
  }

  const lightbox = isOpen && imageSrc
    ? createPortal(
        <div className="fixed inset-0 z-[100] bg-black/30 text-white backdrop-blur-[12px]" role="dialog" aria-modal="true" aria-label={media.fileName}>
          <Image src={imageSrc} alt="" fill unoptimized sizes="100vw" className="pointer-events-none absolute inset-0 scale-110 object-cover opacity-20 blur-2xl" />
          <div className="pointer-events-none absolute inset-0 bg-black/30" />

          <div className="absolute right-4 top-4 z-30 flex items-center gap-2 sm:right-6 sm:top-6">
            <button
              type="button"
              onClick={toggleFavorite}
              disabled={isPending}
              aria-pressed={isFavorite}
              className="grid h-11 w-11 place-items-center rounded-full border border-white/30 bg-black/[0.28] text-white backdrop-blur-md transition hover:bg-black/45"
              title={isFavorite ? "Remove favorite" : "Save favorite"}
            >
              <Heart className={isFavorite ? "text-[#e0444f]" : "text-white"} size={17} fill={isFavorite ? "currentColor" : "none"} />
            </button>
            {canDownload ? (
              <a href={`/download/${media.id}`} download className="grid h-11 w-11 place-items-center rounded-full border border-white/30 bg-black/25 text-white backdrop-blur-md transition hover:bg-white hover:text-ink" title="Download original">
                <Download size={17} />
              </a>
            ) : null}
            <button type="button" onClick={() => setIsOpen(false)} className="grid h-11 w-11 place-items-center rounded-full border border-white/30 bg-black/25 text-white backdrop-blur-md transition hover:bg-white hover:text-ink" title="Close preview">
              <X size={19} />
            </button>
          </div>

          <div className="relative z-10 flex h-[100svh] w-full items-center justify-center p-3 sm:p-6">
            <Image
              src={imageSrc}
              alt={media.fileName}
              width={media.width || 2000}
              height={media.height || 1400}
              sizes="92vw"
              unoptimized
              priority
              className="h-auto max-h-[90svh] w-auto max-w-[92vw] object-contain shadow-[0_28px_90px_rgba(0,0,0,0.45)]"
            />
          </div>
        </div>,
        document.body
      )
    : null;

  return (
    <article className="group relative w-full overflow-hidden bg-[#ecebe7]">
      <button type="button" onClick={() => imageSrc && setIsOpen(true)} className="block w-full overflow-hidden bg-ink/10 text-left" aria-label={`Preview ${media.fileName}`}>
        {imageSrc ? (
          <Image
            src={imageSrc}
            alt={media.fileName}
            width={media.width || 1600}
            height={media.height || 1200}
            sizes="(min-width: 2400px) 16vw, (min-width: 1536px) 20vw, (min-width: 1280px) 25vw, (min-width: 768px) 33vw, 50vw"
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

      <div className="absolute right-2 top-2 z-20 flex gap-1.5 opacity-100 transition md:opacity-0 md:group-hover:opacity-100">
        <button
          type="button"
          onClick={toggleFavorite}
          disabled={isPending}
          aria-pressed={isFavorite}
          className="grid h-9 w-9 place-items-center rounded-full border border-white/[0.35] bg-black/[0.35] text-white backdrop-blur-md transition hover:bg-black/50"
          title={isFavorite ? "Remove favorite" : "Save favorite"}
        >
          <Heart className={isFavorite ? "text-[#e0444f]" : "text-white"} size={16} fill={isFavorite ? "currentColor" : "none"} />
        </button>
        {canDownload ? (
          <a href={`/download/${media.id}`} download className="grid h-9 w-9 place-items-center rounded-full border border-white/[0.35] bg-black/[0.35] text-white backdrop-blur-md transition hover:bg-white hover:text-ink" title="Download">
            <Download size={16} />
          </a>
        ) : null}
      </div>
      {lightbox}
    </article>
  );
}

"use client";

import { Check, Share2 } from "lucide-react";
import { useState } from "react";

export function GalleryShareButton({ title, className = "", showLabel = false }: { title: string; className?: string; showLabel?: boolean }) {
  const [copied, setCopied] = useState(false);

  async function shareGallery() {
    const url = window.location.href.split("?")[0];

    try {
      if (navigator.share) {
        await navigator.share({ title, url });
        return;
      }

      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // Closing the native share sheet is not an error the gallery needs to surface.
    }
  }

  return (
    <button type="button" onClick={shareGallery} className={className} title="Share gallery">
      {copied ? <Check size={18} /> : <Share2 size={18} />}
      {showLabel ? <span>{copied ? "Copied" : "Share"}</span> : null}
    </button>
  );
}

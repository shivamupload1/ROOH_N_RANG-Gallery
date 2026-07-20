export const GALLERY_SHARE_CODE_KEY_PREFIX = "galleryShare:code:";

export type GalleryShareValue = {
  code: string;
  eventId: string;
};

export function parseGalleryShareValue(value: unknown): GalleryShareValue | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const record = value as Record<string, unknown>;
  const code = typeof record.code === "string" ? record.code : "";
  const eventId = typeof record.eventId === "string" ? record.eventId : "";

  return code && eventId ? { code, eventId } : null;
}

export function galleryShareCodeKey(code: string) {
  return `${GALLERY_SHARE_CODE_KEY_PREFIX}${code}`;
}

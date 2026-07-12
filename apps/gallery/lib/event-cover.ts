const EVENT_COVER_PREFIX = "eventCover:";

export function eventCoverKey(eventId: string) {
  return `${EVENT_COVER_PREFIX}${eventId}`;
}

export function parseEventCoverMediaId(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const mediaFileId = "mediaFileId" in value ? value.mediaFileId : null;
  return typeof mediaFileId === "string" && mediaFileId.length > 0 ? mediaFileId : null;
}

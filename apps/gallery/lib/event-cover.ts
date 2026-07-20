const EVENT_COVER_PREFIX = "eventCover:";

export function eventCoverKey(eventId: string) {
  return `${EVENT_COVER_PREFIX}${eventId}`;
}

function coverPosition(value: unknown) {
  const position = typeof value === "number" ? value : Number(value);
  return Number.isFinite(position) ? Math.min(100, Math.max(0, position)) : 50;
}

export function parseEventCover(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {
      mediaFileId: null,
      desktopPositionX: 50,
      desktopPositionY: 50,
      mobilePositionX: 50,
      mobilePositionY: 50
    };
  }

  const record = value as Record<string, unknown>;
  const fallbackX = coverPosition(record.positionX);
  const fallbackY = coverPosition(record.positionY);

  return {
    mediaFileId: typeof record.mediaFileId === "string" && record.mediaFileId.length > 0 ? record.mediaFileId : null,
    desktopPositionX: record.desktopPositionX == null ? fallbackX : coverPosition(record.desktopPositionX),
    desktopPositionY: record.desktopPositionY == null ? fallbackY : coverPosition(record.desktopPositionY),
    mobilePositionX: record.mobilePositionX == null ? fallbackX : coverPosition(record.mobilePositionX),
    mobilePositionY: record.mobilePositionY == null ? fallbackY : coverPosition(record.mobilePositionY)
  };
}

export function parseEventCoverMediaId(value: unknown) {
  return parseEventCover(value).mediaFileId;
}

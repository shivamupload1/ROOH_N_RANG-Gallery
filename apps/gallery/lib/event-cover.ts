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
    return { mediaFileId: null, positionX: 50, positionY: 50 };
  }

  const record = value as Record<string, unknown>;
  return {
    mediaFileId: typeof record.mediaFileId === "string" && record.mediaFileId.length > 0 ? record.mediaFileId : null,
    positionX: coverPosition(record.positionX),
    positionY: coverPosition(record.positionY)
  };
}

export function parseEventCoverMediaId(value: unknown) {
  return parseEventCover(value).mediaFileId;
}

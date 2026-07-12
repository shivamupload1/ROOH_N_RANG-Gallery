const SELECTION_SUBMISSION_PREFIX = "selectionSubmission:";

export type SelectionSubmission = {
  eventId: string;
  eventSlug: string;
  eventName: string;
  clientName: string;
  visitorId: string;
  submittedAt: string;
  favoriteCount: number;
  mediaFileIds: string[];
  fileNames: string[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function readString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function readStringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

export function selectionSubmissionKey(eventId: string, visitorId: string) {
  return `${SELECTION_SUBMISSION_PREFIX}${eventId}:${visitorId}`;
}

export function selectionSubmissionPrefix() {
  return SELECTION_SUBMISSION_PREFIX;
}

export function selectionSubmissionLookupKey(eventId: string, visitorId: string) {
  return `${eventId}:${visitorId}`;
}

export function parseSelectionSubmission(value: unknown): SelectionSubmission | null {
  if (!isRecord(value)) {
    return null;
  }

  const eventId = readString(value.eventId);
  const eventSlug = readString(value.eventSlug);
  const eventName = readString(value.eventName);
  const clientName = readString(value.clientName);
  const visitorId = readString(value.visitorId);
  const submittedAt = readString(value.submittedAt);
  const favoriteCount = typeof value.favoriteCount === "number" ? value.favoriteCount : Number(value.favoriteCount || 0);
  const mediaFileIds = readStringArray(value.mediaFileIds);
  const fileNames = readStringArray(value.fileNames);

  if (!eventId || !eventSlug || !eventName || !visitorId || !submittedAt || Number.isNaN(favoriteCount)) {
    return null;
  }

  return {
    eventId,
    eventSlug,
    eventName,
    clientName,
    visitorId,
    submittedAt,
    favoriteCount,
    mediaFileIds,
    fileNames
  };
}

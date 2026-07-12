import { createHmac, timingSafeEqual } from "node:crypto";
import { DriveAccountStatus, MediaType } from "@prisma/client";
import { google } from "googleapis";
import { decrypt, encrypt } from "@/lib/crypto";
import { prisma } from "@/lib/db";
import { generateSlug } from "@/lib/slug";

const DRIVE_SCOPES = [
  "https://www.googleapis.com/auth/drive",
  "https://www.googleapis.com/auth/userinfo.email"
];
const GOOGLE_DRIVE_FOLDER_MIME = "application/vnd.google-apps.folder";

type OAuthState = {
  driveAccountId: string;
  ts: number;
};

type DriveListItem = {
  id?: string | null;
  name?: string | null;
  mimeType?: string | null;
  size?: string | null;
  thumbnailLink?: string | null;
  webViewLink?: string | null;
  webContentLink?: string | null;
  imageMediaMetadata?: {
    width?: number | string | null;
    height?: number | string | null;
  } | null;
  videoMediaMetadata?: {
    durationMillis?: number | string | null;
  } | null;
};

function normalizeEnvValue(value?: string) {
  if (!value) {
    return "";
  }

  return value.trim().replace(/^['"]|['"]$/g, "");
}

function appUrl() {
  return normalizeEnvValue(process.env.APP_URL) || "http://localhost:3000";
}

function callbackUrl(origin?: string) {
  const baseUrl = origin || normalizeEnvValue(process.env.GOOGLE_REDIRECT_URI) || `${appUrl()}/api/google/callback`;

  if (baseUrl.endsWith("/api/google/callback")) {
    return baseUrl;
  }

  return `${baseUrl.replace(/\/$/, "")}/api/google/callback`;
}

function oauthConfig(origin?: string) {
  const clientId = normalizeEnvValue(process.env.GOOGLE_CLIENT_ID);
  const clientSecret = normalizeEnvValue(process.env.GOOGLE_CLIENT_SECRET);
  const redirectUri = callbackUrl(origin);

  if (!clientId || !clientSecret) {
    throw new Error("GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are required.");
  }

  return { clientId, clientSecret, redirectUri };
}

function signingSecret() {
  const secret = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET;

  if (!secret) {
    throw new Error("JWT_SECRET is required to sign Google OAuth state.");
  }

  return secret;
}

function sign(value: string) {
  return createHmac("sha256", signingSecret()).update(value).digest("base64url");
}

function googleErrorMessage(error: unknown) {
  if (error && typeof error === "object") {
    const candidate = error as {
      message?: unknown;
      response?: { data?: unknown };
    };

    if (candidate.response?.data && typeof candidate.response.data === "object") {
      const responseError = candidate.response.data as {
        error?: { message?: unknown };
      };

      if (typeof responseError.error?.message === "string") {
        return responseError.error.message;
      }
    }

    if (typeof candidate.message === "string") {
      return candidate.message;
    }
  }

  return "";
}

function folderAccessMessage(error: unknown) {
  const message = googleErrorMessage(error);

  if (/invalid|not found|permission|forbidden|insufficient/i.test(message)) {
    return "Google Drive could not open this folder. Check that the Root folder ID is correct, belongs to this Google account, and reconnect Google after this permission update.";
  }

  return message || "Google Drive request failed while reading this folder.";
}

function isFolder(item: Pick<DriveListItem, "mimeType">) {
  return item.mimeType === GOOGLE_DRIVE_FOLDER_MIME;
}

function isMediaFile(item: Pick<DriveListItem, "mimeType">) {
  return Boolean(item.mimeType && (item.mimeType.startsWith("image/") || item.mimeType.startsWith("video/")));
}

function parseIntOrNull(value?: string | number | null) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = Number.parseInt(String(value), 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseBigIntOrNull(value?: string | number | null) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  try {
    return BigInt(String(value));
  } catch {
    return null;
  }
}

function uniqueSlug(baseSlug: string, usedSlugs: Set<string>) {
  const normalizedBase = baseSlug || "album";
  let candidate = normalizedBase;
  let suffix = 2;

  while (usedSlugs.has(candidate)) {
    candidate = `${normalizedBase}-${suffix}`;
    suffix += 1;
  }

  usedSlugs.add(candidate);
  return candidate;
}

function mediaMetadataForFile(file: DriveListItem) {
  return {
    fileSize: parseBigIntOrNull(file.size),
    width: parseIntOrNull(file.imageMediaMetadata?.width),
    height: parseIntOrNull(file.imageMediaMetadata?.height),
    duration: parseIntOrNull(file.videoMediaMetadata?.durationMillis)
  };
}

function encodeState(state: OAuthState) {
  const payload = Buffer.from(JSON.stringify(state)).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

function decodeState(value: string): OAuthState {
  const [payload, signature] = value.split(".");

  if (!payload || !signature) {
    throw new Error("Invalid OAuth state.");
  }

  const expected = sign(payload);
  const expectedBuffer = Buffer.from(expected);
  const signatureBuffer = Buffer.from(signature);

  if (expectedBuffer.length !== signatureBuffer.length || !timingSafeEqual(expectedBuffer, signatureBuffer)) {
    throw new Error("Invalid OAuth state signature.");
  }

  const state = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as OAuthState;

  if (!state.driveAccountId || Date.now() - state.ts > 1000 * 60 * 15) {
    throw new Error("OAuth state expired.");
  }

  return state;
}

export function createOAuthClient(origin?: string) {
  const { clientId, clientSecret, redirectUri } = oauthConfig(origin);
  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

export function getAuthUrl(driveAccountId: string, origin?: string) {
  const oauth2Client = createOAuthClient(origin);

  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: DRIVE_SCOPES,
    state: encodeState({ driveAccountId, ts: Date.now() })
  });
}

export async function handleOAuthCallback(code: string, stateValue: string, origin?: string) {
  const state = decodeState(stateValue);
  const oauth2Client = createOAuthClient(origin);
  const { tokens } = await oauth2Client.getToken(code);
  oauth2Client.setCredentials(tokens);

  const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
  const profile = await oauth2.userinfo.get();

  await prisma.driveAccount.update({
    where: { id: state.driveAccountId },
    data: {
      googleEmail: profile.data.email || undefined,
      encryptedAccessToken: tokens.access_token ? encrypt(tokens.access_token) : undefined,
      encryptedRefreshToken: tokens.refresh_token ? encrypt(tokens.refresh_token) : undefined,
      tokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
      status: DriveAccountStatus.CONNECTED
    }
  });

  return state.driveAccountId;
}

async function authorizedClient(driveAccountId: string) {
  const account = await prisma.driveAccount.findUnique({ where: { id: driveAccountId } });

  if (!account) {
    throw new Error("Drive account not found.");
  }

  if (!account?.encryptedRefreshToken) {
    await prisma.driveAccount.update({
      where: { id: driveAccountId },
      data: { status: DriveAccountStatus.REVOKED }
    });
    throw new Error("Drive account is not connected.");
  }

  const oauth2Client = createOAuthClient();
  const currentAccessToken = account.encryptedAccessToken ? decrypt(account.encryptedAccessToken) : undefined;
  let accessToken = currentAccessToken;

  oauth2Client.setCredentials({
    access_token: currentAccessToken,
    refresh_token: decrypt(account.encryptedRefreshToken),
    expiry_date: account.tokenExpiry?.getTime()
  });

  try {
    const token = await oauth2Client.getAccessToken();
    accessToken = token.token || currentAccessToken;

    if (token.token && token.token !== currentAccessToken) {
      await prisma.driveAccount.update({
        where: { id: driveAccountId },
        data: {
          encryptedAccessToken: encrypt(token.token),
          status: DriveAccountStatus.CONNECTED
        }
      });
    }
  } catch {
    await prisma.driveAccount.update({
      where: { id: driveAccountId },
      data: {
        status: account.tokenExpiry && account.tokenExpiry.getTime() < Date.now() ? DriveAccountStatus.EXPIRED : DriveAccountStatus.REVOKED
      }
    });

    throw new Error("Google Drive connection expired or was revoked. Reconnect the account and try again.");
  }

  if (!accessToken) {
    throw new Error("Google Drive connection expired or was revoked. Reconnect the account and try again.");
  }

  return { account, oauth2Client, accessToken };
}

export async function createFolder(driveAccountId: string, name: string, parentFolderId?: string | null) {
  try {
    const { oauth2Client } = await authorizedClient(driveAccountId);
    const drive = google.drive({ version: "v3", auth: oauth2Client });
    const response = await drive.files.create({
      supportsAllDrives: true,
      requestBody: {
        name,
        mimeType: "application/vnd.google-apps.folder",
        parents: parentFolderId ? [parentFolderId] : undefined
      },
      fields: "id,name"
    });

    return response.data;
  } catch (error) {
    throw new Error(folderAccessMessage(error));
  }
}

export async function listFiles(driveAccountId: string, folderId: string) {
  try {
    const { account, oauth2Client } = await authorizedClient(driveAccountId);
    const drive = google.drive({ version: "v3", auth: oauth2Client });
    const files: DriveListItem[] = [];
    let pageToken: string | undefined;

    do {
      const response = await drive.files.list({
        supportsAllDrives: true,
        includeItemsFromAllDrives: true,
        corpora: account.sharedDriveId ? "drive" : "allDrives",
        driveId: account.sharedDriveId || undefined,
        q: `'${folderId}' in parents and trashed = false`,
        pageSize: 1000,
        pageToken,
        orderBy: "folder,name_natural",
        fields: "nextPageToken,files(id,name,mimeType,size,thumbnailLink,webViewLink,webContentLink,imageMediaMetadata,videoMediaMetadata)"
      });
      files.push(...((response.data.files || []) as DriveListItem[]));
      pageToken = response.data.nextPageToken || undefined;
    } while (pageToken);

    return files;
  } catch (error) {
    throw new Error(folderAccessMessage(error));
  }
}

export async function getFileMetadata(driveAccountId: string, fileId: string) {
  try {
    const { oauth2Client } = await authorizedClient(driveAccountId);
    const drive = google.drive({ version: "v3", auth: oauth2Client });
    const response = await drive.files.get({
      fileId,
      supportsAllDrives: true,
      fields: "id,name,mimeType,size,thumbnailLink,webViewLink,webContentLink,imageMediaMetadata,videoMediaMetadata"
    });

    return response.data as DriveListItem;
  } catch (error) {
    throw new Error(folderAccessMessage(error));
  }
}

async function authorizedFetch(accessToken: string, url: string) {
  return fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`
    },
    cache: "no-store"
  });
}

function driveMediaUrl(fileId: string) {
  return `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media&supportsAllDrives=true`;
}

export async function fetchDriveFileAsset(input: {
  driveAccountId: string;
  fileId: string;
  thumbnailUrl?: string | null;
  preferThumbnail?: boolean;
  fallbackToMedia?: boolean;
}) {
  const { driveAccountId, fileId, thumbnailUrl, preferThumbnail = false, fallbackToMedia = true } = input;
  const { accessToken } = await authorizedClient(driveAccountId);

  if (preferThumbnail && thumbnailUrl) {
    const thumbnailResponse = await authorizedFetch(accessToken, thumbnailUrl);

    if (thumbnailResponse.ok) {
      return thumbnailResponse;
    }

    if (!fallbackToMedia) {
      throw new Error(`Google Drive file request failed (${thumbnailResponse.status}).`);
    }
  }

  const mediaResponse = await authorizedFetch(accessToken, driveMediaUrl(fileId));

  if (!mediaResponse.ok) {
    throw new Error(`Google Drive file request failed (${mediaResponse.status}).`);
  }

  return mediaResponse;
}

export async function syncEventGalleryFromDrive(eventId: string) {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: {
      albums: {
        orderBy: { sortOrder: "asc" }
      }
    }
  });

  if (!event) {
    throw new Error("Event not found.");
  }

  if (!event.driveFolderId) {
    throw new Error("Save the event folder ID first.");
  }

  const items = await listFiles(event.driveAccountId, event.driveFolderId);
  const folders = items.filter((item) => isFolder(item) && item.id && item.name);
  const usedSlugs = new Set(event.albums.map((album) => album.slug));
  const albumsByFolderId = new Map(
    event.albums.filter((album) => album.driveFolderId).map((album) => [album.driveFolderId as string, album])
  );
  const albumsBySlug = new Map(event.albums.map((album) => [album.slug, album]));
  const syncedAlbums: Array<{ id: string; name: string; driveFolderId: string }> = [];

  for (const [index, folder] of folders.entries()) {
    const folderId = folder.id as string;
    const folderName = folder.name as string;
    const baseSlug = generateSlug(folderName) || `album-${index + 1}`;
    const matchedAlbum = albumsByFolderId.get(folderId) || albumsBySlug.get(baseSlug);

    if (matchedAlbum) {
      await prisma.album.update({
        where: { id: matchedAlbum.id },
        data: {
          name: folderName,
          driveFolderId: folderId,
          sortOrder: index + 1
        }
      });

      syncedAlbums.push({
        id: matchedAlbum.id,
        name: folderName,
        driveFolderId: folderId
      });
      continue;
    }

    const album = await prisma.album.create({
      data: {
        eventId: event.id,
        name: folderName,
        slug: uniqueSlug(baseSlug, usedSlugs),
        sortOrder: index + 1,
        driveFolderId: folderId
      }
    });

    syncedAlbums.push({
      id: album.id,
      name: album.name,
      driveFolderId: folderId as string
    });
  }

  const importedRootFiles = await importFilesFromFolder(event.driveAccountId, event.id, null, event.driveFolderId);
  let importedMediaCount = importedRootFiles.length;

  for (const album of syncedAlbums) {
    const importedFiles = await importFilesFromFolder(event.driveAccountId, event.id, album.id, album.driveFolderId);
    importedMediaCount += importedFiles.length;
  }

  return {
    albumCount: syncedAlbums.length,
    mediaCount: importedMediaCount,
    rootFilesCount: importedRootFiles.length,
    hasVisibleMedia: items.some((item) => isMediaFile(item))
  };
}

export async function importFilesFromFolder(
  driveAccountId: string,
  eventId: string,
  albumId: string | null,
  folderId: string
) {
  const files = await listFiles(driveAccountId, folderId);
  const imported = [];

  for (const file of files) {
    if (!file.id || !file.name || !file.mimeType) {
      continue;
    }

    const mediaType = file.mimeType.startsWith("video/") ? MediaType.VIDEO : MediaType.PHOTO;

    if (!isMediaFile(file)) {
      continue;
    }

    const metadata = mediaMetadataForFile(file);

    const media = await prisma.mediaFile.upsert({
      where: {
        driveAccountId_driveFileId: {
          driveAccountId,
          driveFileId: file.id
        }
      },
      update: {
        eventId,
        albumId,
        fileName: file.name,
        mimeType: file.mimeType,
        fileSize: metadata.fileSize,
        mediaType,
        thumbnailUrl: file.thumbnailLink || null,
        previewUrl: file.webContentLink || file.webViewLink || null,
        width: metadata.width,
        height: metadata.height,
        duration: metadata.duration,
        downloadAllowed: true
      },
      create: {
        eventId,
        albumId,
        driveAccountId,
        driveFileId: file.id,
        fileName: file.name,
        mimeType: file.mimeType,
        fileSize: metadata.fileSize,
        mediaType,
        thumbnailUrl: file.thumbnailLink || null,
        previewUrl: file.webContentLink || file.webViewLink || null,
        width: metadata.width,
        height: metadata.height,
        duration: metadata.duration,
        downloadAllowed: true
      }
    });

    imported.push(media);
  }

  return imported;
}

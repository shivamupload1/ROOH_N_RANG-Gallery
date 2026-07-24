ALTER TABLE "User"
ALTER COLUMN "role" SET DEFAULT 'GUEST';

CREATE TABLE "UserGalleryAccess" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "firstAccessedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastAccessedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "accessCount" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserGalleryAccess_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UserGalleryAccess_userId_eventId_key"
ON "UserGalleryAccess"("userId", "eventId");

CREATE INDEX "UserGalleryAccess_eventId_lastAccessedAt_idx"
ON "UserGalleryAccess"("eventId", "lastAccessedAt");

CREATE INDEX "UserGalleryAccess_userId_lastAccessedAt_idx"
ON "UserGalleryAccess"("userId", "lastAccessedAt");

ALTER TABLE "UserGalleryAccess"
ADD CONSTRAINT "UserGalleryAccess_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "UserGalleryAccess"
ADD CONSTRAINT "UserGalleryAccess_eventId_fkey"
FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "AuthHandoff" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "destination" TEXT NOT NULL,
    "returnPath" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuthHandoff_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AuthHandoff_tokenHash_key"
ON "AuthHandoff"("tokenHash");

CREATE INDEX "AuthHandoff_userId_createdAt_idx"
ON "AuthHandoff"("userId", "createdAt");

CREATE INDEX "AuthHandoff_expiresAt_idx"
ON "AuthHandoff"("expiresAt");

ALTER TABLE "AuthHandoff"
ADD CONSTRAINT "AuthHandoff_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Browser clients authenticate through Supabase Auth, but all application data
-- is served by the three trusted Next.js servers. No direct anon/authenticated
-- PostgREST table access is allowed.
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Client" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DriveAccount" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Event" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Album" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MediaFile" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Favorite" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Download" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Inquiry" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "WebsiteContent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Settings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "InstagramPost" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "UserGalleryAccess" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AuthHandoff" ENABLE ROW LEVEL SECURITY;

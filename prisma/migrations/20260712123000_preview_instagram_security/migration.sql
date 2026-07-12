CREATE TYPE "PreviewStatus" AS ENUM ('PENDING', 'PROCESSING', 'READY', 'FAILED');
CREATE TYPE "GalleryAccessMode" AS ENUM ('PIN', 'PUBLIC');

ALTER TABLE "Event" ADD COLUMN "accessMode" "GalleryAccessMode" NOT NULL DEFAULT 'PIN';

ALTER TABLE "MediaFile"
ADD COLUMN "previewStatus" "PreviewStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN "previewStoragePath" TEXT,
ADD COLUMN "previewWidth" INTEGER,
ADD COLUMN "previewHeight" INTEGER,
ADD COLUMN "previewBytes" INTEGER,
ADD COLUMN "previewMimeType" TEXT,
ADD COLUMN "previewError" TEXT,
ADD COLUMN "previewGeneratedAt" TIMESTAMP(3);

CREATE INDEX "MediaFile_previewStatus_idx" ON "MediaFile"("previewStatus");

CREATE TABLE "InstagramPost" (
  "id" TEXT NOT NULL,
  "permalink" TEXT NOT NULL,
  "mediaType" TEXT NOT NULL,
  "mediaUrl" TEXT,
  "thumbnailUrl" TEXT,
  "caption" TEXT,
  "postedAt" TIMESTAMP(3),
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "InstagramPost_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "InstagramPost_isActive_postedAt_idx" ON "InstagramPost"("isActive", "postedAt");

DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'User', 'Client', 'DriveAccount', 'Event', 'Album', 'MediaFile',
    'Favorite', 'Download', 'Inquiry', 'WebsiteContent', 'Settings', 'InstagramPost'
  ]
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('REVOKE ALL ON TABLE %I FROM anon, authenticated', table_name);
  END LOOP;
END $$;

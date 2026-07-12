-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'CLIENT', 'GUEST');

-- CreateEnum
CREATE TYPE "DriveAccountType" AS ENUM ('CLIENT_PERSONAL', 'STUDIO_WORKSPACE', 'SHARED_DRIVE');

-- CreateEnum
CREATE TYPE "DriveAccountStatus" AS ENUM ('CONNECTED', 'EXPIRED', 'REVOKED');

-- CreateEnum
CREATE TYPE "MediaType" AS ENUM ('PHOTO', 'VIDEO');

-- CreateEnum
CREATE TYPE "InquiryStatus" AS ENUM ('NEW', 'CONTACTED', 'BOOKED', 'ARCHIVED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "passwordHash" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'CLIENT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "city" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DriveAccount" (
    "id" TEXT NOT NULL,
    "clientId" TEXT,
    "label" TEXT NOT NULL,
    "googleEmail" TEXT,
    "accountType" "DriveAccountType" NOT NULL DEFAULT 'CLIENT_PERSONAL',
    "encryptedAccessToken" TEXT,
    "encryptedRefreshToken" TEXT,
    "tokenExpiry" TIMESTAMP(3),
    "rootFolderId" TEXT,
    "sharedDriveId" TEXT,
    "status" "DriveAccountStatus" NOT NULL DEFAULT 'REVOKED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DriveAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "driveAccountId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "eventType" TEXT,
    "eventDate" TIMESTAMP(3),
    "city" TEXT,
    "pinHash" TEXT NOT NULL,
    "driveFolderId" TEXT,
    "expiryDate" TIMESTAMP(3),
    "downloadAllowed" BOOLEAN NOT NULL DEFAULT false,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Album" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "driveFolderId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Album_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MediaFile" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "albumId" TEXT,
    "driveAccountId" TEXT NOT NULL,
    "driveFileId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSize" BIGINT,
    "mediaType" "MediaType" NOT NULL,
    "thumbnailUrl" TEXT,
    "previewUrl" TEXT,
    "width" INTEGER,
    "height" INTEGER,
    "duration" INTEGER,
    "downloadAllowed" BOOLEAN NOT NULL DEFAULT false,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MediaFile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Favorite" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "mediaFileId" TEXT NOT NULL,
    "visitorId" TEXT,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Favorite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Download" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "mediaFileId" TEXT NOT NULL,
    "visitorId" TEXT,
    "userId" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "downloadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Download_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Inquiry" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "eventType" TEXT,
    "eventDate" TIMESTAMP(3),
    "city" TEXT,
    "message" TEXT,
    "status" "InquiryStatus" NOT NULL DEFAULT 'NEW',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Inquiry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebsiteContent" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WebsiteContent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Settings" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Client_email_idx" ON "Client"("email");

-- CreateIndex
CREATE INDEX "Client_phone_idx" ON "Client"("phone");

-- CreateIndex
CREATE INDEX "DriveAccount_clientId_idx" ON "DriveAccount"("clientId");

-- CreateIndex
CREATE INDEX "DriveAccount_status_idx" ON "DriveAccount"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Event_slug_key" ON "Event"("slug");

-- CreateIndex
CREATE INDEX "Event_clientId_idx" ON "Event"("clientId");

-- CreateIndex
CREATE INDEX "Event_driveAccountId_idx" ON "Event"("driveAccountId");

-- CreateIndex
CREATE INDEX "Event_isPublished_idx" ON "Event"("isPublished");

-- CreateIndex
CREATE INDEX "Event_expiryDate_idx" ON "Event"("expiryDate");

-- CreateIndex
CREATE INDEX "Album_eventId_idx" ON "Album"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "Album_eventId_slug_key" ON "Album"("eventId", "slug");

-- CreateIndex
CREATE INDEX "MediaFile_eventId_idx" ON "MediaFile"("eventId");

-- CreateIndex
CREATE INDEX "MediaFile_albumId_idx" ON "MediaFile"("albumId");

-- CreateIndex
CREATE INDEX "MediaFile_mediaType_idx" ON "MediaFile"("mediaType");

-- CreateIndex
CREATE INDEX "MediaFile_isFeatured_idx" ON "MediaFile"("isFeatured");

-- CreateIndex
CREATE UNIQUE INDEX "MediaFile_driveAccountId_driveFileId_key" ON "MediaFile"("driveAccountId", "driveFileId");

-- CreateIndex
CREATE INDEX "Favorite_visitorId_idx" ON "Favorite"("visitorId");

-- CreateIndex
CREATE INDEX "Favorite_userId_idx" ON "Favorite"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Favorite_eventId_mediaFileId_visitorId_key" ON "Favorite"("eventId", "mediaFileId", "visitorId");

-- CreateIndex
CREATE UNIQUE INDEX "Favorite_eventId_mediaFileId_userId_key" ON "Favorite"("eventId", "mediaFileId", "userId");

-- CreateIndex
CREATE INDEX "Download_eventId_idx" ON "Download"("eventId");

-- CreateIndex
CREATE INDEX "Download_mediaFileId_idx" ON "Download"("mediaFileId");

-- CreateIndex
CREATE INDEX "Download_visitorId_idx" ON "Download"("visitorId");

-- CreateIndex
CREATE INDEX "Download_userId_idx" ON "Download"("userId");

-- CreateIndex
CREATE INDEX "Inquiry_status_idx" ON "Inquiry"("status");

-- CreateIndex
CREATE INDEX "Inquiry_createdAt_idx" ON "Inquiry"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "WebsiteContent_key_key" ON "WebsiteContent"("key");

-- CreateIndex
CREATE UNIQUE INDEX "Settings_key_key" ON "Settings"("key");

-- AddForeignKey
ALTER TABLE "Client" ADD CONSTRAINT "Client_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DriveAccount" ADD CONSTRAINT "DriveAccount_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_driveAccountId_fkey" FOREIGN KEY ("driveAccountId") REFERENCES "DriveAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Album" ADD CONSTRAINT "Album_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaFile" ADD CONSTRAINT "MediaFile_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaFile" ADD CONSTRAINT "MediaFile_albumId_fkey" FOREIGN KEY ("albumId") REFERENCES "Album"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaFile" ADD CONSTRAINT "MediaFile_driveAccountId_fkey" FOREIGN KEY ("driveAccountId") REFERENCES "DriveAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Favorite" ADD CONSTRAINT "Favorite_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Favorite" ADD CONSTRAINT "Favorite_mediaFileId_fkey" FOREIGN KEY ("mediaFileId") REFERENCES "MediaFile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Favorite" ADD CONSTRAINT "Favorite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Download" ADD CONSTRAINT "Download_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Download" ADD CONSTRAINT "Download_mediaFileId_fkey" FOREIGN KEY ("mediaFileId") REFERENCES "MediaFile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Download" ADD CONSTRAINT "Download_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

import { PrismaClient, UserRole, DriveAccountStatus, DriveAccountType, MediaType } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const adminEmail = (process.env.ADMIN_EMAIL || "admin@roohandrangstories.in").toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD || "ChangeMeSoon!";
  const adminPasswordHash = await bcrypt.hash(adminPassword, 12);
  const galleryPinHash = await bcrypt.hash("1234", 12);

  const existingAdmin = await prisma.user.findFirst({
    where: {
      email: {
        equals: adminEmail,
        mode: "insensitive"
      }
    },
    select: { id: true }
  });

  if (existingAdmin) {
    await prisma.user.update({
      where: { id: existingAdmin.id },
      data: {
        name: "ROOH & RANG Admin",
        email: adminEmail,
        passwordHash: adminPasswordHash,
        role: UserRole.ADMIN
      }
    });
  } else {
    await prisma.user.create({
      data: {
        name: "ROOH & RANG Admin",
        email: adminEmail,
        passwordHash: adminPasswordHash,
        role: UserRole.ADMIN
      }
    });
  }

  await prisma.websiteContent.upsert({
    where: { key: "brand" },
    update: {
      value: {
        name: "ROOH & RANG Stories",
        tagline: "Rooh se judi kahaniyan, rangon mein amar.",
        city: "Jaipur, Rajasthan"
      }
    },
    create: {
      key: "brand",
      value: {
        name: "ROOH & RANG Stories",
        tagline: "Rooh se judi kahaniyan, rangon mein amar.",
        city: "Jaipur, Rajasthan"
      }
    }
  });

  await prisma.settings.upsert({
    where: { key: "contact" },
    update: {
      value: {
        whatsapp: "+91 90000 00000",
        email: "hello@roohandrangstories.in",
        instagram: "@roohandrangstories"
      }
    },
    create: {
      key: "contact",
      value: {
        whatsapp: "+91 90000 00000",
        email: "hello@roohandrangstories.in",
        instagram: "@roohandrangstories"
      }
    }
  });

  const client = await prisma.client.upsert({
    where: { id: "sample-client-rahul-priya" },
    update: {
      name: "Rahul & Priya",
      email: "rahul.priya@example.com",
      phone: "+91 90000 00001",
      city: "Jaipur",
      notes: "Sample client for Phase 1 seed data."
    },
    create: {
      id: "sample-client-rahul-priya",
      name: "Rahul & Priya",
      email: "rahul.priya@example.com",
      phone: "+91 90000 00001",
      city: "Jaipur",
      notes: "Sample client for Phase 1 seed data."
    }
  });

  const driveAccount = await prisma.driveAccount.upsert({
    where: { id: "sample-drive-account" },
    update: {
      clientId: client.id,
      label: "Phase 3 Google Drive placeholder",
      googleEmail: "client-drive@example.com",
      accountType: DriveAccountType.CLIENT_PERSONAL,
      status: DriveAccountStatus.REVOKED
    },
    create: {
      id: "sample-drive-account",
      clientId: client.id,
      label: "Phase 3 Google Drive placeholder",
      googleEmail: "client-drive@example.com",
      accountType: DriveAccountType.CLIENT_PERSONAL,
      status: DriveAccountStatus.REVOKED
    }
  });

  const event = await prisma.event.upsert({
    where: { slug: "rahul-priya-wedding" },
    update: {
      clientId: client.id,
      driveAccountId: driveAccount.id,
      name: "Rahul & Priya Wedding",
      eventType: "Wedding",
      eventDate: new Date("2026-12-08T00:00:00.000Z"),
      city: "Jaipur",
      pinHash: galleryPinHash,
      expiryDate: new Date("2027-03-08T00:00:00.000Z"),
      downloadAllowed: true,
      isPublished: true
    },
    create: {
      clientId: client.id,
      driveAccountId: driveAccount.id,
      name: "Rahul & Priya Wedding",
      slug: "rahul-priya-wedding",
      eventType: "Wedding",
      eventDate: new Date("2026-12-08T00:00:00.000Z"),
      city: "Jaipur",
      pinHash: galleryPinHash,
      expiryDate: new Date("2027-03-08T00:00:00.000Z"),
      downloadAllowed: true,
      isPublished: true
    }
  });

  const albumSeeds = [
    { id: "sample-album-haldi", name: "Haldi", slug: "haldi", sortOrder: 1 },
    { id: "sample-album-mehendi", name: "Mehendi", slug: "mehendi", sortOrder: 2 },
    { id: "sample-album-wedding", name: "Wedding", slug: "wedding", sortOrder: 3 },
    { id: "sample-album-reception", name: "Reception", slug: "reception", sortOrder: 4 },
    { id: "sample-album-videos", name: "Videos", slug: "videos", sortOrder: 5 }
  ];

  for (const album of albumSeeds) {
    await prisma.album.upsert({
      where: { id: album.id },
      update: {
        eventId: event.id,
        name: album.name,
        slug: album.slug,
        sortOrder: album.sortOrder
      },
      create: {
        id: album.id,
        eventId: event.id,
        name: album.name,
        slug: album.slug,
        sortOrder: album.sortOrder
      }
    });
  }

  const weddingAlbum = await prisma.album.findUniqueOrThrow({ where: { id: "sample-album-wedding" } });
  const videoAlbum = await prisma.album.findUniqueOrThrow({ where: { id: "sample-album-videos" } });

  const mediaSeeds: Array<{
    id: string;
    albumId: string;
    driveFileId: string;
    fileName: string;
    mimeType: string;
    mediaType: MediaType;
    thumbnailUrl: string;
    previewUrl: string;
    width: number;
    height: number;
    duration?: number;
    isFeatured: boolean;
  }> = [
    {
      id: "sample-media-photo-1",
      albumId: weddingAlbum.id,
      driveFileId: "placeholder-drive-photo-1",
      fileName: "rahul-priya-portrait.jpg",
      mimeType: "image/jpeg",
      mediaType: MediaType.PHOTO,
      thumbnailUrl: "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=900&q=80",
      previewUrl: "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1400&q=80",
      width: 1400,
      height: 933,
      isFeatured: true
    },
    {
      id: "sample-media-photo-2",
      albumId: weddingAlbum.id,
      driveFileId: "placeholder-drive-photo-2",
      fileName: "jaipur-wedding-moment.jpg",
      mimeType: "image/jpeg",
      mediaType: MediaType.PHOTO,
      thumbnailUrl: "https://images.unsplash.com/photo-1606800052052-a08af7148866?auto=format&fit=crop&w=900&q=80",
      previewUrl: "https://images.unsplash.com/photo-1606800052052-a08af7148866?auto=format&fit=crop&w=1400&q=80",
      width: 1400,
      height: 933,
      isFeatured: true
    },
    {
      id: "sample-media-video-1",
      albumId: videoAlbum.id,
      driveFileId: "placeholder-drive-video-1",
      fileName: "wedding-highlight-placeholder.mp4",
      mimeType: "video/mp4",
      mediaType: MediaType.VIDEO,
      thumbnailUrl: "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=900&q=80",
      previewUrl: "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=1400&q=80",
      width: 1400,
      height: 933,
      duration: 60,
      isFeatured: false
    }
  ];

  for (const media of mediaSeeds) {
    await prisma.mediaFile.upsert({
      where: { id: media.id },
      update: {
        eventId: event.id,
        driveAccountId: driveAccount.id,
        albumId: media.albumId,
        driveFileId: media.driveFileId,
        fileName: media.fileName,
        mimeType: media.mimeType,
        mediaType: media.mediaType,
        thumbnailUrl: media.thumbnailUrl,
        previewUrl: media.previewUrl,
        width: media.width,
        height: media.height,
        duration: media.duration,
        isFeatured: media.isFeatured,
        downloadAllowed: true
      },
      create: {
        ...media,
        eventId: event.id,
        driveAccountId: driveAccount.id,
        downloadAllowed: true
      }
    });
  }

  console.log("Seed complete");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

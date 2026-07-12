import { prisma } from "@/lib/db";
import { brand as defaultBrand } from "@/lib/content";

export type SiteBrand = {
  name: string;
  tagline: string;
  city: string;
  whatsapp: string;
  whatsappHref: string;
  email: string;
  instagram: string;
};

export type HomeHeroContent = {
  eyebrow: string;
  title: string;
  subtitle: string;
};

export type AboutContent = {
  heading: string;
  paragraphs: [string, string, string];
};

export type GalleryDefaults = {
  defaultExpiryDays: 30 | 90 | 0;
  allowDownloadsByDefault: boolean;
  pinLength: 4;
  publicDomain: string;
};

const defaultHomeHero: HomeHeroContent = {
  eyebrow: defaultBrand.tagline,
  title: "Capture Your Wedding Story Forever",
  subtitle: "Premium wedding photography, cinematic films, pre-wedding shoots, and private online gallery delivery."
};

const defaultAboutContent: AboutContent = {
  heading: "Stories made of rooh, rang, ritual, and memory.",
  paragraphs: [
    `${defaultBrand.name} is a premium wedding photography studio based in ${defaultBrand.city}. We photograph weddings as living family histories: the quiet glance before a ceremony, the color of a dupatta in afternoon light, the laughter in a crowded courtyard, and the emotion that arrives without announcement.`,
    "Our style is cinematic and elegant, but never distant. We balance royal compositions with honest moments so your gallery feels both polished and personal. The work is designed for today's screens and tomorrow's albums.",
    "The client delivery portal supports secure galleries, favorite selections, download control, and Google Drive-backed storage for each event."
  ]
};

const defaultGalleryDefaults: GalleryDefaults = {
  defaultExpiryDays: 30,
  allowDownloadsByDefault: false,
  pinLength: 4,
  publicDomain: process.env.GALLERY_URL || process.env.NEXT_PUBLIC_GALLERY_URL || "http://localhost:3002"
};

function normalizeWhatsappHref(whatsapp: string) {
  const digits = whatsapp.replace(/\D/g, "");
  return digits ? `https://wa.me/${digits}` : defaultBrand.whatsappHref;
}

function mergeRecord<T extends Record<string, unknown>>(fallback: T, value: unknown): T {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return fallback;
  }

  return {
    ...fallback,
    ...value
  };
}

export async function getSiteBrand(): Promise<SiteBrand> {
  try {
    const [brandRecord, contactRecord] = await Promise.all([
      prisma.websiteContent.findUnique({ where: { key: "brand" }, select: { value: true } }),
      prisma.settings.findUnique({ where: { key: "contact" }, select: { value: true } })
    ]);

    const brandValue = mergeRecord(
      {
        name: defaultBrand.name,
        tagline: defaultBrand.tagline,
        city: defaultBrand.city
      },
      brandRecord?.value
    );

    const contactValue = mergeRecord(
      {
        whatsapp: defaultBrand.whatsapp,
        email: defaultBrand.email,
        instagram: defaultBrand.instagram
      },
      contactRecord?.value
    );

    const whatsapp = String(contactValue.whatsapp || defaultBrand.whatsapp);

    return {
      name: String(brandValue.name || defaultBrand.name),
      tagline: String(brandValue.tagline || defaultBrand.tagline),
      city: String(brandValue.city || defaultBrand.city),
      whatsapp,
      whatsappHref: normalizeWhatsappHref(whatsapp),
      email: String(contactValue.email || defaultBrand.email),
      instagram: String(contactValue.instagram || defaultBrand.instagram)
    };
  } catch {
    return defaultBrand;
  }
}

export async function getHomeHeroContent(): Promise<HomeHeroContent> {
  try {
    const record = await prisma.websiteContent.findUnique({
      where: { key: "homeHero" },
      select: { value: true }
    });

    const merged = mergeRecord(defaultHomeHero, record?.value);

    return {
      eyebrow: String(merged.eyebrow || defaultHomeHero.eyebrow),
      title: String(merged.title || defaultHomeHero.title),
      subtitle: String(merged.subtitle || defaultHomeHero.subtitle)
    };
  } catch {
    return defaultHomeHero;
  }
}

export async function getAboutContent(): Promise<AboutContent> {
  try {
    const record = await prisma.websiteContent.findUnique({
      where: { key: "about" },
      select: { value: true }
    });

    const merged = mergeRecord(
      {
        heading: defaultAboutContent.heading,
        paragraph1: defaultAboutContent.paragraphs[0],
        paragraph2: defaultAboutContent.paragraphs[1],
        paragraph3: defaultAboutContent.paragraphs[2]
      },
      record?.value
    );

    return {
      heading: String(merged.heading || defaultAboutContent.heading),
      paragraphs: [
        String(merged.paragraph1 || defaultAboutContent.paragraphs[0]),
        String(merged.paragraph2 || defaultAboutContent.paragraphs[1]),
        String(merged.paragraph3 || defaultAboutContent.paragraphs[2])
      ]
    };
  } catch {
    return defaultAboutContent;
  }
}

export async function getGalleryDefaults(): Promise<GalleryDefaults> {
  try {
    const record = await prisma.settings.findUnique({
      where: { key: "galleryDefaults" },
      select: { value: true }
    });

    const merged = mergeRecord(defaultGalleryDefaults, record?.value);
    const expiry = Number(merged.defaultExpiryDays);

    const configuredGalleryDomain = process.env.GALLERY_URL || process.env.NEXT_PUBLIC_GALLERY_URL;

    return {
      defaultExpiryDays: expiry === 90 ? 90 : expiry === 0 ? 0 : 30,
      allowDownloadsByDefault: Boolean(merged.allowDownloadsByDefault),
      pinLength: 4,
      publicDomain: String(configuredGalleryDomain || merged.publicDomain || defaultGalleryDefaults.publicDomain)
    };
  } catch {
    return defaultGalleryDefaults;
  }
}

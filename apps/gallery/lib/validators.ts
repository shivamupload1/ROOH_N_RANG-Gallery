import { z } from "zod";

export const adminLoginSchema = z.object({
  email: z.string().trim().email("Enter a valid admin email."),
  password: z.string().min(1, "Enter your password.")
});

const optionalText = z.string().trim().optional().or(z.literal(""));
const optionalDate = z.string().trim().optional().or(z.literal(""));
const pinSchema = z.string().trim().regex(/^\d{4}$/, "Use a 4 digit PIN.");

export const contactInquirySchema = z.object({
  name: z.string().trim().min(2, "Enter your name."),
  phone: z.string().trim().min(7, "Enter a valid phone number."),
  email: z.string().trim().email("Enter a valid email.").optional().or(z.literal("")),
  eventType: optionalText,
  eventDate: optionalDate,
  city: optionalText,
  message: z.string().trim().max(1000, "Keep the message under 1000 characters.").optional().or(z.literal(""))
});

export const clientSchema = z.object({
  name: z.string().trim().min(2, "Enter the client name."),
  email: z.string().trim().email("Enter a valid email.").optional().or(z.literal("")),
  phone: optionalText,
  city: optionalText,
  notes: optionalText
});

export const driveAccountSchema = z.object({
  clientId: optionalText,
  label: z.string().trim().min(2, "Enter an account label."),
  googleEmail: z.string().trim().email("Enter a valid Google email.").optional().or(z.literal("")),
  accountType: z.enum(["CLIENT_PERSONAL", "STUDIO_WORKSPACE", "SHARED_DRIVE"]),
  rootFolderId: optionalText,
  sharedDriveId: optionalText
});

export const eventSchema = z.object({
  clientId: z.string().min(1, "Choose a client."),
  driveAccountId: z.string().min(1, "Choose a Drive account."),
  name: z.string().trim().min(2, "Enter the event name."),
  slug: optionalText,
  eventType: optionalText,
  eventDate: optionalDate,
  city: optionalText,
  pin: pinSchema,
  expiryOption: z.enum(["30", "90", "none"]),
  downloadAllowed: z.enum(["on"]).optional(),
  isPublished: z.enum(["on"]).optional()
});

export const albumSchema = z.object({
  eventId: z.string().min(1, "Choose an event."),
  name: z.string().trim().min(2, "Enter the album name."),
  slug: optionalText,
  sortOrder: z.coerce.number().int().min(0).default(0),
  driveFolderId: optionalText
});

export const mediaFileSchema = z.object({
  eventId: z.string().min(1, "Choose an event."),
  albumId: optionalText,
  driveAccountId: z.string().min(1, "Choose a Drive account."),
  driveFileId: z.string().trim().min(2, "Enter the Drive file ID."),
  fileName: z.string().trim().min(2, "Enter the file name."),
  mimeType: z.string().trim().min(3, "Enter the MIME type."),
  mediaType: z.enum(["PHOTO", "VIDEO"]),
  thumbnailUrl: optionalText,
  previewUrl: optionalText,
  downloadAllowed: z.enum(["on"]).optional(),
  isFeatured: z.enum(["on"]).optional()
});

export const galleryPinSchema = z.object({
  eventId: z.string().min(1),
  pin: pinSchema
});

export const importDriveFolderSchema = z.object({
  eventId: z.string().min(1, "Choose an event."),
  albumId: optionalText,
  driveAccountId: z.string().min(1, "Choose a connected Drive account."),
  folderId: z.string().trim().min(3, "Enter the Drive folder ID.")
});

export const websiteContentSchema = z.object({
  heroEyebrow: z.string().trim().min(2, "Enter the hero eyebrow."),
  heroTitle: z.string().trim().min(3, "Enter the hero title."),
  heroSubtitle: z.string().trim().min(8, "Enter the hero subtitle."),
  aboutHeading: z.string().trim().min(3, "Enter the about heading."),
  aboutParagraph1: z.string().trim().min(20, "Add the first about paragraph."),
  aboutParagraph2: z.string().trim().min(20, "Add the second about paragraph."),
  aboutParagraph3: z.string().trim().min(20, "Add the third about paragraph.")
});

export const studioSettingsSchema = z.object({
  brandName: z.string().trim().min(2, "Enter the studio name."),
  tagline: z.string().trim().min(3, "Enter the tagline."),
  city: z.string().trim().min(2, "Enter the city."),
  whatsapp: z.string().trim().min(8, "Enter the WhatsApp number."),
  email: z.string().trim().email("Enter a valid email."),
  instagram: z.string().trim().min(2, "Enter the Instagram handle."),
  defaultExpiryDays: z.enum(["0", "30", "90"]),
  allowDownloadsByDefault: z.enum(["on"]).optional(),
  publicDomain: z.string().trim().url("Enter a valid public URL.")
});

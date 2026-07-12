export const appPorts = {
  website: 3000,
  admin: 3001,
  gallery: 3002
} as const;

export const appOrigins = {
  website: process.env.NEXT_PUBLIC_WEBSITE_URL || "http://localhost:3000",
  admin: process.env.NEXT_PUBLIC_ADMIN_URL || "http://localhost:3001",
  gallery: process.env.NEXT_PUBLIC_GALLERY_URL || "http://localhost:3002"
} as const;

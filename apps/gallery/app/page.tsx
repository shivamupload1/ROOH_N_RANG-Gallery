import { redirect } from "next/navigation";

export default function GalleryHomePage() {
  const website = process.env.WEBSITE_URL
    || process.env.NEXT_PUBLIC_WEBSITE_URL
    || (process.env.NODE_ENV === "production"
      ? "https://rooh-n-rang.vercel.app"
      : "http://localhost:3000");
  redirect(`${website.replace(/\/$/, "")}/main.html`);
}

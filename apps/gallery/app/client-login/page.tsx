import { redirect } from "next/navigation";
import { gallerySignInHref, safeInternalPath } from "@/lib/viewer-auth";

export const dynamic = "force-dynamic";

export default async function ClientLoginPage({
  searchParams
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  if (next) {
    redirect(gallerySignInHref(safeInternalPath(next)));
  }

  const website = process.env.WEBSITE_URL
    || process.env.NEXT_PUBLIC_WEBSITE_URL
    || (process.env.NODE_ENV === "production"
      ? "https://rooh-n-rang.vercel.app"
      : "http://localhost:3000");
  redirect(`${website.replace(/\/$/, "")}/main.html#login`);
}

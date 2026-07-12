"use server";

import { redirect } from "next/navigation";

export async function openGalleryAction(formData: FormData) {
  const value = String(formData.get("gallery") || "").trim();
  const slug = value
    .replace(/^https?:\/\/[^/]+/i, "")
    .replace(/^\/gallery\//i, "")
    .split(/[?#]/)[0]
    .replace(/^\/+|\/+$/g, "");

  if (!slug || !/^[a-z0-9-]+$/i.test(slug)) {
    redirect("/client-login?error=gallery");
  }

  redirect(`/gallery/${slug}`);
}

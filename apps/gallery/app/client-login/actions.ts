"use server";

import { redirect } from "next/navigation";

export async function openGalleryAction(formData: FormData) {
  const value = String(formData.get("gallery") || "").trim();
  const path = value
    .replace(/^https?:\/\/[^/]+/i, "")
    .split(/[?#]/)[0]
    .replace(/\/+$/g, "");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  if (/^\/[a-z0-9-]+\/(?:\d{4}-\d{2}-\d{2}|undated)\/[a-z0-9]{10}$/i.test(normalizedPath)) {
    redirect(normalizedPath);
  }

  const slug = normalizedPath.replace(/^\/gallery\//i, "").replace(/^\/+|\/+$/g, "");

  if (!slug || !/^[a-z0-9-]+$/i.test(slug)) {
    redirect("/client-login?error=gallery");
  }

  redirect(`/gallery/${slug}`);
}

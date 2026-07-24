import { redirect } from "next/navigation";
import { gallerySignInHref, getGalleryViewer, safeInternalPath } from "@/lib/viewer-auth";

export const dynamic = "force-dynamic";

export default async function GallerySignInPage({
  searchParams
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const nextPath = safeInternalPath(next);
  const viewer = await getGalleryViewer();

  if (viewer) {
    redirect(nextPath);
  }

  redirect(gallerySignInHref(nextPath));
}

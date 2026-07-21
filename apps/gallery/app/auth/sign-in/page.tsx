import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, LockKeyhole } from "lucide-react";
import { getSiteBrand } from "@/lib/site-content";
import { getGalleryViewer, safeInternalPath } from "@/lib/viewer-auth";

export const dynamic = "force-dynamic";

export default async function GallerySignInPage({
  searchParams
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;
  const nextPath = safeInternalPath(next);
  const viewer = await getGalleryViewer();

  if (viewer) {
    redirect(nextPath);
  }

  const brand = await getSiteBrand();
  const googleHref = `/auth/google?next=${encodeURIComponent(nextPath)}`;

  return (
    <main className="grid min-h-screen place-items-center bg-[#171414] px-4 py-12 text-white">
      <div className="relative w-full max-w-md overflow-hidden rounded-lg border border-white/20 bg-white/[0.08] p-7 shadow-[0_30px_100px_rgba(0,0,0,0.45)] backdrop-blur-2xl sm:p-9">
        <div className="relative">
          <div className="grid h-11 w-11 place-items-center rounded-full border border-white/25 bg-black/15">
            <LockKeyhole size={19} />
          </div>
          <p className="mt-8 text-[10px] font-bold uppercase tracking-[0.22em] text-white/55">{brand.name}</p>
          <h1 className="mt-3 font-serif text-4xl">Private gallery access</h1>
          <p className="mt-3 text-sm leading-6 text-white/65">
            Continue with your own Google account. After sign-in, enter the PIN shared by the studio.
          </p>

          {error ? (
            <p className="mt-5 rounded-md border border-red-200/20 bg-red-500/10 px-4 py-3 text-sm text-red-100">
              Google sign-in could not be completed. Please try again.
            </p>
          ) : null}

          <Link
            href={googleHref}
            className="mt-7 flex min-h-12 w-full items-center justify-between rounded-full border border-white/40 px-5 text-sm font-semibold transition hover:bg-white hover:text-[#171414]"
          >
            <span className="flex items-center gap-3"><span className="text-base font-bold">G</span> Continue with Google</span>
            <ArrowRight size={18} />
          </Link>
          <p className="mt-5 text-xs leading-5 text-white/45">Your Google password is never shared with Rooh N Rang.</p>
        </div>
      </div>
    </main>
  );
}

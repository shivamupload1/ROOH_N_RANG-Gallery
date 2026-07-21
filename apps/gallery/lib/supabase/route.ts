import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { type NextRequest, type NextResponse } from "next/server";

type PendingCookie = {
  name: string;
  value: string;
  options: CookieOptions;
};

export function createSupabaseRouteClient(request: NextRequest) {
  const pendingCookies: PendingCookie[] = [];
  const pendingHeaders = new Map<string, string>();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          pendingCookies.push(...cookiesToSet);
          Object.entries(headers).forEach(([name, value]) => pendingHeaders.set(name, value));
        }
      }
    }
  );

  function applyAuthCookies<T extends NextResponse>(response: T) {
    pendingCookies.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
    pendingHeaders.forEach((value, name) => response.headers.set(name, value));
    response.headers.set("Cache-Control", "private, no-cache, no-store, must-revalidate, max-age=0");
    return response;
  }

  return { supabase, applyAuthCookies };
}

import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

/**
 * Refresh the Supabase session on every request.
 * Required so Server Components see the latest auth state.
 *
 * No-ops when Supabase env vars aren't configured yet, so the app
 * can render even before you've created your Supabase project.
 */
export async function middleware(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anon) {
    return NextResponse.next({ request: { headers: request.headers } });
  }

  let response = NextResponse.next({ request: { headers: request.headers } });

  const supabase = createServerClient(url, anon, {
    cookies: {
      get(name: string) {
        return request.cookies.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        request.cookies.set({ name, value, ...options });
        response = NextResponse.next({ request: { headers: request.headers } });
        response.cookies.set({ name, value, ...options });
      },
      remove(name: string, options: CookieOptions) {
        request.cookies.set({ name, value: "", ...options });
        response = NextResponse.next({ request: { headers: request.headers } });
        response.cookies.set({ name, value: "", ...options });
      },
    },
  });

  try {
    await supabase.auth.getUser();
  } catch {
    // If Supabase is unreachable (bad URL, offline, etc.), don't 500 the request.
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg|.*\\.svg).*)"],
};

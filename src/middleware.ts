import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale } from "@/lib/i18n/config";
import { negotiateLocale } from "@/lib/i18n/negotiate";
import { env } from "@/lib/env";

/**
 * Two jobs, and they never overlap: the console has no locale segment, and the
 * public site has no session to refresh.
 *
 * Public side — only `/` is redirected.
 *
 * Every locale URL is directly reachable and returns 200. Redirecting a locale
 * URL based on headers is what traps a crawler in whichever locale its
 * Accept-Language happens to carry, and it would make hreflang a lie.
 *
 * Detection order: cookie → Accept-Language → en. The cookie is written only by
 * an explicit switch (see the locale switcher), never here — auto-detection that
 * writes a cookie would pin a user to a guess they never made.
 *
 * Console side — the access token is short-lived, so something has to refresh it
 * on the way past or the console signs itself out mid-edit. `getUser()` does that
 * as a side effect, and the refreshed cookies have to be written onto the response
 * that is actually returned, which is why the response object is threaded through
 * the cookie handlers rather than created at the end.
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    return refreshSession(request);
  }

  if (pathname !== "/") return NextResponse.next();

  const cookieValue = request.cookies.get(LOCALE_COOKIE)?.value;
  const locale =
    cookieValue && isLocale(cookieValue)
      ? cookieValue
      : negotiateLocale(request.headers.get("accept-language")) || DEFAULT_LOCALE;

  const url = request.nextUrl.clone();
  url.pathname = `/${locale}`;

  // 307, not 308: the redirect target depends on the request, so it must not be
  // cached as permanent by intermediaries or the browser.
  const response = NextResponse.redirect(url, 307);
  response.headers.set("Vary", "Accept-Language, Cookie");
  return response;
}

async function refreshSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(env.supabaseUrl, env.supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  // The call is the point: it refreshes the token when it is close to expiry.
  // Whether there is a user is decided in the console layout, against `admins`.
  await supabase.auth.getUser();

  return response;
}

export const config = {
  // Static assets and API routes are excluded outright. `/admin` is matched —
  // not for the locale logic, which skips it, but so the session gets refreshed.
  matcher: ["/((?!_next|api|.*\\.).*)"],
};

/**
 * Typed environment access.
 *
 * Reads happen here and nowhere else, so a missing variable fails with its own
 * name rather than surfacing later as `undefined` inside a URL.
 *
 * Getters, not eager constants: a module that needs only `siteUrl` should not
 * fail because Supabase has not been configured yet. The check still runs on
 * every read, so nothing gets to be quietly undefined.
 *
 * `process.env.X` is written out literally — Next substitutes these at build time
 * by static analysis, so `process.env[name]` would silently yield undefined in
 * the browser bundle.
 */

function required(value: string | undefined, name: string): string {
  if (!value) {
    throw new Error(
      `Missing environment variable ${name}. Copy .env.example to .env.local and fill it in.`,
    );
  }
  return value;
}

/** Safe on the client — every value here is NEXT_PUBLIC_. */
export const env = {
  /** Absolute origin, no trailing slash. Canonicals, hreflang and the sitemap. */
  get siteUrl(): string {
    return required(process.env.NEXT_PUBLIC_SITE_URL, "NEXT_PUBLIC_SITE_URL").replace(/\/$/, "");
  },
  get supabaseUrl(): string {
    return required(process.env.NEXT_PUBLIC_SUPABASE_URL, "NEXT_PUBLIC_SUPABASE_URL");
  },
  get supabaseAnonKey(): string {
    return required(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, "NEXT_PUBLIC_SUPABASE_ANON_KEY");
  },
  /**
   * Demo mode: the console renders fixtures, signs nobody in, and saves nothing.
   *
   * It is for showing the thing before the data behind it exists. Because it
   * disables the sign-in guard, it refuses to switch on in a production build —
   * a forgotten flag in a deploy would otherwise publish an open console.
   */
  /**
   * Demo photography: the catalogue renders the reference's six pictures instead
   * of the shop's own.
   *
   * Unlike `consoleDemo` this one is allowed in a production build. It swaps
   * photographs and nothing else — there is no guard to disable and no data to
   * fake — so a deployed preview can use it, which is the point of it existing.
   */
  get catalogDemoPhotos(): boolean {
    return process.env.NEXT_PUBLIC_CATALOG_DEMO_PHOTOS === "1";
  },
  get consoleDemo(): boolean {
    return (
      process.env.NEXT_PUBLIC_CONSOLE_DEMO === "1" && process.env.NODE_ENV !== "production"
    );
  },
} as const;

import "server-only";
import { revalidatePath } from "next/cache";

/**
 * The console has just changed what the site says.
 *
 * The landing page is cached — see its `revalidate` — so without this a price
 * edit would sit invisible for up to a minute and read as a save that did not
 * work. The path is the route pattern, not a URL: one call covers every locale.
 */
export function revalidateSite(): void {
  revalidatePath("/[locale]", "page");
}

import { createHash } from "node:crypto";
import sharp from "sharp";
import { createClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import { PHOTO_BUCKET } from "@/lib/catalog/photos";

/**
 * Every product photograph becomes a WebP, here.
 *
 * Here and not in the browser, because the browser cannot be trusted to do it:
 * Safari — which is what the owner's iPhone is — answers
 * `canvas.toBlob("image/webp")` with a PNG and says nothing. A conversion that
 * silently does not happen on the one device most likely to be used is not a
 * conversion. `sharp` is the encoder Next already ships for `next/image`, so
 * this adds no package to the install.
 *
 * What happens to a file on the way through:
 *   · turned upright from its EXIF orientation, then the metadata is dropped —
 *     including the GPS position a phone writes into every photo it takes;
 *   · fitted inside 2000 px, which is twice the largest size a card or the
 *     detail panel ever draws it at;
 *   · encoded as WebP at quality 82;
 *   · named by a hash of the result, so a corrected photo is a new URL and no
 *     cache anywhere can keep serving the old one;
 *   · given the 10×12 blur the site paints under it while it loads.
 */

export const runtime = "nodejs";

const MAX_EDGE = 2000;
const MAX_BYTES = 15 * 1024 * 1024;

function refuse(status: number, error: string): Response {
  return Response.json({ error }, { status });
}

export async function POST(request: Request): Promise<Response> {
  if (env.consoleDemo) return refuse(403, "Demo mode has nowhere to store photographs.");

  // Not behind the console layout's guard — route handlers have no layout — so
  // the same two questions are asked here: who is this, and are they on the list.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return refuse(401, "Sign in again, then upload.");

  const { data: allowed } = await supabase.rpc("is_admin");
  if (!allowed) return refuse(403, "Only an administrator can upload photographs.");

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File) || file.size === 0) return refuse(400, "No file arrived.");
  if (file.size > MAX_BYTES) return refuse(413, "That file is over 15 MB.");

  let webp: Buffer;
  let width = 0;
  let height = 0;

  try {
    const result = await sharp(Buffer.from(await file.arrayBuffer()), { failOn: "error" })
      .rotate()
      .resize({ width: MAX_EDGE, height: MAX_EDGE, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 82, effort: 4 })
      .toBuffer({ resolveWithObject: true });
    webp = result.data;
    width = result.info.width;
    height = result.info.height;
  } catch {
    return refuse(
      415,
      "That file is not an image the server can read. A HEIC photo from a computer is the usual " +
        "cause — export it as JPEG and upload that.",
    );
  }

  const blur = await sharp(webp).resize(10, 12, { fit: "cover" }).jpeg({ quality: 50 }).toBuffer();

  const name = `${createHash("sha256").update(webp).digest("hex").slice(0, 16)}.webp`;

  const { error } = await supabase.storage.from(PHOTO_BUCKET).upload(name, webp, {
    contentType: "image/webp",
    // The name changes whenever the bytes do, so the object never needs
    // revalidating.
    cacheControl: "31536000",
    upsert: true,
  });

  if (error) return refuse(502, `Storage refused the photo: ${error.message}`);

  return Response.json({
    path: name,
    blur: `data:image/jpeg;base64,${blur.toString("base64")}`,
    width,
    height,
    bytes: webp.length,
    originalBytes: file.size,
  });
}

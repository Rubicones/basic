"use client";

import { useState, type ChangeEvent } from "react";
import { Button, Field, IconAlert } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import { env } from "@/lib/env";

/**
 * Photo upload, with the blur placeholder made in the browser.
 *
 * The site's cards render a base64 preview under every photograph, so one has to
 * exist for each upload. Producing it on the server would mean an image library in
 * the bundle; a 10×12 canvas draw costs nothing and needs no dependency at all.
 *
 * The stored name carries a hash of the file's own bytes. Next keys its image
 * cache on the URL, so re-uploading a corrected photograph under a name it has
 * already cached leaves the old one being served — which is exactly the bug that
 * cost two rounds of "the photos are still cropped" earlier in this project.
 */

const BUCKET = "product-photos";

export function PhotoField({
  initialPath,
  initialBlur,
}: {
  initialPath: string | null;
  initialBlur: string | null;
}) {
  const [path, setPath] = useState(initialPath ?? "");
  const [blur, setBlur] = useState(initialBlur ?? "");
  const [local, setLocal] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setBusy(true);
    setError(null);

    try {
      // Demo mode has no bucket to write to, so the upload is skipped and the
      // preview comes from the file itself — the control still demonstrates.
      if (env.consoleDemo) {
        setLocal(URL.createObjectURL(file));
        setBlur(await makeBlur(file));
        setPath(file.name);
        return;
      }

      const bytes = await file.arrayBuffer();
      const name = `${await hash(bytes)}.${extensionOf(file)}`;

      const supabase = createClient();
      const { error: uploadError } = await supabase.storage.from(BUCKET).upload(name, file, {
        // The name already changes when the bytes do, so the object itself never
        // has to be revalidated.
        cacheControl: "31536000",
        upsert: true,
        contentType: file.type,
      });
      if (uploadError) throw new Error(uploadError.message);

      setBlur(await makeBlur(file));
      setPath(name);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The upload failed.");
    } finally {
      setBusy(false);
      event.target.value = "";
    }
  }

  const preview =
    local ??
    (path
      ? path.startsWith("/")
        ? path
        : `${env.supabaseUrl}/storage/v1/object/public/${BUCKET}/${path}`
      : null);

  return (
    <div className="flex flex-col gap-3">
      <input type="hidden" name="photo_path" value={path} />
      <input type="hidden" name="photo_blur" value={blur} />

      <Field name="photo" label="Photograph">
        <div className="flex items-start gap-4">
          <div className="border-line bg-surface-sunken size-24 shrink-0 overflow-hidden rounded-inner border">
            {preview && (
              // Not next/image: the file has just been uploaded and the optimiser
              // would be serving a cache entry for a URL it has never seen.
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt="" className="size-full object-cover" />
            )}
          </div>

          <div className="flex min-w-0 flex-col gap-2">
            <label className="inline-flex">
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFile}
                disabled={busy}
                className="sr-only"
                id="f-photo"
              />
              <span className="border-line-control text-body-sm hover:border-brand hover:text-brand cursor-pointer rounded-pill border px-4 py-2 transition-surface">
                {busy ? "Uploading…" : path ? "Replace" : "Choose a file"}
              </span>
            </label>

            {path && (
              <div className="flex items-center gap-3">
                <p className="text-caption text-content-secondary truncate">{path}</p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setPath("");
                    setBlur("");
                    setLocal(null);
                  }}
                >
                  Remove
                </Button>
              </div>
            )}
          </div>
        </div>
      </Field>

      {error && (
        <p role="alert" className="text-body-sm text-danger flex items-start gap-2 font-medium">
          <span className="mt-0.5 shrink-0">
            <IconAlert size={16} />
          </span>
          {error}
        </p>
      )}
    </div>
  );
}

async function hash(bytes: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest).slice(0, 4))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function extensionOf(file: File): string {
  if (file.type === "image/png") return "png";
  if (file.type === "image/webp") return "webp";
  return "jpg";
}

/** A 10×12 JPEG, which is all a blurred backdrop ever needed to be. */
function makeBlur(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement("canvas");
      canvas.width = 10;
      canvas.height = 12;
      const context = canvas.getContext("2d");
      if (!context) {
        reject(new Error("This browser cannot draw the preview."));
        return;
      }
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", 0.5));
    };

    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("That file is not an image this browser can read."));
    };

    image.src = url;
  });
}

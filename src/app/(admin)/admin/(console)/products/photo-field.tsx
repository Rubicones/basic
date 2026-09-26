"use client";

import { useState, type ChangeEvent } from "react";
import { Button, Field, IconAlert } from "@/components/ui";
import { env } from "@/lib/env";

/**
 * Photo upload.
 *
 * The file goes to /admin/api/photo, which turns it into a WebP, names it by a
 * hash of the result, stores it and hands back the path and the blur placeholder
 * — see that route for why the conversion cannot be left to the browser.
 *
 * The browser does one thing first: a 12-megapixel phone photo is 5–8 MB, and a
 * serverless function will not accept a request body that size. So a large image
 * is redrawn at 2400 px as a high-quality JPEG before it leaves, and the server
 * makes the real WebP from that. A small one is sent untouched, so it is not
 * compressed twice for no reason.
 */

const BUCKET = "product-photos";
const SHRINK_EDGE = 2400;
const SEND_AS_IS_BYTES = 2.5 * 1024 * 1024;

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

      const body = new FormData();
      body.set("file", await shrink(file));

      const response = await fetch("/admin/api/photo", { method: "POST", body });
      const result = (await response.json().catch(() => ({}))) as {
        path?: string;
        blur?: string;
        error?: string;
      };

      if (!response.ok || !result.path) {
        throw new Error(
          result.error ??
            (response.status === 413
              ? "That photo is too large to send. Export it smaller and try again."
              : `The upload failed (${response.status}).`),
        );
      }

      setLocal(null);
      setBlur(result.blur ?? "");
      setPath(result.path);
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
                accept="image/*"
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

/**
 * Small enough to send.
 *
 * Redrawn only when it is worth it — larger than 2400 px on its long edge, or
 * heavier than 2.5 MB. The browser applies EXIF orientation when it decodes, so
 * the redraw is upright. A file the browser cannot decode at all (HEIC on a
 * desktop browser) is sent as it is, and the server says what to do about it.
 */
async function shrink(file: File): Promise<Blob> {
  const image = await decode(file).catch(() => null);
  if (!image) return file;

  const longest = Math.max(image.naturalWidth, image.naturalHeight);
  if (longest <= SHRINK_EDGE && file.size <= SEND_AS_IS_BYTES) return file;

  const scale = Math.min(1, SHRINK_EDGE / longest);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(image.naturalWidth * scale);
  canvas.height = Math.round(image.naturalHeight * scale);
  const context = canvas.getContext("2d");
  if (!context) return file;

  context.imageSmoothingQuality = "high";
  context.drawImage(image, 0, 0, canvas.width, canvas.height);

  // JPEG because every browser can encode it — WebP is the server's job.
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", 0.9),
  );
  return blob ?? file;
}

function decode(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("undecodable"));
    };
    image.src = url;
  });
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

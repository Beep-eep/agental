"use client";

/* eslint-disable @next/next/no-img-element -- signed, short-lived private URLs */
import { useRef, useState, useTransition } from "react";
import { setHeadshot } from "@/app/actions/talent";
import { createClient } from "@/lib/supabase/client";

const TYPES = ["image/jpeg", "image/png", "image/webp"];

/**
 * Uploads straight from the browser to the private `headshots` bucket.
 * Storage RLS only allows writing inside the user's own folder ({uid}/...).
 */
export function HeadshotUploader({ userId, currentUrl }: { userId: string; currentUrl: string | null }) {
  const [preview, setPreview] = useState<string | null>(currentUrl);
  const [msg, setMsg] = useState<{ ok: boolean; message: string } | null>(null);
  const [pending, start] = useTransition();
  const input = useRef<HTMLInputElement>(null);

  function onFile(file: File) {
    if (!TYPES.includes(file.type)) return setMsg({ ok: false, message: "Use a JPG, PNG or WebP image." });
    if (file.size > 5 * 1024 * 1024) return setMsg({ ok: false, message: "That file is over 5 MB." });
    start(async () => {
      const ext = file.type.split("/")[1].replace("jpeg", "jpg");
      const path = `${userId}/headshot-${Date.now()}.${ext}`;
      const { error } = await createClient().storage.from("headshots").upload(path, file, { contentType: file.type, upsert: false });
      if (error) return setMsg({ ok: false, message: `Upload failed: ${error.message}` });
      const res = await setHeadshot(path);
      setMsg(res);
      if (res.ok) setPreview(URL.createObjectURL(file));
    });
  }

  return (
    <div className="flex items-center gap-4">
      <div className="grid h-28 w-24 flex-none place-items-center overflow-hidden rounded-lg bg-paper ring-1 ring-line">
        {preview ? <img src={preview} alt="Your headshot" className="h-full w-full object-cover" /> : <span className="text-xs text-muted">No photo</span>}
      </div>
      <div className="space-y-2">
        <input ref={input} type="file" accept={TYPES.join(",")} className="sr-only" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
        <button type="button" className="btn btn-line btn-sm" disabled={pending} onClick={() => input.current?.click()}>
          {pending ? "Uploading…" : preview ? "Replace photo" : "Upload a photo"}
        </button>
        {msg && (
          <p role="status" className={`text-sm ${msg.ok ? "text-good" : "text-critical"}`}>
            {msg.message}
          </p>
        )}
      </div>
    </div>
  );
}

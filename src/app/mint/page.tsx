"use client";

import React, { useState } from "react";

type MintStatus = "idle" | "minting" | "success" | "error";

export default function MintPage() {
  const [status, setStatus] = useState<MintStatus>("idle");
  const [message, setMessage] = useState<string>("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const form = e.currentTarget;
    const formData = new FormData(form);

    // Read actual form values (these must match route.ts)
    const title = ((formData.get("title") as string) || "").trim();
    const creator = ((formData.get("creator") as string) || "").trim();
    const email = ((formData.get("email") as string) || "").trim();
    const notes = ((formData.get("notes") as string) || "").trim();
    const file = formData.get("file") as File | null;

    // Basic validation against the true form data
    if (!title || !creator || !email || !file || !file.name) {
      setStatus("error");
      setMessage("Missing required fields (title, creator, email, file).");
      return;
    }

    setStatus("minting");
    setMessage("");

    try {
      const res = await fetch("/api/mint", {
        method: "POST",
        body: formData, // browser sets multipart/form-data headers
      });

      if (!res.ok) {
        let detail = "";
        try {
          const errJson = await res.json();
          detail = errJson?.error || errJson?.detail || "";
        } catch {
          // ignore JSON parse errors
        }

        setStatus("error");
        setMessage(
          detail || `Mint failed on the server (HTTP ${res.status}).`
        );
        return;
      }

      // Server returns the .fxs SmartFile as a binary response
      const blob = await res.blob();

      // Try to pull filename from Content-Disposition; fall back to title
      const cd = res.headers.get("Content-Disposition") || "";
      const match = cd.match(/filename="?([^"]+)"?/);
      const suggestedName =
        match?.[1] ||
        `${title.replace(/[^\w\-]+/g, "_") || "smartfile"}.fxs`;

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = suggestedName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      setStatus("success");
      setMessage("Mint complete. SmartFile downloaded to your device.");

      // Optional: reset form (keeps workspace label at top)
      form.reset();
    } catch (err: any) {
      console.error("Mint UI error:", err);
      setStatus("error");
      setMessage(err?.message || "Unexpected error during mint.");
    }
  }

  const statusBar =
    status === "error"
      ? {
          bg: "bg-red-600/10 border-red-500/60 text-red-200",
        }
      : status === "success"
      ? {
          bg: "bg-emerald-500/10 border-emerald-400/60 text-emerald-200",
        }
      : status === "minting"
      ? {
          bg: "bg-zinc-800/40 border-zinc-600 text-zinc-200",
        }
      : null;

  return (
    <main className="min-h-screen bg-gradient-to-b from-zinc-950 via-zinc-900 to-black text-zinc-50 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-4xl">
        <section className="mx-auto rounded-[32px] bg-gradient-to-b from-zinc-900/80 to-zinc-950/90 shadow-[0_40px_120px_rgba(0,0,0,0.85)] border border-zinc-800/70 backdrop-blur-xl px-8 py-10 md:px-12 md:py-12">
          {/* Header row */}
          <div className="flex items-start justify-between gap-4 mb-8">
            <div>
              <p className="text-xs tracking-[0.3em] text-zinc-500 uppercase mb-3">
                GFE SmartFile Mint
              </p>
              <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-zinc-50">
                Wrap a media file and metadata into a single signed{" "}
                <span className="text-emerald-300">FXS SmartFile</span>.
              </h1>
            </div>
            <div className="text-right">
              <p className="text-[0.68rem] tracking-[0.25em] text-zinc-500 uppercase">
                Workspace · Internal
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Top row: title + creator */}
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-medium text-zinc-400 uppercase tracking-[0.18em] mb-2">
                  Title *
                </label>
                <input
                  name="title"
                  type="text"
                  className="w-full rounded-xl border border-zinc-700/80 bg-zinc-900/70 px-4 py-3 text-sm text-zinc-50 shadow-inner shadow-black/40 focus:outline-none focus:ring-2 focus:ring-emerald-400/70 focus:border-emerald-300/70 placeholder:text-zinc-500"
                  placeholder="FXS SmartFile – Test Asset 01"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-400 uppercase tracking-[0.18em] mb-2">
                  Creator / Owner
                </label>
                <input
                  name="creator"
                  type="text"
                  defaultValue="Global Data Capture, LLC"
                  className="w-full rounded-xl border border-zinc-700/80 bg-zinc-900/70 px-4 py-3 text-sm text-zinc-50 shadow-inner shadow-black/40 focus:outline-none focus:ring-2 focus:ring-emerald-400/70 focus:border-emerald-300/70 placeholder:text-zinc-500"
                />
              </div>
            </div>

            {/* Email + file */}
            <div className="grid md:grid-cols-2 gap-6 items-start">
              <div>
                <label className="block text-xs font-medium text-zinc-400 uppercase tracking-[0.18em] mb-2">
                  Notification Email
                </label>
                <input
                  name="email"
                  type="email"
                  defaultValue="eswartwood@globaldatacapture.com"
                  className="w-full rounded-xl border border-zinc-700/80 bg-zinc-900/70 px-4 py-3 text-sm text-zinc-50 shadow-inner shadow-black/40 focus:outline-none focus:ring-2 focus:ring-emerald-400/70 focus:border-emerald-300/70 placeholder:text-zinc-500"
                  placeholder="you@company.com"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-400 uppercase tracking-[0.18em] mb-2">
                  Media File *
                </label>
                <div className="flex items-center gap-3">
                  <input
                    name="file"
                    type="file"
                    className="block w-full text-sm text-zinc-300 file:mr-4 file:rounded-lg file:border-0 file:bg-emerald-500 file:px-4 file:py-2 file:text-sm file:font-medium file:text-black hover:file:bg-emerald-400/90"
                  />
                </div>
                <p className="mt-2 text-xs text-zinc-500">
                  Any binary payload (image, audio, video, PDF, etc.) up to
                  your current workspace limit.
                </p>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-medium text-zinc-400 uppercase tracking-[0.18em] mb-2">
                Internal Notes / License Terms
              </label>
              <textarea
                name="notes"
                rows={3}
                className="w-full rounded-xl border border-zinc-700/80 bg-zinc-900/70 px-4 py-3 text-sm text-zinc-50 shadow-inner shadow-black/40 focus:outline-none focus:ring-2 focus:ring-emerald-400/70 focus:border-emerald-300/70 placeholder:text-zinc-500 resize-none"
                placeholder="Optional. Embed any additional metadata or licensing language into the SmartFile header."
              />
            </div>

            {/* Status bar + actions */}
            <div className="pt-2 flex items-center justify-between gap-4">
              <div className="text-xs text-zinc-500">
                Output:{" "}
                <span className="font-mono text-zinc-300">.fxs SmartFile</span>{" "}
                · downloads directly to your device.
              </div>

              <button
                type="submit"
                disabled={status === "minting"}
                className={`inline-flex items-center justify-center rounded-full px-6 py-2.5 text-sm font-semibold shadow-lg shadow-emerald-500/40 bg-emerald-400 text-black hover:bg-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-400/80 focus:ring-offset-2 focus:ring-offset-zinc-950 transition-all ${
                  status === "minting" ? "opacity-70 cursor-wait" : ""
                }`}
              >
                {status === "minting" ? "Minting…" : "Mint SmartFile"}
              </button>
            </div>

            {statusBar && (
              <div
                className={`mt-3 rounded-xl border px-4 py-2 text-xs ${statusBar.bg}`}
              >
                {status === "error" && (
                  <p className="font-medium">
                    {message || "Mint failed. Please check the form and retry."}
                  </p>
                )}
                {status === "success" && <p>{message}</p>}
                {status === "minting" && (
                  <p>Building SmartFile… wrapping header, metadata, and file.</p>
                )}
              </div>
            )}
          </form>
        </section>
      </div>
    </main>
  );
}

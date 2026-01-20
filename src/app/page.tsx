"use client";

import React, { useState, FormEvent } from "react";

type MintState = "idle" | "minting" | "success" | "error";

export default function Home() {
  const [status, setStatus] = useState<MintState>("idle");
  const [message, setMessage] = useState<string>("");
  const [title, setTitle] = useState<string>("");
  const [creator, setCreator] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const form = e.currentTarget;
    const fileInput = form.elements.namedItem("media") as HTMLInputElement | null;
    const file = fileInput?.files?.[0];

    if (!file) {
      setStatus("error");
      setMessage("Please choose a media file to mint.");
      return;
    }

    if (!title.trim()) {
      setStatus("error");
      setMessage("Please enter a title for this token.");
      return;
    }

    setStatus("minting");
    setMessage("");

    try {
      const formData = new FormData();
      formData.append("title", title.trim());
      if (creator.trim()) formData.append("creator", creator.trim());
      if (email.trim()) formData.append("email", email.trim());
      if (notes.trim()) formData.append("notes", notes.trim());
      formData.append("media", file);

      const res = await fetch("/api/mint", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(
          data?.error || data?.detail || `Mint failed with status ${res.status}`
        );
      }

      const blob = await res.blob();
      const filename =
        res.headers.get("content-disposition")?.match(/filename="?(.+)"?/)?.[1] ||
        `${title.replace(/[^\w\-]+/g, "_") || "minted_file"}.fxs`;

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      setStatus("success");
      setMessage("Mint complete. Your FXS SmartFile has been downloaded.");
    } catch (err: any) {
      console.error("Mint error:", err);
      setStatus("error");
      setMessage(err?.message || "Mint failed on the server.");
    }
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-50 flex items-center justify-center px-4">
      <div className="w-full max-w-3xl rounded-3xl bg-zinc-900/70 shadow-2xl shadow-black/60 border border-zinc-800 px-6 py-8 sm:px-10 sm:py-10 backdrop-blur">
        {/* Header */}
        <header className="mb-8 flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-2">
          <div>
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
              GFE SmartFile Mint
            </h1>
            <p className="text-sm sm:text-base text-zinc-400 mt-1">
              Wrap a media file and metadata into a single signed FXS SmartFile.
            </p>
          </div>
          <span className="text-xs sm:text-sm uppercase tracking-[0.2em] text-zinc-500">
            Workspace · Internal
          </span>
        </header>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label
                htmlFor="title"
                className="text-sm font-medium text-zinc-200"
              >
                Title *
              </label>
              <input
                id="title"
                name="title"
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-xl border border-zinc-700 bg-zinc-900/70 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/70 focus:border-transparent"
                placeholder="FXS SmartFile – Test Asset 01"
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="creator"
                className="text-sm font-medium text-zinc-200"
              >
                Creator / Owner
              </label>
              <input
                id="creator"
                name="creator"
                type="text"
                value={creator}
                onChange={(e) => setCreator(e.target.value)}
                className="w-full rounded-xl border border-zinc-700 bg-zinc-900/70 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/70 focus:border-transparent"
                placeholder="Global Data Capture, LLC"
              />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label
                htmlFor="email"
                className="text-sm font-medium text-zinc-200"
              >
                Notification Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-zinc-700 bg-zinc-900/70 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/70 focus:border-transparent"
                placeholder="minted@theglobaltokenexchange.com"
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="media"
                className="text-sm font-medium text-zinc-200"
              >
                Media File *
              </label>
              <input
                id="media"
                name="media"
                type="file"
                required
                className="w-full text-sm text-zinc-300 file:mr-3 file:rounded-lg file:border-0 file:bg-emerald-500/90 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-zinc-950 hover:file:bg-emerald-400/90 cursor-pointer"
              />
              <p className="text-xs text-zinc-500">
                Any binary payload (image, audio, video, PDF, etc.) up to your
                current workspace limit.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <label
              htmlFor="notes"
              className="text-sm font-medium text-zinc-200"
            >
              Internal Notes / License Terms
            </label>
            <textarea
              id="notes"
              name="notes"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-xl border border-zinc-700 bg-zinc-900/70 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/70 focus:border-transparent resize-none"
              placeholder="Optional. Embed any additional metadata or licensing language into the SmartFile header."
            />
          </div>

          {/* Status */}
          {status !== "idle" && (
            <div
              className={
                "rounded-xl border px-3 py-2 text-sm " +
                (status === "success"
                  ? "border-emerald-500/60 bg-emerald-500/10 text-emerald-200"
                  : status === "error"
                  ? "border-red-500/60 bg-red-500/10 text-red-200"
                  : "border-zinc-600 bg-zinc-800/70 text-zinc-100")
              }
            >
              {status === "minting"
                ? "Minting SmartFile… building header, metadata, and payload."
                : message}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between pt-2">
            <p className="text-xs text-zinc-500">
              Output: <span className="font-mono">.fxs</span> SmartFile ·
              downloads directly to your device.
            </p>
            <button
              type="submit"
              disabled={status === "minting"}
              className="inline-flex items-center rounded-xl bg-emerald-500 px-5 py-2 text-sm font-semibold text-zinc-950 shadow-lg shadow-emerald-500/40 hover:bg-emerald-400 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {status === "minting" ? "Minting…" : "Mint SmartFile"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}

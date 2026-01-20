'use client';

import React, { useState } from 'react';

type MintStatus = 'idle' | 'minting' | 'success' | 'error';

export default function Home() {
  const [status, setStatus] = useState<MintStatus>('idle');
  const [message, setMessage] = useState<string>('');

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;

    setStatus('minting');
    setMessage('');

    try {
      const formData = new FormData(form);

      const res = await fetch('/api/mint', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        let errorText = 'Mint failed on the server.';
        try {
          const data = await res.json();
          if (data?.error) errorText = data.error;
        } catch {
          // ignore JSON parse error, keep default
        }
        setStatus('error');
        setMessage(errorText);
        return;
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);

      const title = (formData.get('title') as string) || 'smartfile';
      const a = document.createElement('a');
      a.href = url;
      a.download = `${title.replace(/[^\w\-]+/g, '_')}.fxs`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      setStatus('success');
      setMessage('Mint complete. SmartFile downloaded.');

      form.reset();
    } catch (err: any) {
      console.error('Mint client error:', err);
      setStatus('error');
      setMessage('Mint failed. Please try again.');
    }
  }

  const isMinting = status === 'minting';

  return (
    <main className="min-h-screen flex items-center justify-center bg-zinc-950 text-zinc-50">
      <div className="w-full max-w-4xl px-4">
        <div className="bg-zinc-900/80 border border-zinc-800 shadow-2xl rounded-3xl px-8 py-10 sm:px-10 sm:py-12">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6 mb-10">
            <div>
              <p className="text-xs tracking-[0.25em] text-emerald-400 uppercase mb-2">
                GFE SmartFile Mint
              </p>
              <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
                Wrap a media file and metadata into a single signed FXS
                SmartFile.
              </h1>
            </div>
            <div className="text-right text-xs sm:text-sm text-zinc-400 uppercase tracking-[0.2em]">
              <div>Workspace ·</div>
              <div>Internal</div>
            </div>
          </div>

          <form
            onSubmit={handleSubmit}
            encType="multipart/form-data"
            className="space-y-8"
          >
            {/* Row 1: Title / Creator */}
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-2">
                <label
                  htmlFor="title"
                  className="text-xs font-medium tracking-wide text-zinc-300 uppercase"
                >
                  Title<span className="text-emerald-400"> *</span>
                </label>
                <input
                  id="title"
                  name="title"
                  type="text"
                  required
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-900/60 px-4 py-2.5 text-sm outline-none ring-0 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/40"
                  placeholder="FXS SmartFile – Test Asset 01"
                />
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="creator"
                  className="text-xs font-medium tracking-wide text-zinc-300 uppercase"
                >
                  Creator / Owner<span className="text-emerald-400"> *</span>
                </label>
                <input
                  id="creator"
                  name="creator"
                  type="text"
                  required
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-900/60 px-4 py-2.5 text-sm outline-none ring-0 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/40"
                  placeholder="Global Data Capture, LLC"
                />
              </div>
            </div>

            {/* Row 2: Email / File */}
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-2">
                <label
                  htmlFor="email"
                  className="text-xs font-medium tracking-wide text-zinc-300 uppercase"
                >
                  Notification Email<span className="text-emerald-400"> *</span>
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-900/60 px-4 py-2.5 text-sm outline-none ring-0 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/40"
                  placeholder="minted@theglobaltokenexchange.com"
                />
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="file"
                  className="text-xs font-medium tracking-wide text-zinc-300 uppercase"
                >
                  Media File<span className="text-emerald-400"> *</span>
                </label>
                <input
                  id="file"
                  name="file"
                  type="file"
                  required
                  className="block w-full text-sm text-zinc-200 file:mr-4 file:rounded-lg file:border-0 file:bg-emerald-500 file:px-3 file:py-2 file:text-sm file:font-medium file:text-zinc-950 hover:file:bg-emerald-400"
                />
                <p className="text-xs text-zinc-400">
                  Any binary payload (image, audio, video, PDF, etc.) up to your
                  current workspace limit.
                </p>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <label
                htmlFor="notes"
                className="text-xs font-medium tracking-wide text-zinc-300 uppercase"
              >
                Internal Notes / License Terms
              </label>
              <textarea
                id="notes"
                name="notes"
                rows={3}
                className="w-full rounded-xl border border-zinc-700 bg-zinc-900/60 px-4 py-2.5 text-sm outline-none ring-0 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/40 resize-none"
                placeholder="Optional. Embed any additional metadata or licensing language into the SmartFile header."
              />
            </div>

            {/* Output hint + button */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-2">
              <p className="text-xs text-zinc-500">
                Output: <span className="font-mono text-emerald-300">.fxs</span>{' '}
                SmartFile · downloads directly to your device.
              </p>

              <button
                type="submit"
                disabled={isMinting}
                className={`inline-flex items-center rounded-2xl px-6 py-2.5 text-sm font-semibold shadow-lg shadow-emerald-500/40 transition ${
                  isMinting
                    ? 'bg-emerald-700/70 text-zinc-100 cursor-wait'
                    : 'bg-emerald-500 text-zinc-950 hover:bg-emerald-400'
                }`}
              >
                {isMinting ? 'Minting…' : 'Mint SmartFile'}
              </button>
            </div>

            {/* Status banner */}
            {status !== 'idle' && message && (
              <div
                className={`mt-4 rounded-xl border px-4 py-3 text-sm ${
                  status === 'success'
                    ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                    : 'border-red-500/40 bg-red-500/10 text-red-300'
                }`}
              >
                {message}
              </div>
            )}
          </form>
        </div>
      </div>
    </main>
  );
}

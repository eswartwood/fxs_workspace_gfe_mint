"use client";

import { useState } from "react";

type PresignResponse = {
  uploadUrl: string; // signed PUT URL
  r2Key: string; // key/path inside the bucket
  publicUrl?: string; // optional (if you return it)
};

function safeBaseName(name: string) {
  const base = (name || "GFE_File").replace(/\.[^.]+$/, "");
  return (
    base.replace(/[^\w\- ]+/g, "").trim().replace(/\s+/g, "_") || "GFE_File"
  );
}

export default function MintPage() {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [creator, setCreator] = useState("Global Data Capture");
  const [owner, setOwner] = useState("REPLACE_WITH_OWNER_NAME");
  const [network, setNetwork] = useState("polygon-mainnet");
  const [busy, setBusy] = useState(false);

  async function uploadToR2(file: File) {
    // 1) Ask server for a presigned PUT URL + r2Key
    const presignRes = await fetch("/api/r2/presign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fileName: file.name,
        contentType: file.type || "application/octet-stream",
        bytes: file.size || 0, // ✅ FIX 1
      }),
    });

    if (!presignRes.ok) {
      const t = await presignRes.text();
      throw new Error(t || "Presign failed");
    }

    const presignJson = (await presignRes.json()) as PresignResponse;

    if (!presignJson.uploadUrl || !presignJson.r2Key) {
      throw new Error("Presign response missing uploadUrl or r2Key");
    }

    // 2) Upload directly from browser to R2 using PUT
    // ✅ FIX 2: do NOT add extra headers unless you know they're signed
    const putRes = await fetch(presignJson.uploadUrl, {
      method: "PUT",
      body: file,
    });

    if (!putRes.ok) {
      const t = await putRes.text().catch(() => "");
      throw new Error(t || `R2 upload failed (${putRes.status})`);
    }

    return {
      r2Key: presignJson.r2Key,
      publicUrl: presignJson.publicUrl,
    };
  }

  async function mintFromR2(args: { r2Key: string; file: File }) {
    const payload = {
      r2Key: args.r2Key,
      originalName: args.file.name || "asset.bin",
      mimeType: args.file.type || "application/octet-stream",
      bytes: args.file.size || 0,
      title: (title || args.file.name).trim(),
      creator: creator.trim(),
      owner: owner.trim(),
      network: network.trim(),
      // publicUrl: args.publicUrl, // if/when you add it
    };

    const res = await fetch("/api/mint", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const t = await res.text();
      throw new Error(t || "Mint failed");
    }

    const blob = await res.blob();

    // Force download in browser
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;

    const outName = `${safeBaseName(title || args.file.name)}.fxs`;
    a.download = outName;

    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  async function onMint() {
    if (!file) return alert("Choose a file first.");

    setBusy(true);
    try {
      const { r2Key } = await uploadToR2(file);
      await mintFromR2({ r2Key, file });
    } catch (e: any) {
      alert(e?.message || String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ padding: 30, fontFamily: "Arial", maxWidth: 640 }}>
      <h1>GFE — File Mint</h1>

      <div style={{ marginBottom: 12 }}>
        <label style={{ display: "block", marginBottom: 6 }}>Asset File</label>
        <input
          type="file"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
      </div>

      <div style={{ marginBottom: 12 }}>
        <label style={{ display: "block", marginBottom: 6 }}>Title</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g., The Golden Age (Test Video)"
          style={{ width: "100%", padding: 8 }}
        />
      </div>

      <div style={{ marginBottom: 12 }}>
        <label style={{ display: "block", marginBottom: 6 }}>Creator</label>
        <input
          value={creator}
          onChange={(e) => setCreator(e.target.value)}
          style={{ width: "100%", padding: 8 }}
        />
      </div>

      <div style={{ marginBottom: 12 }}>
        <label style={{ display: "block", marginBottom: 6 }}>Owner Name</label>
        <input
          value={owner}
          onChange={(e) => setOwner(e.target.value)}
          placeholder="Roxanne / Eric / Wallet owner name"
          style={{ width: "100%", padding: 8 }}
        />
      </div>

      <div style={{ marginBottom: 18 }}>
        <label style={{ display: "block", marginBottom: 6 }}>Network</label>
        <select
          value={network}
          onChange={(e) => setNetwork(e.target.value)}
          style={{ width: "100%", padding: 8 }}
        >
          <option value="polygon-mainnet">polygon-mainnet</option>
          <option value="polygon-amoy">polygon-amoy (test)</option>
          <option value="offline">offline</option>
        </select>
      </div>

      <button
        onClick={onMint}
        disabled={busy}
        style={{ padding: "10px 18px", fontSize: 16 }}
      >
        {busy ? "Uploading + Minting..." : "Mint File"}
      </button>

      <div style={{ marginTop: 14, opacity: 0.7 }}>
        {file ? `Selected: ${file.name}` : "No file selected yet."}
      </div>
    </div>
  );
}

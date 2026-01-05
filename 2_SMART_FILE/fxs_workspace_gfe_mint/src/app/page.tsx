"use client";

import { useState } from "react";

export default function MintPage() {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [creator, setCreator] = useState("Global Data Capture");
  const [owner, setOwner] = useState("REPLACE_WITH_OWNER_NAME");
  const [network, setNetwork] = useState("polygon-mainnet");
  const [busy, setBusy] = useState(false);

  async function onMint() {
    if (!file) return alert("Choose a file first.");

    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("title", title || file.name);
      fd.append("creator", creator);
      fd.append("owner", owner);
      fd.append("network", network);

      const res = await fetch("/api/mint", { method: "POST", body: fd });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || "Mint failed");
      }

      const blob = await res.blob();

      // Force download in browser
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;

      // always download .fxs
      const safeBase = (title || file.name).replace(/\.[^.]+$/, "");
      a.download = `${safeBase}.fxs`;

      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
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
        {busy ? "Minting..." : "Mint File"}
      </button>

      <div style={{ marginTop: 14, opacity: 0.7 }}>
        {file ? `Selected: ${file.name}` : "No file selected yet."}
      </div>
    </div>
  );
}

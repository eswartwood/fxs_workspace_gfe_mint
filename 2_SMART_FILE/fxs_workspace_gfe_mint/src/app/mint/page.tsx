"use client";

import { useState } from "react";

export default function MintPage() {
  const [file, setFile] = useState<File | null>(null);

  const [title, setTitle] = useState("");
  const [creator, setCreator] = useState("Global Data Capture");
  const [owner, setOwner] = useState("REPLACE_WITH_OWNER_NAME");
  const [network, setNetwork] = useState("polygon-mainnet");

  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string>("");

  async function onMint() {
    if (!file) return alert("Choose a file first.");

    setBusy(true);
    setMsg("");

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

      // force download in browser
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = (title || file.name.replace(/\.[^.]+$/, "")) + ".fxs";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      setMsg("✅ Mint complete. .fxs downloaded.");
    } catch (e: any) {
      setMsg("❌ " + (e?.message || String(e)));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ padding: 30, fontFamily: "Arial", maxWidth: 720 }}>
      <h1 style={{ marginBottom: 16 }}>GFE — File Mint</h1>

      <div style={{ display: "grid", gap: 12 }}>
        <label>
          <div style={{ fontSize: 13, marginBottom: 6 }}>File</div>
          <input
            type="file"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
        </label>

        <label>
          <div style={{ fontSize: 13, marginBottom: 6 }}>Title</div>
          <input
            style={{ width: "100%", padding: 10 }}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. My Test Video Token"
          />
        </label>

        <label>
          <div style={{ fontSize: 13, marginBottom: 6 }}>Creator</div>
          <input
            style={{ width: "100%", padding: 10 }}
            value={creator}
            onChange={(e) => setCreator(e.target.value)}
          />
        </label>

        <label>
          <div style={{ fontSize: 13, marginBottom: 6 }}>Owner</div>
          <input
            style={{ width: "100%", padding: 10 }}
            value={owner}
            onChange={(e) => setOwner(e.target.value)}
            placeholder="Owner display name"
          />
        </label>

        <label>
          <div style={{ fontSize: 13, marginBottom: 6 }}>Network</div>
          <select
            style={{ width: "100%", padding: 10 }}
            value={network}
            onChange={(e) => setNetwork(e.target.value)}
          >
            <option value="polygon-mainnet">polygon-mainnet</option>
            <option value="polygon-amoy">polygon-amoy</option>
            <option value="ethereum-mainnet">ethereum-mainnet</option>
          </select>
        </label>

        <button
          onClick={onMint}
          disabled={busy}
          style={{
            padding: "12px 16px",
            borderRadius: 8,
            border: "1px solid #999",
            width: 160,
            cursor: busy ? "not-allowed" : "pointer",
          }}
        >
          {busy ? "Minting..." : "Mint File"}
        </button>

        {msg ? (
          <div style={{ marginTop: 6, fontSize: 14 }}>{msg}</div>
        ) : null}
      </div>
    </div>
  );
}
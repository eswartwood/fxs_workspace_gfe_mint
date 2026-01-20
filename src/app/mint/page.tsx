"use client";

import { useState } from "react";

export default function MintPage() {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState("");

  async function handleMint() {
    if (!file) return;

    setStatus("Building FXS file...");

    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("/api/mint", {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      setStatus("Mint failed.");
      return;
    }

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);

    // Trigger download of the .fxs file
    const a = document.createElement("a");
    a.href = url;
    a.download = "output.fxs";
    a.click();

    setStatus("Mint complete!");
  }

  return (
    <div className="flex flex-col items-center space-y-6 p-10">
      <h1 className="text-3xl font-bold">GFE — File Mint</h1>

      <input
        type="file"
        onChange={(e) => setFile(e.target.files?.[0] || null)}
        className="border p-2"
      />

      <button
        onClick={handleMint}
        className="bg-blue-600 text-white px-6 py-2 rounded-lg"
      >
        Mint File
      </button>

      <p>{status}</p>
    </div>
  );
}

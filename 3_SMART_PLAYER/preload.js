// preload.js — FULL REPLACEMENT (FINAL ARCHITECTURE)
// Safe bridge: renderer <-> main via IPC
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("FXS", {
  // -------- Actions (invoke main) --------
  openExternal: (url) => ipcRenderer.invoke("openExternal", url),
  loadFile: (filePath) => ipcRenderer.invoke("load-file", filePath),
  extractZipFromFXS: (filePath) => ipcRenderer.invoke("extract-zip-from-fxs", filePath),

  // -------- Events (main -> renderer) --------
  onOpenFile: (cb) => {
    if (typeof cb !== "function") return () => {};
    const handler = (_e, filePath) => cb(filePath);
    ipcRenderer.on("ftx:open-file", handler);
    return () => ipcRenderer.removeListener("ftx:open-file", handler);
  },

  onDeepLink: (cb) => {
    if (typeof cb !== "function") return () => {};
    const handler = (_e, url) => cb(url);
    ipcRenderer.on("ftx:deep-link", handler);
    return () => ipcRenderer.removeListener("ftx:deep-link", handler);
  },
});

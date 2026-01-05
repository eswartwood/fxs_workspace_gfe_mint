// main.js — FULL REPLACEMENT (FINAL ARCHITECTURE)
// Electron main process: single-instance + open-with/double-click + IPC bridge (path -> renderer)
// Renderer pulls bytes via preload (extractZipFromFXS)

const { app, BrowserWindow, ipcMain, shell } = require("electron");
const path = require("path");
const fs = require("fs");

let mainWindow = null;
let pendingOpenFile = null;
let pendingDeepLink = null;

// Inline helper: extract embedded ZIP payload from .fxs container
function getZipBytesFromFXS(buf) {
  // ZIP local file header signature: PK\x03\x04
  const sig = Buffer.from([0x50, 0x4B, 0x03, 0x04]);
  const idx = buf.indexOf(sig);
  if (idx === -1) throw new Error("ZIP payload not found inside FXS file");
  return buf.slice(idx);
}

// -----------------------------
// Single instance lock (Windows double-click + protocol)
// -----------------------------
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on("second-instance", (_event, argv) => {
    // Deep link like ftx://...
    const protoArg = argv.find((a) => typeof a === "string" && a.startsWith("ftx://"));
    if (protoArg) {
      if (mainWindow) {
        if (mainWindow.isMinimized()) mainWindow.restore();
        mainWindow.focus();
        mainWindow.webContents.send("ftx:deep-link", protoArg);
      } else {
        pendingDeepLink = protoArg;
      }
    }

    // File open (.fxs / .ftxsmart)
    const fileArg = argv.find((a) => {
      if (typeof a !== "string") return false;
      const x = a.toLowerCase();
      return x.endsWith(".fxs") || x.endsWith(".ftxsmart");
    });

    if (fileArg) {
      if (mainWindow) {
        if (mainWindow.isMinimized()) mainWindow.restore();
        mainWindow.focus();
        mainWindow.webContents.send("ftx:open-file", fileArg);
      } else {
        pendingOpenFile = fileArg;
      }
    }
  });
}

// macOS: Finder “Open With” / double click
app.on("open-file", (event, filePath) => {
  event.preventDefault();
  if (mainWindow) mainWindow.webContents.send("ftx:open-file", filePath);
  else pendingOpenFile = filePath;
});

// -----------------------------
// Window creation
// -----------------------------
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    show: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      preload: path.join(__dirname, "preload.js"),
    },
  });

  // Always load the renderer UI from /renderer/index.html
  mainWindow.loadFile(path.join(__dirname, "renderer", "index.html"));

  // Optional: devtools
  // mainWindow.webContents.openDevTools({ mode: "detach" });

  // Flush pending events after UI is ready
  mainWindow.webContents.once("did-finish-load", () => {
    if (pendingDeepLink) {
      mainWindow.webContents.send("ftx:deep-link", pendingDeepLink);
      pendingDeepLink = null;
    }
    if (pendingOpenFile) {
      mainWindow.webContents.send("ftx:open-file", pendingOpenFile);
      pendingOpenFile = null;
    }
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

// -----------------------------
// App lifecycle
// -----------------------------
app.whenReady().then(() => {
  // Protocol registration (works "for real" on Windows once packaged/installed)
  try {
    app.setAsDefaultProtocolClient("ftx");
  } catch (_) {}

  createWindow();

  // Handle initial launch args (first instance)
  const argv = process.argv || [];

  const protoArg = argv.find((a) => typeof a === "string" && a.startsWith("ftx://"));
  if (protoArg) pendingDeepLink = protoArg;

  const fileArg = argv.find((a) => {
    if (typeof a !== "string") return false;
    const x = a.toLowerCase();
    return x.endsWith(".fxs") || x.endsWith(".ftxsmart");
  });
  if (fileArg) pendingOpenFile = fileArg;

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

// -----------------------------
// IPC HANDLERS (Renderer pulls bytes)
// -----------------------------
ipcMain.handle("load-file", async (_e, filePath) => {
  const buf = fs.readFileSync(filePath);
  return buf; // Buffer -> renderer as Uint8Array
});

ipcMain.handle("extract-zip-from-fxs", async (_e, filePath) => {
  const buf = fs.readFileSync(filePath);
  const zipBytes = getZipBytesFromFXS(buf);
  return zipBytes; // Buffer -> renderer as Uint8Array
});

ipcMain.handle("openExternal", async (_e, url) => {
  await shell.openExternal(url);
  return true;
});

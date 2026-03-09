const fs = require("fs");

const file = process.argv[2];
if (!file) {
  console.error("Usage: node print-fxs-url.js <file.fxs>");
  process.exit(1);
}

const b = fs.readFileSync(file);
let o = 0;

function readU32LE() { const v = b.readUInt32LE(o); o += 4; return v; }
function readU64LE() { const v = Number(b.readBigUInt64LE(o)); o += 8; return v; }

const magic = b.slice(0, 4).toString("ascii");
if (magic !== "FXS1") {
  console.error("Not Option-2 FXS1 format. Magic =", magic);
  process.exit(2);
}
o = 4;

const version = readU32LE();
const metaLen = readU32LE();
const metaJson = b.slice(o, o + metaLen).toString("utf8"); o += metaLen;

let meta;
try { meta = JSON.parse(metaJson); }
catch (e) { console.error("Metadata JSON parse failed:", e.message); process.exit(3); }

const zipLen = readU64LE(); // confirms structure

const url = meta?.media?.remote?.url;

console.log("FXS1 version:", version);
console.log("zipLen:", zipLen);
console.log("assetUrl:", url || "(missing meta.media.remote.url)");

// test-build.js
const { buildFXS } = require("./fxs-builder");

(async () => {
  console.log("▶ Building FXS SmartFile...");
  await buildFXS({ tokenId: "0001" });
  console.log("▶ Build finished.");
})().catch((err) => {
  console.error("Error building FXS SmartFile:", err);
  process.exitCode = 1;
});

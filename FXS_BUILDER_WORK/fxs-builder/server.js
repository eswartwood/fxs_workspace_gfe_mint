// server.js
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const { buildFXS } = require("./fxs-builder");

const app = express();
const PORT = 4000;

app.use(cors({ origin: "http://localhost:3000" }));
app.use(bodyParser.json());

app.post("/mint", async (req, res) => {
  try {
    const tokenInfo = req.body;
    console.log("🔥 Mint request received:", tokenInfo);

    const outputPath = await buildFXS(tokenInfo);

    console.log("✅ SmartFile built at:", outputPath);

    res.json({
      success: true,
      file: outputPath,
      message: "FXS SmartFile minted successfully.",
    });
  } catch (err) {
    console.error("❌ Mint error:", err);
    res.status(500).json({
      success: false,
      error: "Minting failed",
      details: err.message || String(err),
    });
  }
});

app.listen(PORT, () => {
  console.log(`✅ FXS Mint API running on http://localhost:${PORT}`);
});

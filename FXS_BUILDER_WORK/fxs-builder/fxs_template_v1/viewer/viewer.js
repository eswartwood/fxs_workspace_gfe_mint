// viewer.js – FXS SmartFile Viewer v1
// Clean, self-contained version

(function () {
  // ---------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------

    // Normal path for http:// / https://
    const res = await fetch(path);
    if (!res.ok) throw new Error("Failed to fetch");
    return await res.json();
  } catch (err) {
    console.warn("[FXS viewer] Could not load JSON:", path, err);
    return fallback;
  }
}

  // Set innerText on an element if it exists
  function setText(id, value, fallback) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = value != null && value !== "" ? value : (fallback ?? "Loading…");
  }

  // Metadata + UI wiring
// -------------------------------------------------------

  function hydrateMeta(header, metadata) {
  header = header || {};
  metadata = metadata || {};

  // DEBUG
  console.log("[FXS] hydrateMeta()", { header, metadata });

  // Handle both shapes: metadata.asset.{title,subtitle} OR top-level metadata.{title,subtitle}
  const asset = metadata.asset || metadata;
  const owner = metadata.current_owner || {};
  const token = metadata.token || metadata.blockchain || {};

  // Asset details
  setText("asset-title", asset.title || header.title || "Untitled asset");
  setText("asset-subtitle", asset.subtitle || header.subtitle || "");
  setText("asset-token-id", token.token_id || header.token_id || "Pending");

  // Ownership
  setText("owner-wallet", owner.wallet_address || "N/A");
  setText("owner-name", owner.name || "Owner");

  // You can add more wiring here later (issuer, dates, etc.)
}

  // Handle both shapes: metadata.asset.{title,subtitle} OR top-level metadata.{title,subtitle}
  const asset = metadata.asset || metadata;
  const owner = metadata.current_owner || {};
  const token = metadata.token || metadata.blockchain || {};

  // Asset details
  setText("asset-title", asset.title || header.title || "Untitled asset");
  setText("asset-subtitle", asset.subtitle || header.subtitle || "");
  setText("asset-token-id", token.token_id || header.token_id || "Pending");

  // Ownership
  setText("owner-wallet", owner.wallet_address || "N/A");
  setText("owner-name", owner.name || "Owner");

  // You can add more wiring here later (issuer, dates, etc.)
}

  // ---------------------------------------------------------
  // Primary asset mounting
  // ---------------------------------------------------------

  function getAssetSlot() {
    // Try several likely spots for the primary asset.
    // Fall back to the outer ".frame" so we ALWAYS have somewhere to mount.
    return (
      document.getElementById("asset-slot") ||
      document.getElementById("primary-asset-slot") ||
      document.getElementById("asset-container") ||
      document.querySelector("[data-role='asset-slot']") ||
      document.querySelector(".asset-slot") ||
      document.querySelector(".primary-asset") ||
      document.querySelector(".asset-panel") ||
      document.querySelector(".frame") // last resort: outer shell
    );
  }

  function mountPrimaryAsset(filePath) {
    console.log("[FXS Viewer] mountPrimaryAsset() called with:", filePath);

    if (!filePath) {
      console.warn("[FXS Viewer] No filePath passed, defaulting to media/asset.mov");
      filePath = "media/asset.mov";
    }

    // Normalize path – always expect it to live under /media/
    if (!filePath.startsWith("media/")) {
      filePath = filePath.replace(/^\.?\//, ""); // strip leading ./ or /
      filePath = "media/" + filePath;
    }

    const slot = getAssetSlot() || document.body;
    if (!slot) {
      console.error("[FXS Viewer] No asset slot found in DOM, and document.body missing.");
      return;
    }

    // Clear placeholder
    slot.innerHTML = "";

    const ext = filePath.split(".").pop().toLowerCase();
    let node;

    if (["mp4", "mov", "webm", "ogg"].includes(ext)) {
      // Video
      node = document.createElement("video");
      node.controls = true;
      node.playsInline = true;
      node.autoplay = false;
      node.style.width = "100%";
      node.style.height = "100%";

      const source = document.createElement("source");
      source.src = filePath;
      source.type = ext === "mov" ? "video/quicktime" : `video/${ext}`;
      node.appendChild(source);
    } else if (["png", "jpg", "jpeg", "gif", "webp"].includes(ext)) {
      // Image
      node = document.createElement("img");
      node.alt = "Primary asset";
      node.style.maxWidth = "100%";
      node.style.maxHeight = "100%";
      node.src = filePath;
    } else {
      // Fallback – link to the asset
      node = document.createElement("a");
      node.href = filePath;
      node.target = "_blank";
      node.textContent = "Open asset file";
    }

    slot.appendChild(node);
  }

 // -------------------------------------------------------------
// Boot sequence (offline, fully embedded)
// -------------------------------------------------------------
async function initViewer() {
  console.log("[FXS Viewer] Booting (offline embed mode)...");

  // Only use embedded globals baked at build time
  const header   = window.__FXS_HEADER__   || {};
  const metadata = window.__FXS_METADATA__ || {};

  if (!window.__FXS_HEADER__ || !window.__FXS_METADATA__) {
    console.warn("[FXS Viewer] No embedded metadata found. Using empty header/metadata.");
  } else {
    console.log("[FXS Viewer] ✅ Using embedded metadata.", { header, metadata });
  }

  // Wire UI + media
  hydrateMeta(header, metadata);
  mountPrimaryAsset(header, metadata);
}

// Keep this listener under initViewer
document.addEventListener("DOMContentLoaded", () => {
  initViewer().catch((err) => {
    console.error("[FXS Viewer] Fatal boot error:", err);
    // As a last resort, still try to show the asset
    mountPrimaryAsset("media/asset.mp4");
  });
});

// Keep this listener just below initViewer
document.addEventListener("DOMContentLoaded", () => {
  initViewer().catch((err) => {
    console.error("[FXS Viewer] Fatal boot error:", err);
    // As a last resort, still try to show the primary asset
    mountPrimaryAsset("media/asset.mp4");
  });
});

  // ✅ FINAL FAILSAFE (Should never hit now)
  console.warn("[FXS Viewer] ❗ No metadata found. Showing asset only.");
  mountPrimaryAsset("media/asset.mp4");
}

// Keep this as-is, just make sure it's below initViewer
document.addEventListener("DOMContentLoaded", () => {
  initViewer().catch((err) => {
    console.error("[FXS Viewer] Fatal boot error:", err);
    // As a last resort, still try to show the primary asset
    mountPrimaryAsset({}, {});
  });
});

  document.addEventListener("DOMContentLoaded", () => {
    initViewer().catch((err) => {
      console.error("[FXS Viewer] Fatal boot error:", err);
      // As a last-resort, still try to show asset.mp4
      mountPrimaryAsset("media/asset.mp4");
    });
  });
})();

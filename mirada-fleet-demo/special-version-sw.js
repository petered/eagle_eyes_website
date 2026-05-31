/**
 * Special Version Service Worker
 *
 * When a special version is active, this SW intercepts navigation and asset
 * requests under the app's base path and serves them from the R2 public bucket.
 *
 * R2 layout (deduped):
 *   assets/<filename>            — Vite-hashed assets shared across versions
 *   root-assets/<hash>.<ext>     — Content-addressed root files
 *   versions/<tag>.json          — Manifest mapping root paths → content-addressed keys
 *
 * Flow for assets/*:  rewrite directly to R2 shared assets pool
 * Flow for root files: look up in cached manifest → fetch from root-assets/
 * Fallback: if R2 fails, serve from normal origin
 *
 * Version source (in priority order):
 *   1. In-memory activeVersion (set via postMessage from the page)
 *   2. specialVersion cookie on the request (survives SW restarts)
 *
 * Communication:
 *   - The main app posts { type: "SET_SPECIAL_VERSION", version: string|null, manifest?: object }
 *     whenever the user changes version.
 */

// Canonical source: src/constants/r2.ts — keep in sync.
const R2_PUBLIC_BASE = "https://pub-3cefe8b27fd94fbab284bd867ba823cd.r2.dev";
const APP_BASE = "/mirada/";

let activeVersion = null;
let cachedManifest = null; // { rootFiles: { "index.html": "root-assets/abc.html", ... } }
let manifestPromise = null; // Pending manifest fetch — requests wait on this

// Set to true to enable verbose logging (useful for debugging).
// In production, keep false to avoid noisy console output.
const SW_DEBUG = false;

function log(...args) {
  if (SW_DEBUG) console.log("[special-version-sw]", ...args);
}

/** Read specialVersion cookie from the request's Cookie header. */
function getVersionFromCookie(request) {
  const cookieHeader = request.headers.get("Cookie");
  if (!cookieHeader) return null;
  const match = cookieHeader.match(/(?:^|;\s*)specialVersion=([^;]*)/);
  if (!match) return null;
  const value = decodeURIComponent(match[1]);
  // Basic validation: non-empty, max 64 chars, no path traversal
  if (!value || value.length > 64 || value.includes("..") || value.includes("/")) return null;
  return value;
}

// Listen for version changes from the main app
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SET_SPECIAL_VERSION") {
    activeVersion = event.data.version || null;
    cachedManifest = event.data.manifest || null;
    manifestPromise = null;
    log("Version set to:", activeVersion, "manifest:", cachedManifest ? "provided" : "not provided");

    // If version is set but no manifest was provided, fetch it.
    // Store the promise so fetch handlers can await it.
    if (activeVersion && !cachedManifest) {
      log("No manifest provided, fetching from R2...");
      manifestPromise = fetchManifest(activeVersion);
    }
  }
});

async function fetchManifest(version) {
  try {
    const url = `${R2_PUBLIC_BASE}/versions/${encodeURIComponent(version)}.json?_t=${Date.now()}`;
    log("Fetching manifest:", url);
    const resp = await fetch(url, { mode: "cors" });
    if (resp.ok) {
      cachedManifest = await resp.json();
      log("Manifest loaded, rootFiles:", Object.keys(cachedManifest.rootFiles || {}));
    } else {
      log("Manifest fetch failed:", resp.status, resp.statusText);
    }
  } catch (err) {
    console.warn("[special-version-sw] Failed to fetch manifest:", err);
  }
}

self.addEventListener("install", () => {
  log("Installing...");
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  log("Activating, claiming clients...");
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  // Determine version: prefer in-memory, fall back to cookie.
  // The cookie survives SW restarts and is available synchronously
  // on the very first fetch — before any postMessage arrives.
  let version = activeVersion;
  if (!version) {
    version = getVersionFromCookie(event.request);
    if (version) {
      log("Cold start: read version from cookie:", version);
      activeVersion = version;
      // Start fetching manifest in the background
      if (!cachedManifest && !manifestPromise) {
        manifestPromise = fetchManifest(version);
      }
    }
  }

  if (!version) return;

  const url = new URL(event.request.url);

  // Only intercept same-origin requests under the app base path
  if (url.origin !== self.location.origin) return;
  if (!url.pathname.startsWith(APP_BASE)) return;

  const relativePath = url.pathname.slice(APP_BASE.length);

  // Skip dev-server-only paths — these never exist in R2 builds.
  // Let them fall through to origin without wasting time on R2 lookups.
  if (relativePath.startsWith("@")            // @vite/client, @react-refresh, etc.
      || relativePath.startsWith("src/")      // Vite unbundled source modules
      || relativePath.startsWith("node_modules/")) {  // Vite pre-bundled deps
    return;
  }

  // Determine what to serve.
  // Only actual browser navigation gets index.html — use request.mode to
  // distinguish navigation from script/style/image requests. This prevents
  // misrouting module requests that lack a file extension.
  let targetPath = relativePath;
  if (event.request.mode === "navigate" || !relativePath || relativePath.endsWith("/")) {
    targetPath = "index.html";
  }

  log("Intercepting:", url.pathname, "→ target:", targetPath);

  // Wait for any pending manifest fetch before resolving, so we don't
  // miss root files on reload when the manifest hasn't arrived yet.
  const pending = manifestPromise || Promise.resolve();
  event.respondWith(pending.then(() => resolveFromR2(targetPath, event.request)));
});

async function resolveFromR2(relativePath, originalRequest) {
  try {
    let r2Url;
    let resolveMethod;

    if (relativePath.startsWith("assets/")) {
      // Hashed assets: fetch from shared pool
      r2Url = `${R2_PUBLIC_BASE}/assets/${relativePath.slice("assets/".length)}`;
      resolveMethod = "shared-assets";
    } else if (cachedManifest && cachedManifest.rootFiles && cachedManifest.rootFiles[relativePath]) {
      // Root file: resolve via manifest
      r2Url = `${R2_PUBLIC_BASE}/${cachedManifest.rootFiles[relativePath]}`;
      resolveMethod = "manifest";
    } else {
      // No manifest or file not in manifest — try legacy path, then origin
      r2Url = `${R2_PUBLIC_BASE}/versions/${activeVersion}/${relativePath}`;
      resolveMethod = "legacy";
    }

    log(`Fetching [${resolveMethod}]:`, r2Url);
    const r2Response = await fetch(r2Url, { mode: "cors" });

    if (r2Response.ok) {
      log(`  ✓ R2 served [${resolveMethod}]:`, relativePath, `(${r2Response.status})`);
      // Wrap in a new Response so the browser treats it as same-origin.
      // Without this, the response URL points to R2, which breaks Web Workers
      // (cross-origin script restriction) and React Compiler runtime context.
      return new Response(r2Response.body, {
        status: r2Response.status,
        statusText: r2Response.statusText,
        headers: r2Response.headers,
      });
    }

    log(`  ✗ R2 miss [${resolveMethod}]:`, relativePath, `(${r2Response.status}), falling back to origin`);
    return fetch(originalRequest);
  } catch (err) {
    log("  ✗ R2 error:", relativePath, err.message || err, "— falling back to origin");
    return fetch(originalRequest);
  }
}

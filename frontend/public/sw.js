/* eslint-disable no-restricted-globals */

const CACHE_VERSION = "v3";
const CACHE_NAME = `healthspire-cache-${CACHE_VERSION}`;

// Minimal app-shell caching for Vite builds
const APP_SHELL = [
  "/",
  "/index.html",
  "/manifest.webmanifest",
  "/favicon.svg",
  "/HealthSpire%20logo.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)));
      await self.clients.claim();
    })()
  );
});

const isApiRequest = (url) => {
  try {
    const u = new URL(url);
    return u.pathname.startsWith("/api/") || u.pathname === "/api";
  } catch {
    return false;
  }
};

// Check if URL is cross-origin (different domain than the PWA)
const isCrossOrigin = (url) => {
  try {
    return new URL(url).origin !== self.location.origin;
  } catch {
    return false;
  }
};

self.addEventListener("fetch", (event) => {
  const req = event.request;

  // Pass through non-GET requests with credentials for cross-origin API calls
  // This is critical for POST /api/auth/login to work in PWA mode
  if (req.method !== "GET") {
    if (isApiRequest(req.url) && isCrossOrigin(req.url)) {
      event.respondWith(
        fetch(req, { credentials: "include" }).catch(() =>
          new Response(JSON.stringify({ error: "Network error" }), {
            status: 503,
            headers: { "Content-Type": "application/json" },
          })
        )
      );
    }
    return;
  }

  // Network-first for API GET requests (with credentials for cross-origin)
  if (isApiRequest(req.url)) {
    event.respondWith(
      (async () => {
        try {
          const options = isCrossOrigin(req.url) ? { credentials: "include" } : {};
          return await fetch(req, options);
        } catch {
          return new Response(JSON.stringify({ error: "Offline" }), {
            status: 503,
            headers: { "Content-Type": "application/json" },
          });
        }
      })()
    );
    return;
  }

  // Cache-first for static assets / navigation fallback to index.html
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(req);
      if (cached) return cached;

      try {
        const res = await fetch(req);
        // Cache successful same-origin responses
        const url = new URL(req.url);
        if (res.ok && url.origin === self.location.origin) {
          cache.put(req, res.clone());
        }
        return res;
      } catch {
        // Navigation fallback
        if (req.mode === "navigate") {
          const index = await cache.match("/index.html");
          if (index) return index;
        }
        throw new Error("Offline");
      }
    })()
  );
});

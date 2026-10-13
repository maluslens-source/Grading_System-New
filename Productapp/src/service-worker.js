/* eslint-disable no-restricted-globals */
/**
 * Malus Lens service worker (CRA InjectManifest + Workbox).
 * Precaches the production build shell so the app can open offline.
 * API / grading traffic is always network-only (never cached).
 */

import { clientsClaim } from "workbox-core";
import { ExpirationPlugin } from "workbox-expiration";
import { createHandlerBoundToURL, precacheAndRoute } from "workbox-precaching";
import { registerRoute } from "workbox-routing";
import { NetworkFirst, NetworkOnly, StaleWhileRevalidate } from "workbox-strategies";

clientsClaim();

// Build-time asset list injected by workbox-webpack-plugin
precacheAndRoute(self.__WB_MANIFEST);

// Never cache backend / ML API calls (same-origin production or any /api path)
registerRoute(({ url }) => url.pathname.startsWith("/api/"), new NetworkOnly());

// App shell for navigations (HashRouter still benefits when index.html is cached)
const fileExtensionRegexp = new RegExp("/[^/?]+\\.[^/]+$");
registerRoute(({ request, url }) => {
  if (request.mode !== "navigate") return false;
  if (url.pathname.startsWith("/_")) return false;
  if (url.pathname.startsWith("/api")) return false;
  if (url.pathname.match(fileExtensionRegexp)) return false;
  return true;
}, createHandlerBoundToURL(`${process.env.PUBLIC_URL}/index.html`));

// Same-origin static images (icons, samples copied into build)
registerRoute(
  ({ request, url }) =>
    url.origin === self.location.origin &&
    (request.destination === "image" || /\.(?:png|jpg|jpeg|webp|gif|svg)$/i.test(url.pathname)),
  new StaleWhileRevalidate({
    cacheName: "malus-images",
    plugins: [new ExpirationPlugin({ maxEntries: 64, maxAgeSeconds: 30 * 24 * 60 * 60 })],
  })
);

// Google Fonts / Material Icons — network first, fall back to cache
registerRoute(
  ({ url }) =>
    url.origin === "https://fonts.googleapis.com" || url.origin === "https://fonts.gstatic.com",
  new NetworkFirst({
    cacheName: "malus-fonts",
    plugins: [new ExpirationPlugin({ maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 })],
  })
);

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

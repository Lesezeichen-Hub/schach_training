"use strict";

const CACHE_NAME = "schachwerkstatt-4.13.1";
const APP_SHELL = [
  "./",
  "./index.html",
  "./styles.css",
  "./chess-engine.js",
  "./training-core.js",
  "./training-data.generated.js",
  "./chess-3d.js",
  "./analysis-worker.js",
  "./app.js",
  "./manifest.webmanifest",
  "./icons/app-icon.svg",
  "./version.json"
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))).then(() => self.clients.claim()));
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET" || new URL(event.request.url).origin !== self.location.origin) return;
  event.respondWith(caches.match(event.request).then((cached) => cached || fetch(event.request).then((response) => {
    if (response.ok) caches.open(CACHE_NAME).then((cache) => cache.put(event.request, response.clone()));
    return response;
  }).catch(() => event.request.mode === "navigate" ? caches.match("./index.html") : Response.error())));
});

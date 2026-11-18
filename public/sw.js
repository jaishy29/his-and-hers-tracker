// Service worker: a small background helper the phone keeps for this app.
// It makes the app installable now; Milestone 6 adds push notifications here.

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

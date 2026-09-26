/*
 * The console's service worker. It does one thing: show a pushed notification
 * and, when it is tapped, open the order.
 *
 * No caching, no offline mode, no fetch handler — a console that serves a stale
 * copy of an order list from a cache is worse than one that says it is offline.
 *
 * Plain JavaScript in /public on purpose: a service worker is fetched by the
 * browser at a fixed URL, outside the app's bundle, and has to stay tiny and
 * boring. Registered with scope /admin from the Notifications page.
 */

self.addEventListener("install", () => {
  // A new version takes over at once rather than waiting for every console tab
  // to close — there is no cache whose consistency that could break.
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data ? event.data.text() : "" };
  }

  const options = {
    body: data.body || "",
    icon: "/admin-icon-192.png",
    badge: "/admin-badge.png",
    data: { url: data.url || "/admin/orders" },
  };

  // One notification per order: a second push with the same tag replaces the
  // first — and `renotify` makes the replacement buzz rather than arrive silently.
  if (data.tag) {
    options.tag = data.tag;
    options.renotify = true;
  }

  event.waitUntil(self.registration.showNotification(data.title || "basic", options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL(
    (event.notification.data && event.notification.data.url) || "/admin/orders",
    self.location.origin,
  ).href;

  event.waitUntil(
    (async () => {
      // An open console tab is reused rather than a second one opened.
      const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const client of windows) {
        if (new URL(client.url).pathname.startsWith("/admin") && "focus" in client) {
          await client.focus();
          if ("navigate" in client) await client.navigate(target);
          return;
        }
      }
      await self.clients.openWindow(target);
    })(),
  );
});

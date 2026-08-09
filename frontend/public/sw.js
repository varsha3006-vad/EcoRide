// Ecoride Service Worker for Push Notifications

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// 1. Handle Web Push Events from Browser Push Service
self.addEventListener("push", (event) => {
  if (!event.data) return;

  try {
    const data = event.data.json();
    const title = data.title || "Ecoride Update";
    const options = {
      body: data.body || "",
      icon: "/globe.svg",
      badge: "/globe.svg",
      vibrate: [100, 50, 100],
      data: {
        url: data.url || "/"
      }
    };

    event.waitUntil(self.registration.showNotification(title, options));
  } catch (err) {
    console.error("Error showing push notification:", err);
    // Plaintext fallback
    const text = event.data.text();
    event.waitUntil(
      self.registration.showNotification("Ecoride Update", {
        body: text,
        icon: "/globe.svg",
        badge: "/globe.svg",
        data: { url: "/" }
      })
    );
  }
});

// 2. Handle Notification Taps (Focus or Open PWA Window)
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || "/";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      // Look for any open window of the PWA
      for (const client of clientList) {
        const clientPath = new URL(client.url).pathname;
        const targetPath = new URL(targetUrl, client.url).pathname;
        if (clientPath === targetPath && "focus" in client) {
          return client.focus();
        }
      }
      // If none open, launch a new window
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});

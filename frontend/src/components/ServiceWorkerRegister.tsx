"use client";

import React, { useEffect } from "react";
import { useAppState } from "@/context/StateContext";

// Utility to convert Base64 VAPID Key to Uint8Array
const urlBase64ToUint8Array = (base64String: string) => {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/\-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
};

// VAPID Public Key
const VAPID_PUBLIC_KEY = "BIvZxFD56q2yFyfqc-DWPUeduMsO_UwuCTB3_EzlQ4Yu_OYXiEXzdZRe4a8tYXdvXZwGb-kym8cDb7TrPEjdPV4";

export default function ServiceWorkerRegister() {
  const { currentUser, isLoggedIn } = useAppState();

  useEffect(() => {
    if (typeof window === "undefined") return;

    let registration: ServiceWorkerRegistration | null = null;

    // 1. Version Poller for cross-platform (iOS, Android, Desktop)
    const checkVersionUpdate = async () => {
      try {
        const res = await fetch("/api/version", { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          const currentSaved = localStorage.getItem("ecoride_app_version");
          if (!currentSaved) {
            localStorage.setItem("ecoride_app_version", data.version);
          } else if (currentSaved !== data.version) {
            console.log(`🚀 New app version detected! Remote: ${data.version}, Local: ${currentSaved}`);
            window.dispatchEvent(new CustomEvent("pwa-update-available", { detail: { version: data.version } }));
          }
        }
      } catch (err) {
        console.warn("Version check failed:", err);
      }
    };

    // Run version check on mount and window focus
    checkVersionUpdate();
    const handleFocus = () => {
      checkVersionUpdate();
      if (registration) {
        registration.update().catch(() => {});
      }
    };
    window.addEventListener("focus", handleFocus);
    window.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") handleFocus();
    });

    // Interval poller every 60 seconds
    const interval = setInterval(checkVersionUpdate, 60000);

    // 2. Register Service Worker with update listeners
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => {
          registration = reg;
          console.log("Service Worker registered successfully with scope:", reg.scope);

          // Force check for sw updates
          reg.update().catch(() => {});

          reg.onupdatefound = () => {
            const installingWorker = reg.installing;
            if (installingWorker) {
              installingWorker.onstatechange = () => {
                if (installingWorker.state === "installed" && navigator.serviceWorker.controller) {
                  console.log("🚀 New Service Worker installed & waiting!");
                  window.dispatchEvent(new CustomEvent("pwa-update-available", { detail: { version: "New Build" } }));
                }
              };
            }
          };
        })
        .catch((err) => {
          console.error("Service Worker registration failed:", err);
        });

      let refreshing = false;
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (!refreshing) {
          refreshing = true;
          window.location.reload();
        }
      });
    }

    // 3. Listener to execute force reload
    const handleForceReload = (e: Event) => {
      const customEvent = e as CustomEvent<{ version?: string }>;
      if (customEvent.detail?.version) {
        localStorage.setItem("ecoride_app_version", customEvent.detail.version);
      }
      if (registration && registration.waiting) {
        registration.waiting.postMessage({ type: "SKIP_WAITING" });
      }
      window.location.reload();
    };

    window.addEventListener("pwa-force-reload", handleForceReload);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("pwa-force-reload", handleForceReload);
    };
  }, []);

  useEffect(() => {
    if (!isLoggedIn || !currentUser?.id) return;

    const handleTogglePush = async (e: Event) => {
      const customEvent = e as CustomEvent<{ enable: boolean }>;
      const { enable } = customEvent.detail;

      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        alert("Push notifications are not supported on this browser/device.");
        return;
      }

      try {
        const registration = await navigator.serviceWorker.ready;

        if (enable) {
          const permission = await Notification.requestPermission();
          if (permission !== "granted") {
            alert("Notification permission denied. Please enable it in browser settings.");
            return;
          }

          const subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
          });

          await fetch("/api/push", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              userId: currentUser.id,
              subscription,
            }),
          });

          localStorage.setItem("ecoride_push_enabled", "true");
          console.log("Device subscribed to push notifications successfully.");
        } else {
          const subscription = await registration.pushManager.getSubscription();
          if (subscription) {
            await subscription.unsubscribe();
          }

          await fetch("/api/push", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId: currentUser.id }),
          });

          localStorage.setItem("ecoride_push_enabled", "false");
          console.log("Device unsubscribed from push notifications successfully.");
        }
      } catch (err) {
        console.error("Error toggling push subscription:", err);
      }
    };

    window.addEventListener("toggle-push-notifications" as any, handleTogglePush);

    const syncSubscription = async () => {
      const isPushEnabled = localStorage.getItem("ecoride_push_enabled") === "true";
      if (isPushEnabled && Notification.permission === "granted") {
        try {
          const registration = await navigator.serviceWorker.ready;
          let subscription = await registration.pushManager.getSubscription();
          if (!subscription) {
            subscription = await registration.pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
            });
          }
          await fetch("/api/push", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              userId: currentUser.id,
              subscription,
            }),
          });
        } catch (err) {
          console.error("Auto-sync push subscription error:", err);
        }
      }
    };

    syncSubscription();

    return () => {
      window.removeEventListener("toggle-push-notifications" as any, handleTogglePush);
    };
  }, [isLoggedIn, currentUser?.id]);

  return null;
}

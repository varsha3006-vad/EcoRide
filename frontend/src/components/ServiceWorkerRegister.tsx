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
    if (typeof window === "undefined" || !("serviceWorker" in navigator) || !("PushManager" in window)) {
      return;
    }

    // 1. Register the Service Worker
    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => {
        console.log("Service Worker registered successfully with scope:", reg.scope);
      })
      .catch((err) => {
        console.error("Service Worker registration failed:", err);
      });
  }, []);

  useEffect(() => {
    if (!isLoggedIn || !currentUser?.id) return;

    // 2. Handler to subscribe or unsubscribe
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
          // Request Permission
          const permission = await Notification.requestPermission();
          if (permission !== "granted") {
            alert("Notification permission denied. Please enable it in browser settings.");
            return;
          }

          // Subscribe
          const subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
          });

          // Send to API
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
          // Unsubscribe
          const subscription = await registration.pushManager.getSubscription();
          if (subscription) {
            await subscription.unsubscribe();
          }

          // Delete from API
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

    // 3. Auto-sync subscription if previously enabled
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
          console.warn("Failed auto-syncing push subscription:", err);
        }
      }
    };

    syncSubscription();

    return () => {
      window.removeEventListener("toggle-push-notifications" as any, handleTogglePush);
    };
  }, [isLoggedIn, currentUser?.id]);

  return null; // Side-effect only component
}

"use client";

import React, { useState, useEffect } from "react";
import { Sparkles, RefreshCw, X } from "lucide-react";

export default function PwaUpdateModal() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [newVersion, setNewVersion] = useState<string>("");
  const [countdown, setCountdown] = useState(10);

  useEffect(() => {
    const handleUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<{ version: string }>;
      const versionStr = customEvent.detail?.version || "New Build";
      setNewVersion(versionStr);
      setUpdateAvailable(true);
      setCountdown(10);
    };

    window.addEventListener("pwa-update-available", handleUpdate);
    return () => window.removeEventListener("pwa-update-available", handleUpdate);
  }, []);

  // Countdown for auto-refresh
  useEffect(() => {
    if (!updateAvailable) return;

    if (countdown <= 0) {
      handleRefreshNow();
      return;
    }

    const timer = setInterval(() => {
      setCountdown(prev => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [updateAvailable, countdown]);

  const handleRefreshNow = () => {
    window.dispatchEvent(new CustomEvent("pwa-force-reload", { detail: { version: newVersion } }));
  };

  const handleDismiss = () => {
    setUpdateAvailable(false);
  };

  if (!updateAvailable) return null;

  return (
    <div className="fixed bottom-5 right-5 left-5 sm:left-auto sm:max-w-sm z-50 animate-bounce-in">
      <div className="glass-panel p-4 sm:p-5 rounded-3xl border-2 border-brand-green-500/40 bg-slate-950/90 text-white shadow-2xl space-y-3.5 backdrop-blur-md">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-2xl bg-brand-green-500/20 text-brand-green-400 text-lg flex items-center justify-center">
              🚀
            </span>
            <div>
              <h4 className="text-xs font-black tracking-wide text-white uppercase flex items-center gap-1.5">
                New Update Available <Sparkles className="h-3 w-3 text-amber-400 animate-pulse" />
              </h4>
              <p className="text-[10px] text-slate-350 font-medium mt-0.5 leading-tight">
                A new version of EcoRide is live with updates.
              </p>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Dismiss"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Auto-refresh countdown indicator */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[9px] font-bold text-slate-400">
            <span>Auto-refreshing app...</span>
            <span className="text-brand-green-400 font-extrabold">{countdown}s</span>
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-gradient-to-r from-brand-green-500 to-emerald-400 h-full transition-all duration-1000 ease-linear rounded-full"
              style={{ width: `${(countdown / 10) * 100}%` }}
            />
          </div>
        </div>

        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={handleRefreshNow}
            className="flex-1 py-2 px-3 rounded-xl bg-brand-green-600 hover:bg-brand-green-500 text-white text-xs font-extrabold cursor-pointer transition-all shadow-md flex items-center justify-center gap-1.5 active:scale-95"
          >
            <RefreshCw className="h-3.5 w-3.5 animate-spin" /> ⚡ Refresh Now
          </button>
          <button
            onClick={handleDismiss}
            className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold cursor-pointer transition-all"
          >
            Later
          </button>
        </div>
      </div>
    </div>
  );
}

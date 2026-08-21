"use client";

import React, { useState, useRef, useEffect } from "react";
import { useAppState } from "@/context/StateContext";
import { Send, MapPin, AlertCircle, X, CheckCheck, Landmark, Navigation, Compass } from "lucide-react";

interface ChatModalProps {
  rideId: string;
  onClose: () => void;
}

export default function ChatModal({ rideId, onClose }: ChatModalProps) {
  const { messages, sendMessage, currentUser, rides } = useAppState();
  const [text, setText] = useState("");
  const [isLocating, setIsLocating] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const activeRide = rides.find(r => r.id === rideId);
  const rideMessages = messages.filter(m => m.rideId === rideId);

  // Auto-scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [rideMessages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    sendMessage(rideId, text);
    setText("");
  };

  const shareLiveLocation = () => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const googleMapsUrl = `https://www.google.com/maps?q=${lat},${lng}`;
        sendMessage(
          rideId,
          `📍 Live GPS Location Shared: ${googleMapsUrl}`,
          true
        );
        setIsLocating(false);
      },
      (err) => {
        setIsLocating(false);
        // Fallback to ride pickup location if browser permission denied
        const fallbackAddr = activeRide?.pickup || "Main entrance pickup point";
        const fallbackUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fallbackAddr)}`;
        sendMessage(
          rideId,
          `📍 Pickup Location: ${fallbackUrl}`,
          true
        );
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const triggerEmergency = () => {
    sendMessage(
      rideId,
      `🚨 EMERGENCY ALERT: ${currentUser.name} triggered safety protocol. Alert sent to Emergency Contacts & HR Security.`,
      false
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in select-none">
      <div className="glass-panel flex h-[520px] w-full max-w-lg flex-col rounded-3xl overflow-hidden shadow-2xl border bg-white dark:bg-slate-950">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b px-5 py-4 bg-slate-50 dark:bg-slate-900/60">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-green-100 text-base dark:bg-brand-green-950/40">
              🚗
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-white truncate max-w-[200px]">
                Ride to {activeRide?.destination || "Office"}
              </h3>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">
                Host: {activeRide?.status === "Started" || activeRide?.status === "Completed" || activeRide?.hostId === currentUser.id ? activeRide?.hostName : "Verified Colleague"} • {activeRide?.vehicleModel}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-950/50 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Message Logs */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/50 dark:bg-slate-900/20">
          {rideMessages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center p-6 text-slate-400">
              <span className="text-3xl mb-2">💬</span>
              <p className="text-xs font-semibold">Secure Ride Channel</p>
              <p className="text-[10px] max-w-[200px] mt-1">Colleagues will appear here once ride requests are approved.</p>
            </div>
          ) : (
            rideMessages.map(msg => {
              const isMe = msg.senderId === currentUser.id;
              const isSys = msg.senderId === "system";
              const isLocationMsg = msg.isLocation || msg.content.includes("maps?q=") || msg.content.includes("maps/search") || msg.content.includes("google.com/maps");
              
              if (isSys) {
                return (
                  <div key={msg.id} className="text-center px-4 py-2 my-2 bg-slate-100 dark:bg-slate-900/60 rounded-xl border border-slate-200/30">
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                      {msg.content}
                    </p>
                  </div>
                );
              }

              return (
                <div key={msg.id} className={`flex items-start gap-2.5 ${isMe ? "justify-end" : "justify-start"}`}>
                  {!isMe && (
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 text-sm">
                      {activeRide?.status === "Started" || activeRide?.status === "Completed" ? msg.senderAvatar : "👤"}
                    </div>
                  )}
                  <div className="max-w-[75%]">
                    {!isMe && (
                      <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400 block mb-0.5 ml-1">
                        {activeRide?.status === "Started" || activeRide?.status === "Completed" || msg.senderId === currentUser.id ? msg.senderName : msg.senderId === activeRide?.hostId ? "Verified Colleague (Driver)" : "Verified Colleague"}
                      </span>
                    )}

                    {isLocationMsg ? (
                      (() => {
                        const mapsMatch = msg.content.match(/(https?:\/\/[^\s]+maps[^\s]+)/i) || msg.content.match(/(https?:\/\/[^\s]+google\.com[^\s]+)/i);
                        const mapsUrl = mapsMatch ? mapsMatch[0] : (msg.content.includes("http") ? msg.content.substring(msg.content.indexOf("http")) : null);
                        const cleanContent = msg.content.replace(mapsUrl || "", "").trim();

                        return (
                          <div className="p-3 rounded-2xl bg-slate-900 border border-brand-blue-500/40 text-white shadow-lg space-y-2 max-w-[260px]">
                            <div className="flex items-center gap-1.5 text-[11px] font-extrabold text-cyan-300">
                              <Navigation className="h-4 w-4 text-cyan-400 animate-pulse flex-shrink-0" />
                              <span>Live GPS Location Shared</span>
                            </div>
                            {cleanContent && (
                              <p className="text-[10px] text-slate-200 font-semibold leading-snug">
                                {cleanContent}
                              </p>
                            )}
                            {mapsUrl && (
                              <a
                                href={mapsUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="mt-1.5 w-full py-2 px-3 rounded-xl bg-brand-blue-600 hover:bg-brand-blue-500 active:scale-[0.98] text-white text-[10px] font-extrabold flex items-center justify-center gap-1.5 transition-all shadow-md cursor-pointer no-underline"
                              >
                                <Compass className="h-3.5 w-3.5" />
                                Navigate on Google Maps ↗
                              </a>
                            )}
                          </div>
                        );
                      })()
                    ) : (
                      <div className={`p-3 rounded-2xl text-xs leading-relaxed ${
                        isMe 
                          ? "bg-brand-green-600 text-white rounded-tr-none" 
                          : "bg-white dark:bg-slate-900 border border-slate-200/40 dark:border-slate-800 text-slate-800 dark:text-slate-200 rounded-tl-none"
                      } ${msg.content.includes("🚨") ? "bg-rose-500 text-white border-none font-semibold animate-pulse" : ""}`}>
                        <p>{msg.content}</p>
                      </div>
                    )}

                    <div className={`flex items-center gap-1 mt-1 justify-end ${isMe ? "" : "flex-row-reverse"}`}>
                      <span className="text-[9px] text-slate-400">{msg.timestamp}</span>
                      {isMe && <CheckCheck className="h-3 w-3 text-brand-green-500" />}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Shortcuts Panel */}
        <div className="border-t px-4 py-2 flex items-center gap-2 bg-slate-50 dark:bg-slate-900/40">
          <button
            type="button"
            onClick={shareLiveLocation}
            disabled={isLocating}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold rounded-lg bg-brand-blue-500/10 hover:bg-brand-blue-500/20 text-brand-blue-600 dark:text-brand-blue-400 transition-all border border-brand-blue-500/30 cursor-pointer disabled:opacity-50"
          >
            <Navigation className="h-3.5 w-3.5 text-brand-blue-500 animate-pulse" />
            {isLocating ? "Locating GPS..." : "📍 Share Live Location"}
          </button>
          <button
            type="button"
            onClick={triggerEmergency}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold rounded-lg bg-rose-50 dark:bg-rose-950/20 text-rose-500 hover:bg-rose-100 transition-colors border border-rose-200/30 ml-auto cursor-pointer"
          >
            <AlertCircle className="h-3.5 w-3.5" /> Trigger SOS
          </button>
        </div>

        {/* Quick Messages Bar */}
        <div className="px-4 py-1.5 border-t bg-slate-50/50 dark:bg-slate-900/10 flex gap-1.5 overflow-x-auto scrollbar-none scroll-smooth">
          {[
            "I am on my way 🚗",
            "At the pickup location 📍",
            "Running 5 mins late ⏳",
            "Reached the office! 🏢"
          ].map((msgText) => (
            <button
              key={msgText}
              type="button"
              onClick={() => sendMessage(rideId, msgText)}
              className="flex-shrink-0 px-2.5 py-1 rounded-full bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-[9px] font-semibold text-slate-600 dark:text-slate-300 border border-slate-250/40 dark:border-slate-800/60 transition-colors shadow-sm cursor-pointer whitespace-nowrap"
            >
              {msgText}
            </button>
          ))}
        </div>

        {/* Input Form */}
        <form onSubmit={handleSend} className="p-3 border-t bg-white dark:bg-slate-950 flex items-center gap-2">
          <input
            type="text"
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="Type a message to your colleagues..."
            className="flex-1 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-3.5 py-2 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-brand-green-500"
          />
          <button
            type="submit"
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-green-600 hover:bg-brand-green-700 text-white transition-colors cursor-pointer"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>

      </div>
    </div>
  );
}

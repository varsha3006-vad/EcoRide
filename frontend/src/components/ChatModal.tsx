"use client";

import React, { useState, useRef, useEffect } from "react";
import { useAppState } from "@/context/StateContext";
import { Send, MapPin, AlertCircle, X, CheckCheck, Landmark } from "lucide-react";

interface ChatModalProps {
  rideId: string;
  onClose: () => void;
}

export default function ChatModal({ rideId, onClose }: ChatModalProps) {
  const { messages, sendMessage, currentUser, rides } = useAppState();
  const [text, setText] = useState("");
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

  const shareMeetingPoint = () => {
    sendMessage(
      rideId,
      `📍 Shared Pick-up Location: Meeting point suggested near ${activeRide?.pickup || "Main entrance lobby"}`,
      true
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="glass-panel flex h-[500px] w-full max-w-lg flex-col rounded-3xl overflow-hidden shadow-2xl border bg-white dark:bg-slate-950">
        
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
                Host: {activeRide?.hostName} • {activeRide?.vehicleModel}
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
                      {msg.senderAvatar}
                    </div>
                  )}
                  <div className="max-w-[75%]">
                    {!isMe && (
                      <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400 block mb-0.5 ml-1">
                        {msg.senderName}
                      </span>
                    )}
                    <div className={`p-3 rounded-2xl text-xs leading-relaxed ${
                      isMe 
                        ? "bg-brand-green-600 text-white rounded-tr-none" 
                        : "bg-white dark:bg-slate-900 border border-slate-200/40 dark:border-slate-800 text-slate-800 dark:text-slate-200 rounded-tl-none"
                    } ${msg.content.includes("🚨") ? "bg-rose-500 text-white border-none font-semibold animate-pulse" : ""} ${
                      msg.isLocation ? "bg-brand-blue-600 text-white border-none" : ""
                    }`}>
                      <p>{msg.content}</p>
                    </div>
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
            onClick={shareMeetingPoint}
            className="flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-bold rounded-lg bg-brand-blue-50 dark:bg-brand-blue-950/20 text-brand-blue-600 dark:text-brand-blue-400 hover:bg-brand-blue-100 transition-colors border border-brand-blue-200/30"
          >
            <MapPin className="h-3 w-3" /> Share Pickup
          </button>
          <button
            onClick={triggerEmergency}
            className="flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-bold rounded-lg bg-rose-50 dark:bg-rose-950/20 text-rose-500 hover:bg-rose-100 transition-colors border border-rose-200/30 ml-auto"
          >
            <AlertCircle className="h-3 w-3" /> Trigger SOS
          </button>
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
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-green-600 hover:bg-brand-green-700 text-white transition-colors"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>

      </div>
    </div>
  );
}

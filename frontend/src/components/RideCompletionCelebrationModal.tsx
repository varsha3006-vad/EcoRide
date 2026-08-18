"use client";

import React from "react";
import { Sparkles, Leaf, Award, X, TreeDeciduous, Fuel, Trophy } from "lucide-react";

export interface CelebrationData {
  rideId: string;
  co2Saved: number;
  creditsEarned: number;
  drivenKm: number;
  passengerCount: number;
  destination: string;
  role: "Host Colleague" | "Passenger";
}

interface RideCompletionCelebrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: CelebrationData | null;
}

export const RideCompletionCelebrationModal: React.FC<RideCompletionCelebrationModalProps> = ({
  isOpen,
  onClose,
  data
}) => {
  if (!isOpen || !data) return null;

  const treesEquivalent = (data.co2Saved * 0.45).toFixed(1);
  const petrolSavedLiters = (data.co2Saved * 0.42).toFixed(1);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      {/* Dynamic Confetti & Glow Background Particles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-brand-green-500/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-10 left-10 w-72 h-72 bg-emerald-500/15 rounded-full blur-3xl" />
        <div className="absolute top-10 right-10 w-72 h-72 bg-brand-blue-500/15 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl overflow-hidden animate-scale-up text-white">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-slate-800/60 text-slate-400 hover:text-white hover:bg-slate-800 transition-all cursor-pointer z-10"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Celebration Header Icon */}
        <div className="flex flex-col items-center text-center relative z-10">
          <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-brand-green-500 to-emerald-400 p-0.5 shadow-lg shadow-brand-green-500/30 flex items-center justify-center mb-4 animate-bounce">
            <div className="w-full h-full rounded-full bg-slate-950 flex items-center justify-center text-3xl">
              🌍
            </div>
          </div>

          <span className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-black uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-emerald-400" /> Mother Earth Hero Celebration
          </span>

          <h2 className="text-2xl sm:text-3xl font-black text-white leading-tight">
            Thank You! 🎉
          </h2>
          <p className="text-sm sm:text-base text-emerald-300 font-bold mt-1.5 max-w-md leading-relaxed">
            You helped Mother Earth by saving <span className="text-emerald-400 underline font-black">{data.co2Saved} kg of CO₂</span> on your commute to <span className="text-white font-bold">{data.destination}</span>!
          </p>
        </div>

        {/* Impact Breakdown Grid */}
        <div className="grid grid-cols-2 gap-3 my-6 relative z-10">
          {/* CO2 Saved */}
          <div className="p-4 bg-slate-950/60 border border-emerald-500/30 rounded-2xl flex flex-col items-center text-center">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 mb-1.5">
              <Leaf className="h-5 w-5" />
            </div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Carbon Offset</span>
            <span className="text-xl font-black text-emerald-400 mt-0.5">+{data.co2Saved} kg</span>
          </div>

          {/* Credits Earned */}
          <div className="p-4 bg-slate-950/60 border border-amber-500/30 rounded-2xl flex flex-col items-center text-center">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 mb-1.5">
              <Award className="h-5 w-5" />
            </div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">ESG Credits</span>
            <span className="text-xl font-black text-amber-400 mt-0.5">+{data.creditsEarned} Pts</span>
          </div>

          {/* Trees Equivalent */}
          <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-2xl flex flex-col items-center text-center">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 mb-1.5">
              <TreeDeciduous className="h-5 w-5" />
            </div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tree Impact</span>
            <span className="text-sm font-black text-slate-200 mt-0.5">~{treesEquivalent} Trees</span>
            <span className="text-[9px] text-slate-500">1-month absorption</span>
          </div>

          {/* Distance Driven */}
          <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-2xl flex flex-col items-center text-center">
            <div className="p-2 rounded-xl bg-brand-blue-500/10 text-brand-blue-400 mb-1.5">
              <Fuel className="h-5 w-5" />
            </div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Petrol Saved</span>
            <span className="text-sm font-black text-slate-200 mt-0.5">~{petrolSavedLiters} Liters</span>
            <span className="text-[9px] text-slate-500">{data.drivenKm} km on-road</span>
          </div>
        </div>

        {/* Role badge message */}
        <div className="p-3 bg-slate-950/40 rounded-xl border border-slate-800 text-center text-xs text-slate-300 font-medium mb-6 relative z-10 flex items-center justify-center gap-2">
          <span>{data.role === "Host Colleague" ? "🚗 Thank you for hosting colleagues on your commute!" : "👥 Thank you for sharing a corporate ride with colleagues!"}</span>
        </div>

        {/* Modal Footer Actions */}
        <div className="flex items-center gap-3 relative z-10">
          <button
            onClick={() => {
              onClose();
              window.dispatchEvent(new CustomEvent("open-credit-details"));
            }}
            className="flex-1 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer border border-slate-700"
          >
            <Trophy className="h-4 w-4 text-amber-400" /> View ESG Ledger
          </button>

          <button
            onClick={onClose}
            className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-brand-green-600 to-emerald-500 hover:from-brand-green-500 hover:to-emerald-400 text-slate-950 font-black text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-brand-green-500/20"
          >
            Awesome! 🚀
          </button>
        </div>
      </div>
    </div>
  );
};

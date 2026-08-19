"use client";

import React, { useState } from "react";
import { useAppState } from "@/context/StateContext";
import { 
  X, 
  Award, 
  Leaf, 
  TrendingUp, 
  TrendingDown, 
  Calendar, 
  Car, 
  CheckCircle2, 
  AlertTriangle, 
  FileText, 
  Download, 
  Sparkles,
  TreeDeciduous,
  Fuel,
  Users
} from "lucide-react";

interface EsgCreditModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const EsgCreditModal: React.FC<EsgCreditModalProps> = ({ isOpen, onClose }) => {
  const { currentUser, rides, requests } = useAppState();
  const [activeTab, setActiveTab] = useState<"summary" | "ledger" | "rules">("summary");

  if (!isOpen || !currentUser) return null;

  // Compute detailed statistics
  const isUserHost = (r: any) => 
    r.hostId === currentUser.id || 
    (currentUser.name && r.hostName?.toLowerCase() === currentUser.name.toLowerCase()) ||
    (currentUser.email && r.hostId === currentUser.email);

  const isUserPassenger = (r: any) => {
    const passengersRaw = r.passengers as any;
    const passengersArray = Array.isArray(passengersRaw)
      ? passengersRaw
      : (typeof passengersRaw === "string" && passengersRaw.startsWith("{")
        ? passengersRaw.slice(1, -1).split(",").map((s: string) => s.trim().replace(/^"|"$/g, ''))
        : []);
    return passengersArray.includes(currentUser.id) ||
      (currentUser.name && passengersArray.some((p: string) => p.toLowerCase() === currentUser.name.toLowerCase()));
  };

  const hostedCompletedRides = rides.filter(r => isUserHost(r) && r.status?.toLowerCase() === "completed");
  const joinedCompletedRides = rides.filter(r => isUserPassenger(r) && !isUserHost(r) && r.status?.toLowerCase() === "completed");
  const hostedCancelledRides = rides.filter(r => isUserHost(r) && r.status?.toLowerCase() === "cancelled");

  const totalCompletedCount = hostedCompletedRides.length + joinedCompletedRides.length;
  const totalCancelledCount = hostedCancelledRides.length;

  const totalDrivenKm = [...hostedCompletedRides, ...joinedCompletedRides].reduce((acc, r) => {
    const dist = r.actualDrivenKm && r.actualDrivenKm > 0
      ? r.actualDrivenKm
      : (r.co2Saved ? Number((r.co2Saved / 0.17).toFixed(1)) : 0);
    return acc + dist;
  }, 0);

  const totalHostCredits = hostedCompletedRides.reduce((acc, r) => {
    const pCount = (r.passengers || []).filter((p: string) => p !== r.hostId).length;
    return acc + 50 + (pCount * 15);
  }, 0);

  const totalPassengerCredits = joinedCompletedRides.length * 25;
  const totalPenaltyDeducted = totalCancelledCount * 25;

  const co2Kg = currentUser.carbonSaved || 0;
  const treesEquivalent = (co2Kg / 20.0).toFixed(1);
  const petrolLiters = (co2Kg * 0.42).toFixed(1);

  // Generate combined audit ledger
  const auditEntries = [
    ...hostedCompletedRides.map(r => {
      const pCount = (r.passengers || []).filter((p: string) => p !== r.hostId).length;
      const creditsEarned = 50 + (pCount * 15);
      const rDist = r.actualDrivenKm && r.actualDrivenKm > 0 ? r.actualDrivenKm : (r.co2Saved ? Number((r.co2Saved / 0.17).toFixed(1)) : 0);
      return {
        id: `audit-${r.id}`,
        date: r.rideDate || "Recent",
        type: "HOST_EARNED",
        description: `Hosted commute (${rDist.toFixed(1)} km): ${r.pickup} → ${r.destination}`,
        passengersCount: pCount,
        co2: r.co2Saved || 5.0,
        drivenKm: rDist,
        creditsChange: `+${creditsEarned}`,
        isPositive: true,
        details: `Base +50 credits + ${pCount * 15} passenger bonus (${rDist.toFixed(1)} km driven)`
      };
    }),
    ...joinedCompletedRides.map(r => {
      const rDist = r.actualDrivenKm && r.actualDrivenKm > 0 ? r.actualDrivenKm : (r.co2Saved ? Number((r.co2Saved / 0.17).toFixed(1)) : 0);
      return {
        id: `audit-${r.id}`,
        date: r.rideDate || "Recent",
        type: "PASSENGER_EARNED",
        description: `Carpooled with ${r.hostName} (${rDist.toFixed(1)} km): ${r.pickup} → ${r.destination}`,
        passengersCount: 1,
        co2: r.co2Saved || 5.0,
        drivenKm: rDist,
        creditsChange: "+25",
        isPositive: true,
        details: `Passenger 50% carbon share credits (${rDist.toFixed(1)} km driven)`
      };
    }),
    ...hostedCancelledRides.map(r => ({
      id: `audit-can-${r.id}`,
      date: r.rideDate || "Recent",
      type: "HOST_CANCELLED_PENALTY",
      description: `Cancelled hosted ride to ${r.destination}`,
      passengersCount: 0,
      co2: 0,
      drivenKm: 0,
      creditsChange: "-25",
      isPositive: false,
      details: "Late cancellation penalty (-25 Credits, -5 ESG score)"
    }))
  ].sort((a, b) => b.id.localeCompare(a.id));

  // Handle statement download
  const handleDownloadStatement = () => {
    const statementLines = [
      "===========================================================",
      "               ECORIDE ENTERPRISE ESG AUDIT STATEMENT       ",
      "===========================================================",
      `Employee Name   : ${currentUser.name}`,
      `Department      : ${currentUser.department} (${currentUser.designation})`,
      `Statement Date  : ${new Date().toLocaleDateString()}`,
      `Active City     : ${currentUser.office}`,
      "-----------------------------------------------------------",
      "SUMMARY STATISTICS:",
      `Current Total ESG Credits : ${currentUser.credits} Credits`,
      `Total Carbon Offset       : ${co2Kg} kg CO2`,
      `Environmental Impact      : ~${treesEquivalent} Trees Planted / ${petrolLiters}L Petrol Saved`,
      `Completed Commutes        : ${totalCompletedCount} rides (${hostedCompletedRides.length} Hosted, ${joinedCompletedRides.length} Joined)`,
      `Cancelled Rides           : ${totalCancelledCount} rides (-${totalPenaltyDeducted} penalty credits)`,
      `Corporate ESG Score       : ${currentUser.esgScore} / 100`,
      "-----------------------------------------------------------",
      "TRANSACTION AUDIT LEDGER:",
      ...auditEntries.map(e => `[${e.date}] ${e.description} | CO2: ${e.co2}kg | Credits: ${e.creditsChange} (${e.details})`),
      "===========================================================",
      "       Generated by EcoRide Enterprise Sustainability Platform",
      "==========================================================="
    ];

    const blob = new Blob([statementLines.join("\n")], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `EcoRide_ESG_Statement_${currentUser.name.replace(/\s+/g, "_")}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="glass-panel max-w-2xl w-full rounded-3xl border-2 border-brand-green-500/30 bg-white dark:bg-slate-950 animate-scale-up overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* Header Section */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-brand-green-600 via-brand-green-500 to-brand-blue-600 text-white relative flex-shrink-0 text-left">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-black/20 hover:bg-black/40 text-white transition-colors cursor-pointer"
            title="Close modal"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="flex items-center gap-3">
            <span className="text-3xl p-3 rounded-2xl bg-white/15 backdrop-blur-sm border border-white/20">
              🌱
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-extrabold uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded-full">
                  ESG Calculation Audit
                </span>
                <span className="text-[9px] font-extrabold uppercase tracking-wider bg-amber-400 text-slate-900 px-2 py-0.5 rounded-full flex items-center gap-1">
                  ⭐ ESG Score: {currentUser.esgScore}/100
                </span>
              </div>
              <h3 className="text-lg sm:text-xl font-black mt-1 tracking-tight">
                {currentUser.name}'s Credit Breakdown
              </h3>
              <p className="text-xs text-emerald-100 font-medium">
                {currentUser.designation} • {currentUser.department}
              </p>
            </div>
          </div>

          {/* Hero Net Credits Counter */}
          <div className="mt-4 p-3 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase font-bold text-emerald-100 tracking-wider">Total Net Balance</p>
              <p className="text-2xl sm:text-3xl font-black flex items-center gap-2 text-white">
                <Award className="h-7 w-7 text-amber-300 animate-pulse" />
                {currentUser.credits} <span className="text-sm font-semibold text-emerald-100">Credits</span>
              </p>
            </div>
            <button
              onClick={handleDownloadStatement}
              className="px-3.5 py-2 rounded-xl bg-white text-brand-green-700 hover:bg-brand-green-50 text-xs font-black transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="h-3.5 w-3.5" />
              Download Statement
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center border-b px-5 bg-slate-50 dark:bg-slate-900/50 flex-shrink-0 overflow-x-auto">
          <button
            onClick={() => setActiveTab("summary")}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === "summary"
                ? "border-brand-green-500 text-brand-green-600 dark:text-brand-green-400"
                : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            <Sparkles className="h-3.5 w-3.5" /> Summary Statistics
          </button>
          <button
            onClick={() => setActiveTab("ledger")}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === "ledger"
                ? "border-brand-green-500 text-brand-green-600 dark:text-brand-green-400"
                : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            <FileText className="h-3.5 w-3.5" /> Audit Transaction Ledger ({auditEntries.length})
          </button>
          <button
            onClick={() => setActiveTab("rules")}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === "rules"
                ? "border-brand-green-500 text-brand-green-600 dark:text-brand-green-400"
                : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            <Leaf className="h-3.5 w-3.5" /> Calculation Rules
          </button>
        </div>

        {/* Scrollable Body Content */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1">
          
          {/* TAB 1: SUMMARY STATISTICS */}
          {activeTab === "summary" && (
            <div className="space-y-5">
              
              {/* 4 KPI Grid Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                
                {/* Card 1: CO2 Offset */}
                <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-left space-y-1">
                  <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400">
                    <Leaf className="h-4 w-4" />
                    <span className="text-[9px] font-extrabold uppercase">CO₂ Saved</span>
                  </div>
                  <p className="text-base sm:text-lg font-black text-slate-800 dark:text-white">
                    {co2Kg} <span className="text-xs font-semibold text-slate-500">kg</span>
                  </p>
                  <p className="text-[9px] text-slate-500 font-medium">
                    ~{treesEquivalent} 🌳 trees planted
                  </p>
                </div>

                {/* Card 2: Completed Commutes */}
                <div className="p-3.5 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-left space-y-1">
                  <div className="flex items-center justify-between text-blue-600 dark:text-blue-400">
                    <Car className="h-4 w-4" />
                    <span className="text-[9px] font-extrabold uppercase">Completed</span>
                  </div>
                  <p className="text-base sm:text-lg font-black text-slate-800 dark:text-white">
                    {totalCompletedCount} <span className="text-xs font-semibold text-slate-500">rides</span>
                  </p>
                  <p className="text-[9px] text-slate-500 font-medium">
                    {hostedCompletedRides.length} Host • {joinedCompletedRides.length} Passenger
                  </p>
                </div>

                {/* Card 3: Late Cancellations */}
                <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-left space-y-1">
                  <div className="flex items-center justify-between text-rose-600 dark:text-rose-400">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="text-[9px] font-extrabold uppercase">Penalties</span>
                  </div>
                  <p className="text-base sm:text-lg font-black text-rose-600 dark:text-rose-400">
                    -{totalPenaltyDeducted} <span className="text-xs font-semibold text-slate-500">pts</span>
                  </p>
                  <p className="text-[9px] text-slate-500 font-medium">
                    {totalCancelledCount} host cancellations
                  </p>
                </div>

                {/* Card 4: Corporate Rank */}
                <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-left space-y-1">
                  <div className="flex items-center justify-between text-amber-600 dark:text-amber-400">
                    <Award className="h-4 w-4" />
                    <span className="text-[9px] font-extrabold uppercase">Company Rank</span>
                  </div>
                  <p className="text-base sm:text-lg font-black text-slate-800 dark:text-white">
                    #{currentUser.rank} <span className="text-xs font-semibold text-slate-500">Leader</span>
                  </p>
                  <p className="text-[9px] text-slate-500 font-medium">
                    ESG Gold Tier Champion
                  </p>
                </div>
              </div>

              {/* Earnings & Deductions Breakdown */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/50 dark:border-slate-800/40 space-y-3 text-left">
                <h4 className="text-xs font-extrabold text-slate-800 dark:text-white flex items-center justify-between">
                  <span>📊 Earnings vs Deductions Breakdown</span>
                  <span className="text-[10px] font-normal text-slate-500">Calculated real-time from ride registries</span>
                </h4>

                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between p-2 rounded-xl bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-850">
                    <span className="flex items-center gap-2 font-medium text-slate-700 dark:text-slate-300">
                      <span className="p-1 rounded bg-emerald-500/10 text-emerald-600">🚗</span>
                      Colleague Host Ride Completions & Passenger Bonus
                    </span>
                    <strong className="text-emerald-600 dark:text-emerald-400">+{totalHostCredits} Credits</strong>
                  </div>

                  <div className="flex items-center justify-between p-2 rounded-xl bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-850">
                    <span className="flex items-center gap-2 font-medium text-slate-700 dark:text-slate-300">
                      <span className="p-1 rounded bg-blue-500/10 text-blue-600">🤝</span>
                      Shared Passenger Commute Completions
                    </span>
                    <strong className="text-blue-600 dark:text-blue-400">+{totalPassengerCredits} Credits</strong>
                  </div>

                  {totalCancelledCount > 0 && (
                    <div className="flex items-center justify-between p-2 rounded-xl bg-rose-50 dark:bg-rose-950/20 border border-rose-200/30">
                      <span className="flex items-center gap-2 font-medium text-rose-700 dark:text-rose-300">
                        <span className="p-1 rounded bg-rose-500/10 text-rose-600">⚠️</span>
                        Host Late Ride Cancellations ({totalCancelledCount} Rides)
                      </span>
                      <strong className="text-rose-600 dark:text-rose-400">-{totalPenaltyDeducted} Penalty Credits</strong>
                    </div>
                  )}
                </div>
              </div>

              {/* Sustainability Impact Metrics */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-500/10 to-brand-green-500/10 border border-emerald-500/20 space-y-2 text-left">
                <h4 className="text-xs font-extrabold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                  <TreeDeciduous className="h-4 w-4 text-emerald-600" /> Sustainability Impact Metrics
                </h4>
                <div className="grid grid-cols-2 gap-3 text-xs text-slate-650 dark:text-slate-350 pt-1">
                  <div className="flex items-center gap-2">
                    <Fuel className="h-4 w-4 text-amber-500" />
                    <div>
                      <p className="font-extrabold text-slate-800 dark:text-white">{petrolLiters} Liters</p>
                      <p className="text-[9px] text-slate-500">Petrol fuel saved</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <TreeDeciduous className="h-4 w-4 text-emerald-500" />
                    <div>
                      <p className="font-extrabold text-slate-800 dark:text-white">{treesEquivalent} Trees</p>
                      <p className="text-[9px] text-slate-500">Annual CO₂ absorb equivalent</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: AUDIT TRANSACTION LEDGER */}
          {activeTab === "ledger" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-extrabold text-slate-800 dark:text-white">
                  📋 Line-Item Transaction Audit Ledger
                </h4>
                <span className="text-[10px] text-slate-500 font-semibold">
                  Showing {auditEntries.length} recorded events
                </span>
              </div>

              {auditEntries.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400">
                  No completed or cancelled rides logged yet. Host or join a commute to populate your audit ledger!
                </div>
              ) : (
                <div className="space-y-2">
                  {auditEntries.map(entry => (
                    <div 
                      key={entry.id}
                      className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/50 dark:border-slate-800/40 flex items-center justify-between gap-3 text-left"
                    >
                      <div className="flex items-center gap-3">
                        <span className={`text-xl p-2 rounded-xl ${
                          entry.isPositive ? "bg-emerald-500/10 text-emerald-600" : "bg-rose-500/10 text-rose-600"
                        }`}>
                          {entry.isPositive ? "🚗" : "⚠️"}
                        </span>
                        <div>
                          <h5 className="text-xs font-bold text-slate-800 dark:text-white">
                            {entry.description}
                          </h5>
                          <p className="text-[10px] text-slate-500 mt-0.5 font-medium">
                            {entry.details} • Date: {entry.date}
                          </p>
                        </div>
                      </div>

                      <div className="text-right flex-shrink-0">
                        <span className={`text-xs font-black ${
                          entry.isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                        }`}>
                          {entry.creditsChange} Credits
                        </span>
                        {entry.co2 > 0 && (
                          <span className="block text-[9px] text-slate-400 font-semibold">
                            +{entry.co2} kg CO₂
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: CALCULATION RULES */}
          {activeTab === "rules" && (
            <div className="space-y-4 text-left">
              <h4 className="text-xs font-extrabold text-slate-800 dark:text-white">
                📜 Corporate ESG Credit Allocation Rules & Policies
              </h4>

              <div className="space-y-3 text-xs text-slate-650 dark:text-slate-350">
                <div className="p-3 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 space-y-1">
                  <h5 className="font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                    🚗 1. Colleague Host Completion Credits
                  </h5>
                  <p className="text-[11px] leading-relaxed">
                    Colleague hosts receive a base reward of <strong>+50 ESG Credits</strong> for every completed carpool trip, plus a carpool passenger bonus of <strong>+15 ESG Credits</strong> per accepted passenger aboard.
                  </p>
                </div>

                <div className="p-3 rounded-2xl bg-blue-500/5 border border-blue-500/20 space-y-1">
                  <h5 className="font-bold text-blue-700 dark:text-blue-400 flex items-center gap-1.5">
                    🤝 2. Passenger Carpool Credits
                  </h5>
                  <p className="text-[11px] leading-relaxed">
                    Passengers joining a shared carpool receive a 50% carbon offset share of <strong>+25 ESG Credits</strong> upon successful trip completion.
                  </p>
                </div>

                <div className="p-3 rounded-2xl bg-rose-500/5 border border-rose-500/20 space-y-1">
                  <h5 className="font-bold text-rose-700 dark:text-rose-400 flex items-center gap-1.5">
                    ⚠️ 3. Host Late Cancellation Penalty
                  </h5>
                  <p className="text-[11px] leading-relaxed">
                    If a colleague host cancels a scheduled ride, a penalty of <strong>-25 ESG Credits</strong> and <strong>-5 ESG Score points</strong> is deducted from the host's sustainability score to maintain reliability. Affected passengers automatically have their pickup requests reactivated with Urgent priority.
                  </p>
                </div>

                <div className="p-3 rounded-2xl bg-amber-500/5 border border-amber-500/20 space-y-1">
                  <h5 className="font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                    🌱 4. Carbon Savings Calculation Standard
                  </h5>
                  <p className="text-[11px] leading-relaxed">
                    Carbon offsets are computed based on vehicle engine category (Electric / Hybrid / Petrol) and commute distance. 1.0 kg CO₂ reduced yields +10 ESG Credits toward annual corporate sustainability awards.
                  </p>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-slate-50 dark:bg-slate-900/50 flex items-center justify-between flex-shrink-0">
          <p className="text-[10px] text-slate-400 font-medium">
            EcoRide Enterprise Sustainability Registry • Verified Real-time
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white dark:bg-slate-200 dark:text-slate-900 dark:hover:bg-white text-xs font-bold transition-all cursor-pointer shadow-sm"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};

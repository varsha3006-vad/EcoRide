"use client";

import React, { useState, useEffect } from "react";
import { Cpu, Sparkles, Leaf, Award, Navigation, Clock, Zap, ArrowRight, X } from "lucide-react";
import { findSmartMatchesForDriver, RouteMatchResult } from "@/utils/routeMatching";
import { Ride, CommuteRequest, useAppState } from "@/context/StateContext";

interface SmartRouteMatchesWidgetProps {
  rides: Ride[];
  commuteRequests: CommuteRequest[];
  currentUserId: string;
  onProposeRide: (req: CommuteRequest, ride: Ride) => void;
}

export default function SmartRouteMatchesWidget({
  rides,
  commuteRequests,
  currentUserId,
  onProposeRide,
}: SmartRouteMatchesWidgetProps) {
  const { rideProposals } = useAppState();
  const [mounted, setMounted] = useState(false);
  const [dismissedRequestIds, setDismissedRequestIds] = useState<string[]>([]);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Prevent any microsecond flash during initial un-hydrated SSR frame
  if (!mounted || !currentUserId) return null;

  // Find published rides hosted by current user
  const myRides = rides.filter(
    (r) => r.hostId === currentUserId && r.status === "Published" && r.seatsAvailable > 0
  );

  if (myRides.length === 0) return null;

  // Filter out any locally dismissed request IDs
  const activeRequests = commuteRequests.filter(
    (req) => !dismissedRequestIds.includes(req.id)
  );

  // Aggregate and rank all matches for all of driver's active rides
  const allMatches: RouteMatchResult[] = [];
  myRides.forEach((ride) => {
    const matches = findSmartMatchesForDriver(ride, activeRequests, rideProposals);
    allMatches.push(...matches);
  });

  // Sort strictly by highest CO2 saved
  allMatches.sort((a, b) => b.estimatedCo2Saved - a.estimatedCo2Saved);

  if (allMatches.length === 0) return null;

  const handleDismissMatch = (requestId: string) => {
    setDismissedRequestIds((prev) => [...prev, requestId]);
  };

  const handleProposeClick = (req: CommuteRequest, ride: Ride) => {
    handleDismissMatch(req.id);
    onProposeRide(req, ride);
  };

  return (
    <div className="glass-panel p-5.5 rounded-3xl border-2 border-cyan-500/40 bg-gradient-to-r from-cyan-950/40 via-slate-950/95 to-emerald-950/40 text-white shadow-2xl space-y-4 animate-fade-in relative overflow-hidden backdrop-blur-xl">
      {/* Decorative AI Neural Background Accent Glow */}
      <div className="absolute -top-12 -right-12 w-44 h-44 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-12 -left-12 w-44 h-44 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Hero Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-cyan-500/20 pb-3.5 relative z-10">
        <div className="flex items-center gap-3">
          <span className="p-2.5 rounded-2xl bg-gradient-to-br from-cyan-500/30 to-emerald-500/30 text-cyan-300 text-xl flex items-center justify-center border border-cyan-500/30 shadow-lg shadow-cyan-500/10">
            <Cpu className="h-5 w-5 animate-pulse text-cyan-400" />
          </span>
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-1.5 flex-wrap">
              EcoRide AI Neural Engine v2.0 <Sparkles className="h-3.5 w-3.5 text-amber-400 animate-pulse" />
            </h3>
            <span className="text-[9px] font-extrabold bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 px-2 py-0.5 rounded-full uppercase tracking-wider">
              🤖 AI Adaptive Matcher
            </span>
          </div>
        </div>

        {/* High-Visibility Flashing Orange Best Match Found Badge */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] bg-orange-500/25 text-orange-300 border border-orange-500/50 px-3.5 py-1 rounded-full font-black uppercase flex items-center gap-1.5 shadow-lg shadow-orange-500/20 animate-pulse">
            <Zap className="h-3.5 w-3.5 text-orange-400 fill-orange-400 animate-bounce" /> {allMatches.length} Best {allMatches.length === 1 ? "Match" : "Matches"} Found
          </span>
        </div>
      </div>

      {/* Ranked Matches List */}
      <div className="space-y-3.5 relative z-10">
        {allMatches.slice(0, 3).map((match) => {
          const req = match.commuteRequest;
          const ride = match.driverRide;
          const isIntercity = match.tripType === "Intercity";

          return (
            <div
              key={`${req.id}-${ride.id}`}
              className={`p-4 rounded-2xl bg-slate-900/90 border transition-all space-y-3 shadow-lg group relative ${
                isIntercity
                  ? "border-indigo-500/40 hover:border-indigo-400/70"
                  : "border-cyan-500/30 hover:border-cyan-400/60"
              }`}
            >
              {/* Dismiss button for individual match */}
              <button
                onClick={() => handleDismissMatch(req.id)}
                className="absolute top-3 right-3 p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                title="Dismiss Match"
              >
                <X className="h-3.5 w-3.5" />
              </button>

              {/* Match Top Bar */}
              <div className="flex flex-wrap items-center justify-between gap-2 pr-6">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-white flex items-center gap-1.5">
                    Verified Colleague ({req.requesterDept || "Engineering"})
                  </span>
                </div>

                {/* Deviation & Time Proximity Tags */}
                <div className="flex items-center gap-2 text-[9px] font-extrabold">
                  <span className="bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                    📍 {match.deviationKm.toFixed(1)} km deviation
                  </span>
                  <span className="bg-amber-500/15 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Clock className="h-2.5 w-2.5" /> {match.timeDiffMins === 0 ? "Exact Time Match" : `${match.timeDiffMins} min window`}
                  </span>
                </div>
              </div>

              {/* Route Summary */}
              <p className="text-[10px] text-slate-300 font-medium flex items-center gap-1.5 bg-slate-950/60 px-3 py-1.5 rounded-xl border border-slate-800">
                <Navigation className="h-3 w-3 text-cyan-400 flex-shrink-0" />
                <span className="font-semibold text-white">{req.pickup}</span>
                <ArrowRight className="h-2.5 w-2.5 text-slate-500 flex-shrink-0" />
                <span className="font-semibold text-white">{req.destination}</span>
              </p>

              {/* Environmental Impact Callout & Action Button */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-1.5 border-t border-slate-800/80">
                <div className="flex items-center gap-3.5 text-[10px] font-black">
                  <span className="text-emerald-400 flex items-center gap-1">
                    <Leaf className="h-3.5 w-3.5" /> +{match.estimatedCo2Saved.toFixed(1)} kg CO₂ Saved
                  </span>
                  <span className="text-amber-400 flex items-center gap-1">
                    <Award className="h-3.5 w-3.5" /> +{match.estimatedEsgCredits} ESG Points
                  </span>
                </div>

                <button
                  onClick={() => handleProposeClick(req, ride)}
                  className={`py-2 px-3.5 rounded-xl text-white text-xs font-black cursor-pointer transition-all shadow-md flex items-center justify-center gap-1.5 active:scale-95 border ${
                    isIntercity
                      ? "bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 border-indigo-400/40"
                      : "bg-gradient-to-r from-cyan-600 to-emerald-600 hover:from-cyan-500 hover:to-emerald-500 border-cyan-400/40"
                  }`}
                >
                  <Sparkles className="h-3.5 w-3.5 text-amber-300" /> 🚀 AI One-Tap Pickup Proposal
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

"use client";

import React from "react";
import { Sparkles, Leaf, Award, Navigation, Send, ArrowRight } from "lucide-react";
import { findSmartMatchesForDriver, RouteMatchResult } from "@/utils/routeMatching";
import { Ride, CommuteRequest } from "@/context/StateContext";

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
  // Find published rides hosted by current user
  const myRides = rides.filter(
    (r) => r.hostId === currentUserId && r.status === "Published" && r.seatsAvailable > 0
  );

  if (myRides.length === 0) return null;

  // Aggregate and rank all matches for all of driver's active rides
  const allMatches: RouteMatchResult[] = [];
  myRides.forEach((ride) => {
    const matches = findSmartMatchesForDriver(ride, commuteRequests);
    allMatches.push(...matches);
  });

  // Sort strictly by highest CO2 saved
  allMatches.sort((a, b) => b.estimatedCo2Saved - a.estimatedCo2Saved);

  if (allMatches.length === 0) return null;

  return (
    <div className="glass-panel p-5 rounded-3xl border-2 border-brand-green-500/30 bg-gradient-to-r from-emerald-950/20 via-slate-950/90 to-teal-950/20 text-white shadow-xl space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="p-2 rounded-2xl bg-brand-green-500/20 text-brand-green-400 text-lg flex items-center justify-center">
            🎯
          </span>
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-1.5">
              AI Smart Route Matches <Sparkles className="h-3.5 w-3.5 text-amber-400 animate-pulse" />
            </h3>
            <p className="text-[10px] text-slate-300 font-medium">
              Passengers along your route (ranked by highest CO₂ saved for Mother Earth)
            </p>
          </div>
        </div>
        <span className="text-[9px] bg-brand-green-500/20 text-brand-green-300 border border-brand-green-500/40 px-2.5 py-1 rounded-full font-extrabold uppercase">
          {allMatches.length} {allMatches.length === 1 ? "Match" : "Matches"} (≤ 5.0 km)
        </span>
      </div>

      <div className="space-y-3">
        {allMatches.slice(0, 3).map((match, idx) => {
          const req = match.commuteRequest;
          const ride = match.driverRide;

          return (
            <div
              key={`${req.id}-${ride.id}`}
              className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-brand-green-500/40 transition-all space-y-2.5"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-extrabold text-white">
                      Verified Colleague ({req.requesterDept || "Engineering"})
                    </span>
                    <span className="text-[9px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold">
                      {match.deviationKm.toFixed(1)} km deviation
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-350 mt-1 flex items-center gap-1">
                    <Navigation className="h-3 w-3 text-brand-green-400" />
                    <span>{req.pickup}</span>
                    <ArrowRight className="h-2.5 w-2.5 text-slate-500" />
                    <span>{req.destination}</span>
                  </p>
                </div>
              </div>

              {/* Impact Callout Pill */}
              <div className="flex items-center justify-between pt-1 border-t border-slate-800/60">
                <div className="flex items-center gap-3 text-[10px] font-bold">
                  <span className="text-emerald-400 flex items-center gap-1">
                    <Leaf className="h-3 w-3" /> +{match.estimatedCo2Saved.toFixed(1)} kg CO₂ Saved
                  </span>
                  <span className="text-amber-400 flex items-center gap-1">
                    <Award className="h-3 w-3" /> +{match.estimatedEsgCredits} ESG Pts
                  </span>
                </div>

                <button
                  onClick={() => onProposeRide(req, ride)}
                  className="py-1.5 px-3 rounded-xl bg-brand-green-600 hover:bg-brand-green-500 text-white text-[10px] font-black cursor-pointer transition-all shadow-md flex items-center gap-1 active:scale-95"
                >
                  <Send className="h-3 w-3" /> Propose Pickup Offer
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

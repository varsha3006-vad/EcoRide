"use client";

import React, { useState } from "react";
import { useAppState } from "@/context/StateContext";
import { X, Award, Leaf, Calendar, MapPin, User, Mail, Briefcase, ChevronRight, ChevronDown, ChevronUp } from "lucide-react";
import { Employee } from "@/context/StateContext";

interface PastRidesModalProps {
  onClose: () => void;
}

export default function PastRidesModal({ onClose }: PastRidesModalProps) {
  const { rides, currentUser, employees } = useAppState();
  const [selectedColleague, setSelectedColleague] = useState<Employee | null>(null);
  const [expandedRideId, setExpandedRideId] = useState<string | null>(null);

  // Filter completed or cancelled rides where the user was the host or a passenger
  const pastRides = rides.filter(
    (r) =>
      (r.status === "Completed" || r.status === "Cancelled") &&
      (r.hostId === currentUser.id || r.passengers.includes(currentUser.id))
  );

  // Calculate cumulative stats for past commutes (skipping cancelled rides in metric sums)
  const totalCommutes = pastRides.filter(r => r.status === "Completed").length;
  
  const totalCreditsEarned = pastRides.reduce((acc, ride) => {
    if (ride.status === "Cancelled") return acc;
    const isDriver = ride.hostId === currentUser.id;
    const totalPassengers = ride.passengers.length;
    if (isDriver) {
      return acc + ride.esgCredits + (totalPassengers * 15);
    } else {
      const earnedCredits = ride.esgCredits + (totalPassengers * 15);
      return acc + Math.round(earnedCredits * 0.5);
    }
  }, 0);

  const totalCarbonSaved = pastRides.reduce((acc, ride) => {
    if (ride.status === "Cancelled") return acc;
    const isDriver = ride.hostId === currentUser.id;
    const totalPassengers = ride.passengers.length;
    if (isDriver) {
      return acc + (ride.co2Saved * (totalPassengers || 1));
    } else {
      return acc + ride.co2Saved;
    }
  }, 0);

  // Total actual driven distance for completed commutes
  const totalDistance = pastRides.reduce((acc, ride) => {
    if (ride.status === "Cancelled") return acc;
    const rDist = ride.actualDrivenKm && ride.actualDrivenKm > 0
      ? ride.actualDrivenKm
      : (ride.co2Saved ? Number((ride.co2Saved / 0.17).toFixed(1)) : 0);
    return acc + rDist;
  }, 0);

  const handleColleagueClick = (empId: string) => {
    const found = employees.find((emp) => emp.id === empId);
    if (found) {
      setSelectedColleague(found);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in select-none">
      <div className="w-full max-w-md bg-white dark:bg-slate-950 rounded-3xl border border-slate-150 dark:border-slate-800 p-6 shadow-2xl space-y-5 flex flex-col max-h-[80vh] overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b pb-3 flex-shrink-0">
          <h3 className="font-extrabold text-slate-800 dark:text-white flex items-center gap-1.5 text-sm">
            📜 Past Commutes History
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-650 dark:hover:text-slate-350 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto space-y-5 pr-1 text-xs">
          {/* Cumulative Stats Card */}
          <div className="grid grid-cols-2 gap-3 bg-gradient-to-tr from-brand-green-50 to-brand-green-100/50 dark:from-brand-green-950/10 dark:to-brand-green-950/20 p-4 rounded-2xl border border-brand-green-500/10">
            <div>
              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Total Commutes</p>
              <p className="text-base font-black text-slate-800 dark:text-white mt-0.5">{totalCommutes}</p>
            </div>
            <div>
              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Carbon Offsets</p>
              <p className="text-base font-black text-brand-green-600 dark:text-brand-green-400 mt-0.5 flex items-center gap-1">
                <Leaf className="h-3.5 w-3.5" />
                {totalCarbonSaved.toFixed(1)} kg
              </p>
            </div>
            <div className="mt-1">
              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">ESG Credits Earned</p>
              <p className="text-base font-black text-brand-blue-600 dark:text-brand-blue-400 mt-0.5 flex items-center gap-1">
                <Award className="h-3.5 w-3.5" />
                +{totalCreditsEarned}
              </p>
            </div>
            <div className="mt-1">
              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Total Distance</p>
              <p className="text-base font-black text-slate-700 dark:text-slate-300 mt-0.5">
                {totalDistance.toFixed(1)} km
              </p>
            </div>
          </div>

          {/* Past Ride Entries */}
          <div className="space-y-3">
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Completed Commutes</h4>
            {pastRides.length === 0 ? (
              <div className="text-center py-8 text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-slate-100 dark:border-slate-900 p-4">
                No past completed commutes logged yet. Go to your active commute schedule to start and complete rides.
              </div>
            ) : (
              pastRides.map((ride) => {
                const isHost = ride.hostId === currentUser.id;
                const isCancelled = ride.status === "Cancelled";
                const rideDateFormatted = ride.rideDate
                  ? new Date(ride.rideDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                  : "Aug 10, 2026";
                
                const rideCredits = isCancelled ? 0 : (isHost
                  ? ride.esgCredits + (ride.passengers.length * 15)
                  : Math.round((ride.esgCredits + (ride.passengers.length * 15)) * 0.5));

                const rideCarbon = isCancelled ? 0 : (isHost
                  ? (ride.co2Saved * (ride.passengers.length || 1))
                  : ride.co2Saved);

                const isExpanded = expandedRideId === ride.id;

                return (
                  <div
                    key={ride.id}
                    className={`glass-panel rounded-2xl border transition-all cursor-pointer overflow-hidden ${
                      isExpanded
                        ? "border-brand-green-500/40 bg-white dark:bg-slate-900 shadow-md"
                        : "border-slate-150 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/40 hover:bg-white dark:hover:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700"
                    }`}
                  >
                    {/* Default Clean Summary Row (Destination, Time, Date, Credits) */}
                    <div
                      onClick={() => setExpandedRideId(isExpanded ? null : ride.id)}
                      className="p-3.5 flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-base flex-shrink-0 p-2 rounded-xl bg-brand-green-50 dark:bg-brand-green-950/40 text-brand-green-600 dark:text-brand-green-400 font-bold">
                          {ride.vehicleType === "Electric" ? "⚡" : ride.vehicleType === "Hybrid" ? "🍃" : "🚗"}
                        </span>
                        <div className="min-w-0">
                          <h4 className="font-extrabold text-slate-850 dark:text-white text-xs truncate">
                            {ride.destination}
                          </h4>
                          <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-500 dark:text-slate-400 font-medium flex-wrap">
                            <span>📅 {rideDateFormatted}</span>
                            <span>•</span>
                            <span>⏰ {ride.departureTime}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        <div className="text-right">
                          <span className="text-xs font-black text-brand-blue-600 dark:text-brand-blue-400 block">
                            {isCancelled ? "0 Credits" : `+${rideCredits} Credits`}
                          </span>
                          {isCancelled && (
                            <span className="block text-[8px] font-black text-rose-500 uppercase">
                              Cancelled
                            </span>
                          )}
                        </div>
                        <div className="p-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-400">
                          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </div>
                      </div>
                    </div>

                    {/* Expanded Details Panel */}
                    {isExpanded && (
                      <div className="px-4 pb-4 pt-2 border-t border-slate-100 dark:border-slate-800/80 space-y-3.5 animate-fade-in text-left text-xs bg-slate-50/50 dark:bg-slate-950/30">
                        {/* Role & Status Badges */}
                        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[9px] font-extrabold border ${
                            isHost
                              ? "bg-brand-green-500/10 text-brand-green-600 dark:text-brand-green-400 border-brand-green-500/20"
                              : "bg-brand-blue-500/10 text-brand-blue-600 dark:text-brand-blue-400 border-brand-blue-500/20"
                          }`}>
                            {isHost ? "🚗 Colleague Host" : "👥 Co-Passenger"}
                          </span>
                          {isCancelled && (
                            <span className="inline-flex items-center rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 px-2 py-0.5 text-[9px] font-extrabold">
                              ⚠️ Trip Cancelled
                            </span>
                          )}
                        </div>

                        {/* Full Pickup & Drop Addresses */}
                        <div className="space-y-1.5 p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800">
                          <div className="flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full bg-brand-green-500 flex-shrink-0" />
                            <span className="text-[10px] text-slate-500 font-semibold uppercase">Pickup:</span>
                            <span className="text-xs font-bold text-slate-800 dark:text-white truncate">{ride.pickup}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full bg-brand-blue-500 flex-shrink-0" />
                            <span className="text-[10px] text-slate-500 font-semibold uppercase">Drop-off:</span>
                            <span className="text-xs font-bold text-slate-800 dark:text-white truncate">{ride.destination}</span>
                          </div>
                        </div>

                        {/* Detailed Metrics Grid */}
                        <div className="grid grid-cols-4 gap-1.5 py-2 border-y border-slate-100 dark:border-slate-800 text-center">
                          <div>
                            <p className="text-[8px] font-bold text-slate-400 uppercase">Driven Dist.</p>
                            <p className="text-xs font-extrabold text-slate-800 dark:text-slate-200 mt-0.5">
                              {(ride.actualDrivenKm && ride.actualDrivenKm > 0 ? ride.actualDrivenKm : (ride.co2Saved ? Number((ride.co2Saved / 0.17).toFixed(1)) : 0)).toFixed(1)} km
                            </p>
                          </div>
                          <div>
                            <p className="text-[8px] font-bold text-slate-400 uppercase">Credits Earned</p>
                            <p className="text-xs font-extrabold text-brand-blue-600 dark:text-brand-blue-400 mt-0.5">
                              {isCancelled ? "0" : `+${rideCredits}`}
                            </p>
                          </div>
                          <div>
                            <p className="text-[8px] font-bold text-slate-400 uppercase">CO₂ Offset</p>
                            <p className="text-xs font-extrabold text-brand-green-600 dark:text-brand-green-400 mt-0.5">
                              {rideCarbon.toFixed(1)} kg
                            </p>
                          </div>
                          <div>
                            <p className="text-[8px] font-bold text-slate-400 uppercase">Vehicle</p>
                            <p className="text-[10px] font-bold text-slate-700 dark:text-slate-300 mt-0.5 truncate">
                              {ride.vehicleModel || "Standard Auto"}
                            </p>
                          </div>
                        </div>

                        {/* Commute Crew */}
                        <div className="space-y-1.5">
                          <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">Commute Crew</p>
                          <div className="flex flex-wrap items-center gap-1.5">
                            {/* Host */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleColleagueClick(ride.hostId);
                              }}
                              className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-lg border transition-colors cursor-pointer ${
                                ride.hostId === currentUser.id
                                  ? "bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800"
                                  : "bg-brand-green-500/10 text-brand-green-700 border-brand-green-500/20 hover:bg-brand-green-500/20"
                              }`}
                            >
                              🚗 {ride.hostId === currentUser.id ? "Me (Host)" : `${ride.hostName} (Host)`}
                            </button>
                            
                            {/* Passengers */}
                            {ride.passengers.map((pId) => {
                              const passengerEmp = employees.find((e) => e.id === pId);
                              if (!passengerEmp) return null;
                              return (
                                <button
                                  key={pId}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleColleagueClick(pId);
                                  }}
                                  className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-lg border transition-colors cursor-pointer ${
                                    pId === currentUser.id
                                      ? "bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800"
                                      : "bg-brand-blue-500/10 text-brand-blue-700 border-brand-blue-500/20 hover:bg-brand-blue-500/20"
                                  }`}
                                >
                                  👤 {pId === currentUser.id ? "Me" : passengerEmp.name}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="pt-2 border-t flex-shrink-0">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-850 dark:bg-slate-800 dark:hover:bg-slate-750 text-white text-xs font-bold cursor-pointer transition-all shadow-md text-center"
          >
            Done
          </button>
        </div>
      </div>

      {/* Colleague Profile Popover Overlay */}
      {selectedColleague && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-55 flex items-center justify-center p-4 animate-fade-in">
          <div className="w-full max-w-xs bg-white dark:bg-slate-950 rounded-3xl border border-slate-150 dark:border-slate-800 p-5 shadow-2xl space-y-4 text-center relative animate-scale-up">
            <button
              onClick={() => setSelectedColleague(null)}
              className="absolute top-3 right-3 p-1 rounded-lg text-slate-400 hover:text-slate-650 dark:hover:text-slate-350 cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Avatar & Info */}
            <div className="space-y-1.5 mt-2 text-xs">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-green-100 text-2xl dark:bg-brand-green-950/40 mx-auto">
                {selectedColleague.avatar}
              </span>
              <h4 className="text-sm font-black text-slate-800 dark:text-white">{selectedColleague.name}</h4>
              <p className="text-[9px] uppercase font-bold text-brand-green-600 dark:text-brand-green-400 tracking-wider">
                {selectedColleague.designation}
              </p>
            </div>

            {/* Profile Grid */}
            <div className="space-y-2 text-left bg-slate-50 dark:bg-slate-900/60 p-3 rounded-2xl border border-slate-100 dark:border-slate-900/50 text-[10px]">
              <div className="flex items-center gap-2 text-slate-650 dark:text-slate-350">
                <Briefcase className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                <span className="truncate">{selectedColleague.department} Department</span>
              </div>
              <div className="flex items-center gap-2 text-slate-650 dark:text-slate-350">
                <Mail className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                <span className="truncate select-text">{selectedColleague.email}</span>
              </div>
            </div>

            {/* ESG Stats */}
            <div className="grid grid-cols-2 gap-2 text-center text-xs">
              <div className="p-2 bg-brand-green-500/5 rounded-xl border border-brand-green-500/10">
                <p className="text-[8px] font-bold text-slate-400 uppercase">CO₂ Offsets</p>
                <p className="text-xs font-black text-brand-green-600 mt-0.5">{selectedColleague.carbonSaved.toFixed(1)} kg</p>
              </div>
              <div className="p-2 bg-brand-blue-500/5 rounded-xl border border-brand-blue-500/10">
                <p className="text-[8px] font-bold text-slate-400 uppercase">ESG Credits</p>
                <p className="text-xs font-black text-brand-blue-600 mt-0.5">{selectedColleague.credits}</p>
              </div>
            </div>
            
            <button
              onClick={() => setSelectedColleague(null)}
              className="w-full py-2 rounded-xl bg-slate-900 hover:bg-slate-850 dark:bg-slate-800 dark:hover:bg-slate-750 text-white text-xs font-bold cursor-pointer transition-all shadow-md text-center"
            >
              Close Profile
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

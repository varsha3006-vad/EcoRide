"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useAppState } from "@/context/StateContext";
import Navbar from "@/components/Navbar";
import InteractiveMap from "@/components/InteractiveMap";
import AddressAutocomplete from "@/components/AddressAutocomplete";
import ChatModal from "@/components/ChatModal";
import PastRidesModal from "@/components/PastRidesModal";
import {
  Car,
  Search,
  Plus,
  Users,
  Compass,
  TrendingUp,
  Award,
  ChevronRight,
  MapPin,
  Clock,
  Filter,
  Check,
  X,
  Send,
  Download,
  AlertTriangle,
  Calendar,
  Building,
  UserCheck,
  ToggleLeft,
  Sparkles,
  ArrowRightLeft,
  ChevronLeft,
  Heart,
  Leaf,
  Shield,
  ChevronDown,
  ArrowLeft,
  Map,
  Zap,
  Navigation
} from "lucide-react";

const generate15MinTimeOptions = () => {
  const options = [];
  const periods = ["AM", "PM"];
  for (let p = 0; p < 2; p++) {
    const period = periods[p];
    for (let h = 0; h < 12; h++) {
      const displayHour = h === 0 ? 12 : h;
      const formattedHour = String(displayHour).padStart(2, '0');
      for (let m = 0; m < 60; m += 15) {
        const formattedMin = String(m).padStart(2, '0');
        options.push(`${formattedHour}:${formattedMin} ${period}`);
      }
    }
  }
  return options;
};

const TIME_OPTIONS = generate15MinTimeOptions();

const getLocalDateString = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function HomePage() {
  const {
    currentUser,
    role,
    rides,
    requests,
    badges,
    leaderboard,
    createRide,
    requestJoinRide,
    handleRequestResponse,
    sendMessage,
    startRide,
    completeRide,
    cancelRide,
    adminDeleteRide,
    adminDeactivateEmployee,
    isLoggedIn,
    login,
    updateNotificationPrefs,
    confirmBoarding
  } = useAppState();

  // Helper to filter time options dynamically for future times only when scheduling for today
  const getFilteredTimeOptions = (selectedDateStr: string) => {
    const todayStr = getLocalDateString();
    const isToday = !selectedDateStr || selectedDateStr === todayStr;

    if (!isToday) return TIME_OPTIONS;

    const now = new Date();
    const currentHours = now.getHours();
    const currentMinutes = now.getMinutes();

    return TIME_OPTIONS.filter((timeStr) => {
      const [time, modifier] = timeStr.split(" ");
      let [hours, minutes] = time.split(":").map(Number);

      if (modifier === "PM" && hours < 12) hours += 12;
      if (modifier === "AM" && hours === 12) hours = 0;

      if (hours > currentHours) return true;
      if (hours === currentHours && minutes > currentMinutes) return true;
      return false;
    });
  };

  const hasActiveHostedRide = rides.some(r => r.hostId === currentUser?.id && (r.status === "Published" || r.status === "Started"));

  // Onboarding Login form states
  const [emailInput, setEmailInput] = useState("");
  const [loginError, setLoginError] = useState("");

  // Hydrate last logged in email on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const lastEmail = localStorage.getItem("ecoride_last_email");
      if (lastEmail) {
        setEmailInput(lastEmail);
      }
    }
  }, []);
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState("");

  // Wizard state: null | "host" | "join"
  const [activeWizard, setActiveWizard] = useState<null | "host" | "join">(null);
  const [activeChatRideId, setActiveChatRideId] = useState<string | null>(null);

  // Search filter states
  const [searchPickup, setSearchPickup] = useState("");
  const [searchDest, setSearchDest] = useState("");
  const [filterDept, setFilterDept] = useState("All");
  const [filterVehicle, setFilterVehicle] = useState("All");

  // Host ride form states
  const [pickup, setPickup] = useState("");
  const [dest, setDest] = useState("");
  const [time, setTime] = useState("");
  const [rideDate, setRideDate] = useState(getLocalDateString());
  const [capacity, setCapacity] = useState(3);
  const [vehicleType, setVehicleType] = useState<"Electric" | "Hybrid" | "ICE (Gasoline)">("Electric");
  const [recurring, setRecurring] = useState(false);
  const [radius, setRadius] = useState(3);
  const [music, setMusic] = useState("Acoustic / Soft");
  const [smoking, setSmoking] = useState("No Smoking");
  const [luggage, setLuggage] = useState(true);
  const [womenOnly, setWomenOnly] = useState(false);
  const [notes, setNotes] = useState("");
  const [formError, setFormError] = useState("");
  const [confirmingBoardingId, setConfirmingBoardingId] = useState<string | null>(null);

  const handleConfirmBoardingClick = (rideId: string) => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser. Boarding verification requires location services.");
      return;
    }

    setConfirmingBoardingId(rideId);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude: lat, longitude: lng } = position.coords;
        const res = confirmBoarding(rideId, currentUser.id, lat, lng);
        if (!res.success) {
          alert(res.message);
        }
        setConfirmingBoardingId(null);
      },
      (error) => {
        console.error("Boarding location error:", error);
        alert(`Could not verify your location: ${error.message || "Unknown error"}. Please ensure GPS location services are enabled.`);
        setConfirmingBoardingId(null);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  // Reset form error when switching wizards
  useEffect(() => {
    setFormError("");
  }, [activeWizard]);

  // Admin filter states
  const [adminActiveTab, setAdminActiveTab] = useState<"kpis" | "rides" | "employees">("kpis");
  const [announcementText, setAnnouncementText] = useState("");
  const [announcementSent, setAnnouncementSent] = useState(false);

  // Join ride custom pickup & vicinity verification states
  const [joiningRide, setJoiningRide] = useState<any | null>(null);
  const [passengerPickupInput, setPassengerPickupInput] = useState("");
  const [vicinityError, setVicinityError] = useState("");
  const [verifyingVicinity, setVerifyingVicinity] = useState(false);
  const [reviewingRequest, setReviewingRequest] = useState<any | null>(null);
  const [mapViewPreferences, setMapViewPreferences] = useState<Record<string, "embedded" | "native">>({});

  // PWA installation states
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(true);
  const [showInstallGuide, setShowInstallGuide] = useState(false);

  // Notification Preferences states
  const [showPreferencesModal, setShowPreferencesModal] = useState(false);
  const [isPushEnabled, setIsPushEnabled] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsPushEnabled(
        "Notification" in window &&
        Notification.permission === "granted" &&
        localStorage.getItem("ecoride_push_enabled") === "true"
      );
    }
  }, [showPreferencesModal]);

  // Past Commutes states
  const [showPastRidesModal, setShowPastRidesModal] = useState(false);

  useEffect(() => {
    const handleOpen = () => setShowPastRidesModal(true);
    window.addEventListener("open-past-rides", handleOpen);
    return () => window.removeEventListener("open-past-rides", handleOpen);
  }, []);

  useEffect(() => {
    const handleOpen = () => setShowPreferencesModal(true);
    window.addEventListener("open-notification-preferences", handleOpen);
    return () => window.removeEventListener("open-notification-preferences", handleOpen);
  }, []);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallBanner(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`User response to install: ${outcome}`);
      setDeferredPrompt(null);
      setShowInstallBanner(false);
    } else {
      setShowInstallGuide(true);
    }
  };

  const handleJoinSubmit = () => {
    if (!joiningRide || !passengerPickupInput) return;
    setVerifyingVicinity(true);
    setVicinityError("");

    const google = (window as any).google;
    if (!google || !google.maps) {
      requestJoinRide(joiningRide.id, passengerPickupInput);
      setJoiningRide(null);
      setPassengerPickupInput("");
      setVerifyingVicinity(false);
      return;
    }

    const geocoder = new google.maps.Geocoder();

    geocoder.geocode({ address: passengerPickupInput }, (passengerRes: any, passengerStatus: any) => {
      if (passengerStatus !== "OK" || !passengerRes[0]) {
        setVicinityError("Could not resolve your pickup address. Try another location.");
        setVerifyingVicinity(false);
        return;
      }

      const passengerLatLng = passengerRes[0].geometry.location;

      geocoder.geocode({ address: joiningRide.pickup }, (hostPickupRes: any, hostPickupStatus: any) => {
        if (hostPickupStatus !== "OK" || !hostPickupRes[0]) {
          requestJoinRide(joiningRide.id, passengerPickupInput);
          setJoiningRide(null);
          setPassengerPickupInput("");
          setVerifyingVicinity(false);
          return;
        }

        const hostPickupLatLng = hostPickupRes[0].geometry.location;

        geocoder.geocode({ address: joiningRide.destination }, (hostDestRes: any, hostDestStatus: any) => {
          if (hostDestStatus !== "OK" || !hostDestRes[0]) {
            requestJoinRide(joiningRide.id, passengerPickupInput);
            setJoiningRide(null);
            setPassengerPickupInput("");
            setVerifyingVicinity(false);
            return;
          }

          const hostDestLatLng = hostDestRes[0].geometry.location;

          const pDistance = (x: number, y: number, x1: number, y1: number, x2: number, y2: number) => {
            const A = x - x1;
            const B = y - y1;
            const C = x2 - x1;
            const D = y2 - y1;

            const dot = A * C + B * D;
            const len_sq = C * C + D * D;
            let param = -1;
            if (len_sq !== 0) param = dot / len_sq;

            let xx, yy;
            if (param < 0) {
              xx = x1;
              yy = y1;
            } else if (param > 1) {
              xx = x2;
              yy = y2;
            } else {
              xx = x1 + param * C;
              yy = y1 + param * D;
            }

            const dx = x - xx;
            const dy = y - yy;
            
            const dy_km = dy * 111.1;
            const dx_km = dx * 111.1 * Math.cos(xx * Math.PI / 180);
            
            return Math.sqrt(dx_km * dx_km + dy_km * dy_km);
          };

          const distanceKm = pDistance(
            passengerLatLng.lat(), passengerLatLng.lng(),
            hostPickupLatLng.lat(), hostPickupLatLng.lng(),
            hostDestLatLng.lat(), hostDestLatLng.lng()
          );

          if (distanceKm > 1.0) {
            setVicinityError(`Your pickup is ${distanceKm.toFixed(2)} km away from the driver's direct route. Max limit: 1.0 km.`);
            setVerifyingVicinity(false);
          } else {
            requestJoinRide(joiningRide.id, passengerPickupInput, passengerLatLng.lat(), passengerLatLng.lng());
            setJoiningRide(null);
            setPassengerPickupInput("");
            setVerifyingVicinity(false);
          }
        });
      });
    });
  };

  // ESG Calculation helpers for hosting form
  const mockDistance = pickup && dest ? Math.min(45, Math.max(8, (pickup.length + dest.length) * 0.8)) : 18;
  const co2SavedEstimate = Number(
    ((mockDistance * 0.17 * capacity) - (mockDistance * 0.05)).toFixed(1)
  );
  const creditEstimate = Math.round(
    mockDistance * 1.5 + (vehicleType === "Electric" ? 25 : vehicleType === "Hybrid" ? 15 : 0) + (recurring ? 10 : 0)
  );

  const handleHostSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pickup || !dest || !time) return;

    // Validate that the departure time is in the future
    const parseDepartureDateTime = (dateStr: string, timeStr: string): Date => {
      const [timePart, ampm] = timeStr.split(" ");
      let [hours, minutes] = timePart.split(":").map(Number);
      if (ampm === "PM" && hours < 12) {
        hours += 12;
      } else if (ampm === "AM" && hours === 12) {
        hours = 0;
      }
      const [year, month, day] = dateStr.split("-").map(Number);
      return new Date(year, month - 1, day, hours, minutes, 0, 0);
    };

    const selectedDateTime = parseDepartureDateTime(rideDate, time);
    const now = new Date();

    if (selectedDateTime < now) {
      setFormError("Departure time cannot be in the past. Please choose a future date and time.");
      return;
    }

    setFormError("");

    createRide({
      pickup,
      destination: dest,
      departureTime: time,
      rideDate,
      vehicleModel: currentUser.vehicle?.model || "Tesla Model Y",
      vehiclePlate: currentUser.vehicle?.plateNumber || "CA-990EV",
      vehicleType: vehicleType,
      seatsAvailable: capacity,
      seatsTotal: capacity,
      recurring,
      detourRadius: radius,
      co2Saved: co2SavedEstimate,
      esgCredits: creditEstimate,
      musicPref: music,
      smokingPref: smoking,
      luggageAllowed: luggage,
      womenOnly: womenOnly
    });

    // Reset Form & Close Wizard
    setPickup("");
    setDest("");
    setTime("");
    setWomenOnly(false);
    setActiveWizard(null);
  };

  const handleCsvExport = (reportName: string) => {
    const data = [
      ["Report", reportName],
      ["Generated At", new Date().toLocaleString()],
      ["Scope", "Enterprise Corporate Fleet"],
      ["Total Active Users", "4290"],
      ["Carbon Reduction Target Met", "74%"],
      ["Total CO₂ Saved (kg)", (currentUser.carbonSaved + 14280).toFixed(1)],
      ["Trees Planted Equivalent", Math.round((currentUser.carbonSaved + 14280) / 22).toString()],
      ["Total Cost Savings ($)", ((currentUser.carbonSaved + 14280) * 0.65).toFixed(2)]
    ];
    
    const csvContent = "data:text/csv;charset=utf-8," 
      + data.map(e => e.map(val => `"${val}"`).join(",")).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${reportName.toLowerCase().replace(/ /g, "_")}_report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const myCreatedRides = rides.filter(r => r.hostId === currentUser.id);
  const myJoinedRides = rides.filter(r => r.passengers.includes(currentUser.id));
  const myUpcomingTrips = [...myCreatedRides, ...myJoinedRides].filter(r => r.status?.toLowerCase() !== "completed" && r.status?.toLowerCase() !== "cancelled");

  // Search/Filter rides list
  const filteredRides = rides.filter(r => {
    if (r.hostId === currentUser.id) return false; // Hide own rides
    const isJoinable = r.status === "Published" || (r.status === "Started" && r.seatsAvailable > 0);
    if (!isJoinable) return false;
    if (searchPickup && !r.pickup.toLowerCase().includes(searchPickup.toLowerCase())) return false;
    if (searchDest && !r.destination.toLowerCase().includes(searchDest.toLowerCase())) return false;
    if (filterDept !== "All" && r.hostDept !== filterDept) return false;
    if (filterVehicle !== "All" && r.vehicleType !== filterVehicle) return false;
    return true;
  });

  // Find pending requests on the user's hosted rides
  const pendingRequestsForMe = requests.filter(req => {
    const ride = rides.find(r => r.id === req.rideId);
    return ride && ride.hostId === currentUser.id && req.status === "Pending";
  });

  if (!isLoggedIn) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-screen bg-slate-950 px-4 select-none relative overflow-hidden">
        {/* Dynamic decorative backdrop grids */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-30 z-0"></div>
        <div className="absolute top-[-10%] left-[-10%] h-[500px] w-[500px] rounded-full bg-brand-green-500/10 blur-[120px] z-0"></div>
        <div className="absolute bottom-[-10%] right-[-10%] h-[500px] w-[500px] rounded-full bg-brand-blue-500/10 blur-[120px] z-0"></div>

        <div className="w-full max-w-md bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 shadow-2xl relative z-10 space-y-6">
          {/* Logo */}
          <div className="flex flex-col items-center text-center space-y-3.5">
            <div className="flex items-center gap-3">
              {/* L&T Corporate Logo */}
              <div className="bg-white p-1.5 rounded-xl border border-slate-800 shadow-md">
                <img 
                  src="/logo.png" 
                  alt="L&T Technology Services Logo" 
                  className="h-7 w-auto object-contain" 
                />
              </div>
              {/* Vertical divider */}
              <div className="h-6 w-[1px] bg-slate-800" />
              {/* EcoRide Leaf Logo */}
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-brand-green-600 to-brand-blue-500 shadow-md">
                <Leaf className="h-5 w-5 text-white" />
              </div>
            </div>

            <div>
              <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-1.5 justify-center">
                EcoRide <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand-green-500/10 text-brand-green-500 border border-brand-green-500/20">Enterprise</span>
              </h2>
              {/* Tagline */}
              <p className="text-xs text-brand-green-500 font-bold mt-2 italic tracking-wide max-w-[320px]">
                "Share Your Ride. Reduce Your Footprint. Build Your Community"
              </p>
              <p className="text-[10px] text-slate-500 mt-1">Smart Corporate Ride Sharing & ESG Portal</p>
            </div>
          </div>

          {/* Form */}
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Company Email Address</label>
              <input
                type="email"
                required
                value={emailInput}
                onChange={e => {
                  setEmailInput(e.target.value);
                  setLoginError("");
                }}
                placeholder="e.g. alex@company.com"
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3.5 text-sm text-white placeholder-slate-650 focus:border-brand-green-500 focus:ring-1 focus:ring-brand-green-500 outline-none transition-all"
              />
              {loginError && (
                <p className="text-xs font-semibold text-rose-400 mt-1.5 flex items-center gap-1">
                  ⚠️ {loginError}
                </p>
              )}

              {/* Quick Login Pills (Alex, Chris, Bob, Dan, Elle) */}
              <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
                <span className="text-[10px] text-slate-500 font-bold uppercase mr-1">Quick Tap:</span>
                {[
                  { name: "Alex", email: "alex@company.com" },
                  { name: "Chris", email: "chris@company.com" },
                  { name: "Bob", email: "bob@company.com" },
                  { name: "Dan", email: "dan@company.com" },
                  { name: "Elle", email: "elle@company.com" }
                ].map(p => (
                  <button
                    key={p.email}
                    type="button"
                    onClick={() => {
                      setEmailInput(p.email);
                      setLoginError("");
                    }}
                    className={`px-2 py-1 text-[10px] font-bold rounded-lg border transition-all cursor-pointer ${
                      emailInput.toLowerCase().trim() === p.email
                        ? "bg-brand-green-600 border-brand-green-500 text-white shadow-sm"
                        : "bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700"
                    }`}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            </div>

            {otpSent ? (
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Verification OTP Code</label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={otpCode}
                    onChange={e => setOtpCode(e.target.value)}
                    placeholder="Enter 6-digit code (Use 123456)"
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3.5 text-sm text-white tracking-widest text-center outline-none focus:border-brand-green-500 transition-all font-mono"
                  />
                </div>
                <button
                  onClick={() => {
                    if (otpCode === "123456" || otpCode.length === 6) {
                      const success = login(emailInput);
                      if (!success) {
                        setLoginError("Failed to authenticate domain. Contact IT Service Desk.");
                      }
                    } else {
                      setLoginError("Invalid verification code. Enter '123456' for sandbox testing.");
                    }
                  }}
                  className="w-full py-3.5 rounded-xl bg-brand-green-600 hover:bg-brand-green-700 text-white text-sm font-bold transition-all shadow-md shadow-brand-green-600/10 cursor-pointer"
                >
                  Verify & Register Profile
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <button
                  onClick={() => {
                    const success = login(emailInput);
                    if (!success) {
                      setLoginError("Rejected. Only verified domain handles (@company.com or @enterprise.org) are permitted.");
                    }
                  }}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-brand-green-600 to-brand-green-500 hover:brightness-110 text-white text-sm font-bold transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  🔒 Sign in with Azure AD / Google SSO
                </button>
                <div className="flex items-center my-3 text-slate-700">
                  <div className="flex-1 border-t border-slate-800/80"></div>
                  <span className="px-3 text-xs uppercase tracking-wider font-bold">Or</span>
                  <div className="flex-1 border-t border-slate-800/80"></div>
                </div>
                <button
                  onClick={() => {
                    const cleanEmail = emailInput.trim().toLowerCase();
                    const domain = cleanEmail.split("@")[1];
                    if (domain && ["company.com", "enterprise.org"].includes(domain)) {
                      setOtpSent(true);
                      setLoginError("");
                    } else {
                      setLoginError("Rejected. Personal handles (gmail/yahoo) are blocked from OTP verification.");
                    }
                  }}
                  className="w-full py-3.5 rounded-xl bg-slate-950 hover:bg-slate-900 border border-slate-800 text-slate-350 text-sm font-semibold transition-all cursor-pointer"
                >
                  📩 Send Email verification OTP
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Onboarding footer */}
        <div className="text-[10px] text-slate-500 font-semibold mt-6 relative z-10 text-center">
          © 2026 EcoRide. All Rights Reserved.
          <div className="mt-1">
            Developed by Mindly Consulting ·{" "}
            <Link href="/privacy" className="hover:text-brand-green-400 hover:underline transition-colors cursor-pointer">Privacy</Link> ·{" "}
            <Link href="/terms" className="hover:text-brand-green-400 hover:underline transition-colors cursor-pointer">Terms</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        
        {/* Dynamic Admin View */}
        {role === "Admin" ? (
          <div className="space-y-6 animate-slide-up">
            
            {/* Header */}
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-white flex items-center gap-2">
                  <Shield className="h-6 w-6 text-brand-blue-500" /> Executive Analytics & ESG Panel
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Analyze commuting metrics, monitor environmental impact, manage employee compliance, and configure reward structures.
                </p>
              </div>

              {/* Download Report Actions */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => handleCsvExport("Monthly_Sustainability")}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl bg-brand-green-600 hover:bg-brand-green-700 text-white transition-colors"
                >
                  <Download className="h-3.5 w-3.5" /> CSV Report
                </button>
                <button
                  onClick={() => handleCsvExport("CSR_Impact")}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl bg-brand-blue-600 hover:bg-brand-blue-700 text-white transition-colors"
                >
                  <Download className="h-3.5 w-3.5" /> CSR Report
                </button>
              </div>
            </div>

            {/* Admin Tabs */}
            <div className="flex border-b border-slate-200 dark:border-slate-800 gap-4">
              <button
                onClick={() => setAdminActiveTab("kpis")}
                className={`pb-3 text-xs font-bold transition-all relative ${
                  adminActiveTab === "kpis" ? "text-brand-blue-600 dark:text-brand-blue-400 border-b-2 border-brand-blue-500" : "text-slate-500"
                }`}
              >
                Operational KPIs
              </button>
              <button
                onClick={() => setAdminActiveTab("rides")}
                className={`pb-3 text-xs font-bold transition-all relative ${
                  adminActiveTab === "rides" ? "text-brand-blue-600 dark:text-brand-blue-400 border-b-2 border-brand-blue-500" : "text-slate-500"
                }`}
              >
                Rides Management
              </button>
              <button
                onClick={() => setAdminActiveTab("employees")}
                className={`pb-3 text-xs font-bold transition-all relative ${
                  adminActiveTab === "employees" ? "text-brand-blue-600 dark:text-brand-blue-400 border-b-2 border-brand-blue-500" : "text-slate-500"
                }`}
              >
                Employee Compliance
              </button>
            </div>

            {/* KPI Cards Panel */}
            {adminActiveTab === "kpis" && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  
                  {/* KPI 1 */}
                  <div className="glass-panel p-5 rounded-2xl">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase tracking-wider font-bold text-slate-500">Total Registered</span>
                      <Users className="h-5 w-5 text-brand-blue-500" />
                    </div>
                    <h3 className="text-2xl font-bold mt-2 text-slate-800 dark:text-white">5,142</h3>
                    <p className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1 font-semibold">
                      <span>↑ 12%</span> this month (92% active)
                    </p>
                  </div>

                  {/* KPI 2 */}
                  <div className="glass-panel p-5 rounded-2xl">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase tracking-wider font-bold text-slate-500">CO₂ Reductions</span>
                      <TrendingUp className="h-5 w-5 text-brand-green-500" />
                    </div>
                    <h3 className="text-2xl font-bold mt-2 text-slate-800 dark:text-white">
                      {(currentUser.carbonSaved + 14280.4).toFixed(1)} kg
                    </h3>
                    <p className="text-[10px] text-brand-green-600 dark:text-brand-green-400 mt-1 flex items-center gap-1 font-semibold">
                      <span>🌱 {Math.round((currentUser.carbonSaved + 14280) / 22)} trees</span> equivalent offset
                    </p>
                  </div>

                  {/* KPI 3 */}
                  <div className="glass-panel p-5 rounded-2xl">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase tracking-wider font-bold text-slate-500">Commute Match Rate</span>
                      <Compass className="h-5 w-5 text-indigo-500" />
                    </div>
                    <h3 className="text-2xl font-bold mt-2 text-slate-800 dark:text-white">82.4%</h3>
                    <p className="text-[10px] text-slate-500 mt-1">Average matches in &lt; 2 minutes</p>
                  </div>

                  {/* KPI 4 */}
                  <div className="glass-panel p-5 rounded-2xl">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase tracking-wider font-bold text-slate-500">Estimated Cost Savings</span>
                      <Award className="h-5 w-5 text-amber-500" />
                    </div>
                    <h3 className="text-2xl font-bold mt-2 text-slate-800 dark:text-white">
                      ${((currentUser.carbonSaved + 14280) * 0.65).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </h3>
                    <p className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-1 font-semibold">
                      Fuel & Parking optimization
                    </p>
                  </div>

                </div>

                {/* SVG Visualizations Grid */}
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                  
                  {/* Chart 1: Carbon reduction trends */}
                  <div className="glass-panel p-6 rounded-2xl">
                    <h3 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider mb-4 flex items-center gap-1.5">
                      <TrendingUp className="h-4 w-4 text-brand-green-500" /> Monthly CO₂ Savings (kg)
                    </h3>
                    <div className="h-48 w-full flex items-end justify-between gap-2 pt-4">
                      {/* Bar 1 */}
                      <div className="flex-1 flex flex-col items-center gap-2">
                        <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-t-lg h-24 relative overflow-hidden">
                          <div className="absolute bottom-0 w-full bg-brand-green-500 h-[65%]" />
                        </div>
                        <span className="text-[10px] font-bold text-slate-500">Mar</span>
                      </div>
                      {/* Bar 2 */}
                      <div className="flex-1 flex flex-col items-center gap-2">
                        <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-t-lg h-24 relative overflow-hidden">
                          <div className="absolute bottom-0 w-full bg-brand-green-500 h-[75%]" />
                        </div>
                        <span className="text-[10px] font-bold text-slate-500">Apr</span>
                      </div>
                      {/* Bar 3 */}
                      <div className="flex-1 flex flex-col items-center gap-2">
                        <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-t-lg h-24 relative overflow-hidden">
                          <div className="absolute bottom-0 w-full bg-brand-green-500 h-[82%]" />
                        </div>
                        <span className="text-[10px] font-bold text-slate-500">May</span>
                      </div>
                      {/* Bar 4 */}
                      <div className="flex-1 flex flex-col items-center gap-2">
                        <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-t-lg h-24 relative overflow-hidden">
                          <div className="absolute bottom-0 w-full bg-brand-green-500 h-[88%]" />
                        </div>
                        <span className="text-[10px] font-bold text-slate-500">Jun</span>
                      </div>
                      {/* Bar 5 */}
                      <div className="flex-1 flex flex-col items-center gap-2">
                        <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-t-lg h-24 relative overflow-hidden">
                          <div className="absolute bottom-0 w-full bg-brand-green-600 h-[95%]" />
                        </div>
                        <span className="text-[10px] font-bold text-slate-500">Jul</span>
                      </div>
                    </div>
                  </div>

                  {/* Chart 2: Department participation comparative */}
                  <div className="glass-panel p-6 rounded-2xl">
                    <h3 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider mb-4 flex items-center gap-1.5">
                      <Building className="h-4 w-4 text-brand-blue-500" /> Commuting Matches by Department
                    </h3>
                    <div className="space-y-3.5">
                      <div>
                        <div className="flex justify-between text-[11px] font-bold mb-1">
                          <span className="text-slate-700 dark:text-slate-300">Engineering</span>
                          <span className="text-brand-blue-600 dark:text-brand-blue-400">1,245 Carpools (88%)</span>
                        </div>
                        <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-brand-blue-500 to-brand-green-500 rounded-full" style={{ width: "88%" }} />
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-[11px] font-bold mb-1">
                          <span className="text-slate-700 dark:text-slate-300">Design & Product</span>
                          <span className="text-brand-blue-600 dark:text-brand-blue-400">894 Carpools (72%)</span>
                        </div>
                        <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-brand-blue-500 to-brand-green-500 rounded-full" style={{ width: "72%" }} />
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-[11px] font-bold mb-1">
                          <span className="text-slate-700 dark:text-slate-300">Finance & Operations</span>
                          <span className="text-brand-blue-600 dark:text-brand-blue-400">540 Carpools (54%)</span>
                        </div>
                        <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-brand-blue-500 to-brand-green-500 rounded-full" style={{ width: "54%" }} />
                        </div>
                      </div>
                    </div>
                  </div>

                </div>

                {/* Announcement Dashboard tool */}
                <div className="glass-panel p-5 rounded-2xl">
                  <h3 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider mb-2">Publish Global Announcement</h3>
                  <p className="text-[10px] text-slate-500 mb-3">Broadcast messages directly to all employees dashboard notification centers (e.g. badge boosts, holidays schedules).</p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={announcementText}
                      onChange={e => setAnnouncementText(e.target.value)}
                      placeholder="e.g. Double ESG Credits active for hybrid/electric vehicles during peak commute hours next week!"
                      className="flex-1 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-brand-blue-500"
                    />
                    <button
                      onClick={() => {
                        if (!announcementText.trim()) return;
                        setAnnouncementSent(true);
                        setTimeout(() => setAnnouncementSent(false), 3000);
                        setAnnouncementText("");
                      }}
                      className="px-4 py-2.5 rounded-xl bg-brand-blue-600 hover:bg-brand-blue-700 text-white text-xs font-bold transition-colors"
                    >
                      Broadcast
                    </button>
                  </div>
                  {announcementSent && (
                    <p className="text-[10px] text-brand-green-600 font-semibold mt-1">✓ Announcement sent successfully to 5,142 employee feeds!</p>
                  )}
                </div>
              </div>
            )}

            {/* Admin Ride Panel */}
            {adminActiveTab === "rides" && (
              <div className="glass-panel p-5 rounded-2xl space-y-4">
                <h3 className="text-sm font-bold text-slate-800 dark:text-white">Active Commuting Rides Management</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold">
                        <th className="py-2.5">Driver / Host</th>
                        <th className="py-2.5">Commute Path</th>
                        <th className="py-2.5">Capacity</th>
                        <th className="py-2.5">Vehicle Type</th>
                        <th className="py-2.5">Credits</th>
                        <th className="py-2.5 text-right">Moderation Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-900">
                      {rides.map(ride => (
                        <tr key={ride.id} className="text-slate-700 dark:text-slate-300">
                          <td className="py-3 flex items-center gap-1.5">
                            <span className="text-sm">{ride.hostAvatar}</span>
                            <div>
                              <p className="font-bold">{ride.hostName}</p>
                              <p className="text-[9px] text-slate-500">{ride.hostDept}</p>
                            </div>
                          </td>
                          <td className="py-3 font-medium">
                            {ride.pickup} → {ride.destination}
                          </td>
                          <td className="py-3 font-semibold">{ride.seatsAvailable}/{ride.seatsTotal} Seats</td>
                          <td className="py-3">
                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-semibold ${
                              ride.vehicleType === "Electric" ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-400" :
                              ride.vehicleType === "Hybrid" ? "bg-sky-100 text-sky-800 dark:bg-sky-950/20 dark:text-sky-400" : "bg-amber-100 text-amber-800 dark:bg-amber-950/20 dark:text-amber-400"
                            }`}>
                              {ride.vehicleType}
                            </span>
                          </td>
                          <td className="py-3 font-bold text-slate-800 dark:text-slate-200">{ride.esgCredits} pts</td>
                          <td className="py-3 text-right">
                            <button
                              onClick={() => adminDeleteRide(ride.id)}
                              className="px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 dark:bg-rose-950/20 dark:text-rose-400 text-[10px] font-bold transition-all"
                            >
                              Delete Ride
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Admin Employee panel */}
            {adminActiveTab === "employees" && (
              <div className="glass-panel p-5 rounded-2xl space-y-4">
                <h3 className="text-sm font-bold text-slate-800 dark:text-white">Employee Compliance Directory</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold">
                        <th className="py-2.5">Employee</th>
                        <th className="py-2.5">Department</th>
                        <th className="py-2.5">Office</th>
                        <th className="py-2.5">Credits Earned</th>
                        <th className="py-2.5">Carbon Saved</th>
                        <th className="py-2.5 text-right">Access Controls</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-900">
                      {leaderboard.map(emp => (
                        <tr key={emp.id} className="text-slate-700 dark:text-slate-300">
                          <td className="py-3 flex items-center gap-1.5">
                            <span className="text-sm">{emp.avatar}</span>
                            <div>
                              <p className="font-bold">{emp.name}</p>
                              <p className="text-[9px] text-slate-500">{emp.email}</p>
                            </div>
                          </td>
                          <td className="py-3 font-semibold">{emp.department}</td>
                          <td className="py-3">{emp.office}</td>
                          <td className="py-3 font-bold text-brand-green-600">{emp.credits} pts</td>
                          <td className="py-3 font-semibold">{emp.carbonSaved} kg</td>
                          <td className="py-3 text-right">
                            <button
                              onClick={() => adminDeactivateEmployee(emp.id)}
                              className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 text-[10px] font-bold transition-all"
                            >
                              Deactivate
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

          </div>
        ) : (
          
          /* Dynamic Employee View - Mobile First & Minimal */
          <div className="space-y-6 animate-slide-up">
            
            {activeWizard !== null ? (
              /* Wizard Screen (rendered as a separate clean page) */
              <div className="w-full max-w-2xl mx-auto space-y-6">
                
                {/* Back button to return to minimal dashboard */}
                <button
                  onClick={() => setActiveWizard(null)}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-700 dark:hover:text-white transition-colors cursor-pointer"
                >
                  <ArrowLeft className="h-4 w-4" /> Back to Dashboard
                </button>

                {activeWizard === "host" && (
                  <div className="glass-panel p-6 rounded-3xl border-2 border-brand-green-500/20 bg-white dark:bg-slate-950 animate-slide-up space-y-4 shadow-xl">
                    <div className="flex items-center justify-between border-b pb-3">
                      <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-1.5 text-sm sm:text-base">
                        <Plus className="h-5 w-5 text-brand-green-600" /> Host an Employee Commute Ride
                      </h3>
                    </div>

                    <form onSubmit={handleHostSubmit} className="space-y-4">
                      {/* Map Route preview inside wizard */}
                      <InteractiveMap key="offer-map" pickup={pickup} destination={dest} onLocationDetected={setPickup} />

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 relative z-30">
                        <div>
                          <AddressAutocomplete
                            value={pickup}
                            onChange={setPickup}
                            placeholder="Type pickup point..."
                            label="Pickup Point"
                            required
                          />
                        </div>
                        <div>
                          <AddressAutocomplete
                            value={dest}
                            onChange={setDest}
                            placeholder="Type destination location..."
                            label="Destination Office"
                            required
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Ride Date <span className="text-rose-500">*</span></label>
                          <input
                            type="date"
                            required
                            min={getLocalDateString()}
                            value={rideDate}
                            onChange={e => setRideDate(e.target.value)}
                            className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-xs focus:ring-1 focus:ring-brand-green-500 outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Departure Time <span className="text-rose-500">*</span></label>
                          <select
                            required
                            value={time}
                            onChange={e => setTime(e.target.value)}
                            className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-xs focus:ring-1 focus:ring-brand-green-500 outline-none"
                          >
                            <option value="">Select departure...</option>
                            {getFilteredTimeOptions(rideDate).length === 0 ? (
                              <option disabled value="">No future times today. Select a future date.</option>
                            ) : (
                              getFilteredTimeOptions(rideDate).map(t => (
                                <option key={t} value={t}>{t}</option>
                              ))
                            )}
                          </select>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Available Seats</label>
                          <input
                            type="number"
                            min="1"
                            max="6"
                            value={capacity}
                            onChange={e => setCapacity(Number(e.target.value))}
                            className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3.5 py-2 text-xs focus:ring-1 focus:ring-brand-green-500 outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Vehicle Propulsion</label>
                          <select
                            value={vehicleType}
                            onChange={e => setVehicleType(e.target.value as any)}
                            className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3.5 py-2 text-xs focus:ring-1 focus:ring-brand-green-500 outline-none"
                          >
                            <option value="Electric">Electric Vehicle (EV Bonus)</option>
                            <option value="Hybrid">Hybrid Vehicle</option>
                            <option value="ICE (Gasoline)">Gasoline / ICE</option>
                          </select>
                        </div>
                      </div>

                      {formError && (
                        <p className="text-[10px] font-bold text-rose-500 bg-rose-50 dark:bg-rose-950/20 border border-rose-200/30 px-3.5 py-2.5 rounded-2xl text-center">
                          ⚠️ {formError}
                        </p>
                      )}

                      <div className="flex justify-end gap-2 border-t pt-3">
                        <button
                          type="button"
                          onClick={() => setActiveWizard(null)}
                          className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="px-4 py-2 rounded-xl bg-brand-green-600 hover:bg-brand-green-700 text-white text-xs font-bold cursor-pointer"
                        >
                          Publish Ride
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {activeWizard === "join" && (
                  <div className="glass-panel p-6 rounded-3xl border-2 border-brand-blue-500/20 bg-white dark:bg-slate-950 animate-slide-up space-y-4 shadow-xl">
                    <div className="flex items-center justify-between border-b pb-3">
                      <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-1.5 text-sm sm:text-base">
                        <Search className="h-5 w-5 text-brand-blue-600" /> Search &amp; Join Colleague's Ride
                      </h3>
                    </div>

                    {/* Filter fields */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <input
                        type="text"
                        value={searchPickup}
                        onChange={e => setSearchPickup(e.target.value)}
                        placeholder="Pickup keyword..."
                        className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-xs outline-none focus:border-brand-blue-500"
                      />
                      <input
                        type="text"
                        value={searchDest}
                        onChange={e => setSearchDest(e.target.value)}
                        placeholder="Destination keyword..."
                        className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-xs outline-none focus:border-brand-blue-500"
                      />
                      <select
                        value={filterDept}
                        onChange={e => setFilterDept(e.target.value)}
                        className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-xs outline-none focus:border-brand-blue-500"
                      >
                        <option value="All">All Departments</option>
                        <option value="Engineering">Engineering</option>
                        <option value="Human Resources">Human Resources</option>
                        <option value="Finance">Finance</option>
                        <option value="Operations">Operations</option>
                        <option value="Design">Design</option>
                      </select>
                      <select
                        value={filterVehicle}
                        onChange={e => setFilterVehicle(e.target.value)}
                        className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-xs outline-none focus:border-brand-blue-500"
                      >
                        <option value="All">All Vehicles</option>
                        <option value="Electric">Electric</option>
                        <option value="Hybrid">Hybrid</option>
                        <option value="ICE (Gasoline)">Gasoline</option>
                      </select>
                    </div>

                    {/* Ride search results */}
                    <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
                      {filteredRides.length === 0 ? (
                        <div className="py-12 text-center text-xs text-slate-400">
                          No rides matching search filters. Try updating your criteria.
                        </div>
                      ) : (
                        filteredRides.map(ride => {
                          const myRequest = requests.find(req => req.rideId === ride.id && req.requesterId === currentUser.id);
                          return (
                            <div key={ride.id} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/50 dark:border-slate-800/40 flex items-center justify-between gap-4 animate-fade-in">
                              <div className="flex items-center gap-3">
                                <span className="text-2xl">{ride.hostAvatar}</span>
                                <div>
                                  <h4 className="text-xs font-bold text-slate-800 dark:text-white flex items-center gap-1">
                                    {ride.hostName} <span className="text-[9px] text-slate-500 font-normal">({ride.hostDept})</span>
                                  </h4>
                                  <p className="text-[10px] text-slate-500 font-semibold">{ride.pickup} → {ride.destination}</p>
                                  <div className="flex items-center gap-2 mt-1">
                                    {ride.status === "Started" ? (
                                      <span className="text-[9px] bg-rose-500 text-white dark:bg-rose-600 px-1.5 py-0.5 rounded font-bold animate-pulse flex items-center gap-1">
                                        <span className="h-1.5 w-1.5 rounded-full bg-white block animate-ping"></span>
                                        ⚡ Live Ongoing
                                      </span>
                                    ) : (
                                      <span className="text-[9px] bg-white dark:bg-slate-800 border px-1.5 py-0.5 rounded text-slate-600 dark:text-slate-300 font-medium">
                                        ⏱️ {ride.departureTime}
                                      </span>
                                    )}
                                    <span className="text-[9px] bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400 px-1.5 py-0.5 rounded font-medium">
                                      🌱 {ride.co2Saved} kg CO₂ saved
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <div className="text-right">
                                <span className="text-[10px] font-bold text-slate-600 block mb-1.5">{ride.seatsAvailable} seats left</span>
                                {myRequest ? (
                                  myRequest.status === "Pending" ? (
                                    <span className="inline-block text-[10px] font-bold px-2.5 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/20 text-amber-600 border border-amber-200/30">
                                      Requested
                                    </span>
                                  ) : myRequest.status === "Accepted" ? (
                                    <span className="inline-block text-[10px] font-bold px-2.5 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 border border-emerald-200/30">
                                      Confirmed
                                    </span>
                                  ) : (
                                    <button
                                      onClick={() => setJoiningRide(ride)}
                                      className="px-2.5 py-1.5 rounded-lg bg-brand-blue-600 hover:bg-brand-blue-700 text-white text-[10px] font-bold transition-all cursor-pointer"
                                    >
                                      Join Ride
                                    </button>
                                  )
                                ) : (
                                  <button
                                    onClick={() => setJoiningRide(ride)}
                                    className="px-2.5 py-1.5 rounded-lg bg-brand-blue-600 hover:bg-brand-blue-700 text-white text-[10px] font-bold transition-all cursor-pointer"
                                  >
                                    Join Ride
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}

              </div>
            ) : (
              /* Minimal main mobile-friendly view */
              <div className="max-w-2xl mx-auto space-y-6">
                
                {/* Clean Header / Title for Mobile */}
                <div className="text-center py-2 space-y-1">
                  {currentUser && (
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                      Welcome, <span className="font-extrabold text-brand-green-600 dark:text-brand-green-400">{currentUser.name}</span>
                    </p>
                  )}
                  <h2 className="text-xl font-extrabold tracking-tight text-slate-800 dark:text-white flex items-center justify-center gap-1.5">
                    🚗 Choose Your Commute
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Host colleague carpools or search available routes.
                  </p>
                </div>

                {/* PWA Install Banner */}
                {showInstallBanner && (
                  <div className="glass-panel p-4 rounded-2xl border border-brand-green-500/20 bg-brand-green-500/5 dark:bg-brand-green-950/10 flex items-center justify-between gap-3 text-left animate-slide-up shadow-sm">
                    <div className="flex items-start gap-2.5 min-w-0">
                      <span className="text-lg p-2 rounded-xl bg-brand-green-500/10 text-brand-green-600 dark:text-brand-green-400 mt-0.5 flex-shrink-0">
                        📱
                      </span>
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-slate-800 dark:text-white">Install Ecoride App Shortcut</h4>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                          Add the Ecoride link to your home screen for quick, one-tap mobile access.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <button
                        onClick={handleInstallClick}
                        className="px-3 py-1.5 rounded-xl bg-brand-green-600 hover:bg-brand-green-700 text-white text-[10px] font-bold cursor-pointer transition-all shadow-sm flex-shrink-0"
                      >
                        Install
                      </button>
                      <button
                        onClick={() => setShowInstallBanner(false)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-650 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors flex-shrink-0"
                        title="Dismiss"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Stacking Offer / Join Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Offer a Ride Card */}
                  <div
                    role="button"
                    onClick={() => {
                      if (hasActiveHostedRide) {
                        alert("You already have an active ride hosted or started. Please cancel or complete it before offering a new ride.");
                        return;
                      }
                      setActiveWizard("host");
                    }}
                    className={`group relative flex items-center justify-between p-6 rounded-3xl bg-gradient-to-tr text-white shadow-xl transition-all cursor-pointer overflow-hidden ${
                      hasActiveHostedRide
                        ? "from-slate-700 to-slate-650 opacity-60 hover:opacity-75"
                        : "from-brand-green-600 to-brand-green-500 hover:brightness-105"
                    }`}
                  >
                    <div className="z-10 text-left">
                      <span className="inline-block bg-white/20 text-[9px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full mb-1.5">
                        {hasActiveHostedRide ? "Active Ride Ongoing" : "Host Commuters"}
                      </span>
                      <h3 className="text-lg font-extrabold tracking-tight">Offer a Ride</h3>
                      <p className="text-[11px] text-brand-green-50 mt-1 max-w-[220px] leading-relaxed">
                        {hasActiveHostedRide
                          ? "You are currently hosting an active/started ride. Complete or cancel it first."
                          : "Share your route, reduce corporate congestion, and earn ESG credits."}
                      </p>
                    </div>
                    <div className="z-10 bg-white/10 p-3 rounded-2xl group-hover:scale-110 transition-transform">
                      <Car className="h-7 w-7 text-white" />
                    </div>
                    <div className="absolute right-0 bottom-0 opacity-10 translate-x-6 translate-y-6 select-none scale-150">
                      <Car className="h-32 w-32" />
                    </div>
                  </div>

                  {/* Join a Ride Card */}
                  <div
                    role="button"
                    onClick={() => setActiveWizard("join")}
                    className="group relative flex items-center justify-between p-6 rounded-3xl bg-gradient-to-tr from-brand-blue-600 to-brand-blue-500 text-white shadow-xl hover:brightness-105 transition-all cursor-pointer overflow-hidden"
                  >
                    <div className="z-10 text-left">
                      <span className="inline-block bg-white/20 text-[9px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full mb-1.5">
                        Carpool Group
                      </span>
                      <h3 className="text-lg font-extrabold tracking-tight">Join a Ride</h3>
                      <p className="text-[11px] text-brand-blue-50 mt-1 max-w-[220px] leading-relaxed">
                        Filter by location or department, jump in, and skip parking hassles.
                      </p>
                    </div>
                    <div className="z-10 bg-white/10 p-3 rounded-2xl group-hover:scale-110 transition-transform">
                      <Search className="h-7 w-7 text-white" />
                    </div>
                    <div className="absolute right-0 bottom-0 opacity-10 translate-x-6 translate-y-6 select-none scale-150">
                      <Search className="h-32 w-32" />
                    </div>
                  </div>
                </div>

                {/* My Rides Section (Active Commute Schedule) */}
                <div className="glass-panel p-5 rounded-3xl border border-slate-200/50 dark:border-slate-800/40 space-y-5 bg-white dark:bg-slate-950/20">
                  
                  <div className="flex items-center justify-between border-b pb-3">
                    <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                      <Calendar className="h-4 w-4 text-brand-green-500" /> My Rides (Active Schedule)
                    </h3>
                  </div>

                  {/* Pending Ride Requests block for host */}
                  {pendingRequestsForMe.length > 0 && (
                    <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20 space-y-3">
                      <h4 className="text-xs font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                        <Users className="h-4 w-4 text-amber-500 animate-pulse" /> Pending Join Requests
                      </h4>
                      <div className="divide-y divide-slate-150 dark:divide-slate-800/60">
                        {pendingRequestsForMe.map(req => {
                          const ride = rides.find(r => r.id === req.rideId);
                          return (
                            <div key={req.id} className="py-2.5 flex items-center justify-between gap-3">
                              <div className="flex items-center gap-2">
                                <span className="text-lg">{req.requesterAvatar}</span>
                                <div>
                                  <h5 className="text-[11px] font-bold text-slate-800 dark:text-white">
                                    {req.requesterName} <span className="text-[9px] text-slate-500 font-normal">({req.requesterDept})</span>
                                  </h5>
                                  <p className="text-[9px] text-slate-500">
                                    Wants to join: {ride?.pickup} → {ride?.destination}
                                  </p>
                                  <span className="text-[8px] bg-brand-blue-50 text-brand-blue-700 dark:bg-brand-blue-950/30 dark:text-brand-blue-400 px-1 py-0.2 rounded font-bold mt-1 inline-block">
                                    📍 Pickup: {req.pickup}
                                  </span>
                                </div>
                              </div>
                              <div className="flex gap-1.5">
                                <button
                                  onClick={() => handleRequestResponse(req.id, true)}
                                  className="px-2.5 py-1.5 rounded-lg bg-brand-green-600 hover:bg-brand-green-700 text-white text-[9px] font-bold flex items-center gap-0.5 cursor-pointer"
                                >
                                  Approve
                                </button>
                                <button
                                  onClick={() => handleRequestResponse(req.id, false)}
                                  className="px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 text-[9px] font-bold flex items-center gap-0.5 cursor-pointer"
                                >
                                  Decline
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  {myUpcomingTrips.length === 0 ? (
                    <div className="py-8 text-center text-xs text-slate-400">
                      No commutes scheduled. Offer a ride or search rides above!
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100 dark:divide-slate-900/60">
                      {myUpcomingTrips.map(trip => {
                        const isHost = trip.hostId === currentUser.id;
                        return (
                          <div key={trip.id} className="py-4 last:pb-0 space-y-3">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                              <div className="flex items-start gap-3">
                                <span className="text-2xl mt-0.5">🚗</span>
                                <div>
                                  <h4 className="text-xs font-bold text-slate-800 dark:text-white">
                                    {trip.pickup} → {trip.destination}
                                  </h4>
                                  <div className="flex flex-wrap gap-2 mt-1 text-[9px] text-slate-500 font-semibold">
                                    <span className="flex items-center gap-0.5">
                                      <Clock className="h-3 w-3" /> {trip.departureTime}
                                    </span>
                                    <span>• Status: <strong className="text-brand-green-600">{trip.status}</strong></span>
                                    <span>• Role: {isHost ? "Host" : "Passenger"}</span>
                                    <span>• Vehicle: {trip.vehicleModel} ({trip.vehicleType})</span>
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                {/* Passenger Action: Confirm Boarding */}
                                {!isHost && trip.status === "Started" && (() => {
                                  const hasBoarded = trip.boardedPassengers?.includes(currentUser.id);
                                  return hasBoarded ? (
                                    <span className="px-2.5 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold border border-emerald-200/20 flex items-center gap-1.5">
                                      ✅ Boarded
                                    </span>
                                  ) : (
                                    <button
                                      onClick={() => handleConfirmBoardingClick(trip.id)}
                                      disabled={confirmingBoardingId === trip.id}
                                      className="px-2.5 py-1.5 rounded-lg bg-brand-green-600 hover:bg-brand-green-700 text-white text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1.5"
                                    >
                                      {confirmingBoardingId === trip.id ? "Verifying..." : "Confirm Boarding"}
                                    </button>
                                  );
                                })()}

                                {/* Open Chat */}
                                <button
                                  onClick={() => setActiveChatRideId(trip.id)}
                                  className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 text-[10px] font-bold transition-all cursor-pointer"
                                >
                                  Chat Group
                                </button>

                                {/* Open in Google Maps shortcut (available for all upcoming/active rides) */}
                                <a
                                  href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(trip.destination)}${
                                    requests.filter(req => req.rideId === trip.id && req.status === "Accepted").map(req => req.pickup).length > 0
                                      ? `&waypoints=${encodeURIComponent(requests.filter(req => req.rideId === trip.id && req.status === "Accepted").map(req => req.pickup).join('|'))}`
                                      : ""
                                  }&dir_action=navigate&travelmode=driving`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1.5"
                                >
                                  <Navigation className="h-3 w-3 text-brand-blue-500" />
                                  Google Maps
                                </a>

                                {/* Host actions */}
                                {isHost && trip.status?.toLowerCase() === "published" && (
                                  <button
                                    onClick={() => startRide(trip.id)}
                                    className="px-2.5 py-1.5 rounded-lg bg-brand-green-600 hover:bg-brand-green-700 text-white text-[10px] font-bold transition-all cursor-pointer"
                                  >
                                    Start Trip
                                  </button>
                                )}

                                {/* In Progress Ride - Host View */}
                                {isHost && trip.status?.toLowerCase() === "started" && (
                                  <button
                                    onClick={() => completeRide(trip.id, { safety: 5, comfort: 5, punctuality: 5 })}
                                    className="px-2.5 py-1.5 rounded-lg bg-brand-blue-600 hover:bg-brand-blue-700 text-white text-[10px] font-bold transition-all cursor-pointer"
                                  >
                                    Complete Trip
                                  </button>
                                )}

                                {/* Cancel action */}
                                {trip.status?.toLowerCase() !== "completed" && (
                                  <button
                                    onClick={() => cancelRide(trip.id)}
                                    className="px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 text-[10px] font-bold transition-all cursor-pointer"
                                  >
                                    Cancel
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* Ongoing Ride Map with Embedded / Native selection */}
                            {trip.status?.toLowerCase() === "started" && (() => {
                              const approvedReqs = requests.filter(req => req.rideId === trip.id && req.status === "Accepted");
                              const passengerPickups = approvedReqs.map(req => req.pickup);
                              const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(trip.destination)}${passengerPickups.length > 0 ? `&waypoints=${encodeURIComponent(passengerPickups.join('|'))}` : ""}&dir_action=navigate&travelmode=driving`;

                              return (
                                <div className="mt-3 space-y-3">
                                  {/* Toggle Bar */}
                                  <div className="flex rounded-xl bg-slate-100 dark:bg-slate-800/80 p-0.5 border border-slate-200/40 dark:border-slate-700/40 w-fit">
                                    <button
                                      type="button"
                                      onClick={() => setMapViewPreferences(prev => ({ ...prev, [trip.id]: "embedded" }))}
                                      className={`px-3 py-1.5 text-[10px] font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                                        (mapViewPreferences[trip.id] || "embedded") === "embedded"
                                          ? "bg-white text-brand-green-600 shadow-sm dark:bg-slate-900 dark:text-brand-green-400"
                                          : "text-slate-500 hover:text-slate-850 dark:text-slate-400 dark:hover:text-slate-200"
                                      }`}
                                    >
                                      <Map className="h-3 w-3" />
                                      View inside EcoRide
                                    </button>
                                    <a
                                      href={googleMapsUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      onClick={() => {
                                        setMapViewPreferences(prev => ({ ...prev, [trip.id]: "native" }));
                                      }}
                                      className={`px-3 py-1.5 text-[10px] font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                                        mapViewPreferences[trip.id] === "native"
                                          ? "bg-white text-brand-blue-600 shadow-sm dark:bg-slate-900 dark:text-brand-blue-400"
                                          : "text-slate-500 hover:text-slate-850 dark:text-slate-400 dark:hover:text-slate-200"
                                      }`}
                                    >
                                      <Zap className="h-3 w-3" />
                                      Open in Google Maps
                                    </a>
                                  </div>

                                  {/* Conditional Map View */}
                                  {(mapViewPreferences[trip.id] || "embedded") === "embedded" ? (
                                    <div className="rounded-2xl overflow-hidden border border-brand-green-500/20 shadow-md">
                                      <InteractiveMap
                                        pickup={trip.pickup}
                                        destination={trip.destination}
                                        isDriving={true}
                                        waypoints={passengerPickups}
                                        rideId={trip.id}
                                        isHost={isHost}
                                        passengerId={isHost ? undefined : currentUser.id}
                                      />
                                    </div>
                                  ) : (
                                    <div className="p-5 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 flex flex-col items-center justify-center text-center gap-2.5 py-6">
                                      <div className="h-8 w-8 rounded-full bg-brand-blue-50 dark:bg-brand-blue-950/20 flex items-center justify-center text-brand-blue-500 animate-pulse">
                                        <Zap className="h-4 w-4" />
                                      </div>
                                      <div>
                                        <h5 className="text-[11px] font-bold text-slate-800 dark:text-white">Opened in Native Google Maps</h5>
                                        <p className="text-[9px] text-slate-500 dark:text-slate-400 max-w-[280px] mt-0.5 leading-normal">
                                          GPS waypoints and navigation directions are loaded. Open again or toggle back to embed.
                                        </p>
                                      </div>
                                      <a
                                        href={googleMapsUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="px-3.5 py-2 bg-brand-blue-600 hover:bg-brand-blue-700 text-white rounded-xl text-[9px] font-bold shadow-sm transition-all flex items-center gap-1 cursor-pointer"
                                      >
                                        <Navigation className="h-3 w-3" />
                                        Relaunch Directions
                                      </a>
                                    </div>
                                  )}
                                </div>
                              );
                            })()}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Dynamic overlays */}
            {joiningRide && (
              <div className="fixed inset-0 bg-slate-950/65 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div className="glass-panel max-w-md w-full p-6 rounded-3xl border-2 border-brand-blue-500/20 bg-white dark:bg-slate-950 animate-scale-up space-y-4 shadow-2xl">
                  <div className="flex items-center justify-between border-b pb-3">
                    <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-1.5 text-sm sm:text-base">
                      🤝 Confirm Pickup Point
                    </h3>
                    <button
                      onClick={() => {
                        setJoiningRide(null);
                        setPassengerPickupInput("");
                        setVicinityError("");
                      }}
                      className="p-1 text-slate-400 hover:bg-slate-100 rounded-lg cursor-pointer"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <p className="text-xs text-slate-500 leading-relaxed">
                    You are requesting to join <strong>{joiningRide.hostName}</strong>'s carpool from <strong>{joiningRide.pickup}</strong> to <strong>{joiningRide.destination}</strong>.
                    Your pickup location must be within <strong>1.0 km</strong> of the driver's route path.
                  </p>

                  {/* Dynamic Google Map preview showing driver route and passenger's location */}
                  <InteractiveMap
                    pickup={joiningRide.pickup}
                    destination={joiningRide.destination}
                    passengerPickup={passengerPickupInput}
                  />

                  <div className="space-y-4">
                    <AddressAutocomplete
                      value={passengerPickupInput}
                      onChange={setPassengerPickupInput}
                      placeholder="Enter your exact pickup location..."
                      label="Your Pickup Address"
                      required
                    />

                    {vicinityError && (
                      <p className="text-[10px] font-semibold text-rose-500 flex items-center gap-1">
                        ⚠️ {vicinityError}
                      </p>
                    )}

                    <div className="flex justify-end gap-2 border-t pt-3">
                      <button
                        type="button"
                        onClick={() => {
                          setJoiningRide(null);
                          setPassengerPickupInput("");
                          setVicinityError("");
                        }}
                        className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleJoinSubmit}
                        disabled={verifyingVicinity || !passengerPickupInput}
                        className="px-4 py-2 rounded-xl bg-brand-blue-600 hover:bg-brand-blue-700 disabled:bg-slate-350 text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
                      >
                        {verifyingVicinity ? "Verifying Route..." : "Verify & Join"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {reviewingRequest && (() => {
              const ride = rides.find(r => r.id === reviewingRequest.rideId);
              return ride ? (
                <div className="fixed inset-0 bg-slate-950/65 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                  <div className="glass-panel max-w-md w-full p-6 rounded-3xl border-2 border-brand-green-500/20 bg-white dark:bg-slate-950 animate-scale-up space-y-4 shadow-2xl">
                    <div className="flex items-center justify-between border-b pb-3">
                      <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-1.5 text-sm sm:text-base">
                        🗺️ Review Passenger Pickup
                      </h3>
                      <button
                        onClick={() => setReviewingRequest(null)}
                        className="p-1 text-slate-400 hover:bg-slate-100 rounded-lg cursor-pointer"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>

                    <p className="text-xs text-slate-500 leading-relaxed">
                      <strong>{reviewingRequest.requesterName}</strong> wants to join your carpool. Proposed pickup point:
                      <span className="block mt-1 font-semibold text-slate-700 dark:text-slate-350">📍 {reviewingRequest.pickup}</span>
                    </p>

                    {/* Interactive Google Map preview */}
                    <InteractiveMap
                      pickup={ride.pickup}
                      destination={ride.destination}
                      passengerPickup={reviewingRequest.pickup}
                    />

                    <div className="flex justify-between items-center border-t pt-3">
                      <button
                        onClick={() => {
                          handleRequestResponse(reviewingRequest.id, false);
                          setReviewingRequest(null);
                        }}
                        className="px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 dark:bg-rose-950/20 dark:text-rose-450 text-xs font-bold cursor-pointer"
                      >
                        Decline Request
                      </button>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setReviewingRequest(null)}
                          className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer"
                        >
                          Close Map
                        </button>
                        <button
                          onClick={() => {
                            handleRequestResponse(reviewingRequest.id, true);
                            setReviewingRequest(null);
                          }}
                          className="px-4 py-2 rounded-xl bg-brand-green-600 hover:bg-brand-green-700 text-white text-xs font-bold cursor-pointer"
                        >
                          Approve Request
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : null;
            })()}

          </div>
        )}

      </main>

      {/* Global active chats */}
      {activeChatRideId && (
        <ChatModal
          rideId={activeChatRideId}
          onClose={() => setActiveChatRideId(null)}
        />
      )}

      {/* iOS / Safari Installation Guide Sheet */}
      {showInstallGuide && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-50 flex items-end justify-center sm:items-center animate-fade-in p-4 select-none">
          <div className="w-full max-w-sm bg-white dark:bg-slate-950 rounded-t-3xl sm:rounded-3xl border border-slate-150 dark:border-slate-800 p-6 shadow-2xl animate-slide-up space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-extrabold text-slate-800 dark:text-white flex items-center gap-1.5 text-sm">
                📲 Add Ecoride to Home Screen
              </h3>
              <button
                onClick={() => setShowInstallGuide(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-650 dark:hover:text-slate-350 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 text-left text-xs text-slate-700 dark:text-slate-300">
              <p>
                To install the **Ecoride** app shortcut on your mobile home screen, follow these quick steps:
              </p>
              <div className="space-y-3 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-900">
                <div className="flex items-start gap-2.5">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-200 dark:bg-slate-800 text-[10px] font-bold">1</span>
                  <p className="leading-relaxed">
                    Tap the <strong>Share</strong> button <span className="bg-slate-200 dark:bg-slate-850 px-1.5 py-0.5 rounded text-[10px] border border-slate-300 dark:border-slate-700">⎙</span> or browser options menu.
                  </p>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-200 dark:bg-slate-800 text-[10px] font-bold">2</span>
                  <p className="leading-relaxed">
                    Scroll down and tap <strong>Add to Home Screen</strong>.
                  </p>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-200 dark:bg-slate-800 text-[10px] font-bold">3</span>
                  <p className="leading-relaxed">
                    Confirm the name is <strong>Ecoride</strong> and tap <strong>Add</strong>.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowInstallGuide(false)}
                className="w-full py-2.5 rounded-xl bg-brand-green-600 hover:bg-brand-green-700 text-white text-xs font-bold cursor-pointer transition-all shadow-md text-center"
              >
                Got It!
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notification Preferences Modal */}
      {showPreferencesModal && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in select-none">
          <div className="w-full max-w-sm bg-white dark:bg-slate-950 rounded-3xl border border-slate-150 dark:border-slate-800 p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-extrabold text-slate-800 dark:text-white flex items-center gap-1.5 text-sm">
                🔔 Notification Preferences
              </h3>
              <button
                onClick={() => setShowPreferencesModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-650 dark:hover:text-slate-350 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Push notifications global toggle */}
              <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-900/50">
                <div className="space-y-0.5">
                  <p className="text-xs font-bold text-slate-800 dark:text-white">Mobile Push Notifications</p>
                  <p className="text-[10px] text-slate-500">
                    {isPushEnabled ? "Active on this device" : "Receive alerts when app is closed"}
                  </p>
                </div>
                <button
                  onClick={() => {
                    window.dispatchEvent(
                      new CustomEvent("toggle-push-notifications", {
                        detail: { enable: !isPushEnabled }
                      })
                    );
                    // Optimistically toggle
                    setIsPushEnabled(!isPushEnabled);
                  }}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors cursor-pointer ${
                    isPushEnabled ? "bg-brand-green-500" : "bg-slate-200 dark:bg-slate-800"
                  }`}
                >
                  <span
                    className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                      isPushEnabled ? "translate-x-4.5" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>

              {/* Sub-Preferences list */}
              <div className={`space-y-3 transition-opacity duration-200 ${isPushEnabled ? "opacity-100" : "opacity-50 pointer-events-none"}`}>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Alert categories</p>
                
                {/* Preference 1: Rides */}
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    disabled={!isPushEnabled}
                    checked={currentUser?.notificationPrefs?.rides ?? true}
                    onChange={(e) => {
                      const currentPrefs = currentUser?.notificationPrefs || { rides: true, chat: true, leaderboard: true };
                      updateNotificationPrefs({ ...currentPrefs, rides: e.target.checked });
                    }}
                    className="mt-0.5 rounded border-slate-350 dark:border-slate-850 text-brand-green-600 focus:ring-brand-green-500 cursor-pointer h-3.5 w-3.5"
                  />
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Ride &amp; Commute Status</p>
                    <p className="text-[10px] text-slate-500">Requests, approvals, cancellations, starts &amp; arrivals</p>
                  </div>
                </label>

                {/* Preference 2: Chat Messages */}
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    disabled={!isPushEnabled}
                    checked={currentUser?.notificationPrefs?.chat ?? true}
                    onChange={(e) => {
                      const currentPrefs = currentUser?.notificationPrefs || { rides: true, chat: true, leaderboard: true };
                      updateNotificationPrefs({ ...currentPrefs, chat: e.target.checked });
                    }}
                    className="mt-0.5 rounded border-slate-350 dark:border-slate-855 text-brand-green-600 focus:ring-brand-green-500 cursor-pointer h-3.5 w-3.5"
                  />
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Chat Messages</p>
                    <p className="text-[10px] text-slate-500">Real-time chat alerts from host and co-passengers</p>
                  </div>
                </label>

                {/* Preference 3: Leaderboard */}
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    disabled={!isPushEnabled}
                    checked={currentUser?.notificationPrefs?.leaderboard ?? true}
                    onChange={(e) => {
                      const currentPrefs = currentUser?.notificationPrefs || { rides: true, chat: true, leaderboard: true };
                      updateNotificationPrefs({ ...currentPrefs, leaderboard: e.target.checked });
                    }}
                    className="mt-0.5 rounded border-slate-350 dark:border-slate-860 text-brand-green-600 focus:ring-brand-green-500 cursor-pointer h-3.5 w-3.5"
                  />
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-300">ESG &amp; Carbon Updates</p>
                    <p className="text-[10px] text-slate-500">Leaderboard updates, achievements, rank milestones</p>
                  </div>
                </label>
              </div>
            </div>

            <button
              onClick={() => setShowPreferencesModal(false)}
              className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-850 dark:bg-slate-800 dark:hover:bg-slate-750 text-white text-xs font-bold cursor-pointer transition-all shadow-md text-center mt-2"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* Past Commutes Modal */}
      {showPastRidesModal && (
        <PastRidesModal onClose={() => setShowPastRidesModal(false)} />
      )}

      {/* Bottom status signature */}
      <footer className="py-6 border-t mt-auto">
        <div className="max-w-7xl mx-auto px-4 text-center text-[10px] text-slate-400 font-semibold flex items-center justify-center gap-1">
          Made with <Heart className="h-3 w-3 text-brand-green-500 fill-brand-green-500" /> for Corporate Sustainability &amp; ESG Compliance
        </div>
      </footer>
    </div>
  );
}

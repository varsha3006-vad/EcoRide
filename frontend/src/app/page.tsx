"use client";

import React, { useState } from "react";
import { useAppState } from "@/context/StateContext";
import Navbar from "@/components/Navbar";
import InteractiveMap from "@/components/InteractiveMap";
import AddressAutocomplete from "@/components/AddressAutocomplete";
import ChatModal from "@/components/ChatModal";
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
  Shield
} from "lucide-react";

const TIME_OPTIONS = [
  "07:00 AM", "07:15 AM", "07:30 AM", "07:45 AM",
  "08:00 AM", "08:15 AM", "08:30 AM", "08:45 AM",
  "09:00 AM", "09:15 AM", "09:30 AM", "09:45 AM",
  "10:00 AM", "04:00 PM", "04:15 PM", "04:30 PM",
  "04:45 PM", "05:00 PM", "05:15 PM", "05:30 PM",
  "05:45 PM", "06:00 PM", "06:15 PM", "06:30 PM",
  "06:45 PM", "07:00 PM", "07:15 PM", "07:30 PM",
  "07:45 PM", "08:00 PM"
];

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
    login
  } = useAppState();

  // Onboarding Login form states
  const [emailInput, setEmailInput] = useState("");
  const [loginError, setLoginError] = useState("");
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
  const [capacity, setCapacity] = useState(3);
  const [vehicleType, setVehicleType] = useState<"Electric" | "Hybrid" | "ICE (Gasoline)">("Electric");
  const [recurring, setRecurring] = useState(false);
  const [radius, setRadius] = useState(3);
  const [music, setMusic] = useState("Acoustic / Soft");
  const [smoking, setSmoking] = useState("No Smoking");
  const [luggage, setLuggage] = useState(true);
  const [womenOnly, setWomenOnly] = useState(false);
  const [notes, setNotes] = useState("");

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
            requestJoinRide(joiningRide.id, passengerPickupInput);
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

    createRide({
      pickup,
      destination: dest,
      departureTime: time,
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
  const myUpcomingTrips = [...myCreatedRides, ...myJoinedRides].filter(r => r.status !== "Completed" && r.status !== "Cancelled");

  // Search/Filter rides list
  const filteredRides = rides.filter(r => {
    if (r.hostId === currentUser.id) return false; // Hide own rides
    if (r.status !== "Published") return false;
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
          <div className="flex flex-col items-center text-center space-y-2">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-brand-green-600 to-brand-blue-500 shadow-lg">
              <Leaf className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-1.5 justify-center">
                EcoRide <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-brand-green-500/10 text-brand-green-400 border border-brand-green-500/20">Enterprise</span>
              </h2>
              <p className="text-xs text-slate-400 mt-1">Smart Corporate Ride Sharing & ESG Portal</p>
            </div>
          </div>

          {/* Form */}
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Company Email Address</label>
              <input
                type="email"
                required
                value={emailInput}
                onChange={e => {
                  setEmailInput(e.target.value);
                  setLoginError("");
                }}
                placeholder="e.g. rahul@company.com"
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-xs text-white placeholder-slate-650 focus:border-brand-green-500 focus:ring-1 focus:ring-brand-green-500 outline-none transition-all"
              />
              {loginError && (
                <p className="text-[10px] font-semibold text-rose-400 mt-1 flex items-center gap-1">
                  ⚠️ {loginError}
                </p>
              )}
            </div>

            {otpSent ? (
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Verification OTP Code</label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={otpCode}
                    onChange={e => setOtpCode(e.target.value)}
                    placeholder="Enter 6-digit code (Use 123456)"
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-xs text-white tracking-widest text-center outline-none focus:border-brand-green-500 transition-all font-mono"
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
                  className="w-full py-2.5 rounded-xl bg-brand-green-600 hover:bg-brand-green-700 text-white text-xs font-bold transition-all shadow-md shadow-brand-green-600/10 cursor-pointer"
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
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-brand-green-600 to-brand-green-500 hover:brightness-110 text-white text-xs font-bold transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  🔒 Sign in with Azure AD / Google SSO
                </button>
                <div className="flex items-center my-3 text-slate-700">
                  <div className="flex-1 border-t border-slate-800/80"></div>
                  <span className="px-3 text-[9px] uppercase tracking-wider font-bold">Or</span>
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
                  className="w-full py-2.5 rounded-xl bg-slate-950 hover:bg-slate-900 border border-slate-800 text-slate-300 text-xs font-semibold transition-all cursor-pointer"
                >
                  📩 Send Email verification OTP
                </button>
              </div>
            )}
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
          
          /* Dynamic Employee View */
          <div className="space-y-6 animate-slide-up">
            
            {/* Quick action hero */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Host Action */}
              {/* Host Action */}
              <div
                role="button"
                tabIndex={0}
                onClick={() => setActiveWizard("host")}
                onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setActiveWizard("host"); } }}
                className="group relative flex items-center justify-between p-6 rounded-3xl bg-gradient-to-tr from-brand-green-600 to-brand-green-500 text-white shadow-xl glass-panel-hover overflow-hidden cursor-pointer"
              >
                <div className="text-left z-10">
                  <span className="inline-flex items-center rounded-full bg-white/20 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider mb-2">
                    Host Commuters
                  </span>
                  <h3 className="text-xl font-extrabold tracking-tight">Offer a Ride</h3>
                  <p className="text-xs text-brand-green-50 mt-1 max-w-[220px]">
                    Share your route, reduce corporate congestion, and multiply ESG points.
                  </p>
                </div>
                <div className="z-10 bg-white/10 p-3 rounded-2xl group-hover:scale-110 transition-transform">
                  <Car className="h-8 w-8 text-white" />
                </div>
                {/* Visual wave backdrop decoration */}
                <div className="absolute right-0 bottom-0 opacity-10 translate-x-6 translate-y-6 select-none scale-150">
                  <Car className="h-44 w-44" />
                </div>
              </div>

              {/* Join Action */}
              <div
                role="button"
                tabIndex={0}
                onClick={() => setActiveWizard("join")}
                onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setActiveWizard("join"); } }}
                className="group relative flex items-center justify-between p-6 rounded-3xl bg-gradient-to-tr from-brand-blue-600 to-brand-blue-500 text-white shadow-xl glass-panel-hover overflow-hidden cursor-pointer"
              >
                <div className="text-left z-10">
                  <span className="inline-flex items-center rounded-full bg-white/20 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider mb-2">
                    Carpool Group
                  </span>
                  <h3 className="text-xl font-extrabold tracking-tight">Search / Join Ride</h3>
                  <p className="text-xs text-brand-blue-50 mt-1 max-w-[220px]">
                    Filter by location or department, jump in, and skip parking hassles.
                  </p>
                </div>
                <div className="z-10 bg-white/10 p-3 rounded-2xl group-hover:scale-110 transition-transform">
                  <Search className="h-8 w-8 text-white" />
                </div>
                {/* Visual wave backdrop decoration */}
                <div className="absolute right-0 bottom-0 opacity-10 translate-x-6 translate-y-6 select-none scale-150">
                  <Search className="h-44 w-44" />
                </div>
              </div>

            </div>

            {/* Employee ESG dashboard summaries */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              
              {/* Metric 1 */}
              <div className="glass-panel p-4 rounded-2xl flex flex-col justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500">Carbon Saved</span>
                  <h4 className="text-xl font-bold mt-1 text-slate-800 dark:text-white">{currentUser.carbonSaved} kg</h4>
                </div>
                <span className="text-[9px] text-brand-green-600 dark:text-brand-green-400 font-semibold mt-2">
                  🌱 {Math.round(currentUser.carbonSaved / 22)} trees equiv.
                </span>
              </div>

              {/* Metric 2 */}
              <div className="glass-panel p-4 rounded-2xl flex flex-col justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500">Credits Earned</span>
                  <h4 className="text-xl font-bold mt-1 text-slate-800 dark:text-white">{currentUser.credits} pts</h4>
                </div>
                <span className="text-[9px] text-slate-400 mt-2">
                  Level: Gold Member
                </span>
              </div>

              {/* Metric 3 */}
              <div className="glass-panel p-4 rounded-2xl flex flex-col justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500">Leaderboard Rank</span>
                  <h4 className="text-xl font-bold mt-1 text-slate-800 dark:text-white">#{currentUser.rank}</h4>
                </div>
                <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-semibold mt-2">
                  Top 10% in Company
                </span>
              </div>

              {/* Metric 4 */}
              <div className="glass-panel p-4 rounded-2xl flex flex-col justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500">Est. Money Saved</span>
                  <h4 className="text-xl font-bold mt-1 text-slate-800 dark:text-white">
                    ${(currentUser.carbonSaved * 0.65).toFixed(0)}
                  </h4>
                </div>
                <span className="text-[9px] text-slate-400 mt-2">
                  Avoided single occupancy
                </span>
              </div>

            </div>

            {/* Layout body: Left Column (Active commuting/Wizards) & Right Column (Leaderboard/Achievements) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Left 2 Cols: Main Activities & Upcoming list */}
              <div className="lg:col-span-2 space-y-6">
                
                {/* Active Ride Wizards Overlay panels */}
                {activeWizard === "host" && (
                  <div className="glass-panel p-6 rounded-3xl border-2 border-brand-green-500/20 bg-white dark:bg-slate-950 animate-slide-up space-y-4">
                    <div className="flex items-center justify-between border-b pb-3">
                      <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                        <Plus className="h-5 w-5 text-brand-green-600" /> Host an Employee Commute Ride
                      </h3>
                      <button
                        onClick={() => setActiveWizard(null)}
                        className="p-1 text-slate-400 hover:bg-slate-100 rounded-lg"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>

                    <form onSubmit={handleHostSubmit} className="space-y-4">
                      
                      {/* Map Route preview inside wizard */}
                      <InteractiveMap pickup={pickup} destination={dest} onLocationDetected={setPickup} />

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

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Departure Time</label>
                          <select
                            required
                            value={time}
                            onChange={e => setTime(e.target.value)}
                            className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-xs"
                          >
                            <option value="">Select departure...</option>
                            {TIME_OPTIONS.map(t => (
                              <option key={t} value={t}>{t}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Available Seats</label>
                          <input
                            type="number"
                            min="1"
                            max="6"
                            value={capacity}
                            onChange={e => setCapacity(Number(e.target.value))}
                            className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3.5 py-2 text-xs"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Vehicle Propulsion</label>
                          <select
                            value={vehicleType}
                            onChange={e => setVehicleType(e.target.value as any)}
                            className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3.5 py-2 text-xs"
                          >
                            <option value="Electric">Electric Vehicle (EV Bonus)</option>
                            <option value="Hybrid">Hybrid Vehicle</option>
                            <option value="ICE (Gasoline)">Gasoline / ICE</option>
                          </select>
                        </div>
                      </div>

                      {/* Women-Only Carpool Option */}
                      {currentUser.gender === "Female" && (
                        <div className="flex items-center justify-between p-3.5 rounded-2xl bg-rose-500/5 border border-rose-500/10 text-xs">
                          <div className="flex items-center gap-2">
                            <span className="text-base">🌸</span>
                            <div>
                              <span className="font-bold text-rose-600 dark:text-rose-405">Women-Only Carpool</span>
                              <p className="text-[10px] text-slate-500 mt-0.5">Restrict this ride to verified female passengers only.</p>
                            </div>
                          </div>
                          <input
                            type="checkbox"
                            checked={womenOnly}
                            onChange={e => setWomenOnly(e.target.checked)}
                            className="h-4.5 w-4.5 text-rose-500 rounded border-slate-350 focus:ring-rose-450 cursor-pointer"
                          />
                        </div>
                      )}

                      {/* ESG credits preview */}
                      {pickup && dest && (
                        <div className="p-3 bg-brand-green-50 dark:bg-brand-green-950/20 border border-brand-green-500/20 rounded-2xl flex items-center justify-between text-xs">
                          <div>
                            <span className="font-bold text-brand-green-700 dark:text-brand-green-400 flex items-center gap-1">
                              <Sparkles className="h-3.5 w-3.5" /> Commuting ESG Rewards Forecast
                            </span>
                            <p className="text-[10px] text-slate-500 mt-0.5">Approx. distance: {mockDistance.toFixed(1)} km</p>
                          </div>
                          <div className="text-right">
                            <span className="font-extrabold text-brand-green-600 block">+{creditEstimate} ESG Credits</span>
                            <span className="text-[9px] font-bold text-slate-500 block">-{co2SavedEstimate} kg CO₂</span>
                          </div>
                        </div>
                      )}

                      <div className="flex justify-end gap-2 border-t pt-3">
                        <button
                          type="button"
                          onClick={() => setActiveWizard(null)}
                          className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="px-4 py-2 rounded-xl bg-brand-green-600 hover:bg-brand-green-700 text-white text-xs font-bold"
                        >
                          Publish Ride
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {activeWizard === "join" && (
                  <div className="glass-panel p-6 rounded-3xl border-2 border-brand-blue-500/20 bg-white dark:bg-slate-950 animate-slide-up space-y-4">
                    <div className="flex items-center justify-between border-b pb-3">
                      <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                        <Search className="h-5 w-5 text-brand-blue-600" /> Search & Join Colleague's Ride
                      </h3>
                      <button
                        onClick={() => setActiveWizard(null)}
                        className="p-1 text-slate-400 hover:bg-slate-100 rounded-lg"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>

                    {/* Filter fields */}
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                      <input
                        type="text"
                        value={searchPickup}
                        onChange={e => setSearchPickup(e.target.value)}
                        placeholder="Pickup keyword..."
                        className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-xs"
                      />
                      <input
                        type="text"
                        value={searchDest}
                        onChange={e => setSearchDest(e.target.value)}
                        placeholder="Destination keyword..."
                        className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-xs"
                      />
                      <select
                        value={filterDept}
                        onChange={e => setFilterDept(e.target.value)}
                        className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-xs"
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
                        className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-xs"
                      >
                        <option value="All">All Vehicles</option>
                        <option value="Electric">Electric</option>
                        <option value="Hybrid">Hybrid</option>
                        <option value="ICE (Gasoline)">Gasoline</option>
                      </select>
                    </div>

                    {/* Ride search results */}
                    <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                      {filteredRides.length === 0 ? (
                        <div className="py-12 text-center text-xs text-slate-400">
                          No rides matching search filters. Try updating your criteria.
                        </div>
                      ) : (
                        filteredRides.map(ride => {
                          const myRequest = requests.find(req => req.rideId === ride.id && req.requesterId === currentUser.id);
                          const isWomenOnlyRestricted = ride.womenOnly && currentUser.gender !== "Female";
                          return (
                            <div key={ride.id} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/50 dark:border-slate-800/40 flex items-center justify-between gap-4 animate-fade-in">
                              <div className="flex items-center gap-3">
                                <span className="text-2xl">{ride.hostAvatar}</span>
                                <div>
                                  <h4 className="text-xs font-bold text-slate-800 dark:text-white flex items-center gap-1">
                                    {ride.hostName} <span className="text-[9px] text-slate-500 font-normal">({ride.hostDept})</span>
                                    {ride.womenOnly && (
                                      <span className="text-[8px] bg-rose-500/10 text-rose-500 dark:bg-rose-950/30 dark:text-rose-400 px-1 py-0.5 rounded-full font-bold">
                                        🌸 Women-Only
                                      </span>
                                    )}
                                  </h4>
                                  <p className="text-[10px] text-slate-500 font-semibold">{ride.pickup} → {ride.destination}</p>
                                  <div className="flex items-center gap-2 mt-1">
                                    <span className="text-[9px] bg-white dark:bg-slate-800 border px-1.5 py-0.5 rounded text-slate-600 dark:text-slate-300 font-medium">
                                      ⏱️ {ride.departureTime}
                                    </span>
                                    <span className="text-[9px] bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400 px-1.5 py-0.5 rounded font-medium">
                                      🌱 {ride.co2Saved} kg CO₂ saved
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <div className="text-right">
                                <span className="text-[10px] font-bold text-slate-600 block mb-1.5">{ride.seatsAvailable} seats left</span>
                                {isWomenOnlyRestricted ? (
                                  <span className="inline-block text-[10px] font-bold px-2.5 py-1.5 rounded-lg bg-rose-500/10 text-rose-500 dark:text-rose-400 border border-rose-500/25 cursor-not-allowed" title="Safety constraint: Restricted to women only.">
                                    Women-Only 🔒
                                  </span>
                                ) : myRequest ? (
                                  myRequest.status === "Pending" ? (
                                    <span className="inline-block text-[10px] font-bold px-2.5 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/20 text-amber-600 border border-amber-200/30">
                                      Requested
                                    </span>
                                  ) : myRequest.status === "Accepted" ? (
                                    <span className="inline-block text-[10px] font-bold px-2.5 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 border border-emerald-200/30">
                                      Confirmed
                                    </span>
                                  ) : ride.seatsAvailable === 0 ? (
                                    <span className="inline-block text-[10px] font-bold px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-900 text-slate-500 border border-slate-200/30">
                                      Full
                                    </span>
                                  ) : (
                                    <button
                                      onClick={() => setJoiningRide(ride)}
                                      className="px-2.5 py-1.5 rounded-lg bg-brand-blue-600 hover:bg-brand-blue-700 text-white text-[10px] font-bold transition-all cursor-pointer"
                                    >
                                      Join Ride
                                    </button>
                                  )
                                ) : ride.seatsAvailable === 0 ? (
                                  <span className="inline-block text-[10px] font-bold px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-900 text-slate-500 border border-slate-200/30">
                                    Full
                                  </span>
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

                {joiningRide && (
                  <div className="fixed inset-0 bg-slate-950/65 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="glass-panel max-w-md w-full p-6 rounded-3xl border-2 border-brand-blue-500/20 bg-white dark:bg-slate-950 animate-scale-up space-y-4 shadow-2xl">
                      <div className="flex items-center justify-between border-b pb-3">
                        <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                          📍 Define Custom Pickup Vicinity
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

                      <p className="text-xs text-slate-500">
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
                          <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                            🗺️ Review Passenger Pickup Location
                          </h3>
                          <button
                            onClick={() => setReviewingRequest(null)}
                            className="p-1 text-slate-400 hover:bg-slate-100 rounded-lg cursor-pointer"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>

                        <p className="text-xs text-slate-500">
                          <strong>{reviewingRequest.requesterName}</strong> wants to join your carpool. They proposed a pickup location at:
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

                {/* Pending Ride Requests */}
                {pendingRequestsForMe.length > 0 && (
                  <div className="glass-panel p-5 rounded-2xl border-2 border-brand-green-500/20 bg-white dark:bg-slate-950 space-y-4">
                    <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                      <Users className="h-4 w-4 text-brand-green-500" /> Pending Ride Requests
                    </h3>
                    <div className="divide-y divide-slate-100 dark:divide-slate-900/50">
                      {pendingRequestsForMe.map(req => {
                        const ride = rides.find(r => r.id === req.rideId);
                        return (
                          <div key={req.id} className="py-3 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2.5">
                              <span className="text-xl">{req.requesterAvatar}</span>
                              <div>
                                <h4 className="text-xs font-bold text-slate-800 dark:text-white">
                                  {req.requesterName} <span className="text-[10px] text-slate-500 font-normal">({req.requesterDept})</span>
                                </h4>
                                <p className="text-[10px] text-slate-500 font-semibold">
                                  Wants to join: {ride?.pickup} → {ride?.destination}
                                </p>
                                <div className="mt-1 flex items-center gap-1.5">
                                  <span className="text-[9px] bg-brand-blue-50 text-brand-blue-700 dark:bg-brand-blue-950/30 dark:text-brand-blue-400 px-1.5 py-0.5 rounded font-bold">
                                    📍 Pickup: {req.pickup}
                                  </span>
                                  <button
                                    onClick={() => setReviewingRequest(req)}
                                    className="text-[9px] text-slate-500 hover:text-brand-blue-600 font-bold flex items-center gap-0.5 underline cursor-pointer"
                                  >
                                    🗺️ View on Map
                                  </button>
                                </div>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleRequestResponse(req.id, true)}
                                className="px-2.5 py-1.5 rounded-lg bg-brand-green-600 hover:bg-brand-green-700 text-white text-[10px] font-bold flex items-center gap-0.5 cursor-pointer"
                              >
                                <Check className="h-3 w-3" /> Approve
                              </button>
                              <button
                                onClick={() => handleRequestResponse(req.id, false)}
                                className="px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 dark:bg-rose-950/20 dark:text-rose-400 text-[10px] font-bold flex items-center gap-0.5 cursor-pointer"
                              >
                                <X className="h-3 w-3" /> Decline
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Upcoming Commute Trips */}
                <div className="glass-panel p-5 rounded-2xl space-y-4">
                  <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                    <Calendar className="h-4 w-4 text-brand-green-500" /> Active Commute Schedule
                  </h3>
                  
                  {myUpcomingTrips.length === 0 ? (
                    <div className="py-6 text-center text-xs text-slate-400">
                      No upcoming commuting carpools. Click "Offer Ride" or "Search Ride" to start.
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100 dark:divide-slate-900">
                      {myUpcomingTrips.map(trip => {
                        const isHost = trip.hostId === currentUser.id;
                        const acceptedRequests = requests.filter(req => req.rideId === trip.id && req.status === "Accepted");
                        const passengerPickups = acceptedRequests.map(req => req.pickup);
                        return (
                          <div key={trip.id} className="py-4 border-b border-slate-100 dark:border-slate-900/50 last:border-b-0 space-y-3.5">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                              <div className="flex items-start gap-3">
                                <span className="text-2xl mt-1">🚗</span>
                                <div>
                                  <h4 className="text-xs font-bold text-slate-800 dark:text-white">
                                    {trip.pickup} → {trip.destination}
                                  </h4>
                                  <div className="flex flex-wrap gap-2 mt-1 text-[9px] text-slate-500 font-semibold">
                                    <span className="flex items-center gap-0.5">
                                      <Clock className="h-3 w-3" /> {trip.departureTime}
                                    </span>
                                    <span>• Status: <strong className="text-brand-green-600">{trip.status}</strong></span>
                                    <span>• Role: {isHost ? "Ride Host" : "Ride Participant"}</span>
                                    <span>• Vehicle: {trip.vehicleModel} ({trip.vehicleType})</span>
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                {/* Open Chat */}
                                <button
                                  onClick={() => setActiveChatRideId(trip.id)}
                                  className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 text-[10px] font-bold transition-all cursor-pointer"
                                >
                                  Chat Group
                                </button>

                                {/* Host actions */}
                                {isHost && trip.status === "Published" && (
                                  <button
                                    onClick={() => startRide(trip.id)}
                                    className="px-2.5 py-1.5 rounded-lg bg-brand-green-600 hover:bg-brand-green-700 text-white text-[10px] font-bold transition-all cursor-pointer"
                                  >
                                    Start Trip
                                  </button>
                                )}

                                {isHost && trip.status === "Started" && (
                                  <button
                                    onClick={() => completeRide(trip.id, { safety: 5, comfort: 5, punctuality: 5 })}
                                    className="px-2.5 py-1.5 rounded-lg bg-brand-blue-600 hover:bg-brand-blue-700 text-white text-[10px] font-bold transition-all cursor-pointer"
                                  >
                                    Complete Trip
                                  </button>
                                )}

                                {/* Cancel action */}
                                {trip.status !== "Completed" && (
                                  <button
                                    onClick={() => cancelRide(trip.id)}
                                    className="px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 dark:bg-rose-950/20 dark:text-rose-400 text-[10px] font-bold transition-all cursor-pointer"
                                  >
                                    Cancel
                                  </button>
                                )}
                              </div>
                            </div>
                            {/* Show map for passengers as soon as they're accepted, and for host when ride is started */}
                            {(trip.status === "Started" || (!isHost && trip.passengers.includes(currentUser.id))) && (
                              <div className="rounded-2xl overflow-hidden border border-brand-green-500/20 shadow-md space-y-0">
                                {!isHost && trip.status === "Published" && (
                                  <div className="px-3 py-2 bg-amber-50 dark:bg-amber-950/30 border-b border-amber-200 dark:border-amber-900/40 text-xs text-amber-700 dark:text-amber-400 font-semibold flex items-center gap-2">
                                    <span className="animate-pulse">🟡</span>
                                    Waiting for {trip.hostName} to start the ride — map will show live location once started
                                  </div>
                                )}
                                {!isHost && trip.status === "Started" && (
                                  <div className="px-3 py-2 bg-green-50 dark:bg-green-950/30 border-b border-green-200 dark:border-green-900/40 text-xs text-green-700 dark:text-green-400 font-semibold flex items-center gap-2">
                                    <span className="animate-pulse">🟢</span>
                                    {trip.hostName} is en route — tracking live location
                                  </div>
                                )}
                                <InteractiveMap 
                                  pickup={trip.pickup} 
                                  destination={trip.destination} 
                                  isDriving={trip.status === "Started"} 
                                  waypoints={passengerPickups}
                                  rideId={trip.id}
                                  isHost={isHost}
                                />
                              </div>
                            )}
                            {isHost && trip.status === "Started" && (
                              <div className="rounded-2xl overflow-hidden border border-brand-green-500/20 shadow-md">
                                <InteractiveMap 
                                  pickup={trip.pickup} 
                                  destination={trip.destination} 
                                  isDriving={true} 
                                  waypoints={passengerPickups}
                                  rideId={trip.id}
                                  isHost={true}
                                />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Today's Available Rides Feed (Simulated public list) */}
                <div className="glass-panel p-5 rounded-2xl space-y-4">
                  <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                    <Compass className="h-4 w-4 text-brand-blue-500" /> Active Commute Feeds
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {rides.slice(0, 4).map(ride => (
                      <div key={ride.id} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/50 dark:border-slate-800/40 relative overflow-hidden">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xl">{ride.hostAvatar}</span>
                          <div>
                            <h4 className="text-xs font-bold text-slate-800 dark:text-white">{ride.hostName}</h4>
                            <p className="text-[9px] text-slate-500">{ride.hostDept}</p>
                          </div>
                          <span className="ml-auto text-[9px] bg-slate-200/50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-semibold px-2 py-0.5 rounded-full">
                            ⭐️ {ride.hostRating}
                          </span>
                        </div>
                        <p className="text-[10px] font-bold text-slate-700 dark:text-slate-300">
                          {ride.pickup} → {ride.destination}
                        </p>
                        <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-200/40 dark:border-slate-800/40 text-[9px] font-bold text-slate-500">
                          <span>⏱️ {ride.departureTime}</span>
                          <span className="text-brand-green-600">🌱 {ride.co2Saved} kg offset</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

              {/* Right 1 Col: Gamification, Leaderboards, Badges */}
              <div className="space-y-6">
                
                {/* ESG Leaderboard */}
                <div className="glass-panel p-5 rounded-2xl space-y-4">
                  <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                    <Award className="h-4 w-4 text-amber-500" /> Sustainability Leaderboard
                  </h3>
                  <div className="space-y-3">
                    {leaderboard.slice(0, 5).map((emp, index) => {
                      const isMe = emp.id === currentUser.id;
                      return (
                        <div
                          key={emp.id}
                          className={`flex items-center justify-between p-2 rounded-xl border transition-all ${
                            isMe 
                              ? "bg-brand-green-50 dark:bg-brand-green-950/20 border-brand-green-200 dark:border-brand-green-900/30 scale-105" 
                              : "bg-white dark:bg-slate-900 border-slate-200/50 dark:border-slate-800/40"
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <span className={`text-xs font-extrabold w-5 text-center ${
                              index === 0 ? "text-amber-500 text-sm" : index === 1 ? "text-slate-400" : index === 2 ? "text-amber-700" : "text-slate-500"
                            }`}>
                              {index + 1}
                            </span>
                            <span className="text-lg">{emp.avatar}</span>
                            <div>
                              <h4 className="text-xs font-bold text-slate-800 dark:text-white flex items-center gap-1">
                                {emp.name} {isMe && <span className="text-[8px] bg-brand-green-100 text-brand-green-800 dark:bg-brand-green-950/40 dark:text-brand-green-400 px-1 py-0.2 rounded font-bold">YOU</span>}
                              </h4>
                              <p className="text-[9px] text-slate-500">{emp.department}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="text-xs font-bold text-brand-green-600 block">{emp.credits} pts</span>
                            <span className="text-[9px] text-slate-400 block">{emp.carbonSaved} kg CO₂</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Badges and Milestones */}
                <div className="glass-panel p-5 rounded-2xl space-y-4">
                  <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                    <Sparkles className="h-4 w-4 text-brand-blue-500" /> Eco Badges & Levels
                  </h3>
                  <div className="grid grid-cols-4 gap-2.5">
                    {badges.map(badge => {
                      const userHasIt = currentUser.badgeIds.includes(badge.id);
                      return (
                        <div
                          key={badge.id}
                          className={`flex flex-col items-center justify-center p-2 rounded-xl border text-center transition-all ${
                            userHasIt 
                              ? "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 grayscale-0 opacity-100" 
                              : "bg-slate-50/40 dark:bg-slate-900/30 border-transparent grayscale opacity-40"
                          }`}
                          title={`${badge.name}: ${badge.description}`}
                        >
                          <span className="text-xl mb-1">{badge.icon}</span>
                          <span className="text-[8px] font-bold text-slate-700 dark:text-slate-400 truncate w-full">{badge.name}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

              </div>

            </div>

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

      {/* Bottom status signature */}
      <footer className="py-6 border-t mt-auto">
        <div className="max-w-7xl mx-auto px-4 text-center text-[10px] text-slate-400 font-semibold flex items-center justify-center gap-1">
          Made with <Heart className="h-3 w-3 text-brand-green-500 fill-brand-green-500" /> for Corporate Sustainability &amp; ESG Compliance
        </div>
      </footer>
    </div>
  );
}

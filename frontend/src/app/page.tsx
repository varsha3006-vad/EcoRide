"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useAppState, Ride, RideRequest } from "@/context/StateContext";
import Navbar from "@/components/Navbar";
import InteractiveMap from "@/components/InteractiveMap";
import AddressAutocomplete from "@/components/AddressAutocomplete";
import ChatModal from "@/components/ChatModal";
import PastRidesModal from "@/components/PastRidesModal";
import ProfileModal from "@/components/ProfileModal";
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
  Navigation,
  Phone
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

const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371; // km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

const getMaskedHostName = (ride: Ride, currentUserId: string) => {
  if (ride.hostId === currentUserId || ride.status === "Started" || ride.status === "Completed") {
    return ride.hostName;
  }
  return "Verified Colleague";
};

const getMaskedHostAvatar = (ride: Ride, currentUserId: string) => {
  if (ride.hostId === currentUserId || ride.status === "Started" || ride.status === "Completed") {
    return ride.hostAvatar;
  }
  return "🚗";
};

const getMaskedRequesterName = (req: RideRequest, currentUserId: string) => {
  if (req.requesterId === currentUserId) {
    return req.requesterName;
  }
  return "Colleague";
};

const getMaskedRequesterAvatar = (req: RideRequest, currentUserId: string) => {
  if (req.requesterId === currentUserId) {
    return req.requesterAvatar;
  }
  return "👤";
};

const formatRideDate = (dateStr?: string) => {
  if (!dateStr) return "";
  const parts = dateStr.split("-");
  if (parts.length !== 3) return dateStr;
  const [year, month, day] = parts;
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

const getOptimalWaypoints = (
  trip: Ride,
  requests: RideRequest[],
  getDistanceFn: (lat1: number, lon1: number, lat2: number, lon2: number) => number
): string[] => {
  const approvedReqs = requests.filter(req => req.rideId === trip.id && req.status === "Accepted");
  const boarded = trip.boardedPassengers || [];
  const unboardedReqs = approvedReqs.filter(req => !boarded.includes(req.requesterId));

  const startLat = trip.driverLat;
  const startLng = trip.driverLng;
  
  // 1. Sort pickups optimally (only for unboarded passengers)
  let sortedPickups = [...unboardedReqs];
  let lastPickupLat = startLat;
  let lastPickupLng = startLng;
  
  if (startLat !== undefined && startLng !== undefined && unboardedReqs.length > 0) {
    const remaining = [...unboardedReqs];
    const sorted: typeof approvedReqs = [];
    let currentLat = startLat;
    let currentLng = startLng;
    
    while (remaining.length > 0) {
      let minIndex = 0;
      let minDistance = Infinity;
      for (let i = 0; i < remaining.length; i++) {
        const r = remaining[i];
        if (r.pickupLat !== undefined && r.pickupLng !== undefined) {
          const dist = getDistanceFn(currentLat, currentLng, r.pickupLat, r.pickupLng);
          if (dist < minDistance) {
            minDistance = dist;
            minIndex = i;
          }
        }
      }
      const nextReq = remaining.splice(minIndex, 1)[0];
      sorted.push(nextReq);
      if (nextReq.pickupLat !== undefined && nextReq.pickupLng !== undefined) {
        currentLat = nextReq.pickupLat;
        currentLng = nextReq.pickupLng;
        lastPickupLat = nextReq.pickupLat;
        lastPickupLng = nextReq.pickupLng;
      }
    }
    sortedPickups = sorted;
  }
  
  // 2. Sort drop-offs optimally starting from the last pickup point
  let sortedDrops = [...approvedReqs];
  if (lastPickupLat !== undefined && lastPickupLng !== undefined && approvedReqs.length > 0) {
    const remaining = [...approvedReqs];
    const sorted: typeof approvedReqs = [];
    let currentLat = lastPickupLat;
    let currentLng = lastPickupLng;
    
    while (remaining.length > 0) {
      let minIndex = 0;
      let minDistance = Infinity;
      for (let i = 0; i < remaining.length; i++) {
        const r = remaining[i];
        const lat = r.dropLat !== undefined ? r.dropLat : currentLat;
        const lng = r.dropLng !== undefined ? r.dropLng : currentLng;
        const dist = getDistanceFn(currentLat, currentLng, lat, lng);
        if (dist < minDistance) {
          minDistance = dist;
          minIndex = i;
        }
      }
      const nextReq = remaining.splice(minIndex, 1)[0];
      sorted.push(nextReq);
      if (nextReq.dropLat !== undefined && nextReq.dropLng !== undefined) {
        currentLat = nextReq.dropLat;
        currentLng = nextReq.dropLng;
      }
    }
    sortedDrops = sorted;
  }
  
  // 3. Build waypoints list
  const pickupsList = sortedPickups.map(r => r.pickup);
  const dropsList = sortedDrops
    .map(r => r.dropPoint)
    .filter(drop => drop !== trip.destination); // exclude final destination
    
  // Return unique waypoints in order: pickups first, then drops
  const result: string[] = [];
  pickupsList.forEach(p => {
    if (!result.includes(p)) result.push(p);
  });
  dropsList.forEach(d => {
    if (!result.includes(d)) result.push(d);
  });
  return result;
};

interface PassengerPinVerifyFormProps {
  rideId: string;
  passengerId: string;
  confirmBoarding: (rideId: string, passengerId: string, enteredPin: string) => { success: boolean; message: string };
}

const PassengerPinVerifyForm = ({ rideId, passengerId, confirmBoarding }: PassengerPinVerifyFormProps) => {
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin.trim()) return;

    setIsVerifying(true);
    setError(false);
    
    setTimeout(() => {
      const res = confirmBoarding(rideId, passengerId, pin);
      if (!res.success) {
        setError(true);
      }
      setIsVerifying(false);
    }, 450);
  };

  return (
    <form onSubmit={handleVerify} className="flex items-center gap-1">
      <input
        type="text"
        required
        maxLength={4}
        value={pin}
        onChange={e => {
          setPin(e.target.value.replace(/\D/g, ""));
          setError(false);
        }}
        className={`w-12 px-1.5 py-0.5 rounded text-center text-xs font-bold bg-slate-950 border text-white outline-none focus:ring-1 focus:ring-brand-green-500 transition-all ${
          error ? "border-rose-500 ring-rose-500/20" : "border-slate-800"
        }`}
        placeholder="PIN"
      />
      <button
        type="submit"
        disabled={isVerifying || pin.length < 4}
        className="px-2 py-0.5 rounded bg-brand-green-600 hover:bg-brand-green-700 disabled:bg-slate-850 disabled:text-slate-500 text-white text-[9px] font-bold cursor-pointer transition-all"
      >
        {isVerifying ? "..." : "Verify"}
      </button>
    </form>
  );
};

export default function HomePage() {
  const {
    currentUser,
    role,
    rides,
    requests,
    employees,
    badges,
    leaderboard,
    createRide,
    requestJoinRide,
    handleRequestResponse,
    checkRideOverlap,
    sendMessage,
    startRide,
    completeRide,
    cancelRide,
    adminDeleteRide,
    adminDeactivateEmployee,
    isLoggedIn,
    login,
    updateNotificationPrefs,
    confirmBoarding,
    auditLogs,
    activeCity,
    setActiveCity,
    addNotification,
    sendGlobalAnnouncement,
    notifications,
    markNotificationsRead
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

  // Safety Live Tracking states
  const [isSafetyShareView, setIsSafetyShareView] = useState(false);
  const [safetyRideId, setSafetyRideId] = useState<string | null>(null);
  const [safetyPassengerId, setSafetyPassengerId] = useState<string | null>(null);

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


  // Reset form error when switching wizards
  useEffect(() => {
    setFormError("");
  }, [activeWizard]);

  // Auto-detect browser location city on mount
  useEffect(() => {
    if (typeof window === "undefined" || !navigator.geolocation) return;

    let checkInterval: NodeJS.Timeout;

    const runGeocode = () => {
      navigator.geolocation.getCurrentPosition(
        position => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          const win = window as any;

          if (win.google && win.google.maps && win.google.maps.Geocoder) {
            if (checkInterval) clearInterval(checkInterval);
            const geocoder = new win.google.maps.Geocoder();
            geocoder.geocode({ location: { lat, lng } }, (results: any, status: any) => {
              if (status === "OK" && results && results[0]) {
                const cityComp = results[0].address_components.find((comp: any) => 
                  comp.types.includes("locality") || comp.types.includes("administrative_area_level_2")
                );
                if (cityComp) {
                  const detectedCity = cityComp.long_name;
                  if (detectedCity.toLowerCase().includes("bengaluru") || detectedCity.toLowerCase().includes("bangalore")) {
                    setActiveCity("Bangalore");
                  } else if (detectedCity.toLowerCase().includes("mumbai") || detectedCity.toLowerCase().includes("bombay")) {
                    setActiveCity("Mumbai");
                  } else if (detectedCity.toLowerCase().includes("delhi") || detectedCity.toLowerCase().includes("gurgaon") || detectedCity.toLowerCase().includes("noida") || detectedCity.toLowerCase().includes("ncr")) {
                    setActiveCity("Delhi NCR");
                  } else if (detectedCity.toLowerCase().includes("pune")) {
                    setActiveCity("Pune");
                  } else {
                    setActiveCity(detectedCity);
                  }
                }
              }
            });
          }
        },
        error => {
          console.warn("Geolocation not permitted or failed. Using default city Bangalore.", error);
          if (checkInterval) clearInterval(checkInterval);
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    };

    // Run periodically until Google Maps is loaded
    checkInterval = setInterval(() => {
      const win = window as any;
      if (win.google && win.google.maps && win.google.maps.Geocoder) {
        runGeocode();
      }
    }, 1000);

    // Also run immediately
    runGeocode();

    return () => {
      if (checkInterval) clearInterval(checkInterval);
    };
  }, [currentUser, setActiveCity]);

  // Check for shared safety parameters on load
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const rideId = params.get("shareRideId");
      const psgrId = params.get("passengerId");
      if (rideId && psgrId) {
        setIsSafetyShareView(true);
        setSafetyRideId(rideId);
        setSafetyPassengerId(psgrId);
      }
    }
  }, []);

  // Admin filter states
  const [adminActiveTab, setAdminActiveTab] = useState<"kpis" | "rides" | "employees" | "audit">("kpis");
  const [announcementText, setAnnouncementText] = useState("");
  const [announcementSent, setAnnouncementSent] = useState(false);

  // Passenger auto-optimization search states
  const [passengerSearchPickup, setPassengerSearchPickup] = useState("");
  const [passengerSearchDrop, setPassengerSearchDrop] = useState("");
  const [calculatedDeviations, setCalculatedDeviations] = useState<Record<string, number>>({});
  const [calculatingDeviations, setCalculatingDeviations] = useState(false);

  const calculateAllDeviations = async () => {
    if (!passengerSearchPickup || !passengerSearchDrop) return;
    setCalculatingDeviations(true);

    const google = (window as any).google;
    if (!google || !google.maps) {
      setCalculatingDeviations(false);
      return;
    }

    const geocoder = new google.maps.Geocoder();

    const getLatLng = (address: string): Promise<any> => {
      return new Promise((resolve) => {
        geocoder.geocode({ address }, (results: any, status: any) => {
          if (status === "OK" && results && results[0]) {
            resolve(results[0].geometry.location);
          } else {
            resolve(null);
          }
        });
      });
    };

    try {
      const pPickupLatLng = await getLatLng(passengerSearchPickup);
      const pDropLatLng = await getLatLng(passengerSearchDrop);

      if (!pPickupLatLng) {
        alert("Could not geocode your pickup address. Please try another address.");
        setCalculatingDeviations(false);
        return;
      }
      if (!pDropLatLng) {
        alert("Could not geocode your drop-off address. Please try another address.");
        setCalculatingDeviations(false);
        return;
      }

      const pPickupLat = pPickupLatLng.lat();
      const pPickupLng = pPickupLatLng.lng();
      const pDropLat = pDropLatLng.lat();
      const pDropLng = pDropLatLng.lng();

      const newDeviations: Record<string, number> = {};

      const getDistance = (lat1: number, lng1: number, lat2: number, lng2: number) => {
        const dy = lat1 - lat2;
        const dx = lng1 - lng2;
        const latMid = (lat1 + lat2) / 2;
        const dy_km = dy * 111.1;
        const dx_km = dx * 111.1 * Math.cos(latMid * Math.PI / 180);
        return Math.sqrt(dx_km * dx_km + dy_km * dy_km);
      };

      // Geocode all rides in parallel
      const activeRides = rides.filter(r => {
        if (r.hostId === currentUser.id) return false;
        const isJoinable = r.status === "Published" || (r.status === "Started" && r.seatsAvailable > 0);
        if (!isJoinable) return false;
        if (r.womenOnly && currentUser.gender?.toLowerCase() !== "female") return false;
        return true;
      });

      await Promise.all(
        activeRides.map(async (ride) => {
          const rPickupLatLng = await getLatLng(ride.pickup);
          const rDestLatLng = await getLatLng(ride.destination);

          if (rPickupLatLng && rDestLatLng) {
            const dHostToPassengerPickup = getDistance(
              rPickupLatLng.lat(), rPickupLatLng.lng(),
              pPickupLat, pPickupLng
            );
            const dPassengerPickupToDrop = getDistance(
              pPickupLat, pPickupLng,
              pDropLat, pDropLng
            );
            const dPassengerDropToHostDest = getDistance(
              pDropLat, pDropLng,
              rDestLatLng.lat(), rDestLatLng.lng()
            );
            const dHostPickupToDest = getDistance(
              rPickupLatLng.lat(), rPickupLatLng.lng(),
              rDestLatLng.lat(), rDestLatLng.lng()
            );
            const detourDistance = dHostToPassengerPickup + dPassengerPickupToDrop + dPassengerDropToHostDest;
            const dev = Math.max(0, detourDistance - dHostPickupToDest);
            newDeviations[ride.id] = dev;
          } else {
            // Mock deviation based on string length similarity as a smart fallback if geocoding fails
            const mockDev = Math.abs(ride.pickup.length - passengerSearchPickup.length) * 0.5 + 2.0;
            newDeviations[ride.id] = mockDev;
          }
        })
      );

      setCalculatedDeviations(newDeviations);
    } catch (e) {
      console.error("Error calculating deviations:", e);
    } finally {
      setCalculatingDeviations(false);
    }
  };

  // Join ride custom pickup & vicinity verification states
  const [joiningRide, setJoiningRide] = useState<any | null>(null);
  const [passengerPickupInput, setPassengerPickupInput] = useState("");
  const [passengerDropInput, setPassengerDropInput] = useState("");
  const [vicinityError, setVicinityError] = useState("");
  const [verifyingVicinity, setVerifyingVicinity] = useState(false);
  const [reviewingRequest, setReviewingRequest] = useState<any | null>(null);
  const [mapViewPreferences, setMapViewPreferences] = useState<Record<string, "embedded" | "native">>({});

  useEffect(() => {
    if (joiningRide) {
      setPassengerPickupInput(passengerSearchPickup || joiningRide.pickup);
      setPassengerDropInput(passengerSearchDrop || joiningRide.destination);
    }
  }, [joiningRide, passengerSearchPickup, passengerSearchDrop]);

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

  // Profile Editor states
  const [showProfileModal, setShowProfileModal] = useState(false);

  useEffect(() => {
    const handleOpen = () => setShowProfileModal(true);
    window.addEventListener("open-profile-editor", handleOpen);
    return () => window.removeEventListener("open-profile-editor", handleOpen);
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

    const overlapResult = checkRideOverlap(joiningRide.rideDate, joiningRide.departureTime, currentUser.id);
    if (overlapResult.hasOverlap) {
      setVicinityError(`Scheduling Overlap: This ride overlaps with your scheduled ride to ${overlapResult.overlappingRide?.destination} at ${overlapResult.overlappingRide?.departureTime} (${formatRideDate(overlapResult.overlappingRide?.rideDate)}).`);
      setVerifyingVicinity(false);
      return;
    }

    const google = (window as any).google;
    if (!google || !google.maps) {
      requestJoinRide(joiningRide.id, passengerPickupInput, undefined, undefined, passengerDropInput || joiningRide.destination, undefined, undefined, undefined);
      setJoiningRide(null);
      setPassengerPickupInput("");
      setPassengerDropInput("");
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

      geocoder.geocode({ address: passengerDropInput || joiningRide.destination }, (dropRes: any, dropStatus: any) => {
        let dropLat = undefined;
        let dropLng = undefined;
        if (dropStatus === "OK" && dropRes[0]) {
          dropLat = dropRes[0].geometry.location.lat();
          dropLng = dropRes[0].geometry.location.lng();
        }

        geocoder.geocode({ address: joiningRide.pickup }, (hostPickupRes: any, hostPickupStatus: any) => {
          if (hostPickupStatus !== "OK" || !hostPickupRes[0]) {
            requestJoinRide(joiningRide.id, passengerPickupInput, passengerLatLng.lat(), passengerLatLng.lng(), passengerDropInput || joiningRide.destination, dropLat, dropLng, undefined);
            setJoiningRide(null);
            setPassengerPickupInput("");
            setPassengerDropInput("");
            setVerifyingVicinity(false);
            return;
          }

          const hostPickupLatLng = hostPickupRes[0].geometry.location;

          geocoder.geocode({ address: joiningRide.destination }, (hostDestRes: any, hostDestStatus: any) => {
            if (hostDestStatus !== "OK" || !hostDestRes[0]) {
              requestJoinRide(joiningRide.id, passengerPickupInput, passengerLatLng.lat(), passengerLatLng.lng(), passengerDropInput || joiningRide.destination, dropLat, dropLng, undefined);
              setJoiningRide(null);
              setPassengerPickupInput("");
              setPassengerDropInput("");
              setVerifyingVicinity(false);
              return;
            }

            const hostDestLatLng = hostDestRes[0].geometry.location;

             const getDistance = (lat1: number, lng1: number, lat2: number, lng2: number) => {
               const dy = lat1 - lat2;
               const dx = lng1 - lng2;
               const latMid = (lat1 + lat2) / 2;
               const dy_km = dy * 111.1;
               const dx_km = dx * 111.1 * Math.cos(latMid * Math.PI / 180);
               return Math.sqrt(dx_km * dx_km + dy_km * dy_km);
             };

             const dHostToPassengerPickup = getDistance(
               hostPickupLatLng.lat(), hostPickupLatLng.lng(),
               passengerLatLng.lat(), passengerLatLng.lng()
             );

             const effectiveDropLat = dropLat !== undefined ? dropLat : hostDestLatLng.lat();
             const effectiveDropLng = dropLng !== undefined ? dropLng : hostDestLatLng.lng();

             const dPassengerPickupToDrop = getDistance(
               passengerLatLng.lat(), passengerLatLng.lng(),
               effectiveDropLat, effectiveDropLng
             );

             const dPassengerDropToHostDest = getDistance(
               effectiveDropLat, effectiveDropLng,
               hostDestLatLng.lat(), hostDestLatLng.lng()
             );

             const dHostPickupToDest = getDistance(
               hostPickupLatLng.lat(), hostPickupLatLng.lng(),
               hostDestLatLng.lat(), hostDestLatLng.lng()
             );

             const detourDistance = dHostToPassengerPickup + dPassengerPickupToDrop + dPassengerDropToHostDest;
             const deviationKm = Math.max(0, detourDistance - dHostPickupToDest);

             requestJoinRide(joiningRide.id, passengerPickupInput, passengerLatLng.lat(), passengerLatLng.lng(), passengerDropInput || joiningRide.destination, dropLat, dropLng, deviationKm);
            setJoiningRide(null);
            setPassengerPickupInput("");
            setPassengerDropInput("");
            setVerifyingVicinity(false);
          });
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

    const overlapResult = checkRideOverlap(rideDate, time, currentUser.id);
    if (overlapResult.hasOverlap) {
      setFormError(`Scheduling Overlap: This ride overlaps with your scheduled ride to ${overlapResult.overlappingRide?.destination} at ${overlapResult.overlappingRide?.departureTime} (${formatRideDate(overlapResult.overlappingRide?.rideDate)}).`);
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

  const handleShareRide = (rideId: string, passengerId: string) => {
    const shareUrl = `${window.location.origin}/?shareRideId=${rideId}&passengerId=${passengerId}`;
    const shareText = `I am sharing my live EcoRide commute status with you for safety. Track my location, ETA, and route real-time here: ${shareUrl}`;

    const nav = navigator as any;
    if (nav.share) {
      nav.share({
        title: "EcoRide Safety Live Share",
        text: shareText,
        url: shareUrl
      }).catch((err: any) => console.log("Share failed:", err));
    } else {
      // Fallback copy
      navigator.clipboard.writeText(shareText).then(() => {
        addNotification({
          id: `n-share-${Date.now()}`,
          title: "Safety Link Copied! 📋",
          message: "Live safety tracking link copied to clipboard. Opening WhatsApp...",
          timestamp: "Just now",
          type: "success",
          read: false
        });
        const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;
        window.open(whatsappUrl, "_blank");
      }).catch((err: any) => {
        console.error("Clipboard copy failed:", err);
      });
    }
  };

  const myCreatedRides = rides.filter(r => r.hostId === currentUser.id);
  const myJoinedRides = rides.filter(r => r.passengers.includes(currentUser.id));
  const myUpcomingTrips = [...myCreatedRides, ...myJoinedRides].filter(r => r.status?.toLowerCase() !== "completed" && r.status?.toLowerCase() !== "cancelled");

  // Search/Filter rides list
  const filteredRides = rides.filter(r => {
    if (r.hostId === currentUser.id) return false; // Hide own rides
    const isJoinable = r.status === "Published" || (r.status === "Started" && r.seatsAvailable > 0);
    if (!isJoinable) return false;

    // City Geofencing: Only show rides in the user's active city
    const rideCity = r.city || "";
    const isSameCity = rideCity.toLowerCase() === activeCity.toLowerCase() ||
      r.pickup.toLowerCase().includes(activeCity.toLowerCase()) ||
      r.destination.toLowerCase().includes(activeCity.toLowerCase());
    if (!isSameCity) return false;

    if (searchPickup && !r.pickup.toLowerCase().includes(searchPickup.toLowerCase())) return false;
    if (searchDest && !r.destination.toLowerCase().includes(searchDest.toLowerCase())) return false;
    if (filterDept !== "All" && r.hostDept !== filterDept) return false;
    if (filterVehicle !== "All" && r.vehicleType !== filterVehicle) return false;
    if (r.womenOnly && currentUser.gender?.toLowerCase() !== "female") return false;
    return true;
  }).sort((a, b) => {
    const devA = calculatedDeviations[a.id];
    const devB = calculatedDeviations[b.id];
    if (devA !== undefined && devB !== undefined) {
      return devA - devB;
    }
    if (devA !== undefined) return -1;
    if (devB !== undefined) return 1;
    return 0;
  });

  // Find pending requests on the user's hosted rides
  const pendingRequestsForMe = requests.filter(req => {
    const ride = rides.find(r => r.id === req.rideId);
    return ride && ride.hostId === currentUser.id && req.status === "Pending";
  });

  // Public SafeCommute Tracking View (bypasses login for shared tracking URL)
  if (isSafetyShareView && safetyRideId && safetyPassengerId) {
    const targetRide = rides.find(r => r.id === safetyRideId);
    const targetPassenger = employees.find(e => e.id === safetyPassengerId);
    const host = targetRide ? employees.find(e => e.id === targetRide.hostId) : null;
    
    return (
      <div className="flex-1 flex flex-col min-h-screen bg-slate-950 text-slate-105 dark:text-slate-100 p-4 sm:p-6 select-none relative overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808005_1px,transparent_1px),linear-gradient(to_bottom,#80808005_1px,transparent_1px)] bg-[size:24px_24px] opacity-30 z-0"></div>
        <div className="absolute top-[-10%] left-[-10%] h-[500px] w-[500px] rounded-full bg-brand-green-500/5 blur-[120px] z-0"></div>
        <div className="absolute bottom-[-10%] right-[-10%] h-[500px] w-[500px] rounded-full bg-brand-blue-500/5 blur-[120px] z-0"></div>

        <header className="max-w-5xl w-full mx-auto flex items-center justify-between border-b border-slate-900 pb-4 mb-6 relative z-10">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-brand-green-500/10 text-brand-green-400 font-black text-sm tracking-widest">🌱 EcoRide</span>
            <h1 className="text-xs font-black tracking-wider text-slate-400 uppercase">Safety Stream</h1>
          </div>
          <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-450 text-[9px] font-black uppercase tracking-wider flex items-center gap-1.5 animate-pulse">
            🛡️ SafeCommute Active
          </span>
        </header>

        <main className="flex-1 max-w-5xl w-full mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
          <div className="md:col-span-2 space-y-4">
            {targetRide ? (
              <div className="w-full aspect-[4/3] md:aspect-video rounded-3xl overflow-hidden border border-slate-800 shadow-2xl relative">
                <InteractiveMap
                  pickup={targetRide.pickup}
                  destination={targetRide.destination}
                  passengerPickup={targetRide.pickup}
                  passengerDrop={targetRide.destination}
                  isDriving={true}
                  rideId={targetRide.id}
                  passengerId={targetPassenger?.id}
                />
              </div>
            ) : (
              <div className="w-full aspect-[4/3] rounded-3xl bg-slate-900 border border-slate-850 flex items-center justify-center text-slate-500 text-xs font-bold">
                ⚠️ Active tracking route map loading...
              </div>
            )}
          </div>

          <div className="space-y-6">
            {/* Passenger Status */}
            <div className="glass-panel p-5 rounded-3xl border border-slate-900 bg-slate-900/40 space-y-3">
              <h3 className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Shared Commute Details</h3>
              {targetPassenger ? (
                <div className="flex items-center gap-3 p-3 bg-white/5 rounded-2xl border border-slate-900">
                  <span className="text-3xl">{targetPassenger.avatar}</span>
                  <div>
                    <h4 className="text-xs font-bold text-white">{targetPassenger.name}</h4>
                    <p className="text-[9px] text-slate-400">{targetPassenger.designation} · {targetPassenger.department}</p>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-500">Resolving passenger card...</p>
              )}
            </div>

            {/* Ride Status */}
            {targetRide ? (
              <div className="glass-panel p-5 rounded-3xl border border-slate-900 bg-slate-900/40 space-y-4">
                <h3 className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Trip Progress</h3>
                <div className="space-y-2">
                  <p className="text-[10px] font-bold text-slate-350">Route: <span className="text-brand-green-400 font-normal">{targetRide.pickup} → {targetRide.destination}</span></p>
                  <p className="text-[10px] font-bold text-slate-350">Departure: <span className="font-normal">{targetRide.departureTime} ({targetRide.rideDate ? formatRideDate(targetRide.rideDate) : "Today"})</span></p>
                  <p className="text-[10px] font-bold text-slate-350 flex items-center gap-1.5">
                    Status: <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-450 text-[9px] font-extrabold uppercase">{targetRide.status}</span>
                  </p>
                </div>

                {host && (
                  <div className="pt-3 border-t border-slate-900 space-y-1.5">
                    <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Driver Details</p>
                    <div className="flex items-center gap-2.5">
                      <span className="text-2xl">{host.avatar}</span>
                      <div>
                        <p className="text-xs font-bold text-white">{host.name}</p>
                        <p className="text-[9px] text-slate-450">Driving: {targetRide.vehicleModel} ({targetRide.vehiclePlate})</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="glass-panel p-5 rounded-3xl border border-slate-900 bg-slate-900/40 text-center text-xs text-slate-500">
                Resolving commute details...
              </div>
            )}

            {/* Notice Footer */}
            <div className="text-[9px] text-slate-500 space-y-1 bg-slate-900/20 p-4 rounded-2xl border border-slate-900">
              <p className="font-black text-slate-400 uppercase tracking-wider">🛡️ SafeCommute Stream Notice</p>
              <p>This tracking feed is dynamically generated for safety monitoring purposes. Location pins update automatically via live vehicle telemetry.</p>
            </div>
            
            <button
              onClick={() => {
                // Clear safety view state and redirect to main homepage/login
                setIsSafetyShareView(false);
                setSafetyRideId(null);
                setSafetyPassengerId(null);
                window.history.pushState({}, document.title, window.location.pathname);
              }}
              className="w-full py-3.5 rounded-2xl bg-slate-900 hover:bg-slate-850 border border-slate-850 hover:border-slate-800 text-xs font-bold text-slate-450 hover:text-white transition-all cursor-pointer text-center block"
            >
              ← Back to Login / Dashboard
            </button>
          </div>
        </main>
      </div>
    );
  }

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

            {/* System Admin Portal Entry */}
            <div className="pt-4 border-t border-slate-900/60">
              <button
                type="button"
                onClick={() => {
                  setEmailInput("admin@company.com");
                  login("admin@company.com");
                }}
                className="w-full py-3.5 rounded-xl bg-slate-900/40 hover:bg-slate-900 border border-slate-850 hover:border-brand-blue-500/30 hover:text-white text-slate-400 text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Shield className="h-4 w-4 text-brand-blue-500" />
                Executive Admin Login (admin@company.com)
              </button>
            </div>
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

      {/* Global Announcements Live Scrolling Banner */}
      {(() => {
        const recentAnnouncements = notifications
          .filter((n: any) => n.id.startsWith("ann-"))
          .map((n: any) => {
            let timeMs = 0;
            try {
              timeMs = new Date(n.timestamp).getTime();
            } catch (e) {}
            if (isNaN(timeMs) || timeMs === 0) {
              const idPart = n.id.replace("ann-", "");
              const parsed = parseInt(idPart);
              if (!isNaN(parsed)) timeMs = parsed;
            }
            return { ...n, timeMs };
          })
          .filter((n: any) => {
            const ageMs = Date.now() - n.timeMs;
            return ageMs > 0 && ageMs < 24 * 60 * 60 * 1000; // 24 hours
          })
          .sort((a: any, b: any) => b.timeMs - a.timeMs);

        const latestAnn = recentAnnouncements[0];
        if (!latestAnn) return null;

        return (
          <div className="bg-emerald-600 dark:bg-emerald-700 text-white py-2.5 shadow-sm relative z-30 overflow-hidden border-b border-emerald-500/10 flex items-center select-none">
            <style>{`
              @keyframes marquee-scroll {
                0% { transform: translateX(100%); }
                100% { transform: translateX(-100%); }
              }
              .custom-marquee-text {
                animation: marquee-scroll 60s linear infinite;
              }
            `}</style>
            <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
              <span className="text-[9px] font-black uppercase tracking-widest bg-white/20 px-2 py-0.5 rounded flex-shrink-0 relative z-10">
                📢 SYSTEM BULLETIN
              </span>
              <div className="relative flex-1 overflow-hidden h-4 flex items-center">
                <div className="custom-marquee-text whitespace-nowrap text-xs font-black absolute pl-[100%]">
                  {latestAnn.message} &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; 🌱 &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; {latestAnn.message} &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; 🌱 &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; {latestAnn.message}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

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
              <button
                onClick={() => setAdminActiveTab("audit")}
                className={`pb-3 text-xs font-bold transition-all relative ${
                  adminActiveTab === "audit" ? "text-brand-blue-600 dark:text-brand-blue-400 border-b-2 border-brand-blue-500" : "text-slate-500"
                }`}
              >
                Security Audit Logs 🔒
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
                        sendGlobalAnnouncement(announcementText);
                        setAnnouncementSent(true);
                        setTimeout(() => setAnnouncementSent(false), 3000);
                        setAnnouncementText("");
                      }}
                      className="px-4 py-2.5 rounded-xl bg-brand-blue-600 hover:bg-brand-blue-700 text-white text-xs font-bold transition-colors cursor-pointer"
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

            {/* Admin Security Audit Logs tab */}
            {adminActiveTab === "audit" && (
              <div className="glass-panel p-5 rounded-2xl space-y-4 animate-fade-in">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                      <Shield className="h-4 w-4 text-brand-green-500" /> Security Audit Log Console
                    </h3>
                    <p className="text-[10px] text-slate-500">
                      Real-time immutable audit trail monitoring for SOC1 and SOC2 compliance verification.
                    </p>
                  </div>
                  
                  {/* Export and filter */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        const headers = ["ID", "Timestamp", "User ID", "Email", "Action", "Severity", "Details"];
                        const rows = auditLogs.map(log => [
                          log.id,
                          log.timestamp,
                          log.userId,
                          log.userEmail,
                          log.action,
                          log.severity,
                          log.details
                        ]);
                        const csvContent = "data:text/csv;charset=utf-8," 
                          + [headers.join(","), ...rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(","))].join("\n");
                        const encodedUri = encodeURI(csvContent);
                        const link = document.createElement("a");
                        link.setAttribute("href", encodedUri);
                        link.setAttribute("download", `ecoride_security_audit_logs_${Date.now()}.csv`);
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold rounded-lg bg-slate-105 hover:bg-slate-200 dark:bg-slate-80 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer border border-slate-200/40 dark:border-slate-700/40"
                    >
                      <Download className="h-3 w-3" /> Export Logs CSV
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold">
                        <th className="py-2.5">Timestamp</th>
                        <th className="py-2.5">User</th>
                        <th className="py-2.5">Action Code</th>
                        <th className="py-2.5">Severity</th>
                        <th className="py-2.5">Event Details</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-105 dark:divide-slate-900 font-mono text-[10px] divide-slate-100 dark:divide-slate-900">
                      {auditLogs.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-slate-500">
                            No security audit logs recorded yet.
                          </td>
                        </tr>
                      ) : (
                        auditLogs.map(log => {
                          const severityColors = {
                            INFO: "bg-blue-500/10 text-blue-500",
                            WARNING: "bg-amber-500/10 text-amber-550 border border-amber-500/20 text-amber-500",
                            CRITICAL: "bg-rose-500/10 text-rose-500 border border-rose-500/20 font-black animate-pulse"
                          };
                          return (
                            <tr key={log.id} className="text-slate-700 dark:text-slate-350 hover:bg-slate-50/50 dark:hover:bg-slate-900/30">
                              <td className="py-2.5 whitespace-nowrap text-slate-450">
                                {new Date(log.timestamp).toLocaleString()}
                              </td>
                              <td className="py-2.5">
                                <div className="max-w-[120px] truncate" title={log.userEmail}>
                                  {log.userEmail}
                                </div>
                              </td>
                              <td className="py-2.5 font-bold text-slate-800 dark:text-slate-200">
                                {log.action}
                              </td>
                              <td className="py-2.5">
                                <span className={`px-2 py-0.5 rounded text-[8px] uppercase tracking-wider font-extrabold ${severityColors[log.severity]}`}>
                                  {log.severity}
                                </span>
                              </td>
                              <td className="py-2.5 text-slate-550 dark:text-slate-400 font-sans max-w-[280px] break-words">
                                {log.details}
                              </td>
                            </tr>
                          );
                        })
                      )}
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
                          </select>
                        </div>
                      </div>

                      {currentUser?.gender?.toLowerCase() === "female" && (
                        <div className="flex items-center gap-2 p-3 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-200/40 dark:border-slate-800/40">
                          <input
                            type="checkbox"
                            id="womenOnly"
                            checked={womenOnly}
                            onChange={e => setWomenOnly(e.target.checked)}
                            className="rounded border-slate-200 dark:border-slate-800 text-brand-green-600 focus:ring-brand-green-500 h-4 w-4 cursor-pointer"
                          />
                          <label htmlFor="womenOnly" className="text-xs font-bold text-slate-700 dark:text-slate-350 cursor-pointer">
                            👩‍👧‍👧 Female-Only Ride (Only female colleagues can join)
                          </label>
                        </div>
                      )}

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

                    {/* Deviation-based search block */}
                    <div className="p-4 rounded-2xl bg-brand-blue-500/5 border border-brand-blue-500/20 space-y-3.5">
                      <h4 className="text-xs font-bold text-brand-blue-700 dark:text-brand-blue-400 flex items-center gap-1.5">
                        🧭 Find Suitable Rides (Ordered by Lowest Route Deviation)
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 relative z-30">
                        <AddressAutocomplete
                          value={passengerSearchPickup}
                          onChange={setPassengerSearchPickup}
                          placeholder="Your exact pickup address..."
                          label="Your Pickup Address"
                        />
                        <AddressAutocomplete
                          value={passengerSearchDrop}
                          onChange={setPassengerSearchDrop}
                          placeholder="Your exact drop-off address..."
                          label="Your Drop-off Address"
                        />
                      </div>
                      <div className="flex justify-end gap-2 pt-1.5">
                        {Object.keys(calculatedDeviations).length > 0 && (
                          <button
                            type="button"
                            onClick={() => {
                              setPassengerSearchPickup("");
                              setPassengerSearchDrop("");
                              setCalculatedDeviations({});
                            }}
                            className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-650 hover:bg-slate-50 text-[10px] font-bold cursor-pointer"
                          >
                            Clear Routing
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={calculateAllDeviations}
                          disabled={calculatingDeviations || !passengerSearchPickup || !passengerSearchDrop}
                          className="px-3.5 py-1.5 rounded-xl bg-brand-blue-600 hover:bg-brand-blue-700 disabled:bg-slate-300 text-white text-[10px] font-bold cursor-pointer transition-all"
                        >
                          {calculatingDeviations ? "Calculating Deviations..." : "Calculate & Sort by Lowest Deviation"}
                        </button>
                      </div>
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
                        filteredRides.map((ride, idx) => {
                          const myRequest = requests.find(req => req.rideId === ride.id && req.requesterId === currentUser.id);
                          return (
                            <div key={ride.id} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/50 dark:border-slate-800/40 flex items-center justify-between gap-4 animate-fade-in">
                              <div className="flex items-center gap-3">
                                <span className="text-2xl">{getMaskedHostAvatar(ride, currentUser.id)}</span>
                                <div>
                                  <h4 className="text-xs font-bold text-slate-800 dark:text-white flex items-center gap-1">
                                    {getMaskedHostName(ride, currentUser.id)} <span className="text-[9px] text-slate-500 font-normal">({ride.hostDept})</span>
                                  </h4>
                                  <p className="text-[10px] text-slate-500 font-semibold">{ride.pickup} → {ride.destination}</p>
                                  <div className="flex items-center gap-2 mt-1">
                                    {ride.rideDate && (
                                      <span className="text-[9px] bg-white dark:bg-slate-800 border px-1.5 py-0.5 rounded text-slate-600 dark:text-slate-300 font-medium flex items-center gap-1">
                                        <Calendar className="h-2.5 w-2.5 text-slate-400" /> {formatRideDate(ride.rideDate)}
                                      </span>
                                    )}
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
                                    {ride.womenOnly && (
                                      <span className="text-[9px] bg-purple-50 text-purple-750 dark:bg-purple-950/30 dark:text-purple-400 px-1.5 py-0.5 rounded font-bold">
                                        👩‍👧‍👧 Female-Only
                                      </span>
                                    )}
                                    {calculatedDeviations[ride.id] !== undefined && (
                                      <span className="text-[9px] bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 px-1.5 py-0.5 rounded font-bold border border-emerald-250/20">
                                        ↪ Route Match: {calculatedDeviations[ride.id].toFixed(2)} km deviation
                                      </span>
                                    )}
                                    {Object.keys(calculatedDeviations).length > 0 &&
                                      calculatedDeviations[ride.id] !== undefined &&
                                      filteredRides.filter(r => calculatedDeviations[r.id] !== undefined)[0]?.id === ride.id && (
                                        <span className="text-[9px] bg-amber-500 text-white dark:bg-amber-600 px-1.5 py-0.5 rounded font-black animate-pulse flex items-center gap-1 shadow-sm">
                                          Best Match (Min Detour) 👍
                                        </span>
                                      )}
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
                                  ) : (() => {
                                    const overlap = checkRideOverlap(ride.rideDate, ride.departureTime, currentUser.id);
                                    if (overlap.hasOverlap) {
                                      return (
                                        <span className="inline-block text-[10px] font-bold px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-900 text-slate-400 border border-slate-200/20" title={`Overlaps with your ride to ${overlap.overlappingRide?.destination} at ${overlap.overlappingRide?.departureTime}`}>
                                          Overlap ⚠️
                                        </span>
                                      );
                                    }
                                    return (
                                      <button
                                        onClick={() => setJoiningRide(ride)}
                                        className="px-2.5 py-1.5 rounded-lg bg-brand-blue-600 hover:bg-brand-blue-700 text-white text-[10px] font-bold transition-all cursor-pointer"
                                      >
                                        Join Ride
                                      </button>
                                    );
                                  })()
                                ) : (() => {
                                  const overlap = checkRideOverlap(ride.rideDate, ride.departureTime, currentUser.id);
                                  if (overlap.hasOverlap) {
                                    return (
                                      <span className="inline-block text-[10px] font-bold px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-900 text-slate-400 border border-slate-200/20" title={`Overlaps with your ride to ${overlap.overlappingRide?.destination} at ${overlap.overlappingRide?.departureTime}`}>
                                        Overlap ⚠️
                                      </span>
                                    );
                                  }
                                  return (
                                    <button
                                      onClick={() => setJoiningRide(ride)}
                                      className="px-2.5 py-1.5 rounded-lg bg-brand-blue-600 hover:bg-brand-blue-700 text-white text-[10px] font-bold transition-all cursor-pointer"
                                    >
                                      Join Ride
                                    </button>
                                  );
                                })()}
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
                      setActiveWizard("host");
                    }}
                    className="group relative flex items-center justify-between p-6 rounded-3xl bg-gradient-to-tr from-brand-green-600 to-brand-green-500 text-white shadow-xl hover:brightness-105 transition-all cursor-pointer overflow-hidden"
                  >
                    <div className="z-10 text-left">
                      <span className="inline-block bg-white/20 text-[9px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full mb-1.5">
                        Host Commuters
                      </span>
                      <h3 className="text-lg font-extrabold tracking-tight">Offer a Ride</h3>
                      <p className="text-[11px] text-brand-green-50 mt-1 max-w-[220px] leading-relaxed">
                        Share your route, reduce corporate congestion, and earn ESG credits.
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
                                <span className="text-lg">{getMaskedRequesterAvatar(req, currentUser.id)}</span>
                                <div>
                                  <h5 className="text-[11px] font-bold text-slate-800 dark:text-white">
                                    {getMaskedRequesterName(req, currentUser.id)} <span className="text-[9px] text-slate-500 font-normal">({req.requesterDept})</span>
                                  </h5>
                                  <p className="text-[9px] text-slate-500">
                                    Wants to join: {ride?.pickup} → {ride?.destination}
                                  </p>
                                  <div className="flex flex-wrap gap-1.5 mt-1">
                                    <span className="text-[8px] bg-brand-blue-50 text-brand-blue-700 dark:bg-brand-blue-950/30 dark:text-brand-blue-400 px-1.5 py-0.5 rounded font-bold">
                                      📍 Pickup: {req.pickup}
                                    </span>
                                    <span className="text-[8px] bg-purple-50 text-purple-700 dark:bg-purple-950/30 dark:text-purple-400 px-1.5 py-0.5 rounded font-bold">
                                      🏁 Drop-off: {req.dropPoint || ride?.destination}
                                    </span>
                                    {req.deviationKm !== undefined && (
                                      <span className="text-[8px] bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-405 dark:text-amber-400 px-1.5 py-0.5 rounded font-bold">
                                        ↪ Deviation: {req.deviationKm.toFixed(2)} km
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className="flex gap-1.5">
                                <button
                                  onClick={() => setReviewingRequest(req)}
                                  className="px-2.5 py-1.5 rounded-lg bg-brand-blue-600 hover:bg-brand-blue-700 text-white text-[9px] font-bold flex items-center gap-0.5 cursor-pointer"
                                >
                                  Review Path
                                </button>
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
                        const boardedRaw = trip.boardedPassengers as any;
                        const boardedArray = Array.isArray(boardedRaw)
                          ? boardedRaw
                          : (typeof boardedRaw === "string" && boardedRaw.startsWith("{")
                            ? boardedRaw.slice(1, -1).split(",").map((s: string) => s.trim().replace(/^"|"$/g, ''))
                            : []);
                        const hasBoarded = boardedArray.includes(currentUser.id);
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
                                    {trip.rideDate && (
                                      <span className="flex items-center gap-0.5">
                                        <Calendar className="h-3 w-3 text-slate-400" /> {formatRideDate(trip.rideDate)}
                                      </span>
                                    )}
                                    <span className="flex items-center gap-0.5">
                                      <Clock className="h-3 w-3" /> {trip.departureTime}
                                    </span>
                                    <span>• Status: <strong className="text-brand-green-600">{trip.status}</strong></span>
                                    <span>• Role: {isHost ? "Host" : "Passenger"}</span>
                                    <span>• Vehicle: {trip.vehicleModel} ({trip.vehicleType})</span>
                                    <span>• Seats: <strong>{trip.seatsAvailable} of {trip.seatsTotal} vacant</strong></span>
                                    {trip.womenOnly && (
                                      <span className="text-purple-600 dark:text-purple-400 font-bold">• 👩‍👧‍👧 Female-Only</span>
                                    )}
                                  </div>

                                  {!isHost && (() => {
                                    const hostEmployee = employees.find(e => e.id === trip.hostId);
                                    if (!hostEmployee) return null;
                                    return (
                                      <div className="mt-2 text-[9px] text-slate-650 dark:text-slate-350 font-bold flex items-center gap-2 bg-slate-100/40 dark:bg-slate-900/30 px-2 py-1 rounded-lg border border-slate-200/20 dark:border-slate-800/10 w-fit">
                                        <span>Host: {hostEmployee.avatar} {hostEmployee.name} ({hostEmployee.department})</span>
                                        {hostEmployee.phone && (
                                          <a
                                            href={`tel:${hostEmployee.phone}`}
                                            className="px-2 py-0.5 rounded bg-brand-blue-500/10 hover:bg-brand-blue-500/20 text-brand-blue-600 dark:text-brand-blue-400 text-[8px] font-extrabold flex items-center gap-1 transition-all cursor-pointer"
                                            title={`Call ${hostEmployee.name}`}
                                          >
                                            <Phone className="h-2 w-2" /> Call Host
                                          </a>
                                        )}
                                      </div>
                                    );
                                  })()}

                                  {(() => {
                                    const passengersRaw = trip.passengers as any;
                                    const passengersArray = Array.isArray(passengersRaw)
                                      ? passengersRaw
                                      : (typeof passengersRaw === "string" && passengersRaw.startsWith("{")
                                        ? passengersRaw.slice(1, -1).split(",").map((s: string) => s.trim().replace(/^"|"$/g, ''))
                                        : []);
                                    if (passengersArray.length === 0) return null;
                                    const passengerDetails = employees.filter((e: any) => passengersArray.includes(e.id));
                                    return (
                                      <div className="mt-2 flex flex-col gap-2 bg-slate-100/50 dark:bg-slate-900/40 px-2.5 py-2 rounded-xl border border-slate-200/30 dark:border-slate-800/20 w-full max-w-sm animate-fade-in">
                                        <span className="text-[9px] font-bold text-slate-450 uppercase tracking-wider block">Passengers & Boarding:</span>
                                        <div className="space-y-1.5">
                                          {passengerDetails.map((p: any, idx: number) => {
                                            const boardedRaw = trip.boardedPassengers as any;
                                            const boardedArray = Array.isArray(boardedRaw)
                                              ? boardedRaw
                                              : (typeof boardedRaw === "string" && boardedRaw.startsWith("{")
                                                ? boardedRaw.slice(1, -1).split(",").map((s: string) => s.trim().replace(/^"|"$/g, ''))
                                                : []);
                                            const hasBoarded = boardedArray.includes(p.id);
                                            const isSelf = p.id === currentUser.id;
                                            const canSeeDetails = isHost || isSelf || passengersArray.includes(currentUser.id);
                                            const displayName = canSeeDetails ? p.name : `Colleague ${idx + 1}`;
                                            const displayAvatar = canSeeDetails ? p.avatar : "👤";
                                            const pReq = requests.find(r => r.rideId === trip.id && r.requesterId === p.id && r.status === "Accepted");
                                            return (
                                              <div key={p.id} className="flex items-center justify-between gap-3 p-1.5 bg-white/40 dark:bg-slate-950/20 rounded-lg border border-slate-200/20 dark:border-slate-800/20">
                                                <div className="flex flex-col gap-0.5 text-slate-750 dark:text-slate-300">
                                                  <div className="flex items-center gap-1.5 text-[10px] font-bold">
                                                    <span>{displayAvatar}</span>
                                                    <span>{displayName}</span>
                                                    {hasBoarded && (
                                                      <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-500 text-[8px] font-extrabold">
                                                        ✓ Boarded
                                                      </span>
                                                    )}
                                                    {canSeeDetails && p.phone && (
                                                      <a
                                                        href={`tel:${p.phone}`}
                                                        className="p-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-brand-blue-600 dark:bg-slate-800 dark:hover:bg-slate-700 transition-all flex items-center justify-center cursor-pointer"
                                                        title={`Call ${p.name}`}
                                                      >
                                                        <Phone className="h-2.5 w-2.5" />
                                                      </a>
                                                    )}
                                                  </div>
                                                  {pReq && (
                                                    <div className="text-[8px] text-slate-500 dark:text-slate-400 font-semibold space-y-0.5 pl-5">
                                                      <p>📍 Pickup: <span className="font-bold">{pReq.pickup}</span></p>
                                                      <p>🏁 Drop-off: <span className="font-bold">{pReq.dropPoint}</span></p>
                                                    </div>
                                                  )}
                                                </div>
                                                
                                                {isHost && trip.status === "Started" && !hasBoarded && (
                                                  <PassengerPinVerifyForm 
                                                    rideId={trip.id} 
                                                    passengerId={p.id} 
                                                    confirmBoarding={confirmBoarding} 
                                                  />
                                                )}
                                              </div>
                                            );
                                          })}
                                        </div>
                                      </div>
                                    );
                                  })()}
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                {/* Passenger View: Boarding PIN display */}
                                {!isHost && trip.status === "Started" && (() => {
                                  const hasBoarded = trip.boardedPassengers?.includes(currentUser.id);
                                  if (hasBoarded) {
                                    return (
                                      <span className="px-2.5 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold border border-emerald-200/20 flex items-center gap-1.5">
                                        ✅ Boarded
                                      </span>
                                    );
                                  }
                                  
                                  const myRequest = requests.find(r => r.rideId === trip.id && r.requesterId === currentUser.id && r.status === "Accepted");
                                  return (
                                    <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 border border-slate-200/40 dark:border-slate-700/40 rounded-lg text-slate-700 dark:text-slate-300 text-[10px] font-black">
                                      🔑 PIN: <span className="text-brand-green-600 dark:text-brand-green-400 tracking-wider text-xs ml-0.5">{myRequest?.boardingPin || "----"}</span>
                                    </div>
                                  );
                                })()}

                                {/* Passenger View: Share Safety Live Tracking Link */}
                                {!isHost && trip.status === "Started" && hasBoarded && (
                                  <button
                                    onClick={() => handleShareRide(trip.id, currentUser.id)}
                                    className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1 shadow-sm shadow-emerald-500/20"
                                    title="Share live location tracking safety link via WhatsApp / Messenger"
                                  >
                                    🛡️ Share Safety Link
                                  </button>
                                )}

                                {/* Open Chat */}
                                <button
                                  onClick={() => setActiveChatRideId(trip.id)}
                                  className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 text-[10px] font-bold transition-all cursor-pointer"
                                >
                                  Chat Group
                                </button>

                                {/* Open in Google Maps shortcut (available for all upcoming/active rides) */}
                                <a
                                  href={(() => {
                                    const waypoints = getOptimalWaypoints(trip, requests, getDistance);
                                    const originParam = trip.driverLat && trip.driverLng ? `&origin=${trip.driverLat},${trip.driverLng}` : "";
                                    const waypointsParam = waypoints.length > 0 
                                      ? `&waypoints=${encodeURIComponent(waypoints.join('|'))}` 
                                      : "";
                                    
                                    return `https://www.google.com/maps/dir/?api=1${originParam}&destination=${encodeURIComponent(trip.destination)}${waypointsParam}&dir_action=navigate&travelmode=driving`;
                                  })()}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1.5"
                                >
                                  <Navigation className="h-3 w-3" />
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
                               const passengerPickups = getOptimalWaypoints(trip, requests, getDistance);
                               const googleMapsUrl = `https://www.google.com/maps/dir/?api=1${
                                 trip.driverLat && trip.driverLng ? `&origin=${trip.driverLat},${trip.driverLng}` : ""
                               }&destination=${encodeURIComponent(trip.destination)}${passengerPickups.length > 0 ? `&waypoints=${encodeURIComponent(passengerPickups.join('|'))}` : ""}&dir_action=navigate&travelmode=driving`;

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
                      🤝 Confirm Commute Points
                    </h3>
                    <button
                      onClick={() => {
                        setJoiningRide(null);
                        setPassengerPickupInput("");
                        setPassengerDropInput("");
                        setVicinityError("");
                      }}
                      className="p-1 text-slate-400 hover:bg-slate-150 rounded-lg cursor-pointer"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <p className="text-xs text-slate-500 leading-relaxed">
                    You are requesting to join <strong>{getMaskedHostName(joiningRide, currentUser.id)}</strong>'s carpool from <strong>{joiningRide.pickup}</strong> to <strong>{joiningRide.destination}</strong>.
                    Your pickup location must be within <strong>1.0 km</strong> of the driver's route path.
                  </p>

                  {/* Dynamic Google Map preview showing driver route and passenger's location */}
                  <InteractiveMap
                    pickup={joiningRide.pickup}
                    destination={joiningRide.destination}
                    passengerPickup={passengerPickupInput}
                    passengerDrop={passengerDropInput}
                  />

                  <div className="space-y-4">
                    <AddressAutocomplete
                      value={passengerPickupInput}
                      onChange={setPassengerPickupInput}
                      placeholder="Enter your exact pickup location..."
                      label="Your Pickup Address"
                      required
                    />

                    <AddressAutocomplete
                      value={passengerDropInput}
                      onChange={setPassengerDropInput}
                      placeholder="Enter your exact drop-off location..."
                      label="Your Drop-off Location"
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
                          setPassengerDropInput("");
                          setVicinityError("");
                        }}
                        className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleJoinSubmit}
                        disabled={verifyingVicinity || !passengerPickupInput || !passengerDropInput}
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
                      <strong>{getMaskedRequesterName(reviewingRequest, currentUser.id)}</strong> wants to join your carpool. Proposed pickup point:
                      <span className="block mt-1 font-semibold text-slate-700 dark:text-slate-350">📍 {reviewingRequest.pickup}</span>
                      {reviewingRequest.deviationKm !== undefined && (
                        <span className="block mt-1.5 font-bold text-amber-600 dark:text-amber-400">
                          ↪ Route Deviation: {reviewingRequest.deviationKm.toFixed(2)} km
                        </span>
                      )}
                    </p>

                    {/* Interactive Google Map preview */}
                    <InteractiveMap
                      pickup={ride.pickup}
                      destination={ride.destination}
                      passengerPickup={reviewingRequest.pickup}
                      passengerDrop={reviewingRequest.dropPoint}
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

      {/* Profile Editor Modal */}
      {showProfileModal && (
        <ProfileModal onClose={() => setShowProfileModal(false)} />
      )}

      {/* Bottom status signature */}
      <footer className="py-6 border-t mt-auto">
        <div className="max-w-7xl mx-auto px-4 text-center text-[10px] text-slate-400 font-semibold flex flex-col items-center justify-center gap-1.5">
          <div className="flex items-center gap-1">
            Made with <Heart className="h-3 w-3 text-brand-green-500 fill-brand-green-500 animate-pulse" /> for Corporate Sustainability &amp; ESG Compliance
          </div>
          <div className="text-[9px] bg-slate-100 dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/40 text-slate-500 dark:text-slate-400 px-2.5 py-0.5 rounded-full font-bold">
            EcoRide Production v1.0.0
          </div>
        </div>
      </footer>
    </div>
  );
}

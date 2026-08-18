"use client";

import React, { useState } from "react";
import { useAppState } from "@/context/StateContext";
import { Bell, Shield, User, Leaf, Award, ChevronDown, Check, Trash, MapPin, Loader2, Navigation } from "lucide-react";

export default function Navbar() {
  const { currentUser, role, setRole, notifications, markNotificationsRead, employees, switchUser, logout, isSupabaseConfigured, syncError, activeCity, setActiveCity } = useAppState();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showCityPopup, setShowCityPopup] = useState(false);
  const [customCityValue, setCustomCityValue] = useState("");

  React.useEffect(() => {
    if (activeCity && !["Bangalore", "Mumbai", "Delhi NCR", "Pune"].includes(activeCity)) {
      setCustomCityValue(activeCity);
    }
  }, [activeCity]);

  const notificationRef = React.useRef<HTMLDivElement>(null);
  const profileRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const clickOutside = (e: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener("mousedown", clickOutside);
    return () => document.removeEventListener("mousedown", clickOutside);
  }, []);

  const [isDetectingGps, setIsDetectingGps] = useState(false);
  const [cityPredictions, setCityPredictions] = useState<any[]>([]);
  const autocompleteServiceRef = React.useRef<any>(null);

  React.useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";
    
    const initService = () => {
      const google = (window as any).google;
      if (google && google.maps && google.maps.places) {
        autocompleteServiceRef.current = new google.maps.places.AutocompleteService();
        return true;
      }
      return false;
    };

    if (initService()) return;

    if (apiKey) {
      const scriptId = "google-maps-api-loader";
      let script = document.getElementById(scriptId) as HTMLScriptElement;
      if (!script) {
        script = document.createElement("script");
        script.id = scriptId;
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey.trim()}&libraries=geometry,places`;
        script.async = true;
        script.defer = true;
        document.head.appendChild(script);
      }
    }

    const interval = setInterval(() => {
      if (initService()) {
        clearInterval(interval);
      }
    }, 500);

    return () => clearInterval(interval);
  }, []);

  const triggerGpsDetection = () => {
    if (!navigator.geolocation) return;
    setIsDetectingGps(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        const google = (window as any).google;
        
        if (google && google.maps && google.maps.Geocoder) {
          const geocoder = new google.maps.Geocoder();
          geocoder.geocode({ location: { lat, lng } }, (results: any, status: any) => {
            setIsDetectingGps(false);
            if (status === "OK" && results && results[0]) {
              const cityComp = results[0].address_components.find((comp: any) => 
                comp.types.includes("locality") || comp.types.includes("administrative_area_level_2")
              );
              if (cityComp) {
                const detectedCity = cityComp.long_name;
                setActiveCity(detectedCity);
                setCustomCityValue("");
                setCityPredictions([]);
                setShowCityPopup(false);
              }
            }
          });
        } else {
          setIsDetectingGps(false);
        }
      },
      (err) => {
        console.warn("GPS Detection failed:", err);
        setIsDetectingGps(false);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const handleCityInputChange = (val: string) => {
    setCustomCityValue(val);
    if (!val.trim()) {
      setCityPredictions([]);
      return;
    }

    if (autocompleteServiceRef.current) {
      autocompleteServiceRef.current.getPlacePredictions({
        input: val,
        types: ["(cities)"]
      }, (results: any, status: any) => {
        if (status === "OK" && results) {
          setCityPredictions(results);
        } else {
          setCityPredictions([]);
        }
      });
    }
  };

  const userNotifications = notifications.filter(n => !n.recipientId || n.recipientId === currentUser.id);
  const unreadCount = userNotifications.filter(n => !n.read).length;

  return (
    <nav className="glass-panel sticky top-0 z-40 w-full border-b px-4 py-3 sm:px-6">
      <div className="mx-auto flex max-w-7xl items-center justify-between">
        
        {/* Left: Brand Identity */}
        <div className="flex items-center gap-1.5 sm:gap-3 min-w-0">
          {/* L&T Technology Services Logo (DISABLED FOR NOW)
          <div className="flex items-center bg-white/75 dark:bg-white/90 p-1 sm:p-1.5 rounded-lg shadow-sm border border-slate-100 flex-shrink-0 max-w-[125px] sm:max-w-[180px] overflow-hidden">
            <img 
              src="/logo.png" 
              alt="L&T Technology Services" 
              className="h-7 sm:h-10 w-auto object-contain flex-shrink-0" 
            />
          </div>
          <div className="hidden sm:block h-6 w-[1px] bg-slate-200 dark:bg-slate-800 flex-shrink-0" />
          */}

          {/* EcoRide Leaf Logo */}
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-brand-green-600 to-brand-blue-500 shadow-md flex-shrink-0">
            <Leaf className="h-4.5 w-4.5 text-white" />
          </div>

          {/* Brand Info */}
          <div>
            <h1 className="text-xs font-bold tracking-tight text-slate-800 dark:text-white flex items-center gap-1.5 sm:text-sm">
              EcoRide <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-brand-green-100 text-brand-green-700 dark:bg-brand-green-950/30 dark:text-brand-green-400 border border-brand-green-500/20">Enterprise</span>
            </h1>
            <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
              <p className="hidden md:block text-[9px] text-slate-500 dark:text-slate-400 font-medium">Sustainable Corporate Carpooling</p>
              <span className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.2 text-[8px] font-bold ${
                syncError
                  ? "bg-rose-500/10 text-rose-500 border border-rose-500/20 animate-pulse"
                  : isSupabaseConfigured 
                    ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" 
                    : "bg-amber-500/10 text-amber-500 border border-amber-500/20"
              }`} title={syncError || ""}>
                <span className={`h-1.5 w-1.5 rounded-full ${syncError ? "bg-rose-500" : isSupabaseConfigured ? "bg-emerald-500" : "bg-amber-500"}`} />
                {syncError ? "Sync Error" : isSupabaseConfigured ? "Sync Live" : "Sandbox"}
              </span>
            </div>
          </div>
        </div>

        {/* Center/Right Actions */}
        <div className="flex items-center gap-1.5 sm:gap-3.5">


          {/* Role Switcher - Compacted padding/sizes on mobile */}
          {/* Role Switcher - Rendered ONLY for admin@company.com */}
          {currentUser && currentUser.email.toLowerCase() === "admin@company.com" && (
            <div className="flex items-center rounded-xl bg-slate-100 p-0.5 sm:p-1 dark:bg-slate-800/80 border border-slate-200/50 dark:border-slate-700/50 flex-shrink-0">
              <button
                onClick={() => setRole("Employee")}
                className={`flex items-center gap-1 px-2.5 py-1.5 sm:px-3.5 sm:py-2 text-[11px] sm:text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  role === "Employee"
                    ? "bg-white text-brand-green-600 shadow-sm dark:bg-slate-900 dark:text-brand-green-400"
                    : "text-slate-650 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
                }`}
              >
                <User className="h-3.5 sm:h-4 w-3.5 sm:w-4" />
                <span className="hidden sm:inline">Employee</span>
              </button>
              <button
                onClick={() => setRole("Admin")}
                className={`flex items-center gap-1 px-2.5 py-1.5 sm:px-3.5 sm:py-2 text-[11px] sm:text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  role === "Admin"
                    ? "bg-white text-brand-blue-600 shadow-sm dark:bg-slate-900 dark:text-brand-blue-400"
                    : "text-slate-650 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
                }`}
              >
                <Shield className="h-3.5 sm:h-4 w-3.5 sm:w-4" />
                <span className="hidden sm:inline">Admin</span>
              </button>
            </div>
          )}

          {/* City Geofence Selector */}
          <div className="relative flex-shrink-0">
            <button
              onClick={() => setShowCityPopup(!showCityPopup)}
              className="flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 text-[11px] sm:text-xs font-black rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200/50 dark:border-slate-700/50 text-slate-750 dark:text-slate-350 dark:hover:text-slate-150 hover:border-brand-green-500/50 outline-none cursor-pointer transition-all relative z-10"
              title="Click to change active city context"
            >
              <span>📍 {activeCity}</span>
              <span className="text-[8px] text-slate-400">▼</span>
            </button>

            {showCityPopup && (
              <>
                <div 
                  className="fixed inset-0 z-20" 
                  onClick={() => {
                    setShowCityPopup(false);
                    setCityPredictions([]);
                  }}
                />
                <div className="absolute right-0 mt-2 w-56 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-xl p-3 z-30 animate-fade-in space-y-2.5">
                  <div className="space-y-1">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider px-2">Select Region</p>
                    {["Bangalore", "Mumbai", "Delhi NCR", "Pune"].map(city => (
                      <button
                        key={city}
                        onClick={() => {
                          setActiveCity(city);
                          setCustomCityValue("");
                          setCityPredictions([]);
                          setShowCityPopup(false);
                        }}
                        className={`w-full text-left px-2 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${
                          activeCity.toLowerCase() === city.toLowerCase() 
                            ? "bg-brand-green-500/10 text-brand-green-600 dark:text-brand-green-400" 
                            : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900"
                        }`}
                      >
                        <span>{city}</span>
                        {activeCity.toLowerCase() === city.toLowerCase() && <span className="text-[10px]">✓</span>}
                      </button>
                    ))}
                  </div>

                  <div className="border-t border-slate-150 dark:border-slate-900 pt-2 px-1">
                    <button
                      onClick={triggerGpsDetection}
                      disabled={isDetectingGps}
                      className="w-full text-left px-2 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer text-brand-green-600 dark:text-brand-green-400 bg-brand-green-500/5 hover:bg-brand-green-500/10 border border-brand-green-500/10 disabled:opacity-60"
                    >
                      {isDetectingGps ? (
                        <>
                          <Loader2 className="h-3 w-3 animate-spin" />
                          <span>Detecting GPS...</span>
                        </>
                      ) : (
                        <>
                          <Navigation className="h-3 w-3 rotate-45 text-brand-green-500" />
                          <span>Detect My Location</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div className="border-t border-slate-150 dark:border-slate-900 pt-2.5 px-1 space-y-1.5 relative">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider px-1">Or Enter Manually</p>
                    <input
                      type="text"
                      value={customCityValue}
                      onChange={e => handleCityInputChange(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === "Enter") {
                          if (customCityValue.trim()) {
                            setActiveCity(customCityValue.trim());
                          }
                          setShowCityPopup(false);
                          setCityPredictions([]);
                        }
                      }}
                      placeholder="e.g. Chennai, Kolkata..."
                      className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-2.5 py-1.5 text-xs text-slate-850 dark:text-slate-150 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-brand-green-500"
                    />

                    {/* Auto-suggest list predictions drawer */}
                    {cityPredictions.length > 0 && (
                      <div className="absolute left-1 right-1 mt-1 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl shadow-2xl z-40 max-h-36 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-900/60 animate-fade-in">
                        {cityPredictions.map((pred: any) => {
                          const mainText = pred.structured_formatting?.main_text || pred.description;
                          return (
                            <button
                              key={pred.place_id}
                              onClick={() => {
                                setActiveCity(mainText);
                                setCustomCityValue(mainText);
                                setCityPredictions([]);
                                setShowCityPopup(false);
                              }}
                              className="w-full text-left px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-900/80 cursor-pointer transition-colors block truncate"
                              title={pred.description}
                            >
                              📍 {pred.description}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Quick Metrics (Credits) */}
          <div className="hidden items-center gap-1.5 rounded-xl bg-brand-green-50 px-3 py-1.5 text-xs font-semibold text-brand-green-700 dark:bg-brand-green-950/20 dark:text-brand-green-400 border border-brand-green-500/10 md:flex">
            <Award className="h-4 w-4" />
            <span>{currentUser.credits} Credits</span>
          </div>

          {/* Notification Bell */}
          <div ref={notificationRef} className="relative">
            <button
              onClick={() => {
                setShowNotifications(!showNotifications);
                setShowProfileMenu(false);
              }}
              className="relative flex h-9 w-9 sm:h-11 sm:w-11 items-center justify-center rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border border-slate-200/40 dark:border-slate-700/40 text-slate-600 dark:text-slate-300 cursor-pointer"
            >
              <Bell className="h-5 w-5 sm:h-5.5 sm:w-5.5" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 sm:h-5 sm:w-5 items-center justify-center rounded-full bg-rose-500 text-[8px] sm:text-[10px] font-bold text-white ring-1 sm:ring-2 ring-white dark:ring-slate-900 animate-bounce">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Notification Dropdown Drawer */}
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl border border-slate-150 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-xl overflow-hidden z-50 animate-fade-in">
                <div className="flex items-center justify-between border-b px-4 py-3 bg-slate-50 dark:bg-slate-900/50">
                  <h3 className="font-semibold text-sm text-slate-800 dark:text-white">Notifications</h3>
                  <button 
                    onClick={() => markNotificationsRead()}
                    className="text-xs text-brand-green-600 dark:text-brand-green-400 font-medium hover:underline flex items-center gap-1"
                  >
                    Mark all read
                  </button>
                </div>
                <div className="max-h-[360px] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-900">
                  {userNotifications.length === 0 ? (
                    <div className="py-8 text-center text-xs text-slate-500 dark:text-slate-400">
                      No notifications yet
                    </div>
                  ) : (
                    userNotifications.map(notif => (
                      <div
                        key={notif.id}
                        className={`p-4 transition-colors border-l-4 ${
                          notif.read 
                            ? "bg-white dark:bg-slate-950 border-transparent" 
                            : "bg-emerald-500/5 dark:bg-emerald-950/10 border-emerald-500"
                        }`}
                      >
                        <div className="flex items-start gap-2.5">
                          <span className="text-base mt-0.5">
                            {notif.type === "success" && "✅"}
                            {notif.type === "info" && "ℹ️"}
                            {notif.type === "warning" && "⚠️"}
                            {notif.type === "request" && "✉️"}
                          </span>
                          <div className="flex-1">
                            <h4 className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                              {notif.title}
                              {!notif.read && (
                                <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 ml-1.5 align-middle" />
                              )}
                            </h4>
                            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 leading-relaxed">{notif.message}</p>
                            <span className="text-[10px] text-slate-400 mt-1 block">{notif.timestamp}</span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User Profile */}
          <div ref={profileRef} className="relative">
            <button
              onClick={() => {
                setShowProfileMenu(!showProfileMenu);
                setShowNotifications(false);
              }}
              className="flex items-center gap-1 sm:gap-1.5 rounded-xl border border-slate-200/50 dark:border-slate-700/50 p-0.5 sm:p-1 pr-1 sm:pr-2 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
            >
              <span className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-lg bg-brand-green-100 text-base sm:text-lg dark:bg-brand-green-950/40">
                {currentUser.avatar}
              </span>
              <ChevronDown className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-slate-500" />
            </button>

            {/* Profile Dropdown */}
            {showProfileMenu && (
              <div className="absolute right-0 mt-2 w-56 rounded-2xl border border-slate-150 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-xl p-2 z-50 animate-fade-in">
                <div className="px-3 py-2 border-b mb-1.5">
                  <p className="text-xs font-bold text-slate-800 dark:text-white">{currentUser.name}</p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{currentUser.email}</p>
                  <p className="text-[9px] uppercase tracking-wider font-semibold text-brand-green-600 dark:text-brand-green-400 mt-1">
                    {currentUser.designation} • {currentUser.department}
                  </p>
                </div>
                <div className="space-y-0.5">
                  <div className="flex items-center justify-between px-3 py-1.5 text-xs text-slate-600 dark:text-slate-400">
                    <span>Rank</span>
                    <span className="font-semibold text-slate-800 dark:text-white">#{currentUser.rank}</span>
                  </div>
                  <div className="flex items-center justify-between px-3 py-1.5 text-xs text-slate-600 dark:text-slate-400">
                    <span>Carbon Saved</span>
                    <span className="font-semibold text-brand-green-600 dark:text-brand-green-400">{currentUser.carbonSaved} kg</span>
                  </div>
                  <div className="flex items-center justify-between px-3 py-1.5 text-xs text-slate-600 dark:text-slate-400">
                    <span>Office Location</span>
                    <span className="font-semibold text-slate-800 dark:text-white">{currentUser.office}</span>
                  </div>
                  <div className="border-t mt-2 pt-1.5 space-y-1">
                    <button
                      onClick={() => {
                        setShowProfileMenu(false);
                        window.dispatchEvent(new CustomEvent("open-profile-editor"));
                      }}
                      className="w-full text-left px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-900/50 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      ✏️ Edit Profile
                    </button>
                    <button
                      onClick={() => {
                        setShowProfileMenu(false);
                        window.dispatchEvent(new CustomEvent("open-past-rides"));
                      }}
                      className="w-full text-left px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-900/50 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      📜 Past Commutes
                    </button>
                    <button
                      onClick={() => {
                        setShowProfileMenu(false);
                        window.dispatchEvent(new CustomEvent("open-notification-preferences"));
                      }}
                      className="w-full text-left px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-900/50 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      ⚙️ Notification Settings
                    </button>
                    <button
                      onClick={() => {
                        setShowProfileMenu(false);
                        logout();
                      }}
                      className="w-full text-left px-3 py-2 text-xs font-bold text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      🚪 Log out
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </nav>
  );
}

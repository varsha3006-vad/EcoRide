"use client";

import React, { useState, useEffect, useRef } from "react";
import { Navigation, Loader2, X, Clock } from "lucide-react";

interface AddressAutocompleteProps {
  value: string;
  onChange: (val: string) => void;
  placeholder: string;
  label: string;
  required?: boolean;
  commuteType?: "intra_city" | "inter_city";
  userLocation?: { lat: number; lng: number } | null;
}

export default function AddressAutocomplete({ 
  value, 
  onChange, 
  placeholder, 
  label, 
  required = false,
  commuteType = "intra_city",
  userLocation
}: AddressAutocompleteProps) {
  const [predictions, setPredictions] = useState<any[]>([]);
  const [frequentLocations, setFrequentLocations] = useState<{ address: string; count: number }[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [detectingGps, setDetectingGps] = useState(false);
  const autocompleteServiceRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load frequent locations from localStorage
  const loadFrequentLocations = () => {
    if (typeof window === "undefined") return;
    try {
      const saved = localStorage.getItem("ecoride_frequent_locations");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setFrequentLocations(parsed.sort((a: any, b: any) => b.count - a.count).slice(0, 5));
        }
      }
    } catch (e) {}
  };

  useEffect(() => {
    loadFrequentLocations();
  }, []);

  const saveLocationToFrequency = (selectedAddress: string) => {
    if (!selectedAddress || typeof window === "undefined") return;
    try {
      const saved = localStorage.getItem("ecoride_frequent_locations");
      let list: { address: string; count: number }[] = saved ? JSON.parse(saved) : [];
      const existingIndex = list.findIndex(item => item.address.toLowerCase() === selectedAddress.toLowerCase());

      if (existingIndex >= 0) {
        list[existingIndex].count += 1;
      } else {
        list.push({ address: selectedAddress, count: 1 });
      }

      list = list.sort((a, b) => b.count - a.count).slice(0, 10);
      localStorage.setItem("ecoride_frequent_locations", JSON.stringify(list));
      setFrequentLocations(list.slice(0, 5));
    } catch (e) {}
  };

  const handleClear = () => {
    onChange("");
    setPredictions([]);
    setIsOpen(false);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const triggerFreshGps = () => {
    if (!navigator.geolocation) return;
    setDetectingGps(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        
        const google = (window as any).google;
        if (google && google.maps) {
          const geocoder = new google.maps.Geocoder();
          geocoder.geocode({ location: { lat, lng } }, (results: any, status: any) => {
            setDetectingGps(false);
            if (status === "OK" && results[0]) {
              const address = results[0].formatted_address;
              onChange(address);
              saveLocationToFrequency(address);
              localStorage.setItem("ecoride_last_detected_pickup", address);
            }
          });
        } else {
          setDetectingGps(false);
        }
      },
      (err) => {
        console.warn(err);
        setDetectingGps(false);
      },
      { enableHighAccuracy: true, timeout: 5000 }
    );
  };

  // Initialize service once Google Maps scripts are loaded
  useEffect(() => {
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

    // Load script if not present
    const scriptId = "google-maps-api-loader";
    let script = document.getElementById(scriptId) as HTMLScriptElement;

    if (!script && apiKey) {
      script = document.createElement("script");
      script.id = scriptId;
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey.trim()}&libraries=geometry,places`;
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }

    // Check periodically for asynchronous loader mounts
    const interval = setInterval(() => {
      if (initService()) {
        clearInterval(interval);
      }
    }, 500);

    return () => clearInterval(interval);
  }, []);

  // Close suggestions box on clicking outside the container
  useEffect(() => {
    const clickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", clickOutside);
    return () => document.removeEventListener("mousedown", clickOutside);
  }, []);

  const handleTextChange = (text: string) => {
    onChange(text);
    if (!text.trim()) {
      setPredictions([]);
      setIsOpen(frequentLocations.length > 0);
      return;
    }

    const google = (window as any).google;
    if (autocompleteServiceRef.current && google && google.maps) {
      const options: any = { input: text };

      if (commuteType === "intra_city" && userLocation && userLocation.lat && userLocation.lng) {
        const latLng = new google.maps.LatLng(userLocation.lat, userLocation.lng);
        options.location = latLng;
        options.origin = latLng;
        options.radius = 50000; // 50 km boundary box
        options.strictBounds = true; // STRICTLY GEOFENCE & BLOCK places outside 50km
        options.componentRestrictions = { country: "in" };
      } else if (commuteType === "inter_city") {
        options.componentRestrictions = { country: "in" };
      }

      autocompleteServiceRef.current.getPlacePredictions(
        options,
        (results: any, status: any) => {
          if (status === google.maps.places.PlacesServiceStatus.OK && results && results.length > 0) {
            setPredictions(results);
            setIsOpen(true);
          } else if (commuteType === "inter_city") {
            autocompleteServiceRef.current.getPlacePredictions(
              { input: text },
              (fallbackResults: any, fallbackStatus: any) => {
                if (fallbackStatus === google.maps.places.PlacesServiceStatus.OK && fallbackResults && fallbackResults.length > 0) {
                  setPredictions(fallbackResults);
                  setIsOpen(true);
                } else {
                  setPredictions([]);
                }
              }
            );
          } else {
            setPredictions([]);
          }
        }
      );
    }
  };

  const handleSelectAddress = (selectedAddress: string) => {
    onChange(selectedAddress);
    saveLocationToFrequency(selectedAddress);
    setPredictions([]);
    setIsOpen(false);
  };

  // Filter frequent locations matching current input keyword
  const matchingFrequent = value.trim()
    ? frequentLocations.filter(f => f.address.toLowerCase().includes(value.toLowerCase()))
    : frequentLocations;

  return (
    <div ref={containerRef} className={`relative w-full transition-all ${isOpen ? "z-40" : "z-20"}`}>
      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
        {label}
      </label>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          required={required}
          value={value}
          onChange={e => handleTextChange(e.target.value)}
          placeholder={placeholder}
          onFocus={() => {
            loadFrequentLocations();
            if (predictions.length > 0 || frequentLocations.length > 0) setIsOpen(true);
          }}
          className={`w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 ${
            value ? "pr-16" : "pr-8"
          } pl-3.5 py-2 text-xs text-slate-800 dark:text-white placeholder-slate-400 outline-none focus:border-brand-green-500 transition-all shadow-sm`}
        />

        <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {/* Clear X Button */}
          {value && (
            <button
              type="button"
              onClick={handleClear}
              title="Clear text"
              className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1 transition-colors cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}

          {/* GPS Locator */}
          {label.toLowerCase().includes("pickup") && navigator.geolocation && (
            <button
              type="button"
              onClick={triggerFreshGps}
              disabled={detectingGps}
              title="Locate Me (Fresh GPS)"
              className="text-slate-400 hover:text-brand-green-600 transition-colors p-1 flex items-center justify-center cursor-pointer disabled:opacity-50"
            >
              {detectingGps ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-brand-green-600" />
              ) : (
                <Navigation className="h-3.5 w-3.5 rotate-45" />
              )}
            </button>
          )}
        </div>
      </div>

      {isOpen && (predictions.length > 0 || matchingFrequent.length > 0) && (
        <ul className="absolute left-0 right-0 mt-1 max-h-56 overflow-y-auto rounded-xl border border-slate-150 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-xl z-50 divide-y divide-slate-100 dark:divide-slate-900/50">
          {/* Frequently Used Locations Section */}
          {matchingFrequent.length > 0 && (
            <div>
              <div className="px-3 py-1.5 bg-slate-50 dark:bg-slate-900 text-[9px] font-black uppercase text-brand-blue-600 dark:text-brand-blue-400 tracking-wider flex items-center gap-1">
                <Clock className="h-3 w-3" /> Frequently Used Locations
              </div>
              {matchingFrequent.map((freq, i) => (
                <li
                  key={`freq-${i}`}
                  onClick={() => handleSelectAddress(freq.address)}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-800 dark:text-slate-200 hover:bg-brand-blue-500/10 dark:hover:bg-brand-blue-950/30 cursor-pointer transition-colors flex items-center justify-between gap-2"
                >
                  <span className="truncate">{freq.address}</span>
                  <span className="text-[9px] bg-brand-blue-500/10 text-brand-blue-600 dark:text-brand-blue-400 px-1.5 py-0.5 rounded font-extrabold flex-shrink-0">
                    Used {freq.count}x
                  </span>
                </li>
              ))}
            </div>
          )}

          {/* Google Places Predictions Section */}
          {predictions.length > 0 && (
            <div>
              {matchingFrequent.length > 0 && (
                <div className="px-3 py-1.5 bg-slate-50 dark:bg-slate-900 text-[9px] font-black uppercase text-slate-400 tracking-wider">
                  Address Search Results
                </div>
              )}
              {predictions.map(pred => (
                <li
                  key={pred.place_id}
                  onClick={() => handleSelectAddress(pred.description)}
                  className="px-3.5 py-2 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900 cursor-pointer transition-colors"
                >
                  {pred.description}
                </li>
              ))}
            </div>
          )}
        </ul>
      )}
    </div>
  );
}

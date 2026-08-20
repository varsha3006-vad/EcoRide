"use client";

import React, { useState, useEffect, useRef } from "react";
import { Navigation, Loader2 } from "lucide-react";

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
  const [isOpen, setIsOpen] = useState(false);
  const [detectingGps, setDetectingGps] = useState(false);
  const autocompleteServiceRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

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
      setIsOpen(false);
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
        // Inter-city mode: No local GPS origin bias so distant city names (Mumbai, Delhi, Pune, etc.) autocomplete nationwide!
        options.componentRestrictions = { country: "in" };
      }

      autocompleteServiceRef.current.getPlacePredictions(
        options,
        (results: any, status: any) => {
          if (status === google.maps.places.PlacesServiceStatus.OK && results && results.length > 0) {
            setPredictions(results);
            setIsOpen(true);
          } else if (commuteType === "inter_city") {
            // Fallback retry without strict componentRestrictions for inter-city mode if initial query returned empty
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

  return (
    <div ref={containerRef} className={`relative w-full transition-all ${isOpen ? "z-40" : "z-20"}`}>
      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
        {label}
      </label>
      <div className="relative">
        <input
          type="text"
          required={required}
          value={value}
          onChange={e => handleTextChange(e.target.value)}
          placeholder={placeholder}
          onFocus={() => {
            if (predictions.length > 0) setIsOpen(true);
          }}
          className={`w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 ${
            label.toLowerCase().includes("pickup") ? "pl-3.5 pr-9" : "px-3.5"
          } py-2 text-xs text-slate-800 dark:text-white placeholder-slate-400 outline-none focus:border-brand-green-500 transition-all shadow-sm`}
        />
        {label.toLowerCase().includes("pickup") && navigator.geolocation && (
          <button
            type="button"
            onClick={triggerFreshGps}
            disabled={detectingGps}
            title="Locate Me (Fresh GPS)"
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-brand-green-600 transition-colors p-1 flex items-center justify-center cursor-pointer disabled:opacity-50"
          >
            {detectingGps ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-brand-green-600" />
            ) : (
              <Navigation className="h-3.5 w-3.5 rotate-45" />
            )}
          </button>
        )}
      </div>
      {isOpen && predictions.length > 0 && (
        <ul className="absolute left-0 right-0 mt-1 max-h-48 overflow-y-auto rounded-xl border border-slate-150 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-xl z-50 divide-y divide-slate-100 dark:divide-slate-900/50">
          {predictions.map(pred => (
            <li
              key={pred.place_id}
              onClick={() => {
                onChange(pred.description);
                setPredictions([]);
                setIsOpen(false);
              }}
              className="px-3.5 py-2 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900 cursor-pointer transition-colors"
            >
              {pred.description}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

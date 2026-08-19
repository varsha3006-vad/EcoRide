"use client";

import React, { useState, useEffect, useRef } from "react";
import { Navigation, MapPin, Layers, RefreshCw, Zap, Map as MapIcon } from "lucide-react";
import { useAppState } from "@/context/StateContext";

interface InteractiveMapProps {
  pickup: string;
  destination: string;
  isDriving?: boolean;
  passengerPickup?: string;
  passengerDrop?: string;
  waypoints?: string[];
  onLocationDetected?: (address: string) => void;
  rideId?: string;
  isHost?: boolean;
  passengerId?: string; // current user's id when they are a passenger
  vehicleCategory?: "4-Wheeler (Car)" | "2-Wheeler (Bike/Scooter)";
}

export default function InteractiveMap({ 
  pickup, 
  destination, 
  isDriving = false, 
  passengerPickup, 
  passengerDrop,
  waypoints = [],
  onLocationDetected,
  rideId,
  isHost = false,
  passengerId,
  vehicleCategory
}: InteractiveMapProps) {
  const { rides, updateRideLocation, updatePassengerLocation } = useAppState();
  const [eta, setEta] = useState<number | null>(null);
  const [distanceStr, setDistanceStr] = useState<string>("Calculating...");
  const [traffic, setTraffic] = useState<"Low" | "Medium" | "High">("Low");
  
  const mapRef = useRef<HTMLDivElement>(null);
  const googleMapInstanceRef = useRef<any>(null);
  const carMarkerRef = useRef<any>(null);
  const directionsRendererRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const polylinesRef = useRef<any[]>([]);

  const clearAllMarkers = () => {
    markersRef.current.forEach(marker => {
      if (marker) marker.setMap(null);
    });
    markersRef.current = [];
    
    polylinesRef.current.forEach(line => {
      if (line) line.setMap(null);
    });
    polylinesRef.current = [];

    if (carMarkerRef.current) {
      carMarkerRef.current.setMap(null);
      carMarkerRef.current = null;
    }
  };
  
  const [googleMapsLoaded, setGoogleMapsLoaded] = useState(false);
  const [coordinatesPath, setCoordinatesPath] = useState<any[]>([]);
  const [mapError, setMapError] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [currentCoords, setCurrentCoords] = useState<{lat: number, lng: number} | null>(null);
  const gpsMode = "Live GPS";

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "AIzaSyBfIUY_3TlArLC4BRriogce52erVVY80EI";
  const hasDetectedRef = useRef(false);

  const [isAutoCentering, setIsAutoCentering] = useState(true);
  const programmaticActionRef = useRef(false);

  useEffect(() => {
    if (isDriving) {
      setIsAutoCentering(true);
    }
  }, [isDriving]);

  const vehChar = vehicleCategory === "2-Wheeler (Bike/Scooter)" ? "🛵" : "🚗";

  // 1. Load Google Maps API Script
  useEffect(() => {
    if ((window as any).google && (window as any).google.maps) {
      setGoogleMapsLoaded(true);
      return;
    }

    const scriptId = "google-maps-api-loader";
    let script = document.getElementById(scriptId) as HTMLScriptElement;

    if (!script) {
      script = document.createElement("script");
      script.id = scriptId;
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=geometry,places`;
      script.async = true;
      script.defer = true;
      script.onload = () => {
        setGoogleMapsLoaded(true);
      };
      script.onerror = () => {
        console.error("Failed to load Google Maps script.");
        setMapError(true);
      };
      document.head.appendChild(script);
    } else {
      setGoogleMapsLoaded(true);
    }
  }, [apiKey]);

  // 1.5 Get current location on mount if offering a ride
  useEffect(() => {
    if (isDriving || !navigator.geolocation || mapError || pickup || hasDetectedRef.current) return;
    
    hasDetectedRef.current = true;
    
    // Check if we have a cached address first to avoid prompt on every load/login
    if (typeof window !== "undefined") {
      const cached = localStorage.getItem("ecoride_last_detected_pickup");
      if (cached && onLocationDetected) {
        onLocationDetected(cached);
        return; // Skip browser geolocation call
      }
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        const latLng = { lat, lng };

        setCurrentCoords(latLng);

        // Geocode once Google Maps scripts are loaded
        if (googleMapsLoaded) {
          const google = (window as any).google;
          if (google && google.maps) {
            const geocoder = new google.maps.Geocoder();
            geocoder.geocode({ location: latLng }, (results: any, status: any) => {
              if (status === "OK" && results[0] && onLocationDetected) {
                const address = results[0].formatted_address;
                onLocationDetected(address);
                // Cache the address
                localStorage.setItem("ecoride_last_detected_pickup", address);
              }
            });
          }
        }
      },
      (error) => {
        console.warn("Geolocation permission denied or failed:", error.message);
      }
    );
  }, [googleMapsLoaded, isDriving, mapError, pickup, onLocationDetected]);

  // 1.8 — removed: centering is now done inside map init (GPS-first)

  // 2. Initialize Google Map and Route Renderer — GPS-first to avoid USA flash
  useEffect(() => {
    if (!googleMapsLoaded || !mapRef.current || mapError) return;

    const google = (window as any).google;
    if (!google || !google.maps) return;

    const MAP_STYLES = [
      { elementType: "geometry", stylers: [{ color: "#1e293b" }] },
      { elementType: "labels.text.stroke", stylers: [{ color: "#0f172a" }] },
      { elementType: "labels.text.fill", stylers: [{ color: "#94a3b8" }] },
      { featureType: "road", elementType: "geometry", stylers: [{ color: "#334155" }] },
      { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#1e293b" }] },
      { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#475569" }] },
      { featureType: "water", elementType: "geometry", stylers: [{ color: "#0f172a" }] }
    ];

    const createMap = (center: { lat: number; lng: number }, zoom: number, isUserLocation: boolean) => {
      if (!mapRef.current) return;
      const map = new google.maps.Map(mapRef.current, {
        center,
        zoom,
        disableDefaultUI: true,
        zoomControl: true,
        zoomControlOptions: {
          position: google.maps.ControlPosition.RIGHT_CENTER
        },
        scrollwheel: true,
        gestureHandling: "greedy",
        rotateControl: true,
        scaleControl: true,
        styles: MAP_STYLES
      });
      googleMapInstanceRef.current = map;

      // Fade map in only after tiles are fully painted — eliminates the blank flash
      google.maps.event.addListenerOnce(map, 'tilesloaded', () => setMapReady(true));

      // User interaction listener to release auto-centering lock
      map.addListener("dragstart", () => {
        setIsAutoCentering(false);
      });
      map.addListener("zoom_changed", () => {
        if (!programmaticActionRef.current) {
          setIsAutoCentering(false);
        }
      });

      // Place a blue dot for the user's real current position
      if (isUserLocation) {
        setCurrentCoords(center);
        new google.maps.Marker({
          position: center,
          map,
          title: "My Current Location",
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            fillColor: "#4285F4",
            fillOpacity: 1,
            strokeColor: "#ffffff",
            strokeWeight: 2.5,
            scale: 7
          }
        });
        // Reverse-geocode for onLocationDetected callback
        if (onLocationDetected && !pickup) {
          const geocoder = new google.maps.Geocoder();
          geocoder.geocode({ location: center }, (results: any, status: any) => {
            if (status === "OK" && results[0] && onLocationDetected) {
              onLocationDetected(results[0].formatted_address);
            }
          });
        }
      }
      return map;
    };

    try {
      // --- GPS-FIRST: get position before creating the map ---
      if (navigator.geolocation && !isDriving) {
        // Race GPS vs 3s timeout
        const gpsPromise = new Promise<{ lat: number; lng: number } | null>((resolve) => {
          navigator.geolocation.getCurrentPosition(
            (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
            () => resolve(null),
            { timeout: 3000, maximumAge: 30000, enableHighAccuracy: true }
          );
        });
        const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 3000));

        Promise.race([gpsPromise, timeoutPromise]).then((coords) => {
          if (coords) {
            createMap(coords, 15, true);
          } else {
            // GPS denied or timed out — use a neutral world view, no USA snap
            createMap({ lat: 20.5937, lng: 78.9629 }, 5, false); // India centroid
          }
          initRoutes();
        });
      } else {
        // Driving mode or no geolocation — create map on next tick to ensure mapRef.current is bound in DOM
        setTimeout(() => {
          if (!mapRef.current) {
            console.warn("Map container ref not bound yet. Retrying in 100ms...");
            setTimeout(() => {
              createMap({ lat: 20.5937, lng: 78.9629 }, 13, false);
              initRoutes();
            }, 100);
            return;
          }
          createMap({ lat: 20.5937, lng: 78.9629 }, 13, false);
          initRoutes();
        }, 50);
      }
    } catch (e) {
      console.warn("Map init error:", e);
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [googleMapsLoaded, mapError]);

  const initRoutes = async () => {
    if (!googleMapInstanceRef.current || !pickup || !destination) return;
    const google = (window as any).google;
    const map = googleMapInstanceRef.current;

    if (directionsRendererRef.current) directionsRendererRef.current.setMap(null);

    const directionsRenderer = new google.maps.DirectionsRenderer({
      map: map,
      preserveViewport: true,
      suppressMarkers: true,
      polylineOptions: { strokeColor: "#10b981", strokeOpacity: 0.8, strokeWeight: 6 }
    });
    directionsRendererRef.current = directionsRenderer;

    const geocodeAddress = (address: string): Promise<any> => {
      return new Promise((resolve) => {
        new google.maps.Geocoder().geocode({ address }, (res: any, status: any) => {
          resolve(status === "OK" ? res[0].geometry.location : null);
        });
      });
    };

    const startLatLng = await geocodeAddress(pickup);
    const endLatLng = await geocodeAddress(destination);
    if (!startLatLng || !endLatLng) return;

    const passengerPickupLatLng = passengerPickup ? await geocodeAddress(passengerPickup) : null;
    const passengerDropLatLng = passengerDrop ? await geocodeAddress(passengerDrop) : null;

    clearAllMarkers();

    const placeStaticMarkers = () => {
      const markers = [
        { pos: startLatLng, icon: google.maps.SymbolPath.CIRCLE, color: "#10b981", title: "Pickup" },
        { pos: endLatLng, path: "M -1 12 L -1 -10 L 10 -10 L 10 -2 L -1 -2", color: "#0ea5e9", title: "Destination" }
      ];
      if (passengerPickupLatLng) {
        markers.push({ pos: passengerPickupLatLng, icon: google.maps.SymbolPath.CIRCLE, color: "#3b82f6", title: "Proposed Pickup" });
      }
      if (passengerDropLatLng) {
        markers.push({ pos: passengerDropLatLng, icon: google.maps.SymbolPath.CIRCLE, color: "#a855f7", title: "Proposed Drop-off" });
      }
      markers.forEach(m => {
        const marker = new google.maps.Marker({
          position: m.pos, map: map,
          title: m.title,
          icon: { path: m.icon || m.path, fillColor: m.color, fillOpacity: 1, strokeColor: "#ffffff", strokeWeight: 2, scale: m.icon ? 8 : 1.3 }
        });
        markersRef.current.push(marker);
      });
      
      const carMarker = new google.maps.Marker({
        position: startLatLng, map: map,
        icon: { url: `data:image/svg+xml;utf8,` + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><text transform="rotate(90 16 16)" x="16" y="18" font-size="22" text-anchor="middle" dominant-baseline="middle">${vehChar}</text></svg>`), scaledSize: new google.maps.Size(32, 32), anchor: new google.maps.Point(16, 16) }
      });
      carMarkerRef.current = carMarker;
    };

    const googleWaypoints = [...(passengerPickupLatLng ? [{location: passengerPickupLatLng, stopover: true}] : []), ...(passengerDropLatLng ? [{location: passengerDropLatLng, stopover: true}] : [])];
    for (const wp of waypoints) {
      const loc = await geocodeAddress(wp);
      if (loc) googleWaypoints.push({ location: loc, stopover: true });
    }

    new google.maps.DirectionsService().route({
      origin: startLatLng, destination: endLatLng, waypoints: googleWaypoints, optimizeWaypoints: true, travelMode: google.maps.TravelMode.DRIVING
    }, (result: any, status: any) => {
      if (status === google.maps.DirectionsStatus.OK && result.routes && result.routes[0]) {
        directionsRenderer.setDirections(result);
        setCoordinatesPath(result.routes[0].overview_path);

        // Real-time distance and ETA extraction from Google Maps route legs
        let totalMeters = 0;
        let totalSeconds = 0;
        if (result.routes[0].legs) {
          result.routes[0].legs.forEach((leg: any) => {
            if (leg.distance?.value) totalMeters += leg.distance.value;
            if (leg.duration?.value) totalSeconds += leg.duration.value;
          });
        }
        if (totalMeters > 0) {
          const calcKm = (totalMeters / 1000).toFixed(1);
          setDistanceStr(`${calcKm} km`);
        }
        if (totalSeconds > 0) {
          const calcEta = Math.round(totalSeconds / 60);
          setEta(calcEta);
        }

        placeStaticMarkers();
        if (!isDriving && isAutoCentering) {
          const bounds = new google.maps.LatLngBounds();
          bounds.extend(startLatLng); bounds.extend(endLatLng);
          if (passengerPickupLatLng) bounds.extend(passengerPickupLatLng);
          if (passengerDropLatLng) bounds.extend(passengerDropLatLng);
          map.fitBounds(bounds);
        }
      }
    });
  };

  const serializedWaypoints = JSON.stringify(waypoints);
  useEffect(() => { initRoutes(); }, [googleMapsLoaded, pickup, destination, passengerPickup, passengerDrop, serializedWaypoints]);

  useEffect(() => {
    if (!googleMapsLoaded || !isDriving || mapError || !isHost) return;
    const google = (window as any).google;
    if (!google || !google.maps) return;

    if (gpsMode === "Live GPS") {
      if (!navigator.geolocation) {
        console.warn("Geolocation not supported by this browser.");
        return;
      }

      let lastUpdate = 0;
      let lastLat = 0;
      let lastLng = 0;

      const handlePosition = (position: any) => {
        const now = Date.now();
        // Throttle updates to once every 6 seconds to conserve battery and CPU
        if (now - lastUpdate < 6000) return;

        const lat = position.coords.latitude;
        const lng = position.coords.longitude;

        // Skip updates for minor GPS noise (less than 10 meters / 0.0001 deg deviation)
        const dLat = Math.abs(lat - lastLat);
        const dLng = Math.abs(lng - lastLng);
        if (lastUpdate > 0 && dLat < 0.0001 && dLng < 0.0001) return;

        lastUpdate = now;
        lastLat = lat;
        lastLng = lng;

        const currentLatLng = new google.maps.LatLng(lat, lng);

        // Move car marker to actual live GPS position and rotate to heading
        if (carMarkerRef.current) {
          carMarkerRef.current.setPosition(currentLatLng);
          const heading = position.coords.heading;
          if (heading !== null && !isNaN(heading)) {
            const adjustedRotation = (heading + 90) % 360;
            const rotatedSvg = `data:image/svg+xml;utf8,` + encodeURIComponent(
              `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><text transform="rotate(${adjustedRotation} 16 16)" x="16" y="18" font-size="22" text-anchor="middle" dominant-baseline="middle">${vehChar}</text></svg>`
            );
            carMarkerRef.current.setIcon({
              url: rotatedSvg,
              scaledSize: new google.maps.Size(32, 32),
              anchor: new google.maps.Point(16, 16)
            });
          }
        }
        
        // Pan map to center on driver (close-up vehicle tracking view)
        if (isAutoCentering && googleMapInstanceRef.current) {
          programmaticActionRef.current = true;
          googleMapInstanceRef.current.panTo(currentLatLng);
          if (googleMapInstanceRef.current.getZoom() < 17) {
            googleMapInstanceRef.current.setZoom(18);
          }
          setTimeout(() => {
            programmaticActionRef.current = false;
          }, 150);
        }

        // Push coordinates to shared state
        if (rideId) {
          updateRideLocation(rideId, lat, lng);
        }

        // Recalculate directions
        const directionsService = new google.maps.DirectionsService();
        const googleWaypoints = waypoints.map((addr: string) => ({
          location: addr,
          stopover: true
        }));

        directionsService.route(
          {
            origin: currentLatLng,
            destination: destination || "San Francisco City Hall, CA",
            waypoints: googleWaypoints,
            optimizeWaypoints: false,
            travelMode: google.maps.TravelMode.DRIVING
          },
          (result: any, status: any) => {
            if (status === google.maps.DirectionsStatus.OK && directionsRendererRef.current) {
              directionsRendererRef.current.setDirections(result);
              let totalDuration = 0;
              let totalDistance = 0;
              result.routes[0].legs.forEach((leg: any) => {
                totalDuration += leg.duration.value;
                totalDistance += leg.distance.value;
              });
              setEta(Math.round(totalDuration / 60));
              setDistanceStr((totalDistance / 1000).toFixed(1) + " km");
            }
          }
        );
      };

      let watchId: number | null = null;
      
      const startWatching = () => {
        if (watchId !== null) return;
        watchId = navigator.geolocation.watchPosition(
          handlePosition,
          (error) => console.warn("Live GPS Tracking error:", error.message),
          {
            enableHighAccuracy: true,
            maximumAge: 5000, // Allow system-cached location to avoid continuous GPS hardware wakes
            timeout: 10000
          }
        );
      };

      const stopWatching = () => {
        if (watchId !== null) {
          navigator.geolocation.clearWatch(watchId);
          watchId = null;
        }
      };

      // Start watching initially
      startWatching();

      // Conserve battery by pausing GPS updates when the tab is hidden
      const handleVisibilityChange = () => {
        if (document.hidden) {
          console.log("Tab backgrounded. Suspending host GPS watching to conserve battery.");
          stopWatching();
        } else {
          console.log("Tab focused. Resuming host GPS watching.");
          startWatching();
        }
      };

      document.addEventListener("visibilitychange", handleVisibilityChange);

      return () => {
        stopWatching();
        document.removeEventListener("visibilitychange", handleVisibilityChange);
      };
    } else {
      // Simulation Mode animation loop
      if (coordinatesPath.length === 0 || !carMarkerRef.current) return;
      
      let step = 0;
      const numSteps = coordinatesPath.length;

      const interval = setInterval(() => {
        if (step >= numSteps) {
          step = 0;
        }

        const newPos = coordinatesPath[step];
        carMarkerRef.current.setPosition(newPos);
        
        const nextPos = step < numSteps - 1 ? coordinatesPath[step + 1] : null;
        if (nextPos) {
          const lat1 = newPos.lat();
          const lng1 = newPos.lng();
          const lat2 = nextPos.lat();
          const lng2 = nextPos.lng();
          const angleRad = Math.atan2(lng2 - lng1, lat2 - lat1);
          const angleDeg = (angleRad * 180) / Math.PI;
          const heading = (angleDeg + 360) % 360;
          
          const adjustedRotation = (heading + 90) % 360;
          const rotatedSvg = `data:image/svg+xml;utf8,` + encodeURIComponent(
            `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><text transform="rotate(${adjustedRotation} 16 16)" x="16" y="18" font-size="22" text-anchor="middle" dominant-baseline="middle">${vehChar}</text></svg>`
          );
          carMarkerRef.current.setIcon({
            url: rotatedSvg,
            scaledSize: new google.maps.Size(32, 32),
            anchor: new google.maps.Point(16, 16)
          });
        }

        if (isAutoCentering && googleMapInstanceRef.current) {
          programmaticActionRef.current = true;
          googleMapInstanceRef.current.panTo(newPos);
          if (googleMapInstanceRef.current.getZoom() !== 17) {
            googleMapInstanceRef.current.setZoom(17);
          }
          setTimeout(() => {
            programmaticActionRef.current = false;
          }, 100);
        }

        // Push new simulated coordinates to shared Supabase state
        if (rideId) {
          updateRideLocation(rideId, newPos.lat(), newPos.lng());
        }

        step++;
      }, 500);

      return () => clearInterval(interval);
    }
  }, [isDriving, googleMapsLoaded, gpsMode, coordinatesPath, waypoints, destination, mapError, isHost, rideId, isAutoCentering]);

  // 4. Passenger-side Real-time Tracking (Polls host coordinates from Supabase state)
  useEffect(() => {
    if (isHost || !googleMapsLoaded || !rideId || mapError || !isDriving) return;

    const ride = rides.find(r => r.id === rideId);
    if (ride && ride.driverLat && ride.driverLng) {
      const google = (window as any).google;
      if (google && google.maps) {
        const currentLatLng = new google.maps.LatLng(ride.driverLat, ride.driverLng);
        
        // Move car marker
        if (carMarkerRef.current) {
          carMarkerRef.current.setPosition(currentLatLng);
        }
        // Center map on driver and zoom in
        if (isAutoCentering && googleMapInstanceRef.current) {
          programmaticActionRef.current = true;
          googleMapInstanceRef.current.panTo(currentLatLng);
          if (googleMapInstanceRef.current.getZoom() !== 17) {
            googleMapInstanceRef.current.setZoom(17);
          }
          setTimeout(() => {
            programmaticActionRef.current = false;
          }, 100);
        }

        // Real-time directions & ETA calculation for passenger view
        if (destination) {
          const directionsService = new google.maps.DirectionsService();
          const googleWaypoints = (waypoints || []).map((addr: string) => ({
            location: addr,
            stopover: true
          }));

          directionsService.route(
            {
              origin: currentLatLng,
              destination: destination,
              waypoints: googleWaypoints,
              optimizeWaypoints: false,
              travelMode: google.maps.TravelMode.DRIVING
            },
            (res: any, status: any) => {
              if (status === google.maps.DirectionsStatus.OK && res.routes && res.routes[0]) {
                if (directionsRendererRef.current) {
                  directionsRendererRef.current.setDirections(res);
                }
                let totalDuration = 0;
                let totalDistance = 0;
                res.routes[0].legs.forEach((leg: any) => {
                  if (leg.duration?.value) totalDuration += leg.duration.value;
                  if (leg.distance?.value) totalDistance += leg.distance.value;
                });
                if (totalDuration > 0) setEta(Math.round(totalDuration / 60));
                if (totalDistance > 0) setDistanceStr((totalDistance / 1000).toFixed(1) + " km");
              }
            }
          );
        }
      }
    }
  }, [rides, googleMapsLoaded, isHost, rideId, mapError, isDriving, isAutoCentering, destination, waypoints]);

  // 4.5 Passenger GPS Broadcasting — passengers broadcast live location to host's map
  useEffect(() => {
    if (isHost || !isDriving || !rideId || !passengerId || mapError || !navigator.geolocation) return;

    let lastUpdate = 0;
    let lastLat = 0;
    let lastLng = 0;

    const handlePosition = (position: any) => {
      const now = Date.now();
      // Throttle passenger coordinates transmission to once every 10 seconds
      if (now - lastUpdate < 10000) return;

      const { latitude: lat, longitude: lng } = position.coords;
      const dLat = Math.abs(lat - lastLat);
      const dLng = Math.abs(lng - lastLng);
      if (lastUpdate > 0 && dLat < 0.0001 && dLng < 0.0001) return;

      lastUpdate = now;
      lastLat = lat;
      lastLng = lng;

      if (rideId && passengerId) {
        updatePassengerLocation(rideId, passengerId, lat, lng);
      }
    };

    let watchId: number | null = null;
    const startWatching = () => {
      if (watchId !== null) return;
      watchId = navigator.geolocation.watchPosition(
        handlePosition,
        (err) => console.warn("Passenger GPS error:", err.message),
        // Use coarse location cell-triangulation/Wi-Fi positioning (enableHighAccuracy = false) to save massive power
        { enableHighAccuracy: false, maximumAge: 15000, timeout: 15000 }
      );
    };

    const stopWatching = () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
        watchId = null;
      }
    };

    startWatching();

    // Conserve battery by pausing passenger GPS updates when the tab is hidden
    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopWatching();
      } else {
        startWatching();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      stopWatching();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [isDriving, isHost, rideId, passengerId, mapError]);

  // 4.6 Host map: Show live orange markers for each accepted passenger's current GPS
  const passengerMarkersRef = useRef<Record<string, any>>({});
  useEffect(() => {
    if (!isHost || !googleMapsLoaded || !rideId || mapError) return;

    const google = (window as any).google;
    if (!google || !google.maps || !googleMapInstanceRef.current) return;

    const ride = rides.find(r => r.id === rideId);
    if (!ride) return;

    // Clear markers for passengers who are no longer broadcasting
    Object.keys(passengerMarkersRef.current).forEach(pId => {
      if (!ride.passengerLocations || !ride.passengerLocations[pId]) {
        passengerMarkersRef.current[pId].setMap(null);
        delete passengerMarkersRef.current[pId];
      }
    });

    if (!ride.passengerLocations) return;

    Object.entries(ride.passengerLocations).forEach(([pId, coords]) => {
      const latLng = new google.maps.LatLng(coords.lat, coords.lng);
      if (passengerMarkersRef.current[pId]) {
        // Move existing marker
        passengerMarkersRef.current[pId].setPosition(latLng);
      } else {
        // Create new human-silhouette passenger marker
        passengerMarkersRef.current[pId] = new google.maps.Marker({
          position: latLng,
          map: googleMapInstanceRef.current,
          title: `Passenger live location`,
          icon: {
            // Human/person silhouette: head circle + body trapezoid
            path: "M 0 -13 C -3.5 -13 -3.5 -8 0 -8 C 3.5 -8 3.5 -13 0 -13 Z M -5 -7 C -8 -7 -8 2 -5 2 L -2 2 L -2 10 L 2 10 L 2 2 L 5 2 C 8 2 8 -7 5 -7 Z",
            fillColor: "#f97316",
            fillOpacity: 1,
            strokeColor: "#ffffff",
            strokeWeight: 1,
            scale: 1.2,
            anchor: new google.maps.Point(0, 10)
          }
        });
      }
    });
  }, [rides, isHost, googleMapsLoaded, rideId, mapError]);

  return (
    <div className="relative w-full h-[320px] rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 flex flex-col shadow-inner touch-manipulation">
      
      {googleMapsLoaded && !mapError ? (
        /* Real Google Map */
        <div
          ref={mapRef}
          className="w-full h-full absolute inset-0 z-0 touch-manipulation"
        />
      ) : (
        /* Loading / error fallback */
        <div className="absolute inset-0 w-full h-full z-0 bg-slate-950 flex items-center justify-center text-slate-500 text-xs">
          Loading Google Maps Engine...
        </div>
      )}

      {/* Floating Info Panels */}
      <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-10">
        <div className="flex items-center gap-1.5 bg-slate-950/85 backdrop-blur-md px-2.5 py-1.5 rounded-lg border border-slate-800 text-[10px] font-semibold text-slate-200">
          <MapPin className="h-3 w-3 text-emerald-400" />
          <span className="truncate max-w-[120px]">Pickup: {pickup || "Marina District"}</span>
        </div>
        <div className="flex items-center gap-1.5 bg-slate-950/85 backdrop-blur-md px-2.5 py-1.5 rounded-lg border border-slate-800 text-[10px] font-semibold text-slate-200">
          <Navigation className="h-3 w-3 text-sky-400" />
          <span className="truncate max-w-[120px]">Dest: {destination || "Office HQ"}</span>
        </div>
      </div>

      {/* Floating Recenter Button on Left Side of Map */}
      {!isAutoCentering && (
        <button
          onClick={() => {
            programmaticActionRef.current = true;
            setIsAutoCentering(true);
            if (googleMapInstanceRef.current) {
              const map = googleMapInstanceRef.current;
              let targetPos: any = null;

              if (carMarkerRef.current && carMarkerRef.current.getPosition()) {
                targetPos = carMarkerRef.current.getPosition();
              } else if (currentCoords) {
                targetPos = new (window as any).google.maps.LatLng(currentCoords.lat, currentCoords.lng);
              }

              if (targetPos) {
                map.panTo(targetPos);
                map.setZoom(18); // Close-up vehicle tracking view
              } else if (directionsRendererRef.current && directionsRendererRef.current.getDirections()) {
                const dirs = directionsRendererRef.current.getDirections();
                if (dirs && dirs.routes && dirs.routes[0]) {
                  map.fitBounds(dirs.routes[0].bounds);
                }
              }
            }
            // 1.2s guard so intermediate zoom_changed & directions route renders don't unlock auto-centering!
            setTimeout(() => {
              programmaticActionRef.current = false;
            }, 1200);
          }}
          className="absolute bottom-16 left-3 z-20 flex items-center gap-1.5 bg-brand-green-600 hover:bg-brand-green-700 text-white font-extrabold text-[10px] tracking-wider uppercase px-3 py-1.5 rounded-xl shadow-xl border border-brand-green-400 hover:scale-105 transition-all cursor-pointer animate-slide-up"
          title="Recenter map on vehicle"
        >
          🎯 Recenter
        </button>
      )}

      {/* Bottom status bar */}
      <div className="mt-auto w-full bg-slate-950/90 backdrop-blur-md border-t border-slate-800/80 p-3 flex items-center justify-between z-10">
        <div className="flex items-center gap-4">
          <div>
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Live ETA</p>
            <p className="text-sm font-bold text-white flex items-center gap-1">
              {eta !== null ? `${eta} mins` : "Calculating..."} <span className="text-[10px] font-normal text-slate-400">({distanceStr})</span>
            </p>
          </div>
          <div>
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Traffic Status</p>
            <p className={`text-xs font-bold flex items-center gap-1 ${
              traffic === "High" ? "text-rose-400" : traffic === "Medium" ? "text-amber-400" : "text-emerald-400"
            }`}>
              <Zap className="h-3 w-3" />
              {traffic} Traffic
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Google GPS Tracking</p>
          <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-400 border border-emerald-500/20">
            Live Connected
          </span>
        </div>
      </div>
    </div>
  );
}

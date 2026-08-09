"use client";

import React, { useState, useEffect, useRef } from "react";
import { Navigation, MapPin, Layers, RefreshCw, Zap, Map as MapIcon } from "lucide-react";
import { useAppState } from "@/context/StateContext";

interface InteractiveMapProps {
  pickup: string;
  destination: string;
  isDriving?: boolean;
  passengerPickup?: string;
  waypoints?: string[];
  onLocationDetected?: (address: string) => void;
  rideId?: string;
  isHost?: boolean;
  passengerId?: string; // current user's id when they are a passenger
}

export default function InteractiveMap({ 
  pickup, 
  destination, 
  isDriving = false, 
  passengerPickup, 
  waypoints = [],
  onLocationDetected,
  rideId,
  isHost = false,
  passengerId
}: InteractiveMapProps) {
  const { rides, updateRideLocation, updatePassengerLocation } = useAppState();
  const [eta, setEta] = useState(15);
  const [distanceStr, setDistanceStr] = useState("4.8 km");
  const [traffic, setTraffic] = useState<"Low" | "Medium" | "High">("Low");
  
  const mapRef = useRef<HTMLDivElement>(null);
  const googleMapInstanceRef = useRef<any>(null);
  const carMarkerRef = useRef<any>(null);
  const directionsRendererRef = useRef<any>(null);
  
  const [googleMapsLoaded, setGoogleMapsLoaded] = useState(false);
  const [coordinatesPath, setCoordinatesPath] = useState<any[]>([]);
  const [mapError, setMapError] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [currentCoords, setCurrentCoords] = useState<{lat: number, lng: number} | null>(null);
  const [gpsMode, setGpsMode] = useState<"Simulated" | "Live GPS">("Live GPS");

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "AIzaSyBfIUY_3TlArLC4BRriogce52erVVY80EI";
  const hasDetectedRef = useRef(false);

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
        styles: MAP_STYLES
      });
      googleMapInstanceRef.current = map;

      // Fade map in only after tiles are fully painted — eliminates the blank flash
      google.maps.event.addListenerOnce(map, 'tilesloaded', () => setMapReady(true));

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
          // Continue with directions/routes after map is ready
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

  // Extracted route-drawing logic (called after map is created)
  const initRoutes = () => {
    if (!googleMapInstanceRef.current || !mapRef.current) return;
    const google = (window as any).google;
    if (!google || !google.maps) return;
    const map = googleMapInstanceRef.current;

      // Initialize Directions Renderer
      const directionsRenderer = new google.maps.DirectionsRenderer({
        map: map,
        suppressMarkers: true,
        polylineOptions: {
          strokeColor: "#10b981",
          strokeOpacity: 0.8,
          strokeWeight: 6
        }
      });
      directionsRendererRef.current = directionsRenderer;

      const geocodeAddress = (address: string): Promise<any> => {
        return new Promise((resolve) => {
          const geocoderInstance = new google.maps.Geocoder();
          geocoderInstance.geocode({ address }, (results: any, status: any) => {
            if (status === "OK" && results[0]) {
              resolve(results[0].geometry.location);
            } else {
              resolve(null);
            }
          });
        });
      };

      const placeCustomMarkers = (startLatLng: any, endLatLng: any, mapInstance: any) => {
        // Pickup custom pin marker
        new google.maps.Marker({
          position: startLatLng,
          map: mapInstance,
          title: "Pickup",
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            fillColor: "#10b981",
            fillOpacity: 1,
            strokeColor: "#ffffff",
            strokeWeight: 2,
            scale: 8
          }
        });

        // Destination — flag post icon
        new google.maps.Marker({
          position: endLatLng,
          map: mapInstance,
          title: "Destination",
          icon: {
            // Flag with pole: pole is vertical line, flag is rectangle on top-right
            path: "M -1 12 L -1 -10 L 10 -10 L 10 -2 L -1 -2",
            fillColor: "#0ea5e9",
            fillOpacity: 1,
            strokeColor: "#ffffff",
            strokeWeight: 1.5,
            scale: 1.3,
            anchor: new google.maps.Point(-1, 12)
          }
        });

        // Proposed Passenger Pickup marker if provided (single preview)
        if (passengerPickup) {
          const geocoderInstance = new google.maps.Geocoder();
          geocoderInstance.geocode({ address: passengerPickup }, (passengerRes: any, passengerStatus: any) => {
            if (passengerStatus === google.maps.GeocoderStatus.OK && passengerRes[0]) {
              const passengerLatLng = passengerRes[0].geometry.location;

              new google.maps.Marker({
                position: passengerLatLng,
                map: mapInstance,
                title: "Your Proposed Pickup",
                icon: {
                  path: google.maps.SymbolPath.CIRCLE,
                  fillColor: "#3b82f6", // Royal Blue for passenger
                  fillOpacity: 1,
                  strokeColor: "#ffffff",
                  strokeWeight: 2.5,
                  scale: 8.5
                }
              });

              // Recalculate map bounds to encase driver startup, driver destination, and passenger pickup point
              const bounds = new google.maps.LatLngBounds();
              bounds.extend(startLatLng);
              bounds.extend(endLatLng);
              bounds.extend(passengerLatLng);
              mapInstance.fitBounds(bounds);
            }
          });
        }

        // Car custom tracking marker — top-down car silhouette
        const carMarker = new google.maps.Marker({
          position: startLatLng,
          map: mapInstance,
          title: "Carpool vehicle",
          icon: {
            // Top-down car silhouette: body + windshields + wheel arches
            // Points north (up). Rotation applied via updateRideLocation heading.
            path: "M 0 -22 C -5 -22 -7 -18 -7 -14 L -7 -10 C -9 -10 -9 -6 -7 -6 L -7 14 C -7 18 -5 22 0 22 C 5 22 7 18 7 14 L 7 -6 C 9 -6 9 -10 7 -10 L 7 -14 C 7 -18 5 -22 0 -22 Z M -6 -12 L 6 -12 L 6 -4 L -6 -4 Z M -6 4 L 6 4 L 6 12 L -6 12 Z",
            fillColor: "#10b981",
            fillOpacity: 1,
            strokeColor: "#ffffff",
            strokeWeight: 1.5,
            scale: 0.85,
            anchor: new google.maps.Point(0, 0),
            rotation: 0
          }
        });
        carMarkerRef.current = carMarker;
      };

      const drawGeodesicPath = async (startLatLng: any, endLatLng: any, mapInstance: any) => {
        placeCustomMarkers(startLatLng, endLatLng, mapInstance);

        // Geocode waypoints in parallel
        const waypointLatLngs: any[] = [];
        for (const wp of waypoints) {
          const loc = await geocodeAddress(wp);
          if (loc) {
            waypointLatLngs.push(loc);
            
            // Draw triangle milestone marker for waypoint
            new google.maps.Marker({
              position: loc,
              map: mapInstance,
              title: "Passenger Pickup",
              icon: {
                // Upward-pointing triangle (milestone)
                path: "M 0 -11 L 10 7 L -10 7 Z",
                fillColor: "#6366f1",
                fillOpacity: 1,
                strokeColor: "#ffffff",
                strokeWeight: 1.5,
                scale: 1.1,
                anchor: new google.maps.Point(0, 0)
              }
            });
          }
        }

        const pathPoints = [startLatLng, ...waypointLatLngs, endLatLng];

        // Draw direct straight-line polyline through all points
        new google.maps.Polyline({
          path: pathPoints,
          map: mapInstance,
          strokeColor: "#10b981",
          strokeOpacity: 0.8,
          strokeWeight: 5
        });

        // Fit bounds to fit all markers
        const bounds = new google.maps.LatLngBounds();
        pathPoints.forEach(pt => bounds.extend(pt));
        mapInstance.fitBounds(bounds);

        // Interpolate steps for the car marker animation segment-by-segment
        const steps = 100;
        const pathCoords: any[] = [];
        for (let s = 0; s < pathPoints.length - 1; s++) {
          const pStart = pathPoints[s];
          const pEnd = pathPoints[s + 1];
          const stepsPerSegment = Math.floor(steps / (pathPoints.length - 1));
          for (let i = 0; i <= stepsPerSegment; i++) {
            const fraction = i / stepsPerSegment;
            const lat = pStart.lat() + (pEnd.lat() - pStart.lat()) * fraction;
            const lng = pStart.lng() + (pEnd.lng() - pStart.lng()) * fraction;
            pathCoords.push(new google.maps.LatLng(lat, lng));
          }
        }
        setCoordinatesPath(pathCoords);

        // Estimate Distance & ETA using spherical geometry
        if (google.maps.geometry && google.maps.geometry.spherical) {
          let totalMeters = 0;
          for (let i = 0; i < pathPoints.length - 1; i++) {
            totalMeters += google.maps.geometry.spherical.computeDistanceBetween(pathPoints[i], pathPoints[i+1]);
          }
          const distKm = totalMeters / 1000;
          setDistanceStr(distKm.toFixed(1) + " km (Flight path)");
          setEta(Math.max(5, Math.round(distKm * 1.2))); // ~1.2 mins per km
        } else {
          setDistanceStr("Coordinates Mapped");
          setEta(20);
        }
      };

      // Don't draw any route if pickup/destination aren't set yet — prevents USA pan
      if (!pickup || !destination) return;

      // Get Route Directions from Google
      const directionsService = new google.maps.DirectionsService();

      const startLocation = pickup;
      const endLocation = destination;

      const geocoder = new google.maps.Geocoder();

      geocoder.geocode({ address: startLocation }, (startResults: any, startStatus: any) => {
        if (startStatus === google.maps.GeocoderStatus.OK && startResults[0]) {
          const startLatLng = startResults[0].geometry.location;

          geocoder.geocode({ address: endLocation }, (endResults: any, endStatus: any) => {
            if (endStatus === google.maps.GeocoderStatus.OK && endResults[0]) {
              const endLatLng = endResults[0].geometry.location;

              // Calculate spherical distance
              let distanceKm = 0;
              if (google.maps.geometry && google.maps.geometry.spherical) {
                const distMeters = google.maps.geometry.spherical.computeDistanceBetween(startLatLng, endLatLng);
                distanceKm = distMeters / 1000;
              } else {
                const dy = endLatLng.lat() - startLatLng.lat();
                const dx = endLatLng.lng() - startLatLng.lng();
                distanceKm = Math.sqrt(dx * dx + dy * dy) * 111.1;
              }

              // Proactively check if coordinates are extremely far (e.g. cross-continent / intercontinental point tests)
              if (distanceKm > 500) {
                console.log("Intercontinental coordinates detected (" + distanceKm.toFixed(0) + " km). Directly routing via geodesic flight path.");
                drawGeodesicPath(startLatLng, endLatLng, map);
              } else {
                // Compile Google Waypoints stopovers
                const googleWaypoints = waypoints.map((addr: string) => ({
                  location: addr,
                  stopover: true
                }));

                // Attempt optimized driving directions route
                directionsService.route(
                  {
                    origin: startLatLng,
                    destination: endLatLng,
                    waypoints: googleWaypoints,
                    optimizeWaypoints: true,
                    travelMode: google.maps.TravelMode.DRIVING
                  },
                  (result: any, status: any) => {
                    if (status === google.maps.DirectionsStatus.OK) {
                      directionsRenderer.setDirections(result);
                      const route = result.routes[0];
                      setCoordinatesPath(route.overview_path);

                      // Calculate combined total distance & duration across all waypoint legs!
                      let totalDuration = 0;
                      let totalDistance = 0;
                      const legs = route.legs;
                      legs.forEach((leg: any) => {
                        totalDuration += leg.duration.value;
                        totalDistance += leg.distance.value;
                      });

                      setEta(Math.round(totalDuration / 60));
                      setDistanceStr((totalDistance / 1000).toFixed(1) + " km");

                      placeCustomMarkers(startLatLng, endLatLng, map);

                      // Draw triangle milestone markers for all passenger waypoint stops on the map!
                      legs.slice(0, -1).forEach((leg: any, idx: number) => {
                        new google.maps.Marker({
                          position: leg.end_location,
                          map: map,
                          title: `Passenger Pickup #${idx + 1}`,
                          icon: {
                            // Upward-pointing triangle (milestone)
                            path: "M 0 -11 L 10 7 L -10 7 Z",
                            fillColor: "#6366f1",
                            fillOpacity: 1,
                            strokeColor: "#ffffff",
                            strokeWeight: 1.5,
                            scale: 1.1,
                            anchor: new google.maps.Point(0, 0)
                          }
                        });
                      });
                    } else {
                      console.warn("Driving directions with waypoints failed (status: " + status + "). Attempting geocoded fallback...");
                      drawGeodesicPath(startLatLng, endLatLng, map);
                    }
                  }
                );
              }
            } else {
              new google.maps.Marker({ position: { lat: 20.5937, lng: 78.9629 }, map: map });
            }
          });
        } else {
          new google.maps.Marker({ position: { lat: 20.5937, lng: 78.9629 }, map: map });
        }
      });

  };

  // Trigger initRoutes whenever pickup/destination/passengerPickup changes (after map is ready)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { initRoutes(); }, [googleMapsLoaded, pickup, destination, passengerPickup, waypoints]);

  // 3. Real-time GPS Car Tracking / Simulation (Only active for the Host Driver)
  useEffect(() => {
    if (!googleMapsLoaded || !isDriving || mapError || !isHost) return;

    const google = (window as any).google;
    if (!google || !google.maps) return;

    if (gpsMode === "Live GPS") {
      if (!navigator.geolocation) {
        console.warn("Geolocation not supported by this browser.");
        return;
      }

      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          const currentLatLng = new google.maps.LatLng(lat, lng);

          // Move car marker to actual live GPS position and rotate to heading
          if (carMarkerRef.current) {
            carMarkerRef.current.setPosition(currentLatLng);
            const heading = position.coords.heading;
            if (heading !== null && !isNaN(heading)) {
              const currentIcon = carMarkerRef.current.getIcon();
              carMarkerRef.current.setIcon({ ...currentIcon, rotation: heading });
            }
          }
          // Pan map to center on driver
          if (googleMapInstanceRef.current) {
            googleMapInstanceRef.current.panTo(currentLatLng);
          }

          // Push new coordinates to shared Supabase state
          if (rideId) {
            updateRideLocation(rideId, lat, lng);
          }

          // Recalculate directions from current live GPS coordinate to destination
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
                
                // Sum up remaining duration & distance
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
        },
        (error) => {
          console.warn("Live GPS Tracking error:", error.message);
        },
        {
          enableHighAccuracy: true,
          maximumAge: 1000,
          timeout: 10000
        }
      );

      return () => navigator.geolocation.clearWatch(watchId);
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
        
        if (googleMapInstanceRef.current) {
          googleMapInstanceRef.current.panTo(newPos);
        }

        // Push new simulated coordinates to shared Supabase state
        if (rideId) {
          updateRideLocation(rideId, newPos.lat(), newPos.lng());
        }

        step++;
      }, 500);

      return () => clearInterval(interval);
    }
  }, [isDriving, googleMapsLoaded, gpsMode, coordinatesPath, waypoints, destination, mapError, isHost, rideId]);

  // 4. Passenger-side Real-time Tracking (Polls host coordinates from Supabase state)
  useEffect(() => {
    if (isHost || !googleMapsLoaded || !rideId || mapError) return;

    const ride = rides.find(r => r.id === rideId);
    if (ride && ride.driverLat && ride.driverLng) {
      const google = (window as any).google;
      if (google && google.maps) {
        const currentLatLng = new google.maps.LatLng(ride.driverLat, ride.driverLng);
        
        // Move car marker
        if (carMarkerRef.current) {
          carMarkerRef.current.setPosition(currentLatLng);
        }
        // Center map on driver
        if (googleMapInstanceRef.current) {
          googleMapInstanceRef.current.panTo(currentLatLng);
        }
      }
    }
  }, [rides, googleMapsLoaded, isHost, rideId, mapError]);

  // 4.5 Passenger GPS Broadcasting — passengers broadcast live location to host's map
  useEffect(() => {
    if (isHost || !isDriving || !rideId || !passengerId || mapError || !navigator.geolocation) return;

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude: lat, longitude: lng } = position.coords;
        if (rideId && passengerId) {
          updatePassengerLocation(rideId, passengerId, lat, lng);
        }
      },
      (err) => console.warn("Passenger GPS error:", err.message),
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 10000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [isDriving, isHost, rideId, passengerId, mapError]);

  // 4.6 Host map: Show live orange markers for each accepted passenger's current GPS
  const passengerMarkersRef = useRef<Record<string, any>>({});
  useEffect(() => {
    if (!isHost || !googleMapsLoaded || !rideId || mapError) return;

    const google = (window as any).google;
    if (!google || !google.maps || !googleMapInstanceRef.current) return;

    const ride = rides.find(r => r.id === rideId);
    if (!ride || !ride.passengerLocations) return;

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
    <div className="relative w-full h-[320px] rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 flex flex-col shadow-inner">
      
      {googleMapsLoaded && !mapError ? (
        /* Real Google Map */
        <div
          ref={mapRef}
          className="w-full h-full absolute inset-0 z-0"
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

      {/* Floating GPS Mode Toggle Controls */}
      {isDriving && isHost && (
        <div className="absolute top-3 right-3 z-10 flex items-center gap-1 bg-slate-950/90 backdrop-blur-md p-1 rounded-xl border border-slate-800 text-[10px] font-bold shadow-lg">
          <button
            onClick={() => setGpsMode("Live GPS")}
            className={`px-2.5 py-1.5 rounded-lg transition-all ${
              gpsMode === "Live GPS" 
                ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/10" 
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/50"
            }`}
          >
            📡 Live GPS
          </button>
          <button
            onClick={() => setGpsMode("Simulated")}
            className={`px-2.5 py-1.5 rounded-lg transition-all ${
              gpsMode === "Simulated" 
                ? "bg-sky-500 text-white shadow-md shadow-sky-500/10" 
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/50"
            }`}
          >
            🕹️ Simulate
          </button>
        </div>
      )}

      {/* Bottom status bar */}
      <div className="mt-auto w-full bg-slate-950/90 backdrop-blur-md border-t border-slate-800/80 p-3 flex items-center justify-between z-10">
        <div className="flex items-center gap-4">
          <div>
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Live ETA</p>
            <p className="text-sm font-bold text-white flex items-center gap-1">
              {eta} mins <span className="text-[10px] font-normal text-slate-400">({distanceStr})</span>
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

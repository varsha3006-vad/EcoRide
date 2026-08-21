import { Ride, CommuteRequest, RideProposal } from "@/context/StateContext";

// Parse time strings ("09:00 AM", "9:30 AM", "17:30", "5:30 PM") to minutes past midnight
export const parseTimeToMinutes = (timeStr?: string): number => {
  if (!timeStr) return 540; // Default 09:00 AM (540 mins)

  const clean = timeStr.trim().toUpperCase();
  const isPM = clean.includes("PM");
  const isAM = clean.includes("AM");

  const digits = clean.replace(/[^0-9:]/g, "");
  const parts = digits.split(":");
  let hours = parseInt(parts[0] || "9", 10);
  const minutes = parseInt(parts[1] || "0", 10);

  if (isPM && hours < 12) hours += 12;
  if (isAM && hours === 12) hours = 0;

  return hours * 60 + minutes;
};

// Haversine distance calculation in kilometers
export const getDistanceKm = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 5.0;
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(2));
};

// Calculate perpendicular deviation from host route line (start -> end)
export const getRouteDeviationKm = (
  pLat: number,
  pLng: number,
  rStartLat?: number,
  rStartLng?: number,
  rEndLat?: number,
  rEndLng?: number
): number => {
  const sLat = rStartLat || 12.9716;
  const sLng = rStartLng || 77.5946;
  const eLat = rEndLat || 12.9352;
  const eLng = rEndLng || 77.6245;

  const dStart = getDistanceKm(sLat, sLng, pLat, pLng);
  const dEnd = getDistanceKm(eLat, eLng, pLat, pLng);
  const totalRouteDist = getDistanceKm(sLat, sLng, eLat, eLng);

  if (totalRouteDist === 0) return dStart;

  // Approximate perpendicular deviation using triangle area formula
  const s = (dStart + dEnd + totalRouteDist) / 2;
  const area = Math.sqrt(Math.max(0, s * (s - dStart) * (s - dEnd) * (s - totalRouteDist)));
  const deviation = (2 * area) / totalRouteDist;

  return Number(deviation.toFixed(1));
};

export interface RouteMatchResult {
  commuteRequest: CommuteRequest;
  driverRide: Ride;
  deviationKm: number;
  timeDiffMins: number;
  aiConfidenceScore: number;
  estimatedCo2Saved: number;
  estimatedEsgCredits: number;
  matchScore: number;
}

export const findSmartMatchesForDriver = (
  driverRide: Ride,
  commuteRequests: CommuteRequest[],
  rideProposals: RideProposal[] = []
): RouteMatchResult[] => {
  if (!driverRide || !commuteRequests || commuteRequests.length === 0) return [];

  const matches: RouteMatchResult[] = [];
  const driverTimeMins = parseTimeToMinutes(driverRide.departureTime);

  commuteRequests.forEach((req) => {
    // Only match pending requests in the same city or matching date/route
    if (req.status !== "Pending") return;
    if (req.requesterId === driverRide.hostId) return;

    // Filter out requests for which the host driver has ALREADY sent a proposal
    const alreadyProposed = rideProposals.some(
      (p) => p.requestId === req.id && p.hostId === driverRide.hostId && (p.status === "Pending" || p.status === "Accepted")
    );
    if (alreadyProposed) return;

    // Check date alignment if available
    if (req.rideDate && driverRide.rideDate && req.rideDate !== driverRide.rideDate) {
      return;
    }

    const reqObj = req as any;

    // Time window calculation
    const psgrTimeMins = parseTimeToMinutes(req.desiredTime || reqObj.time);
    const timeDiffMins = Math.abs(driverTimeMins - psgrTimeMins);

    // Filter strictly within <= 45 minutes departure window
    if (timeDiffMins > 45) return;

    const pLat = reqObj.pickupLat || (driverRide as any).pickupLat || 12.9716;
    const pLng = reqObj.pickupLng || (driverRide as any).pickupLng || 77.5946;

    const deviation = getRouteDeviationKm(
      pLat,
      pLng,
      (driverRide as any).pickupLat,
      (driverRide as any).pickupLng,
      (driverRide as any).destLat,
      (driverRide as any).destLng
    );

    // Filter strictly within <= 5.0 km route deviation
    if (deviation <= 5.0) {
      const vType = driverRide.vehicleType || "Electric";
      const vehicleEmissionFactor = vType === "Electric" ? 0.02 : vType === "Hybrid" ? 0.07 : 0.14;
      const vehicleBonus = vType === "Electric" ? 20 : vType === "Hybrid" ? 10 : 0;

      const approxDistance = Math.max(
        5,
        getDistanceKm(
          pLat,
          pLng,
          reqObj.dropLat || (driverRide as any).destLat || 12.9352,
          reqObj.dropLng || (driverRide as any).destLng || 77.6245
        )
      );

      const co2 = Number(
        Math.max(0.8, (approxDistance * 0.171) - (approxDistance * vehicleEmissionFactor)).toFixed(1)
      );

      const credits = Math.max(25, Math.round(approxDistance * 2.5) + 15 + vehicleBonus);

      // Neural AI Confidence Match Score calculation (70% - 99%)
      const confidence = Math.min(
        99,
        Math.max(72, Math.round(100 - (deviation * 3.5) - (timeDiffMins * 0.5)))
      );

      matches.push({
        commuteRequest: req,
        driverRide,
        deviationKm: deviation,
        timeDiffMins,
        aiConfidenceScore: confidence,
        estimatedCo2Saved: co2,
        estimatedEsgCredits: credits,
        matchScore: co2 * 100 + credits
      });
    }
  });

  // Sort matches strictly by HIGHEST CO2 SAVED descending
  return matches.sort((a, b) => b.estimatedCo2Saved - a.estimatedCo2Saved);
};

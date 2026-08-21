import { Ride, CommuteRequest } from "@/context/StateContext";

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
  estimatedCo2Saved: number;
  estimatedEsgCredits: number;
  matchScore: number;
}

export const findSmartMatchesForDriver = (
  driverRide: Ride,
  commuteRequests: CommuteRequest[]
): RouteMatchResult[] => {
  if (!driverRide || !commuteRequests || commuteRequests.length === 0) return [];

  const matches: RouteMatchResult[] = [];

  commuteRequests.forEach((req) => {
    // Only match pending requests in the same city or matching date/route
    if (req.status !== "Pending") return;
    if (req.requesterId === driverRide.hostId) return;

    // Check date alignment if available
    if (req.rideDate && driverRide.rideDate && req.rideDate !== driverRide.rideDate) {
      return;
    }

    const reqObj = req as any;
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

      matches.push({
        commuteRequest: req,
        driverRide,
        deviationKm: deviation,
        estimatedCo2Saved: co2,
        estimatedEsgCredits: credits,
        matchScore: co2 * 100 + credits
      });
    }
  });

  // Sort matches strictly by HIGHEST CO2 SAVED descending
  return matches.sort((a, b) => b.estimatedCo2Saved - a.estimatedCo2Saved);
};

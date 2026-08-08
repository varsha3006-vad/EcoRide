import { Injectable, BadRequestException } from '@nestjs/common';

export interface VehicleDetails {
  fuelType: 'Electric' | 'Hybrid' | 'ICE_Gasoline' | 'ICE_Diesel';
  capacity: number;
}

export interface EsgCreditsResult {
  co2SavedKg: number;
  creditsEarned: number;
  treesEquivalent: number;
}

@Injectable()
export class EsgService {
  // Constants for Emissions Factors (kg CO2 per km)
  private readonly SINGLE_OCCUPANCY_FACTOR = 0.171; // Average standard ICE single passenger
  private readonly CARPOOL_BASE_EMISSION = 0.052;    // Combined baseline vehicle emissions

  // Multipliers for different vehicle propulsions
  private readonly PROPULSION_MULTIPLIERS = {
    Electric: 0.0,    // Zero direct emissions
    Hybrid: 0.35,     // 65% cleaner than base gasoline
    ICE_Gasoline: 1.0,
    ICE_Diesel: 1.1,
  };

  /**
   * Automatically calculates CO2 saved and ESG credits earned for a shared ride.
   * CO2 Saved = (Single Occupancy Emissions * Number of Passengers) - Carpool Emissions
   */
  calculateRideEsgImpact(
    distanceKm: number,
    passengerCount: number,
    vehicle: VehicleDetails,
    isRecurring: boolean,
    isPeakHour: boolean,
  ): EsgCreditsResult {
    if (distanceKm <= 0) {
      throw new BadRequestException('Distance must be positive');
    }
    if (passengerCount < 1) {
      return { co2SavedKg: 0, creditsEarned: 0, treesEquivalent: 0 };
    }

    // 1. Calculate CO2 Offset
    const singleOccupancyEmissions = this.SINGLE_OCCUPANCY_FACTOR * distanceKm * passengerCount;
    
    // Carpool emissions adjust based on vehicle propulsion
    const propulsionModifier = this.PROPULSION_MULTIPLIERS[vehicle.fuelType] ?? 1.0;
    const carpoolEmissions = this.CARPOOL_BASE_EMISSION * distanceKm * propulsionModifier;

    const co2SavedKg = Math.max(0, Number((singleOccupancyEmissions - carpoolEmissions).toFixed(2)));
    
    // 2. Trees Equivalent (1 mature tree absorbs ~22kg of CO2 per year)
    const treesEquivalent = Number((co2SavedKg / 22.0).toFixed(3));

    // 3. ESG Credits Logic
    let baseCredits = Math.round(distanceKm * 1.2); // 1.2 credits per km

    // Vehicle propulsion bonuses
    if (vehicle.fuelType === 'Electric') {
      baseCredits += 25; // EV bonus
    } else if (vehicle.fuelType === 'Hybrid') {
      baseCredits += 15; // Hybrid bonus
    }

    // Capacity utilisation bonus
    if (passengerCount >= 3) {
      baseCredits += 10; // Extra full carpool bonus
    }

    // Scheduling bonuses
    if (isRecurring) baseCredits += 15;
    if (isPeakHour) baseCredits += 10;

    return {
      co2SavedKg,
      creditsEarned: baseCredits,
      treesEquivalent,
    };
  }

  /**
   * Applies penalty deductions for violations
   */
  calculatePenaltyCredits(reason: 'LateCancellation' | 'NoShow' | 'RepeatedRejections'): number {
    switch (reason) {
      case 'LateCancellation':
        return -25;
      case 'NoShow':
        return -50;
      case 'RepeatedRejections':
        return -15;
      default:
        return 0;
    }
  }
}

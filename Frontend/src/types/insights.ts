/**
 * FE2: Green Intelligence / City Dashboard Types
 */

export interface GapCell {
  id: string;
  gridX: number;
  gridY: number;
  centerLat: number;
  centerLng: number;
  demandVolume: number;
  carSharePercentage: number;
  distanceToNearestBikeLaneMeters: number;
  distanceToNearestTransitStopMeters: number;
  priorityScore: number; // 0 - 100
  zoneName: string;
}

export interface PriorityZone {
  rank: number;
  zoneName: string;
  recommendation: 'New Bike Corridor' | 'Extend Tram Line' | 'Add Micro-mobility Hub';
  estimatedCo2ReductionYearKg: number;
  carTripDensity: 'High' | 'Very High' | 'Critical';
}

export interface CityInsightsSummary {
  totalSimulatedTrips: number;
  totalCo2SavedCityKg: number;
  averageEcoRank: number;
  topGapZones: PriorityZone[];
  generatedAt: string;
}

/**
 * FE1: Route & Transit Types
 * Strictly aligned with Backend API contract (POST /routes/plan)
 */

export type TransportMode =
  | 'Walking'
  | 'Bicycle'
  | 'Scooter'
  | 'PublicTransit'
  | 'Carpool'
  | 'CarWithParking';

export type WarningType =
  | 'Rain'
  | 'Snow'
  | 'SteepIncline'
  | 'NoHelmetNotice'
  | 'AgeRestriction'
  | 'AccessibilityNotice'
  | 'HighEmissionsWarning';

export interface LatLng {
  latitude: number;
  longitude: number;
}

export interface RoutePlanRequest {
  origin: LatLng;
  destination: LatLng;
  departureTime?: string;
  hasDisability?: boolean;
  age?: number;
  hasOwnBicycle?: boolean;
  hasOwnScooter?: boolean;
  hasOwnCar?: boolean;
}

export interface RouteWarning {
  type: WarningType;
  message: string;
  severity: 'info' | 'warning' | 'alert';
}

export interface ParkingDetail {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  spotsAvailable: number;
  totalSpots: number;
  hourlyRateRon: number;
  isAccessible: boolean;
}

export interface RouteOption {
  id: string;
  mode: TransportMode;
  durationMinutes: number;
  distanceMeters: number;
  co2Grams: number;
  ecoPoints: number;
  priceRon: number;
  isRecommended: boolean;
  ecoRank: number; // 1 = highest eco score
  warnings: RouteWarning[];
  encodedPolyline: string;
  stepsSummary: string; // e.g. "Tram 2 (4 stops) + 250m walking"
  parkingDetails?: ParkingDetail;
}

export interface RoutePlanResponse {
  options: RouteOption[];
  baselineCarCo2Grams: number;
  calculatedAt: string;
}

export interface StationLocation {
  id: string;
  name: string;
  type: 'tram' | 'bus' | 'bike_station';
  latitude: number;
  longitude: number;
  availableBikes?: number;
  lines?: string[];
}

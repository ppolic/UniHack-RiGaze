/**
 * FE1: Route & Transit Types
 * Strictly aligned with Backend API contract (POST /routes/plan)
 * Source of truth: docs/openapi.json and docs/api-contract.md
 */

export interface GeoPoint {
  lat: number;
  lng: number;
}

// Alias for components expecting LatLng
export type LatLng = GeoPoint;

export type AgeCategory = 'Under14' | 'From14To15' | 'Adult';

export interface UserProfileDto {
  ageCategory: AgeCategory;
  hasDisability: boolean;
  ownsBike: boolean;
  ownsScooter: boolean;
  ownsCar: boolean;
}

export type TransportMode =
  | 'Walk'
  | 'Bike'
  | 'Scooter'
  | 'PublicTransport'
  | 'Car'
  | 'Carpool'
  | 'Combined';

export type WeatherCondition = 'Clear' | 'Rain' | 'Snow' | 'Cold' | 'Windy';

export type WarningType =
  | 'Rain'
  | 'Snow'
  | 'Cold'
  | 'Windy'
  | 'Slope'
  | 'Helmet'
  | 'NoBikeLane'
  | 'NotAccessible'
  | 'Estimate';

export interface RouteWarningDto {
  type: WarningType;
  message?: string | null;
}

export interface RouteSegmentDto {
  mode: TransportMode;
  description?: string | null;
  durationMinutes: number;
  distanceKm: number;
  geometry?: GeoPoint[] | null;
}

export interface RouteOptionDto {
  id: string;
  mode: TransportMode;
  title?: string | null;
  durationMinutes: number;
  distanceKm: number;
  costRon: number;
  co2Grams: number;
  ecoPoints: number;
  ecoRank: number; // 1 = najzelenije
  isRecommended: boolean;
  segments?: RouteSegmentDto[] | null;
  warnings?: RouteWarningDto[] | null;
}

// Aliases for component convenience
export type RouteOption = RouteOptionDto;
export type RouteWarning = RouteWarningDto;
export type RouteSegment = RouteSegmentDto;

export interface WeatherInfoDto {
  condition: WeatherCondition;
  temperatureC: number;
  precipitationMm: number;
}

export interface RoutePlanRequest {
  origin: GeoPoint;
  destination: GeoPoint;
  departureTime?: string | null;
  profile: UserProfileDto;
  preferredModes?: TransportMode[] | null;
}

export interface RoutePlanResponse {
  weather: WeatherInfoDto;
  options: RouteOptionDto[];
  isMock: boolean;
}

export interface StationLocation {
  id: string;
  name: string;
  type: 'tram' | 'bus' | 'bike_station';
  lat: number;
  lng: number;
  availableBikes?: number;
  lines?: string[];
}

export interface ParkingDetail {
  id: string;
  name: string;
  lat: number;
  lng: number;
  spotsAvailable: number;
  totalSpots: number;
  hourlyRateRon: number;
  isAccessible: boolean;
}

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
  | 'AirQuality'
  | 'Slope'
  | 'Helmet'
  | 'NoBikeLane'
  | 'NotAccessible'
  | 'RoadHazard'
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
  type: 'tram' | 'bus' | 'trolleybus' | 'bike_station' | 'scooter_station';
  lat: number;
  lng: number;
  availableBikes?: number;
  totalDocks?: number;
  lines?: string[];
  routeIds?: string[];
  stopCode?: string;
  isWheelchairAccessible?: boolean;
  nextArrivalMinutes?: number;
  nextDepartures?: string[];
  feedVersion?: string;
  dataSource?: string;
}

export interface ParkingDetail {
  id: string;
  name: string;
  lat: number;
  lng: number;
  spotsAvailable?: number | null;
  totalSpots?: number | null;
  hourlyRateRon: number;
  hourlyRateEur?: number;
  smsCode?: string;
  smsNumber?: string;
  isAccessible: boolean;
  accessibleSpots?: number;
  zone?: string;
  tariffColor?: 'green' | 'red' | 'yellow' | 'blue';
  polygon?: GeoPoint[];
  dataSource?: string;
}

export interface CityLandmarkPoi {
  id: string;
  name: string;
  nameEn?: string;
  address?: string;
  description?: string;
  lat: number;
  lng: number;
}

export interface TransitNetworkPath {
  routeId: string;
  shortName: string;
  longName?: string;
  type: number; // 0 = tram, 3 = bus, 11 = trolleybus
  directionId: number;
  color?: string;
  geometry: GeoPoint[];
}

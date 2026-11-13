import { apiFetch, API_CONFIG } from './api';
import { StationLocation, ParkingDetail } from '../types/route';

const MOCK_STATIONS: StationLocation[] = [
  {
    id: 'st_1',
    name: 'Piața Victoriei (STPT)',
    type: 'tram',
    lat: 45.7538,
    lng: 21.2257,
    lines: ['1', '2', '4', '8'],
  },
  {
    id: 'st_2',
    name: 'Catedrala Mitropolitană',
    type: 'bus',
    lat: 45.7511,
    lng: 21.2241,
    lines: ['33', 'E1', 'E8'],
  },
  {
    id: 'st_3',
    name: 'UPT Electro - Politehnica',
    type: 'tram',
    lat: 45.7489,
    lng: 21.2272,
    lines: ['2', '8'],
  },
  {
    id: 'st_4',
    name: 'VeloTM Piața Libertății',
    type: 'bike_station',
    lat: 45.7557,
    lng: 21.2273,
    availableBikes: 7,
  },
];

const MOCK_PARKINGS: ParkingDetail[] = [
  {
    id: 'prk_1',
    name: 'Parcare Hotel Timișoara',
    lat: 45.7534,
    lng: 21.2248,
    spotsAvailable: 14,
    totalSpots: 50,
    hourlyRateRon: 8,
    isAccessible: true,
  },
  {
    id: 'prk_2',
    name: 'Parcare Bulevardul Pârvan',
    lat: 45.7485,
    lng: 21.2291,
    spotsAvailable: 6,
    totalSpots: 30,
    hourlyRateRon: 5,
    isAccessible: true,
  },
];

export const transitService = {
  async getNearbyStations(lat: number, lng: number): Promise<StationLocation[]> {
    if (API_CONFIG.USE_MOCK_FALLBACK) {
      return MOCK_STATIONS;
    }
    return apiFetch<StationLocation[]>(`/transit/stops/nearby?lat=${lat}&lng=${lng}`);
  },

  async getParkings(): Promise<ParkingDetail[]> {
    if (API_CONFIG.USE_MOCK_FALLBACK) {
      return MOCK_PARKINGS;
    }
    return apiFetch<ParkingDetail[]>('/parkings');
  },
};

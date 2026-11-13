import { apiFetch, API_CONFIG } from './api';
import { CityInsightsSummary, GapCell } from '../types/insights';

const MOCK_INSIGHTS_SUMMARY: CityInsightsSummary = {
  totalSimulatedTrips: 14280,
  totalCo2SavedCityKg: 3840.5,
  averageEcoRank: 1.8,
  topGapZones: [
    {
      rank: 1,
      zoneName: 'Zona Calea Torontalului – VOX Technology Park',
      recommendation: 'New Bike Corridor',
      estimatedCo2ReductionYearKg: 14200,
      carTripDensity: 'Critical',
    },
    {
      rank: 2,
      zoneName: 'Calea Șagului Shopping City ➔ Complex Studențesc',
      recommendation: 'Extend Tram Line',
      estimatedCo2ReductionYearKg: 9800,
      carTripDensity: 'Very High',
    },
    {
      rank: 3,
      zoneName: 'Gara de Est ➔ UPT Campus Sud',
      recommendation: 'Add Micro-mobility Hub',
      estimatedCo2ReductionYearKg: 6400,
      carTripDensity: 'High',
    },
  ],
  generatedAt: new Date().toISOString(),
};

const MOCK_GAP_CELLS: GapCell[] = [
  {
    id: 'gap_1',
    gridX: 12,
    gridY: 8,
    centerLat: 45.765,
    centerLng: 21.215,
    demandVolume: 1250,
    carSharePercentage: 78,
    distanceToNearestBikeLaneMeters: 620,
    distanceToNearestTransitStopMeters: 450,
    priorityScore: 92,
    zoneName: 'Torontalului Nord',
  },
  {
    id: 'gap_2',
    gridX: 14,
    gridY: 15,
    centerLat: 45.735,
    centerLng: 21.245,
    demandVolume: 940,
    carSharePercentage: 82,
    distanceToNearestBikeLaneMeters: 850,
    distanceToNearestTransitStopMeters: 600,
    priorityScore: 88,
    zoneName: 'Girocului Sud',
  },
];

export const insightsService = {
  async getSummary(): Promise<CityInsightsSummary> {
    if (API_CONFIG.USE_MOCK_FALLBACK) {
      return MOCK_INSIGHTS_SUMMARY;
    }
    return apiFetch<CityInsightsSummary>('/insights/summary');
  },

  async getGapCells(): Promise<GapCell[]> {
    if (API_CONFIG.USE_MOCK_FALLBACK) {
      return MOCK_GAP_CELLS;
    }
    return apiFetch<GapCell[]>('/insights/gaps');
  },
};

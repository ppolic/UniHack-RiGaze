import { apiFetch, API_CONFIG } from './api';
import { CityInsightsSummary, GapCell, PriorityZone } from '../types/insights';

interface BackendPriorityZoneDto {
  rank: number;
  cellId: string;
  zoneName: string;
  gapScore: number;
  totalTrips: number;
  carSharePercent: number;
  distanceToBikeLaneMeters: number;
  distanceToTransitStopMeters: number;
  reason: string;
  proposedAction: string;
}

interface BackendInsightsSummaryResponseDto {
  totalSavedCo2Kg: number;
  totalTripsCount: number;
  greenTripsCount: number;
  greenModalSplitPercent: number;
  identifiedGapCellsCount: number;
  topInvestmentZones: BackendPriorityZoneDto[];
}

interface BackendGapCellDto {
  cellId: string;
  zoneName: string;
  center: { lat: number; lng: number };
  totalTrips: number;
  carShare: number;
  distanceToNearestBikeLaneMeters: number;
  distanceToNearestTransitStopMeters: number;
  gapScore: number;
}

interface BackendInsightsGapsResponseDto {
  cells: BackendGapCellDto[];
}

function mapRecommendation(action: string): PriorityZone['recommendation'] {
  const lower = action.toLowerCase();
  if (lower.includes('tram') || lower.includes('bus') || lower.includes('stpt') || lower.includes('javn')) {
    return 'Extend Tram Line';
  }
  if (lower.includes('bicikl') || lower.includes('staz') || lower.includes('bike')) {
    return 'New Bike Corridor';
  }
  return 'Add Micro-mobility Hub';
}

function mapCarDensity(carSharePercent: number): PriorityZone['carTripDensity'] {
  if (carSharePercent >= 75) return 'Critical';
  if (carSharePercent >= 55) return 'Very High';
  return 'High';
}

function parseGridCoord(cellId: string, fallbackIdx: number): { gridX: number; gridY: number } {
  const match = /R(\d+)-C(\d+)/i.exec(cellId);
  if (match) {
    return {
      gridY: parseInt(match[1], 10),
      gridX: parseInt(match[2], 10),
    };
  }
  return {
    gridX: fallbackIdx % 4,
    gridY: Math.floor(fallbackIdx / 4),
  };
}

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
    try {
      const res = await apiFetch<BackendInsightsSummaryResponseDto>('/insights/summary');
      const avgEcoRank = Number(
        Math.max(1.0, Math.min(4.5, 3.2 - (res.greenModalSplitPercent / 100) * 1.8)).toFixed(1)
      );
      return {
        totalSimulatedTrips: res.totalTripsCount,
        totalCo2SavedCityKg: Math.round(res.totalSavedCo2Kg * 10) / 10,
        averageEcoRank: avgEcoRank,
        topGapZones: (res.topInvestmentZones || []).map((z) => ({
          rank: z.rank,
          zoneName: z.zoneName,
          recommendation: mapRecommendation(`${z.proposedAction} ${z.reason}`),
          estimatedCo2ReductionYearKg: Math.round(
            Math.max(1500, z.totalTrips * (z.carSharePercent / 100) * 180)
          ),
          carTripDensity: mapCarDensity(z.carSharePercent),
        })),
        generatedAt: new Date().toISOString(),
      };
    } catch (err) {
      console.warn('API /insights/summary unreachable, using mock insights:', err);
      return MOCK_INSIGHTS_SUMMARY;
    }
  },

  async getGapCells(): Promise<GapCell[]> {
    if (API_CONFIG.USE_MOCK_FALLBACK) {
      return MOCK_GAP_CELLS;
    }
    try {
      const res = await apiFetch<BackendInsightsGapsResponseDto>('/insights/gaps');
      return (res.cells || []).map((c, idx) => {
        const { gridX, gridY } = parseGridCoord(c.cellId, idx);
        const carPct = Math.round(c.carShare <= 1 ? c.carShare * 100 : c.carShare);
        return {
          id: c.cellId,
          gridX,
          gridY,
          centerLat: c.center.lat,
          centerLng: c.center.lng,
          demandVolume: c.totalTrips,
          carSharePercentage: carPct,
          distanceToNearestBikeLaneMeters: Math.round(c.distanceToNearestBikeLaneMeters),
          distanceToNearestTransitStopMeters: Math.round(c.distanceToNearestTransitStopMeters),
          priorityScore: Math.round(c.gapScore),
          zoneName: c.zoneName,
        };
      });
    } catch (err) {
      console.warn('API /insights/gaps unreachable, using mock gap cells:', err);
      return MOCK_GAP_CELLS;
    }
  },
};

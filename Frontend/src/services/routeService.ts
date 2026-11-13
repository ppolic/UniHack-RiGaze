import { apiFetch, API_CONFIG } from './api';
import { RoutePlanRequest, RoutePlanResponse, RouteOption } from '../types/route';

/**
 * Realistic Timișoara Mock Data for Demo
 * Piața Victoriei (45.7538, 21.2257) -> UPT Electro (45.7489, 21.2272)
 */
const MOCK_OPTIONS_STANDARD: RouteOption[] = [
  {
    id: 'opt_bike_1',
    mode: 'Bicycle',
    durationMinutes: 6,
    distanceMeters: 1450,
    co2Grams: 0,
    ecoPoints: 50,
    priceRon: 0,
    isRecommended: true,
    ecoRank: 1,
    warnings: [
      {
        type: 'Rain',
        message: 'Lokalna kiša: vozite oprezno po mokrim tračnicama i pločniku.',
        severity: 'warning',
      },
    ],
    encodedPolyline: '_p~iF~ps|U_ulLnnqC_mqNvxq`@',
    stepsSummary: 'Biciklistička staza Bulevarul Vasile Pârvan (1.4 km)',
  },
  {
    id: 'opt_transit_1',
    mode: 'PublicTransit',
    durationMinutes: 9,
    distanceMeters: 1800,
    co2Grams: 35,
    ecoPoints: 35,
    priceRon: 4,
    isRecommended: false,
    ecoRank: 2,
    warnings: [
      {
        type: 'AccessibilityNotice',
        message: 'Niskopodni tramvaj STPT (linija 2) – prilagođeno kolicima.',
        severity: 'info',
      },
    ],
    encodedPolyline: '_p~iF~ps|U_ulLnnqC_mqNvxq`@',
    stepsSummary: 'Tramvaj 2 (Piața Victoriei ➔ Politehnica, 3 stanice) + 120m hoda',
  },
  {
    id: 'opt_walk_1',
    mode: 'Walking',
    durationMinutes: 16,
    distanceMeters: 1300,
    co2Grams: 0,
    ecoPoints: 40,
    priceRon: 0,
    isRecommended: false,
    ecoRank: 3,
    warnings: [],
    encodedPolyline: '_p~iF~ps|U_ulLnnqC_mqNvxq`@',
    stepsSummary: 'Pješke kroz park Central i preko mosta Michelangelo',
  },
  {
    id: 'opt_car_1',
    mode: 'CarWithParking',
    durationMinutes: 14,
    distanceMeters: 2200,
    co2Grams: 390,
    ecoPoints: 0,
    priceRon: 7, // Parking sat
    isRecommended: false,
    ecoRank: 4,
    warnings: [
      {
        type: 'HighEmissionsWarning',
        message: 'Auto emitira 390g CO₂. Odabirom bicikla štedite 100% emisija.',
        severity: 'alert',
      },
    ],
    encodedPolyline: '_p~iF~ps|U_ulLnnqC_mqNvxq`@',
    stepsSummary: 'Bulevarul Mihai Viteazu + parkiranje u Zoni 1 (UPT parking)',
    parkingDetails: {
      id: 'prk_upt_1',
      name: 'Parking UPT Elektrotehnika',
      latitude: 45.7492,
      longitude: 21.2280,
      spotsAvailable: 8,
      totalSpots: 45,
      hourlyRateRon: 7,
      isAccessible: true,
    },
  },
];

const MOCK_OPTIONS_ACCESSIBLE: RouteOption[] = [
  {
    id: 'opt_transit_acc',
    mode: 'PublicTransit',
    durationMinutes: 9,
    distanceMeters: 1800,
    co2Grams: 35,
    ecoPoints: 45,
    priceRon: 0, // Često subvencionirano/besplatno za osobe s invaliditetom
    isRecommended: true,
    ecoRank: 1,
    warnings: [
      {
        type: 'AccessibilityNotice',
        message: 'Potvrđena rampa i niski pod: STPT Tramvaj Linija 2.',
        severity: 'info',
      },
    ],
    encodedPolyline: '_p~iF~ps|U_ulLnnqC_mqNvxq`@',
    stepsSummary: 'Pristupačan tramvaj 2 (Piața Victoriei ➔ Politehnica)',
  },
  {
    id: 'opt_car_acc',
    mode: 'CarWithParking',
    durationMinutes: 11,
    distanceMeters: 2200,
    co2Grams: 390,
    ecoPoints: 10,
    priceRon: 0, // Besplatan invalidski parking
    isRecommended: false,
    ecoRank: 2,
    warnings: [
      {
        type: 'AccessibilityNotice',
        message: 'Rezervirana 3 slobodna invalidska mjesta odmah do ulaza UPT.',
        severity: 'info',
      },
    ],
    encodedPolyline: '_p~iF~ps|U_ulLnnqC_mqNvxq`@',
    stepsSummary: 'Direktna vožnja do rezerviranog invalidskog mjesta',
    parkingDetails: {
      id: 'prk_upt_acc',
      name: 'Rezervirani parking za osobe s invaliditetom UPT',
      latitude: 45.7491,
      longitude: 21.2275,
      spotsAvailable: 3,
      totalSpots: 4,
      hourlyRateRon: 0,
      isAccessible: true,
    },
  },
];

export const routeService = {
  async planRoute(request: RoutePlanRequest): Promise<RoutePlanResponse> {
    if (API_CONFIG.USE_MOCK_FALLBACK) {
      await new Promise((resolve) => setTimeout(resolve, 400)); // Realistična latencija
      const options = request.hasDisability
        ? MOCK_OPTIONS_ACCESSIBLE
        : MOCK_OPTIONS_STANDARD;

      return {
        options,
        baselineCarCo2Grams: 390,
        calculatedAt: new Date().toISOString(),
      };
    }

    try {
      return await apiFetch<RoutePlanResponse>('/routes/plan', {
        method: 'POST',
        body: JSON.stringify(request),
      });
    } catch (err) {
      console.warn('API /routes/plan unreachable, falling back to mock dataset:', err);
      return {
        options: request.hasDisability ? MOCK_OPTIONS_ACCESSIBLE : MOCK_OPTIONS_STANDARD,
        baselineCarCo2Grams: 390,
        calculatedAt: new Date().toISOString(),
      };
    }
  },

  async recordTrip(tripData: {
    mode: string;
    distanceMeters: number;
    co2SavedGrams: number;
    ecoPoints: number;
  }): Promise<{ success: boolean; newPointsTotal: number }> {
    if (API_CONFIG.USE_MOCK_FALLBACK) {
      return { success: true, newPointsTotal: 390 };
    }
    return apiFetch('/trips', {
      method: 'POST',
      body: JSON.stringify(tripData),
    });
  },
};

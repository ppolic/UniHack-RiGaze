import { apiFetch, API_CONFIG } from './api';
import {
  RoutePlanRequest,
  RoutePlanResponse,
  RouteOptionDto,
  WeatherInfoDto,
  GeoPoint,
} from '../types/route';

const MOCK_WEATHER: WeatherInfoDto = {
  condition: 'Rain',
  temperatureC: 9,
  precipitationMm: 1.2,
};

const BASE_ORIGIN: GeoPoint = { lat: 45.7538, lng: 21.2257 };
const BASE_DESTINATION: GeoPoint = { lat: 45.7489, lng: 21.2272 };

/**
 * Dynamically maps the template route geometry between the user's selected origin and destination
 * while preserving the realistic street-following multi-point curve and segment junctions.
 */
function adaptOptionsGeometry(
  options: RouteOptionDto[],
  origin: GeoPoint,
  destination: GeoPoint
): RouteOptionDto[] {
  const baseLatSpan = BASE_DESTINATION.lat - BASE_ORIGIN.lat;
  const baseLngSpan = BASE_DESTINATION.lng - BASE_ORIGIN.lng;
  const targetLatSpan = destination.lat - origin.lat;
  const targetLngSpan = destination.lng - origin.lng;

  const isDefaultRoute =
    Math.abs(origin.lat - BASE_ORIGIN.lat) < 0.0002 &&
    Math.abs(origin.lng - BASE_ORIGIN.lng) < 0.0002 &&
    Math.abs(destination.lat - BASE_DESTINATION.lat) < 0.0002 &&
    Math.abs(destination.lng - BASE_DESTINATION.lng) < 0.0002;

  if (isDefaultRoute) {
    return options;
  }

  const transformPoint = (pt: GeoPoint): GeoPoint => {
    const tLat = baseLatSpan !== 0 ? (pt.lat - BASE_ORIGIN.lat) / baseLatSpan : 0;
    const tLng = baseLngSpan !== 0 ? (pt.lng - BASE_ORIGIN.lng) / baseLngSpan : 0;
    return {
      lat: Number((origin.lat + tLat * targetLatSpan).toFixed(5)),
      lng: Number((origin.lng + tLng * targetLngSpan).toFixed(5)),
    };
  };

  return options.map((opt) => ({
    ...opt,
    segments: (opt.segments || []).map((seg) => ({
      ...seg,
      geometry: seg.geometry ? seg.geometry.map(transformPoint) : undefined,
    })),
  }));
}

/**
 * Realistic Timișoara Mock Options (Piața Victoriei -> UPT Politehnica)
 * Strictly following docs/api-contract.md with multi-point street-following polylines
 */
const MOCK_OPTIONS_STANDARD: RouteOptionDto[] = [
  {
    id: 'bike',
    mode: 'Bike',
    title: 'Najam bicikla (VeloTM)',
    durationMinutes: 8,
    distanceKm: 1.5,
    costRon: 3.5,
    co2Grams: 0,
    ecoPoints: 90,
    ecoRank: 1,
    isRecommended: true,
    segments: [
      {
        mode: 'Walk',
        description: 'Pješke do VeloTM stanice Piața Victoriei',
        durationMinutes: 2,
        distanceKm: 0.15,
        geometry: [
          { lat: 45.7538, lng: 21.2257 },
          { lat: 45.7532, lng: 21.2254 },
          { lat: 45.7526, lng: 21.2251 },
        ],
      },
      {
        mode: 'Bike',
        description: 'Biciklistička staza Bulevarul Regele Ferdinand ➔ Vasile Pârvan',
        durationMinutes: 6,
        distanceKm: 1.35,
        geometry: [
          { lat: 45.7526, lng: 21.2251 },
          { lat: 45.7518, lng: 21.2248 },
          { lat: 45.7509, lng: 21.2247 },
          { lat: 45.7501, lng: 21.2252 },
          { lat: 45.7495, lng: 21.2263 },
          { lat: 45.7489, lng: 21.2272 },
        ],
      },
    ],
    warnings: [
      {
        type: 'Rain',
        message: 'Kiša: vožnja bicikla je manje ugodna i sigurna.',
      },
      {
        type: 'Helmet',
        message: 'Kaciga je obavezna za osobe mlađe od 16 godina.',
      },
    ],
  },
  {
    id: 'walk',
    mode: 'Walk',
    title: 'Pješke',
    durationMinutes: 17,
    distanceKm: 1.3,
    costRon: 0,
    co2Grams: 0,
    ecoPoints: 100,
    ecoRank: 2,
    isRecommended: false,
    segments: [
      {
        mode: 'Walk',
        description: 'Šetnica kroz Parcul Catedrala i preko mosta na Begi',
        durationMinutes: 17,
        distanceKm: 1.3,
        geometry: [
          { lat: 45.7538, lng: 21.2257 },
          { lat: 45.7527, lng: 21.2255 },
          { lat: 45.7515, lng: 21.2258 },
          { lat: 45.7504, lng: 21.2262 },
          { lat: 45.7496, lng: 21.2268 },
          { lat: 45.7489, lng: 21.2272 },
        ],
      },
    ],
    warnings: [],
  },
  {
    id: 'scooter',
    mode: 'Scooter',
    title: 'Najam romobila',
    durationMinutes: 7,
    distanceKm: 1.5,
    costRon: 6.0,
    co2Grams: 20,
    ecoPoints: 70,
    ecoRank: 3,
    isRecommended: false,
    segments: [
      {
        mode: 'Walk',
        description: 'Pješke do slobodnog e-romobila (50m)',
        durationMinutes: 1,
        distanceKm: 0.08,
        geometry: [
          { lat: 45.7538, lng: 21.2257 },
          { lat: 45.7534, lng: 21.2262 },
        ],
      },
      {
        mode: 'Scooter',
        description: 'Vožnja romobilom uz Bulevarul Mihai Eminescu i most Michelangelo',
        durationMinutes: 6,
        distanceKm: 1.42,
        geometry: [
          { lat: 45.7534, lng: 21.2262 },
          { lat: 45.7525, lng: 21.2271 },
          { lat: 45.7512, lng: 21.2279 },
          { lat: 45.7498, lng: 21.2277 },
          { lat: 45.7489, lng: 21.2272 },
        ],
      },
    ],
    warnings: [
      {
        type: 'Rain',
        message: 'Mokri kolnik: smanjite brzinu ispod 20 km/h.',
      },
    ],
  },
  {
    id: 'transit',
    mode: 'PublicTransport',
    title: 'Tramvaj 2 (STPT)',
    durationMinutes: 12,
    distanceKm: 1.8,
    costRon: 4.0,
    co2Grams: 112,
    ecoPoints: 60,
    ecoRank: 4,
    isRecommended: false,
    segments: [
      {
        mode: 'Walk',
        description: 'Pješke do stanice Catedrala Mitropolitană',
        durationMinutes: 2,
        distanceKm: 0.12,
        geometry: [
          { lat: 45.7538, lng: 21.2257 },
          { lat: 45.7529, lng: 21.2248 },
          { lat: 45.7521, lng: 21.2242 },
        ],
      },
      {
        mode: 'PublicTransport',
        description: 'Tramvaj 2 (Catedrala ➔ Podul Mitropolit Andrei Șaguna ➔ UPT)',
        durationMinutes: 8,
        distanceKm: 1.55,
        geometry: [
          { lat: 45.7521, lng: 21.2242 },
          { lat: 45.7508, lng: 21.2238 },
          { lat: 45.7496, lng: 21.2244 },
          { lat: 45.7492, lng: 21.2258 },
          { lat: 45.7494, lng: 21.2269 },
        ],
      },
      {
        mode: 'Walk',
        description: 'Do ulaza u UPT Elektrotehnika',
        durationMinutes: 2,
        distanceKm: 0.13,
        geometry: [
          { lat: 45.7494, lng: 21.2269 },
          { lat: 45.7491, lng: 21.2271 },
          { lat: 45.7489, lng: 21.2272 },
        ],
      },
    ],
    warnings: [],
  },
  {
    id: 'car',
    mode: 'Car',
    title: 'Automobil + Parking',
    durationMinutes: 14,
    distanceKm: 2.2,
    costRon: 7.0,
    co2Grams: 390,
    ecoPoints: 0,
    ecoRank: 5,
    isRecommended: false,
    segments: [
      {
        mode: 'Car',
        description: 'Vožnja automobilom obilaznicom do parkinga UPT (Zona 1)',
        durationMinutes: 11,
        distanceKm: 2.05,
        geometry: [
          { lat: 45.7538, lng: 21.2257 },
          { lat: 45.7535, lng: 21.2278 },
          { lat: 45.7522, lng: 21.2292 },
          { lat: 45.7505, lng: 21.2291 },
          { lat: 45.7493, lng: 21.2282 },
        ],
      },
      {
        mode: 'Walk',
        description: 'Pješke od parkinga UPT do ulaza',
        durationMinutes: 3,
        distanceKm: 0.15,
        geometry: [
          { lat: 45.7493, lng: 21.2282 },
          { lat: 45.7491, lng: 21.2276 },
          { lat: 45.7489, lng: 21.2272 },
        ],
      },
    ],
    warnings: [
      {
        type: 'Estimate',
        message: 'Auto emitira 390g CO₂. Odabirom tramvaja ili bicikla štedite emisije.',
      },
    ],
  },
];

const MOCK_OPTIONS_ACCESSIBLE: RouteOptionDto[] = [
  {
    id: 'transit_acc',
    mode: 'PublicTransport',
    title: 'Tramvaj 2 (Pristupačan niski pod)',
    durationMinutes: 12,
    distanceKm: 1.8,
    costRon: 0,
    co2Grams: 112,
    ecoPoints: 80,
    ecoRank: 1,
    isRecommended: true,
    segments: [
      {
        mode: 'Walk',
        description: 'Pristupačna rampa do stanice Catedrala Mitropolitană',
        durationMinutes: 3,
        distanceKm: 0.12,
        geometry: [
          { lat: 45.7538, lng: 21.2257 },
          { lat: 45.7529, lng: 21.2248 },
          { lat: 45.7521, lng: 21.2242 },
        ],
      },
      {
        mode: 'PublicTransport',
        description: 'STPT Niskopodni tramvaj (Linija 2)',
        durationMinutes: 7,
        distanceKm: 1.55,
        geometry: [
          { lat: 45.7521, lng: 21.2242 },
          { lat: 45.7508, lng: 21.2238 },
          { lat: 45.7496, lng: 21.2244 },
          { lat: 45.7492, lng: 21.2258 },
          { lat: 45.7494, lng: 21.2269 },
        ],
      },
      {
        mode: 'Walk',
        description: 'Ravna staza do lifta zgrade UPT',
        durationMinutes: 2,
        distanceKm: 0.13,
        geometry: [
          { lat: 45.7494, lng: 21.2269 },
          { lat: 45.7491, lng: 21.2271 },
          { lat: 45.7489, lng: 21.2272 },
        ],
      },
    ],
    warnings: [
      {
        type: 'NotAccessible',
        message: 'Potvrđena rampa i niski pod za invalidska kolica.',
      },
    ],
  },
  {
    id: 'walk_acc',
    mode: 'Walk',
    title: 'Pješke / Kolica (Bez arhitektonskih barijera)',
    durationMinutes: 18,
    distanceKm: 1.3,
    costRon: 0,
    co2Grams: 0,
    ecoPoints: 95,
    ecoRank: 2,
    isRecommended: false,
    segments: [
      {
        mode: 'Walk',
        description: 'Prilagođeni pločnici sa spuštenim rubnjacima kroz Park Central',
        durationMinutes: 18,
        distanceKm: 1.3,
        geometry: [
          { lat: 45.7538, lng: 21.2257 },
          { lat: 45.7527, lng: 21.2255 },
          { lat: 45.7515, lng: 21.2258 },
          { lat: 45.7504, lng: 21.2262 },
          { lat: 45.7496, lng: 21.2268 },
          { lat: 45.7489, lng: 21.2272 },
        ],
      },
    ],
    warnings: [],
  },
  {
    id: 'car_acc',
    mode: 'Car',
    title: 'Automobil (Rezervirani invalidski parking)',
    durationMinutes: 11,
    distanceKm: 2.2,
    costRon: 0,
    co2Grams: 390,
    ecoPoints: 10,
    ecoRank: 3,
    isRecommended: false,
    segments: [
      {
        mode: 'Car',
        description: 'Direktno do označenog invalidskog parkirnog mjesta UPT',
        durationMinutes: 11,
        distanceKm: 2.2,
        geometry: [
          { lat: 45.7538, lng: 21.2257 },
          { lat: 45.7535, lng: 21.2278 },
          { lat: 45.7522, lng: 21.2292 },
          { lat: 45.7505, lng: 21.2291 },
          { lat: 45.7493, lng: 21.2282 },
          { lat: 45.7489, lng: 21.2272 },
        ],
      },
    ],
    warnings: [
      {
        type: 'Estimate',
        message: 'Besplatan parking za osobe s invaliditetom uz oznaku.',
      },
    ],
  },
];

export const routeService = {
  async planRoute(request: RoutePlanRequest): Promise<RoutePlanResponse> {
    if (API_CONFIG.USE_MOCK_FALLBACK) {
      await new Promise((resolve) => setTimeout(resolve, 350));

      let options = request.profile.hasDisability
        ? MOCK_OPTIONS_ACCESSIBLE
        : MOCK_OPTIONS_STANDARD;

      // Filter options based on ageCategory from docs/api-contract.md
      if (request.profile.ageCategory === 'Under14') {
        options = options.filter(
          (o) => o.mode === 'Walk' || o.mode === 'PublicTransport'
        );
      } else if (request.profile.ageCategory === 'From14To15') {
        options = options.filter((o) => o.mode !== 'Car');
      }

      const adaptedOptions = adaptOptionsGeometry(
        options,
        request.origin,
        request.destination
      );

      return {
        weather: MOCK_WEATHER,
        options: adaptedOptions,
        isMock: true,
      };
    }

    try {
      return await apiFetch<RoutePlanResponse>('/routes/plan', {
        method: 'POST',
        body: JSON.stringify(request),
      });
    } catch (err) {
      console.warn('API /routes/plan unreachable, using mock fallback:', err);
      const baseOptions = request.profile.hasDisability
        ? MOCK_OPTIONS_ACCESSIBLE
        : MOCK_OPTIONS_STANDARD;

      const adaptedOptions = adaptOptionsGeometry(
        baseOptions,
        request.origin,
        request.destination
      );

      return {
        weather: MOCK_WEATHER,
        options: adaptedOptions,
        isMock: true,
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

import { apiFetch, API_CONFIG } from './api';
import {
  RoutePlanRequest,
  RoutePlanResponse,
  RouteOptionDto,
  WeatherInfoDto,
} from '../types/route';

const MOCK_WEATHER: WeatherInfoDto = {
  condition: 'Rain',
  temperatureC: 9,
  precipitationMm: 1.2,
};

/**
 * Realistic Timișoara Mock Options (Piața Victoriei -> UPT Politehnica)
 * Strictly following docs/api-contract.md
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
        description: 'Pješke do stanice Piața Libertății',
        durationMinutes: 2,
        distanceKm: 0.1,
        geometry: [
          { lat: 45.7538, lng: 21.2257 },
          { lat: 45.7505, lng: 21.225 },
        ],
      },
      {
        mode: 'Bike',
        description: 'Vožnja biciklom uz Bulevarul Vasile Pârvan',
        durationMinutes: 6,
        distanceKm: 1.4,
        geometry: [
          { lat: 45.7505, lng: 21.225 },
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
        description: 'Pješke kroz park Central i preko mosta Michelangelo',
        durationMinutes: 17,
        distanceKm: 1.3,
        geometry: [
          { lat: 45.7538, lng: 21.2257 },
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
        mode: 'Scooter',
        description: 'Vožnja romobilom uz Bulevarul Michelangelo',
        durationMinutes: 7,
        distanceKm: 1.5,
        geometry: [
          { lat: 45.7538, lng: 21.2257 },
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
        description: 'Pješke do stanice Piața Victoriei',
        durationMinutes: 2,
        distanceKm: 0.1,
        geometry: [
          { lat: 45.7538, lng: 21.2257 },
          { lat: 45.753, lng: 21.225 },
        ],
      },
      {
        mode: 'PublicTransport',
        description: 'Tramvaj 2 (3 stanice do Politehnica)',
        durationMinutes: 8,
        distanceKm: 1.6,
        geometry: [
          { lat: 45.753, lng: 21.225 },
          { lat: 45.7495, lng: 21.227 },
        ],
      },
      {
        mode: 'Walk',
        description: 'Do zgrade UPT Elektrotehnika',
        durationMinutes: 2,
        distanceKm: 0.1,
        geometry: [
          { lat: 45.7495, lng: 21.227 },
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
        description: 'Vožnja automobilom do parkinga UPT (Zona 1)',
        durationMinutes: 11,
        distanceKm: 2.1,
        geometry: [
          { lat: 45.7538, lng: 21.2257 },
          { lat: 45.7492, lng: 21.228 },
        ],
      },
      {
        mode: 'Walk',
        description: 'Pješke od parkinga do ulaza',
        durationMinutes: 3,
        distanceKm: 0.1,
        geometry: [
          { lat: 45.7492, lng: 21.228 },
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
        description: 'Pristupačna rampa do stanice Piața Victoriei',
        durationMinutes: 3,
        distanceKm: 0.1,
        geometry: [
          { lat: 45.7538, lng: 21.2257 },
          { lat: 45.753, lng: 21.225 },
        ],
      },
      {
        mode: 'PublicTransport',
        description: 'STPT Niskopodni tramvaj (Linija 2)',
        durationMinutes: 7,
        distanceKm: 1.6,
        geometry: [
          { lat: 45.753, lng: 21.225 },
          { lat: 45.7495, lng: 21.227 },
        ],
      },
      {
        mode: 'Walk',
        description: 'Ravna staza do lifta zgrade UPT',
        durationMinutes: 2,
        distanceKm: 0.1,
        geometry: [
          { lat: 45.7495, lng: 21.227 },
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
        description: 'Prilagođeni pločnici kroz Park Central',
        durationMinutes: 18,
        distanceKm: 1.3,
        geometry: [
          { lat: 45.7538, lng: 21.2257 },
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

      return {
        weather: MOCK_WEATHER,
        options,
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
      const options = request.profile.hasDisability
        ? MOCK_OPTIONS_ACCESSIBLE
        : MOCK_OPTIONS_STANDARD;

      return {
        weather: MOCK_WEATHER,
        options,
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

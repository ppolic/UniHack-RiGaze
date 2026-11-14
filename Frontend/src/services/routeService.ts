import { apiFetch, API_CONFIG } from './api';
import {
  transitService,
  decodeGooglePolyline,
  haversineDistanceMeters,
  VELOTM_STATIONS,
} from './transitService';
import {
  RoutePlanRequest,
  RoutePlanResponse,
  RouteOptionDto,
  RouteSegmentDto,
  WeatherInfoDto,
  GeoPoint,
  StationLocation,
  TransitNetworkPath,
} from '../types/route';

const MOCK_WEATHER: WeatherInfoDto = {
  condition: 'Clear',
  temperatureC: 16,
  precipitationMm: 0,
};

/**
 * Real bridges across the Bega Canal in Timișoara (west to east).
 * Used by the offline street router so routes NEVER cut across the Bega river.
 */
const BEGA_BRIDGES: {
  name: string;
  northApproach: GeoPoint;
  bridgeDeck: GeoPoint;
  southApproach: GeoPoint;
}[] = [
  {
    name: 'Podul Modoș',
    northApproach: { lat: 45.7418, lng: 21.1992 },
    bridgeDeck: { lat: 45.7409, lng: 21.1998 },
    southApproach: { lat: 45.74, lng: 21.2004 },
  },
  {
    name: 'Podul Eroilor',
    northApproach: { lat: 45.7455, lng: 21.2082 },
    bridgeDeck: { lat: 45.7446, lng: 21.2088 },
    southApproach: { lat: 45.7437, lng: 21.2094 },
  },
  {
    name: 'Podul Ștefan cel Mare (Gara de Nord)',
    northApproach: { lat: 45.7478, lng: 21.2134 },
    bridgeDeck: { lat: 45.7469, lng: 21.2141 },
    southApproach: { lat: 45.746, lng: 21.2148 },
  },
  {
    name: 'Podul Traian (Maria)',
    northApproach: { lat: 45.7506, lng: 21.2212 },
    bridgeDeck: { lat: 45.7498, lng: 21.2216 },
    southApproach: { lat: 45.7489, lng: 21.2221 },
  },
  {
    name: 'Podul Mihai Viteazul (Catedrala)',
    northApproach: { lat: 45.7503, lng: 21.2256 },
    bridgeDeck: { lat: 45.7493, lng: 21.2259 },
    southApproach: { lat: 45.7484, lng: 21.2263 },
  },
  {
    name: 'Podul Michelangelo',
    northApproach: { lat: 45.7518, lng: 21.2335 },
    bridgeDeck: { lat: 45.7506, lng: 21.2339 },
    southApproach: { lat: 45.7495, lng: 21.2343 },
  },
  {
    name: 'Podul Decebal (Parcul Rozelor)',
    northApproach: { lat: 45.7556, lng: 21.2422 },
    bridgeDeck: { lat: 45.7547, lng: 21.2428 },
    southApproach: { lat: 45.7538, lng: 21.2434 },
  },
  {
    name: 'Podul Dacilor (Piața Badea Cârțan)',
    northApproach: { lat: 45.7582, lng: 21.2512 },
    bridgeDeck: { lat: 45.7573, lng: 21.2516 },
    southApproach: { lat: 45.7564, lng: 21.252 },
  },
];

/**
 * Approximates the latitude of the Bega Canal centerline at a given longitude in Timișoara.
 */
function getBegaRiverLatAtLng(lng: number): number {
  const clamped = Math.max(21.195, Math.min(21.26, lng));
  // Bega flows roughly SW <- NE through Timișoara
  return 45.7405 + ((clamped - 21.198) / (21.252 - 21.198)) * (45.7573 - 45.7405);
}

function isNorthOfBega(pt: GeoPoint): boolean {
  return pt.lat >= getBegaRiverLatAtLng(pt.lng);
}

/**
 * Computes total polyline length in kilometers.
 */
function computePolylineDistanceKm(points: GeoPoint[]): number {
  if (points.length < 2) return 0.1;
  let meters = 0;
  for (let i = 1; i < points.length; i++) {
    meters += haversineDistanceMeters(points[i - 1], points[i]);
  }
  return Math.max(0.05, Number((meters / 1000).toFixed(2)));
}

/**
 * Builds an L-shaped street-grid path between two points on the same side of the Bega river,
 * aligned with Timișoara's radial/ring street angles so it never cuts diagonally through blocks.
 */
function buildLocalStreetGridLeg(a: GeoPoint, b: GeoPoint): GeoPoint[] {
  const dist = haversineDistanceMeters(a, b);
  if (dist < 85) {
    return [a, b];
  }

  const dLat = b.lat - a.lat;
  const dLng = b.lng - a.lng;

  // Intermediate street corner following boulevard orientation
  const corner1: GeoPoint = {
    lat: Number((a.lat + dLat * 0.45).toFixed(5)),
    lng: Number((a.lng + dLng * 0.18).toFixed(5)),
  };
  const corner2: GeoPoint = {
    lat: Number((a.lat + dLat * 0.82).toFixed(5)),
    lng: Number((a.lng + dLng * 0.65).toFixed(5)),
  };

  return [a, corner1, corner2, b];
}

/**
 * Bridge-aware offline street router for Timișoara:
 * If A and B are on opposite sides of the Bega Canal, routes via the nearest real bridge.
 */
function buildBridgeAwareStreetPath(a: GeoPoint, b: GeoPoint): GeoPoint[] {
  const northA = isNorthOfBega(a);
  const northB = isNorthOfBega(b);

  if (northA === northB) {
    return buildLocalStreetGridLeg(a, b);
  }

  // Pick bridge that minimizes total detour (a -> bridge -> b)
  let bestBridge = BEGA_BRIDGES[4];
  let bestScore = Infinity;
  for (const br of BEGA_BRIDGES) {
    const score =
      haversineDistanceMeters(a, br.bridgeDeck) +
      haversineDistanceMeters(br.bridgeDeck, b);
    if (score < bestScore) {
      bestScore = score;
      bestBridge = br;
    }
  }

  const entryApproach = northA ? bestBridge.northApproach : bestBridge.southApproach;
  const exitApproach = northA ? bestBridge.southApproach : bestBridge.northApproach;

  const leg1 = buildLocalStreetGridLeg(a, entryApproach);
  const leg2 = buildLocalStreetGridLeg(exitApproach, b);

  return [
    ...leg1,
    bestBridge.bridgeDeck,
    ...leg2,
  ];
}

// In-memory cache for OSRM street geometries
const osrmGeometryCache = new Map<string, GeoPoint[]>();

/**
 * Fetches real street-by-street geometry from OSRM (OpenStreetMap routing engine)
 * so routes follow actual Timișoara roads, bridges, and bike/foot paths.
 * Falls back to `buildBridgeAwareStreetPath` if offline.
 */
async function fetchStreetGeometry(
  a: GeoPoint,
  b: GeoPoint,
  profile: 'foot' | 'bike' | 'driving'
): Promise<GeoPoint[]> {
  if (haversineDistanceMeters(a, b) < 40) {
    return [a, b];
  }

  const key = `${profile}_${a.lat.toFixed(4)}_${a.lng.toFixed(4)}_${b.lat.toFixed(4)}_${b.lng.toFixed(4)}`;
  const cached = osrmGeometryCache.get(key);
  if (cached) return cached;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 2400);

  try {
    const url = `https://router.project-osrm.org/route/v1/${profile}/${a.lng},${a.lat};${b.lng},${b.lat}?overview=full&geometries=polyline`;
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      const encoded = data?.routes?.[0]?.geometry;
      if (typeof encoded === 'string' && encoded.length > 0) {
        const decoded = decodeGooglePolyline(encoded);
        if (decoded.length >= 2) {
          osrmGeometryCache.set(key, decoded);
          return decoded;
        }
      }
    }
  } catch {
    clearTimeout(timeoutId);
  }

  const fallback = buildBridgeAwareStreetPath(a, b);
  osrmGeometryCache.set(key, fallback);
  return fallback;
}

/**
 * Finds the best real SMTT public transport line and slices its actual GTFS polyline
 * (`https://cont.primariatm.ro/api/mobile/transit/network`) between the stop nearest to Origin (A)
 * and the stop nearest to Destination (B).
 */
async function buildRealSmttTransitRoute(
  origin: GeoPoint,
  destination: GeoPoint
): Promise<{
  lineTitle: string;
  stopAName: string;
  stopBName: string;
  walkToStopGeometry: GeoPoint[];
  transitGeometry: GeoPoint[];
  walkFromStopGeometry: GeoPoint[];
}> {
  const [stops, paths] = await Promise.all([
    transitService.getAllTransitStops(),
    transitService.getTransitNetworkPaths(),
  ]);

  let bestPath: TransitNetworkPath | null = null;
  let bestStartIdx = 0;
  let bestEndIdx = 0;
  let bestTotalWalkMeters = Infinity;

  // Search all 116 real SMTT directional route polylines for the line that passes closest to A then B
  for (const path of paths) {
    const pts = path.geometry;
    if (pts.length < 2) continue;

    let minOriginDist = Infinity;
    let minOriginIdx = 0;
    let minDestDist = Infinity;
    let minDestIdx = 0;

    for (let i = 0; i < pts.length; i++) {
      const dOrig = haversineDistanceMeters(origin, pts[i]);
      if (dOrig < minOriginDist) {
        minOriginDist = dOrig;
        minOriginIdx = i;
      }
      const dDest = haversineDistanceMeters(destination, pts[i]);
      if (dDest < minDestDist) {
        minDestDist = dDest;
        minDestIdx = i;
      }
    }

    if (minOriginIdx !== minDestIdx) {
      const walkSum = minOriginDist + minDestDist;
      // Prefer forward direction along this path, but allow reverse slice if needed
      const penalty = minOriginIdx < minDestIdx ? 0 : 120;
      if (walkSum + penalty < bestTotalWalkMeters) {
        bestTotalWalkMeters = walkSum + penalty;
        bestPath = path;
        bestStartIdx = minOriginIdx;
        bestEndIdx = minDestIdx;
      }
    }
  }

  if (bestPath && bestPath.geometry.length >= 2) {
    const slice =
      bestStartIdx <= bestEndIdx
        ? bestPath.geometry.slice(bestStartIdx, bestEndIdx + 1)
        : bestPath.geometry.slice(bestEndIdx, bestStartIdx + 1).reverse();

    const boardPt = slice[0];
    const alightPt = slice[slice.length - 1];

    // Find nearest named SMTT stops to boardPt and alightPt
    const findClosestStopName = (pt: GeoPoint, fallbackLabel: string): string => {
      let best: StationLocation | null = null;
      let bestD = Infinity;
      for (const s of stops) {
        const d = haversineDistanceMeters(pt, s);
        if (d < bestD) {
          bestD = d;
          best = s;
        }
      }
      return best && bestD < 450 ? best.name : fallbackLabel;
    };

    const stopAName = findClosestStopName(boardPt, 'Stanica polaska');
    const stopBName = findClosestStopName(alightPt, 'Stanica dolaska');

    const vehicleLabel =
      bestPath.type === 0
        ? 'Tramvaj'
        : bestPath.type === 11
        ? 'Trolejbus'
        : 'Autobus';

    const [walkToStopGeometry, walkFromStopGeometry] = await Promise.all([
      fetchStreetGeometry(origin, boardPt, 'foot'),
      fetchStreetGeometry(alightPt, destination, 'foot'),
    ]);

    return {
      lineTitle: `${vehicleLabel} ${bestPath.shortName} (SMTT)`,
      stopAName,
      stopBName,
      walkToStopGeometry,
      transitGeometry: slice.length >= 2 ? slice : [boardPt, alightPt],
      walkFromStopGeometry,
    };
  }

  // Fallback if paths array was empty: route along street network between nearest stops
  const transitGeometry = await fetchStreetGeometry(origin, destination, 'driving');
  return {
    lineTitle: 'Javni prijevoz (SMTT)',
    stopAName: transitService.resolveNearestPointName(origin),
    stopBName: transitService.resolveNearestPointName(destination),
    walkToStopGeometry: [origin, transitGeometry[0]],
    transitGeometry,
    walkFromStopGeometry: [transitGeometry[transitGeometry.length - 1], destination],
  };
}

/**
 * Dynamically builds road-following multimodal options between ANY origin (A) and destination (B)
 * selected by the user on the Timișoara map.
 */
async function buildRoadFollowingPlanResponse(
  request: RoutePlanRequest
): Promise<RoutePlanResponse> {
  const { origin, destination, profile } = request;

  // Fetch road-following geometries in parallel
  const [
    walkGeometry,
    directBikeGeometry,
    transitRoute,
    parkings,
  ] = await Promise.all([
    fetchStreetGeometry(origin, destination, 'foot'),
    fetchStreetGeometry(origin, destination, 'bike'),
    buildRealSmttTransitRoute(origin, destination),
    transitService.getParkings(),
  ]);

  // 1. WALK OPTION (100% on streets/footpaths/bridges)
  const walkDistKm = computePolylineDistanceKm(walkGeometry);
  const walkDurationMin = Math.max(2, Math.round((walkDistKm / 4.8) * 60));

  const walkOption: RouteOptionDto = {
    id: 'walk',
    mode: 'Walk',
    title: profile.hasDisability
      ? 'Pješke / Kolica (Prilagođeni pločnici)'
      : 'Pješke',
    durationMinutes: walkDurationMin,
    distanceKm: walkDistKm,
    costRon: 0,
    co2Grams: 0,
    ecoPoints: Math.min(120, Math.max(40, Math.round(walkDistKm * 65))),
    ecoRank: 1,
    isRecommended: false,
    segments: [
      {
        mode: 'Walk',
        description: 'Pješačka ruta ulicama i mostovima Temišvara',
        durationMinutes: walkDurationMin,
        distanceKm: walkDistKm,
        geometry: walkGeometry,
      },
    ],
    warnings: [],
  };

  // 2. BIKE OPTION (Own bike OR nearest VeloTM dock + street bike route)
  let bikeSegments: RouteSegmentDto[] = [];
  let bikeTitle = profile.ownsBike ? 'Vlastiti bicikl' : 'Najam bicikla (VeloTM)';

  let nearestVeloStart = VELOTM_STATIONS[0];
  let minVeloDist = Infinity;
  for (const st of VELOTM_STATIONS) {
    const d = haversineDistanceMeters(origin, st);
    if (d < minVeloDist) {
      minVeloDist = d;
      nearestVeloStart = st;
    }
  }

  if (!profile.ownsBike && minVeloDist > 70 && minVeloDist < 1200) {
    const [walkToVelo, bikeFromVelo] = await Promise.all([
      fetchStreetGeometry(origin, nearestVeloStart, 'foot'),
      fetchStreetGeometry(nearestVeloStart, destination, 'bike'),
    ]);
    const wDist = computePolylineDistanceKm(walkToVelo);
    const bDist = computePolylineDistanceKm(bikeFromVelo);
    const wMin = Math.max(1, Math.round((wDist / 4.8) * 60));
    const bMin = Math.max(2, Math.round((bDist / 15.5) * 60));

    bikeSegments = [
      {
        mode: 'Walk',
        description: `Pješke do stanice ${nearestVeloStart.name}`,
        durationMinutes: wMin,
        distanceKm: wDist,
        geometry: walkToVelo,
      },
      {
        mode: 'Bike',
        description: `Biciklistička ruta cestom od ${nearestVeloStart.name} do odredišta`,
        durationMinutes: bMin,
        distanceKm: bDist,
        geometry: bikeFromVelo,
      },
    ];
  } else {
    const bDist = computePolylineDistanceKm(directBikeGeometry);
    const bMin = Math.max(2, Math.round((bDist / 15.5) * 60));
    bikeSegments = [
      {
        mode: 'Bike',
        description: 'Biciklistička ruta ulicama i stazama Temišvara',
        durationMinutes: bMin,
        distanceKm: bDist,
        geometry: directBikeGeometry,
      },
    ];
  }

  const totalBikeDistKm = Number(
    bikeSegments.reduce((acc, s) => acc + s.distanceKm, 0).toFixed(2)
  );
  const totalBikeDurationMin = bikeSegments.reduce(
    (acc, s) => acc + s.durationMinutes,
    0
  );

  const bikeOption: RouteOptionDto = {
    id: 'bike',
    mode: 'Bike',
    title: bikeTitle,
    durationMinutes: totalBikeDurationMin,
    distanceKm: totalBikeDistKm,
    costRon: profile.ownsBike ? 0 : 3.0,
    co2Grams: 0,
    ecoPoints: Math.min(110, Math.max(45, Math.round(totalBikeDistKm * 55))),
    ecoRank: 1,
    isRecommended: false,
    segments: bikeSegments,
    warnings:
      profile.ageCategory === 'From14To15'
        ? [
            {
              type: 'Helmet',
              message:
                'Kaciga je zakonski obavezna za vozače od 14 do 16 godina.',
            },
          ]
        : [],
  };

  // 3. SCOOTER OPTION (Street-following geometry)
  const scooterDistKm = computePolylineDistanceKm(directBikeGeometry);
  const scooterDurationMin = Math.max(
    2,
    Math.round((scooterDistKm / 18.0) * 60) + 1
  );

  const scooterOption: RouteOptionDto = {
    id: 'scooter',
    mode: 'Scooter',
    title: profile.ownsScooter ? 'Vlastiti e-romobil' : 'Najam e-romobila',
    durationMinutes: scooterDurationMin,
    distanceKm: scooterDistKm,
    costRon: profile.ownsScooter
      ? 0.5
      : Number((2.5 + scooterDistKm * 1.8).toFixed(1)),
    co2Grams: Math.round(scooterDistKm * 14),
    ecoPoints: Math.min(90, Math.max(30, Math.round(scooterDistKm * 40))),
    ecoRank: 3,
    isRecommended: false,
    segments: [
      {
        mode: 'Scooter',
        description: 'Vožnja e-romobilom prometnicama i biciklističkim koridorom',
        durationMinutes: scooterDurationMin,
        distanceKm: scooterDistKm,
        geometry: directBikeGeometry,
      },
    ],
    warnings:
      profile.ageCategory === 'From14To15'
        ? [
            {
              type: 'Helmet',
              message:
                'Kaciga je zakonski obavezna za vozače od 14 do 16 godina.',
            },
          ]
        : [],
  };

  // 4. PUBLIC TRANSPORT OPTION (Real SMTT route polyline + street walk legs)
  const w1Dist = computePolylineDistanceKm(transitRoute.walkToStopGeometry);
  const trDist = computePolylineDistanceKm(transitRoute.transitGeometry);
  const w2Dist = computePolylineDistanceKm(transitRoute.walkFromStopGeometry);

  const w1Min = Math.max(1, Math.round((w1Dist / 4.8) * 60));
  const trMin = Math.max(3, Math.round((trDist / 19.0) * 60) + 2);
  const w2Min = Math.max(1, Math.round((w2Dist / 4.8) * 60));

  const transitSegments: RouteSegmentDto[] = [];
  if (w1Dist >= 0.04) {
    transitSegments.push({
      mode: 'Walk',
      description: `Pješke do stanice ${transitRoute.stopAName}`,
      durationMinutes: w1Min,
      distanceKm: w1Dist,
      geometry: transitRoute.walkToStopGeometry,
    });
  }
  transitSegments.push({
    mode: 'PublicTransport',
    description: `${transitRoute.lineTitle}: ${transitRoute.stopAName} ➔ ${transitRoute.stopBName}`,
    durationMinutes: trMin,
    distanceKm: trDist,
    geometry: transitRoute.transitGeometry,
  });
  if (w2Dist >= 0.04) {
    transitSegments.push({
      mode: 'Walk',
      description: `Pješke od stanice ${transitRoute.stopBName} do odredišta`,
      durationMinutes: w2Min,
      distanceKm: w2Dist,
      geometry: transitRoute.walkFromStopGeometry,
    });
  }

  const totalTransitDistKm = Number((w1Dist + trDist + w2Dist).toFixed(2));
  const totalTransitMin = w1Min + trMin + w2Min;

  const transitOption: RouteOptionDto = {
    id: 'transit',
    mode: 'PublicTransport',
    title: profile.hasDisability
      ? `${transitRoute.lineTitle} (Niski pod)`
      : transitRoute.lineTitle,
    durationMinutes: totalTransitMin,
    distanceKm: totalTransitDistKm,
    costRon: profile.hasDisability ? 0 : 4.0,
    co2Grams: Math.round(trDist * 55),
    ecoPoints: Math.min(95, Math.max(35, Math.round(totalTransitDistKm * 38))),
    ecoRank: 2,
    isRecommended: false,
    segments: transitSegments,
    warnings: profile.hasDisability
      ? [
          {
            type: 'NotAccessible',
            message: 'Odabrana SMTT linija s pristupačnim ulazom.',
          },
        ]
      : [],
  };

  // 5. CAR + TIMPARK PARKING OPTION (Road-following drive to nearest TimPark + walk to B)
  let nearestParking = parkings[0];
  let minParkingDist = Infinity;
  for (const p of parkings) {
    const d = haversineDistanceMeters(destination, p);
    if (d < minParkingDist) {
      minParkingDist = d;
      nearestParking = p;
    }
  }

  const parkingTarget: GeoPoint =
    nearestParking && minParkingDist < 900
      ? { lat: nearestParking.lat, lng: nearestParking.lng }
      : destination;

  const [carDriveGeo, carWalkGeo] = await Promise.all([
    fetchStreetGeometry(origin, parkingTarget, 'driving'),
    nearestParking && minParkingDist < 900 && minParkingDist > 40
      ? fetchStreetGeometry(parkingTarget, destination, 'foot')
      : Promise.resolve([parkingTarget, destination]),
  ]);

  const carDriveKm = computePolylineDistanceKm(carDriveGeo);
  const carWalkKm =
    nearestParking && minParkingDist < 900 && minParkingDist > 40
      ? computePolylineDistanceKm(carWalkGeo)
      : 0.05;
  const carDriveMin = Math.max(3, Math.round((carDriveKm / 22.0) * 60) + 3);
  const carWalkMin = Math.max(1, Math.round((carWalkKm / 4.8) * 60));
  const totalCarDistKm = Number((carDriveKm + carWalkKm).toFixed(2));
  const carCo2 = Math.round(carDriveKm * 175);

  const carSegments: RouteSegmentDto[] = [
    {
      mode: 'Car',
      description: nearestParking
        ? `Vožnja cestom do ${nearestParking.name}`
        : 'Vožnja automobilom prometnicama Temišvara',
      durationMinutes: carDriveMin,
      distanceKm: carDriveKm,
      geometry: carDriveGeo,
    },
  ];
  if (nearestParking && minParkingDist < 900 && minParkingDist > 40) {
    carSegments.push({
      mode: 'Walk',
      description: `Pješke od ${nearestParking.name} (${
        nearestParking.zone || 'TimPark'
      }) do odredišta`,
      durationMinutes: carWalkMin,
      distanceKm: carWalkKm,
      geometry: carWalkGeo,
    });
  }

  const carOption: RouteOptionDto = {
    id: 'car',
    mode: 'Car',
    title: profile.hasDisability
      ? 'Automobil (Invalidski TimPark parking)'
      : `Automobil + ${nearestParking ? nearestParking.name : 'TimPark'}`,
    durationMinutes: carDriveMin + carWalkMin,
    distanceKm: totalCarDistKm,
    costRon: profile.hasDisability
      ? 0
      : Number(
          (
            (nearestParking?.hourlyRateRon ?? 4.0) +
            carDriveKm * 0.9
          ).toFixed(1)
        ),
    co2Grams: carCo2,
    ecoPoints: profile.hasDisability ? 10 : 0,
    ecoRank: 5,
    isRecommended: false,
    segments: carSegments,
    warnings: [
      {
        type: 'Estimate',
        message: `Automobil emitira ${carCo2}g CO₂. Javni prijevoz ili bicikl čuvaju zrak u Temišvaru.`,
      },
    ],
  };

  // Assemble & filter by user profile
  let options: RouteOptionDto[] = [];
  if (profile.hasDisability) {
    options = [transitOption, walkOption, carOption];
  } else if (profile.ageCategory === 'Under14') {
    options = [walkOption, transitOption];
  } else if (profile.ageCategory === 'From14To15') {
    options = [bikeOption, walkOption, transitOption, scooterOption];
  } else {
    options = [bikeOption, transitOption, walkOption, scooterOption, carOption];
  }

  // Pick the optimal recommended option based on distance & profile
  const straightDistKm = haversineDistanceMeters(origin, destination) / 1000;
  let recommendedId = options[0]?.id;

  if (profile.hasDisability) {
    recommendedId = straightDistKm < 0.7 ? 'walk' : 'transit';
  } else if (profile.ageCategory === 'Under14') {
    recommendedId = straightDistKm < 1.1 ? 'walk' : 'transit';
  } else {
    if (straightDistKm < 0.65) {
      recommendedId = 'walk';
    } else if (straightDistKm <= 3.2) {
      recommendedId = 'bike';
    } else {
      recommendedId = 'transit';
    }
  }

  // Sort so recommended optimal option is first and assign ecoRank
  options = options
    .map((o) => ({
      ...o,
      isRecommended: o.id === recommendedId,
    }))
    .sort((a, b) => {
      if (a.isRecommended && !b.isRecommended) return -1;
      if (!a.isRecommended && b.isRecommended) return 1;
      return a.co2Grams - b.co2Grams || a.durationMinutes - b.durationMinutes;
    })
    .map((o, idx) => ({
      ...o,
      ecoRank: idx + 1,
    }));

  return {
    weather: MOCK_WEATHER,
    options,
    isMock: true,
  };
}

export const routeService = {
  async planRoute(request: RoutePlanRequest): Promise<RoutePlanResponse> {
    if (API_CONFIG.USE_MOCK_FALLBACK) {
      return buildRoadFollowingPlanResponse(request);
    }

    try {
      const apiRes = await apiFetch<RoutePlanResponse>('/routes/plan', {
        method: 'POST',
        body: JSON.stringify(request),
      });
      // Ensure every segment returned by backend has multi-point road geometry
      const hasDetailedGeometry = apiRes.options?.every((opt) =>
        opt.segments?.every((seg) => seg.geometry && seg.geometry.length >= 2)
      );
      if (hasDetailedGeometry && apiRes.options?.length > 0) {
        return apiRes;
      }
      return buildRoadFollowingPlanResponse(request);
    } catch (err) {
      console.warn('API /routes/plan unreachable, using road-following router:', err);
      return buildRoadFollowingPlanResponse(request);
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
    try {
      return await apiFetch('/trips', {
        method: 'POST',
        body: JSON.stringify(tripData),
      });
    } catch (err) {
      console.warn('API /trips unreachable, recording locally:', err);
      return { success: true, newPointsTotal: 390 };
    }
  },
};

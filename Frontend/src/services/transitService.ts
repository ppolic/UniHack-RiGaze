import { apiFetch, API_CONFIG } from './api';
import { getTranslations } from '../hooks/useTranslation';
import {
  StationLocation,
  ParkingDetail,
  CityLandmarkPoi,
  TransitNetworkPath,
  GeoPoint,
} from '../types/route';

/**
 * Official Primăria Municipiului Timișoara Open Endpoints
 * Source: https://ghid-pmt.vercel.app/unihack
 */
const PMT_BASE_URL = 'https://cont.primariatm.ro';
const PMT_HEADERS: Record<string, string> = {
  Accept: 'application/json',
};

/**
 * Decodes a Google encoded polyline (precision 5) into GeoPoint[]
 * Used for SMTT transit paths from /api/mobile/transit/network
 */
export function decodeGooglePolyline(encoded: string): GeoPoint[] {
  const points: GeoPoint[] = [];
  let index = 0;
  const len = encoded.length;
  let lat = 0;
  let lng = 0;

  while (index < len) {
    let b: number;
    let shift = 0;
    let result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20 && index <= len);
    const dlat = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    lat += dlat;

    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20 && index <= len);
    const dlng = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    lng += dlng;

    points.push({
      lat: Number((lat / 1e5).toFixed(5)),
      lng: Number((lng / 1e5).toFixed(5)),
    });
  }

  return points;
}

export function haversineDistanceMeters(a: GeoPoint, b: GeoPoint): number {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h =
    sinLat * sinLat +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinLng * sinLng;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * Real VeloTM & Micromobility Stations in Timișoara (STPT / data.primariatm.ro)
 */
export const VELOTM_STATIONS: StationLocation[] = [
  {
    id: 'velotm-victoriei',
    name: 'VeloTM Piața Victoriei (Opera)',
    type: 'bike_station',
    lat: 45.7537,
    lng: 21.2257,
    availableBikes: 9,
    totalDocks: 15,
    isWheelchairAccessible: false,
    dataSource: 'STPT VeloTM',
  },
  {
    id: 'velotm-libertatii',
    name: 'VeloTM Piața Libertății',
    type: 'bike_station',
    lat: 45.7556,
    lng: 21.2274,
    availableBikes: 7,
    totalDocks: 15,
    isWheelchairAccessible: false,
    dataSource: 'STPT VeloTM',
  },
  {
    id: 'velotm-unirii',
    name: 'VeloTM Piața Unirii',
    type: 'bike_station',
    lat: 45.758,
    lng: 21.229,
    availableBikes: 11,
    totalDocks: 20,
    isWheelchairAccessible: false,
    dataSource: 'STPT VeloTM',
  },
  {
    id: 'velotm-catedrala',
    name: 'VeloTM Catedrala Mitropolitană',
    type: 'bike_station',
    lat: 45.7509,
    lng: 21.2242,
    availableBikes: 6,
    totalDocks: 12,
    isWheelchairAccessible: false,
    dataSource: 'STPT VeloTM',
  },
  {
    id: 'velotm-upt-parvan',
    name: 'VeloTM Politehnica (Bd. Vasile Pârvan)',
    type: 'bike_station',
    lat: 45.7474,
    lng: 21.2263,
    availableBikes: 12,
    totalDocks: 20,
    isWheelchairAccessible: false,
    dataSource: 'STPT VeloTM',
  },
  {
    id: 'velotm-complex',
    name: 'VeloTM Complexul Studențesc',
    type: 'bike_station',
    lat: 45.7489,
    lng: 21.2398,
    availableBikes: 10,
    totalDocks: 20,
    isWheelchairAccessible: false,
    dataSource: 'STPT VeloTM',
  },
  {
    id: 'velotm-uvt',
    name: 'VeloTM Universitatea de Vest (UVT)',
    type: 'bike_station',
    lat: 45.7471,
    lng: 21.2316,
    availableBikes: 8,
    totalDocks: 15,
    isWheelchairAccessible: false,
    dataSource: 'STPT VeloTM',
  },
  {
    id: 'velotm-iulius',
    name: 'VeloTM Iulius Town / Consiliul Europei',
    type: 'bike_station',
    lat: 45.7662,
    lng: 21.2286,
    availableBikes: 14,
    totalDocks: 25,
    isWheelchairAccessible: false,
    dataSource: 'STPT VeloTM',
  },
  {
    id: 'velotm-gara-nord',
    name: 'VeloTM Gara Timișoara Nord',
    type: 'bike_station',
    lat: 45.7508,
    lng: 21.2076,
    availableBikes: 8,
    totalDocks: 15,
    isWheelchairAccessible: false,
    dataSource: 'STPT VeloTM',
  },
  {
    id: 'velotm-spital-judetean',
    name: 'VeloTM Spitalul Județean',
    type: 'bike_station',
    lat: 45.7368,
    lng: 21.2415,
    availableBikes: 5,
    totalDocks: 12,
    isWheelchairAccessible: false,
    dataSource: 'STPT VeloTM',
  },
];

const FALLBACK_STPT_STOPS: StationLocation[] = [
  {
    id: 'stpt-catedrala',
    name: 'Catedrala Mitropolitană',
    type: 'tram',
    lat: 45.751,
    lng: 21.2244,
    lines: ['1', '2', '16', '33', 'E3'],
    isWheelchairAccessible: true,
    nextArrivalMinutes: 3,
    feedVersion: '4.31-4',
    dataSource: 'SMTT GTFS',
  },
  {
    id: 'stpt-regina-maria',
    name: 'Piața Regina Maria',
    type: 'tram',
    lat: 45.7548,
    lng: 21.2238,
    lines: ['1', '2', '16', 'E8'],
    isWheelchairAccessible: true,
    nextArrivalMinutes: 4,
    feedVersion: '4.31-4',
    dataSource: 'SMTT GTFS',
  },
  {
    id: 'stpt-libertatii',
    name: 'Piața Libertății',
    type: 'tram',
    lat: 45.7556,
    lng: 21.2273,
    lines: ['1', '2', '6'],
    isWheelchairAccessible: true,
    nextArrivalMinutes: 2,
    feedVersion: '4.31-4',
    dataSource: 'SMTT GTFS',
  },
  {
    id: 'stpt-parvan',
    name: 'Universitatea Politehnica (Vasile Pârvan)',
    type: 'trolleybus',
    lat: 45.7472,
    lng: 21.2266,
    lines: ['16', 'E8'],
    isWheelchairAccessible: true,
    nextArrivalMinutes: 5,
    feedVersion: '4.31-4',
    dataSource: 'SMTT GTFS',
  },
  {
    id: 'stpt-complex',
    name: 'Complexul Studențesc',
    type: 'trolleybus',
    lat: 45.7486,
    lng: 21.2395,
    lines: ['15', '16', 'E8'],
    isWheelchairAccessible: true,
    nextArrivalMinutes: 4,
    feedVersion: '4.31-4',
    dataSource: 'SMTT GTFS',
  },
  {
    id: 'stpt-gara-nord',
    name: 'Gara Timișoara Nord',
    type: 'tram',
    lat: 45.7507,
    lng: 21.2079,
    lines: ['1', '2', '8', '11', '14', 'E3'],
    isWheelchairAccessible: true,
    nextArrivalMinutes: 3,
    feedVersion: '4.31-4',
    dataSource: 'SMTT GTFS',
  },
  {
    id: 'stpt-consiliul-europei',
    name: 'Piața Consiliul Europei (Iulius Town)',
    type: 'trolleybus',
    lat: 45.7652,
    lng: 21.228,
    lines: ['14', '40', 'E2'],
    isWheelchairAccessible: true,
    nextArrivalMinutes: 6,
    feedVersion: '4.31-4',
    dataSource: 'SMTT GTFS',
  },
];

const FALLBACK_PARKINGS: ParkingDetail[] = [
  {
    id: 'timpark-modex',
    name: 'TimPark Piața Iancu Huniade (Modex)',
    lat: 45.7544,
    lng: 21.2285,
    spotsAvailable: 24,
    totalSpots: 60,
    hourlyRateRon: 4.5,
    hourlyRateEur: 0.91,
    smsCode: '110',
    smsNumber: '7406',
    isAccessible: true,
    accessibleSpots: 4,
    zone: 'Zona 0 (Verde)',
    tariffColor: 'green',
    dataSource: 'TimPark Primăria TM',
  },
  {
    id: 'timpark-loga',
    name: 'TimPark Bd. C. D. Loga',
    lat: 45.7518,
    lng: 21.231,
    spotsAvailable: 32,
    totalSpots: 55,
    hourlyRateRon: 3.0,
    hourlyRateEur: 0.61,
    smsCode: '111',
    smsNumber: '7406',
    isAccessible: true,
    accessibleSpots: 4,
    zone: 'Zona I (Roșie)',
    tariffColor: 'red',
    dataSource: 'TimPark Primăria TM',
  },
  {
    id: 'timpark-parvan',
    name: 'TimPark Bd. Vasile Pârvan (UPT / Bega)',
    lat: 45.7475,
    lng: 21.228,
    spotsAvailable: 45,
    totalSpots: 80,
    hourlyRateRon: 2.1,
    hourlyRateEur: 0.42,
    smsCode: '112',
    smsNumber: '7406',
    isAccessible: true,
    accessibleSpots: 5,
    zone: 'Zona II (Galbenă)',
    tariffColor: 'yellow',
    dataSource: 'TimPark Primăria TM',
  },
  {
    id: 'timpark-gara',
    name: 'TimPark Gara Timișoara Nord',
    lat: 45.7505,
    lng: 21.2085,
    spotsAvailable: 50,
    totalSpots: 90,
    hourlyRateRon: 2.1,
    hourlyRateEur: 0.42,
    smsCode: '112',
    smsNumber: '7406',
    isAccessible: true,
    accessibleSpots: 6,
    zone: 'Zona II (Galbenă)',
    tariffColor: 'yellow',
    dataSource: 'TimPark Primăria TM',
  },
  {
    id: 'parking-iulius',
    name: 'Iulius Town Parking',
    lat: 45.7668,
    lng: 21.2295,
    spotsAvailable: 180,
    totalSpots: 300,
    hourlyRateRon: 3.0,
    hourlyRateEur: 0.61,
    smsCode: '111',
    smsNumber: '7406',
    isAccessible: true,
    accessibleSpots: 12,
    zone: 'Iulius Town',
    tariffColor: 'red',
    dataSource: 'TimPark Primăria TM',
  },
];

const FALLBACK_LANDMARKS: CityLandmarkPoi[] = [
  {
    id: 'palatul-culturii',
    name: 'Piața Victoriei / Opera Națională',
    nameEn: 'Victory Square & Opera',
    address: 'Piața Victoriei nr. 2',
    lat: 45.7538,
    lng: 21.2257,
  },
  {
    id: 'catedrala-mitropolitana',
    name: 'Catedrala Mitropolitană Ortodoxă',
    nameEn: 'Orthodox Metropolitan Cathedral',
    address: 'Bd. Regele Ferdinand I',
    lat: 45.7507,
    lng: 21.22423,
  },
  {
    id: 'upt-electro',
    name: 'UPT Facultatea de Electrotehnică (Politehnica)',
    nameEn: 'Politehnica University Electro',
    address: 'Bd. Vasile Pârvan nr. 2',
    lat: 45.7474,
    lng: 21.2263,
  },
  {
    id: 'piata-unirii',
    name: 'Piața Unirii (Domul Romano-Catolic)',
    nameEn: 'Union Square',
    address: 'Piața Unirii',
    lat: 45.7577,
    lng: 21.2289,
  },
  {
    id: 'piata-libertatii',
    name: 'Piața Libertății (Primăria Veche)',
    nameEn: 'Liberty Square',
    address: 'Piața Libertății',
    lat: 45.7556,
    lng: 21.2274,
  },
  {
    id: 'complex-studentesc',
    name: 'Complexul Studențesc',
    nameEn: 'Student Complex',
    address: 'Aleea Studenților',
    lat: 45.7486,
    lng: 21.2395,
  },
  {
    id: 'iulius-town',
    name: 'Iulius Town Timișoara',
    nameEn: 'Iulius Town',
    address: 'Piața Consiliul Europei nr. 2',
    lat: 45.7661,
    lng: 21.2285,
  },
  {
    id: 'gara-de-nord',
    name: 'Gara Timișoara Nord',
    nameEn: 'North Railway Station',
    address: 'Str. Gării nr. 1',
    lat: 45.7507,
    lng: 21.2079,
  },
];

// In-memory cache so we download City Hall datasets once per session
let cachedTransitStops: StationLocation[] | null = null;
let cachedTransitPaths: TransitNetworkPath[] | null = null;
let cachedFeedVersion: string | null = null;
let cachedParkings: ParkingDetail[] | null = null;
let cachedLandmarks: CityLandmarkPoi[] | null = null;

async function fetchPmtTransitNetwork(): Promise<{
  stops: StationLocation[];
  paths: TransitNetworkPath[];
  feedVersion: string;
}> {
  if (cachedTransitStops && cachedTransitPaths && cachedFeedVersion) {
    return {
      stops: cachedTransitStops,
      paths: cachedTransitPaths,
      feedVersion: cachedFeedVersion,
    };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  try {
    const res = await fetch(`${PMT_BASE_URL}/api/mobile/transit/network`, {
      headers: PMT_HEADERS,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`PMT transit network HTTP ${res.status}`);
    }

    const data = await res.json();
    const feedVersion: string = data.feedVersion || '4.31';

    // Map routeId -> route metadata (shortName, type, color)
    const routeMap = new Map<
      string,
      { shortName: string; longName?: string; type: number; color?: string }
    >();
    if (Array.isArray(data.routes)) {
      for (const r of data.routes) {
        routeMap.set(String(r.id), {
          shortName: String(r.shortName || r.id),
          longName: r.longName,
          type: typeof r.type === 'number' ? r.type : 3,
          color: r.color ? `#${String(r.color).replace(/^#/, '')}` : undefined,
        });
      }
    }

    // Parse all 890 stops
    const parsedStops: StationLocation[] = [];
    if (Array.isArray(data.stops)) {
      for (const s of data.stops) {
        if (typeof s.lat !== 'number' || typeof s.lon !== 'number') continue;
        const rIds: string[] = Array.isArray(s.routeIds)
          ? s.routeIds.map(String)
          : [];
        const lineNames: string[] = [];
        let primaryType: 'tram' | 'bus' | 'trolleybus' = 'bus';

        for (const rId of rIds) {
          const rMeta = routeMap.get(rId);
          if (rMeta) {
            if (!lineNames.includes(rMeta.shortName)) {
              lineNames.push(rMeta.shortName);
            }
            if (rMeta.type === 0) {
              primaryType = 'tram';
            } else if (rMeta.type === 11 && primaryType !== 'tram') {
              primaryType = 'trolleybus';
            }
          }
        }

        const tr = getTranslations();
        const stationName = String(
          s.name || `${tr.svcStationFallback} ${s.code || s.id}`
        ).trim();
        const existingNearby = parsedStops.find(
          (ex) =>
            ex.name.toLowerCase() === stationName.toLowerCase() &&
            haversineDistanceMeters(ex, { lat: s.lat, lng: s.lon }) < 55
        );

        if (existingNearby) {
          // Merge opposite-side platform lines & routeIds into a single clean station marker
          for (const ln of lineNames) {
            if (!existingNearby.lines?.includes(ln)) {
              existingNearby.lines = [...(existingNearby.lines || []), ln];
            }
          }
          for (const rId of rIds) {
            if (!existingNearby.routeIds?.includes(rId)) {
              existingNearby.routeIds = [...(existingNearby.routeIds || []), rId];
            }
          }
          if (primaryType === 'tram') {
            existingNearby.type = 'tram';
          } else if (primaryType === 'trolleybus' && existingNearby.type === 'bus') {
            existingNearby.type = 'trolleybus';
          }
        } else {
          parsedStops.push({
            id: String(s.id),
            name: stationName,
            stopCode: s.code ? String(s.code) : undefined,
            type: primaryType,
            lat: s.lat,
            lng: s.lon,
            lines: lineNames,
            routeIds: rIds,
            // Note from ghid-pmt.vercel.app/unihack: GTFS has no wheelchair fields
            isWheelchairAccessible: undefined,
            feedVersion,
            dataSource: `SMTT GTFS v${feedVersion} (cont.primariatm.ro)`,
          });
        }
      }
    }

    // Decode all 116 route polylines
    const parsedPaths: TransitNetworkPath[] = [];
    if (Array.isArray(data.paths)) {
      for (const p of data.paths) {
        if (!p.polyline || !p.routeId) continue;
        const rMeta = routeMap.get(String(p.routeId));
        const geometry = decodeGooglePolyline(String(p.polyline));
        if (geometry.length >= 2) {
          parsedPaths.push({
            routeId: String(p.routeId),
            shortName: rMeta?.shortName || String(p.routeId),
            longName: rMeta?.longName,
            type: rMeta?.type ?? 3,
            directionId: typeof p.directionId === 'number' ? p.directionId : 0,
            color: rMeta?.color,
            geometry,
          });
        }
      }
    }

    cachedTransitStops = parsedStops;
    cachedTransitPaths = parsedPaths;
    cachedFeedVersion = feedVersion;

    return {
      stops: parsedStops,
      paths: parsedPaths,
      feedVersion,
    };
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}

async function fetchPmtParkings(): Promise<ParkingDetail[]> {
  if (cachedParkings) return cachedParkings;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  try {
    const res = await fetch(`${PMT_BASE_URL}/api/mobile/parking`, {
      headers: PMT_HEADERS,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`PMT parking HTTP ${res.status}`);
    }

    const data = await res.json();
    const smsNumber: string = data?.tariffs?.smsNumber || '7406';
    const hourlyTariffs = data?.tariffs?.hourly || {};

    const zoneLabelMap: Record<string, string> = {
      green: 'Zona 0 (Verde • Progresiv)',
      red: 'Zona I (Roșie)',
      yellow: 'Zona II (Galbenă)',
      blue: 'Zona III (Albastră)',
    };

    const lots: ParkingDetail[] = [];
    if (Array.isArray(data.features)) {
      for (const feat of data.features) {
        if (feat.kind !== 'lot' || !Array.isArray(feat.coordinates)) continue;
        const coords: number[][] = feat.coordinates;
        if (coords.length === 0) continue;

        // Coordinates in /api/mobile/parking are [lon, lat]!
        let sumLat = 0;
        let sumLng = 0;
        let validCount = 0;
        const polygon: GeoPoint[] = [];

        for (const pair of coords) {
          if (Array.isArray(pair) && pair.length >= 2) {
            const lng = Number(pair[0]);
            const lat = Number(pair[1]);
            if (!isNaN(lat) && !isNaN(lng)) {
              sumLat += lat;
              sumLng += lng;
              validCount++;
              polygon.push({ lat, lng });
            }
          }
        }

        if (validCount === 0) continue;
        const centerLat = Number((sumLat / validCount).toFixed(6));
        const centerLng = Number((sumLng / validCount).toFixed(6));
        const tariffKey = String(feat.tariff || 'blue').toLowerCase();
        const tariffInfo = hourlyTariffs[tariffKey];
        const eurRate =
          typeof tariffInfo?.eur === 'number' ? tariffInfo.eur : 0.42;
        const ronRate = Number((eurRate * 4.97).toFixed(2));
        const smsCode = tariffInfo?.code ? String(tariffInfo.code) : '112';

        lots.push({
          id: String(feat.id),
          name: feat.name
            ? `TimPark ${feat.name}`
            : `${getTranslations().svcTimParkFallback} (${feat.id.toUpperCase()})`,
          lat: centerLat,
          lng: centerLng,
          spotsAvailable: null, // Honest data: TimPark open API does not report live sensor occupancy
          totalSpots: null,
          hourlyRateRon: ronRate,
          hourlyRateEur: eurRate,
          smsCode,
          smsNumber,
          isAccessible: true,
          zone: zoneLabelMap[tariffKey] || `Zona (${tariffKey})`,
          tariffColor: (['green', 'red', 'yellow', 'blue'].includes(tariffKey)
            ? tariffKey
            : 'blue') as 'green' | 'red' | 'yellow' | 'blue',
          polygon,
          dataSource: 'TimPark Primăria TM (/api/mobile/parking)',
        });
      }
    }

    if (lots.length > 0) {
      cachedParkings = lots;
      return lots;
    }
    return FALLBACK_PARKINGS;
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}

interface BackendMobilityStationDto {
  id: string;
  name: string;
  vehicleType: string;
  lat: number;
  lng: number;
  availableVehicles: number;
  unlockCostRon: number;
}

interface BackendParkingLotDto {
  id: string;
  name: string;
  zone: string;
  lat: number;
  lng: number;
  hourlyRateRon: number;
  availableSpots: number;
  accessibleSpots: number;
  hasDisabledAccess: boolean;
}

interface BackendTransitStopDto {
  id: string;
  name: string;
  lat: number;
  lng: number;
  wheelchairAccessible: boolean;
  lines: string[];
}

function mapBackendStation(s: BackendMobilityStationDto): StationLocation {
  const isScooter = s.vehicleType.toLowerCase().includes('scooter');
  return {
    id: s.id,
    name: s.name,
    type: isScooter ? 'scooter_station' : 'bike_station',
    lat: s.lat,
    lng: s.lng,
    availableBikes: s.availableVehicles,
    totalDocks: s.availableVehicles + 6,
    isWheelchairAccessible: false,
    dataSource: 'BeGreen Backend (VeloTM/Micromobility)',
  };
}

function mapBackendTransitStop(s: BackendTransitStopDto): StationLocation {
  const joined = (s.lines || []).join(' ').toLowerCase();
  const type: StationLocation['type'] = joined.includes('tram')
    ? 'tram'
    : joined.includes('trole')
    ? 'trolleybus'
    : 'bus';
  return {
    id: s.id,
    name: s.name,
    type,
    lat: s.lat,
    lng: s.lng,
    lines: s.lines || [],
    isWheelchairAccessible: s.wheelchairAccessible,
    dataSource: 'EcoMutare Backend (STPT)',
  };
}

function mapBackendParking(p: BackendParkingLotDto): ParkingDetail {
  const z = (p.zone || '').toLowerCase();
  const tariffColor: ParkingDetail['tariffColor'] = z.includes('verde')
    ? 'green'
    : z.includes('roș') || z.includes('ros')
    ? 'red'
    : z.includes('galben')
    ? 'yellow'
    : 'blue';
  return {
    id: p.id,
    name: p.name,
    lat: p.lat,
    lng: p.lng,
    spotsAvailable: p.availableSpots,
    totalSpots: p.availableSpots + 30,
    hourlyRateRon: Number(p.hourlyRateRon),
    isAccessible: p.hasDisabledAccess,
    accessibleSpots: p.accessibleSpots,
    zone: p.zone,
    tariffColor,
    dataSource: 'EcoMutare Backend (TimPark)',
  };
}

export const transitService = {
  /**
   * Returns ALL real SMTT public transport stops (bus, tram, trolleybus) + VeloTM bike/scooter stations
   * merged with EcoMutare backend metadata across Timișoara.
   */
  async getNearbyStations(
    lat = 45.7537,
    lng = 21.2257,
    maxTransitStops = 1000
  ): Promise<StationLocation[]> {
    const [backendStationsRes, backendStopsRes, pmtRes] = await Promise.allSettled([
      !API_CONFIG.USE_MOCK_FALLBACK
        ? apiFetch<BackendMobilityStationDto[]>('/stations')
        : Promise.resolve([]),
      !API_CONFIG.USE_MOCK_FALLBACK
        ? apiFetch<BackendTransitStopDto[]>(`/transit/stops/nearby?lat=${lat}&lng=${lng}`)
        : Promise.resolve([]),
      fetchPmtTransitNetwork(),
    ]);

    const backendStations =
      backendStationsRes.status === 'fulfilled' && Array.isArray(backendStationsRes.value)
        ? backendStationsRes.value.map(mapBackendStation)
        : [];
    const mobilityStations = [...backendStations];
    for (const v of VELOTM_STATIONS) {
      if (!mobilityStations.some((m) => m.id === v.id)) {
        mobilityStations.push(v);
      }
    }

    const backendStops =
      backendStopsRes.status === 'fulfilled' && Array.isArray(backendStopsRes.value)
        ? backendStopsRes.value.map(mapBackendTransitStop)
        : [];

    if (pmtRes.status === 'fulfilled') {
      const pmtStops = pmtRes.value.stops;
      const limitedStops =
        maxTransitStops >= pmtStops.length ? [...pmtStops] : pmtStops.slice(0, maxTransitStops);

      // Enrich matching PMT stops with accessibility flags from backend STPT dataset
      for (const bStop of backendStops) {
        const match = limitedStops.find(
          (p) => haversineDistanceMeters(p, bStop) < 75
        );
        if (match) {
          match.isWheelchairAccessible = bStop.isWheelchairAccessible;
        } else {
          limitedStops.unshift(bStop);
        }
      }

      return [...mobilityStations, ...limitedStops];
    }

    if (backendStops.length > 0) {
      return [...mobilityStations, ...backendStops];
    }

    return [...mobilityStations, ...FALLBACK_STPT_STOPS];
  },

  /**
   * Resolves a human-friendly Timișoara location name for any tapped/dragged point on the map.
   */
  resolveNearestPointName(point: GeoPoint): string {
    const candidates: { name: string; lat: number; lng: number }[] = [
      ...(cachedLandmarks || FALLBACK_LANDMARKS),
      ...VELOTM_STATIONS,
      ...(cachedTransitStops || FALLBACK_STPT_STOPS),
    ];

    let bestName = '';
    let bestDist = Infinity;

    for (const c of candidates) {
      const d = haversineDistanceMeters(point, c);
      if (d < bestDist) {
        bestDist = d;
        bestName = c.name;
      }
    }

    const tr = getTranslations();
    if (bestName && bestDist <= 120) {
      return bestName;
    }
    if (bestName && bestDist <= 450) {
      return tr.svcNearPrefix(bestName);
    }
    return `${tr.svcPointFallback} (${point.lat.toFixed(4)}, ${point.lng.toFixed(4)})`;
  },

  /**
   * Returns all cached SMTT stops (890 stops) once loaded, or fallback stops.
   */
  async getAllTransitStops(): Promise<StationLocation[]> {
    try {
      const { stops } = await fetchPmtTransitNetwork();
      return stops;
    } catch {
      return FALLBACK_STPT_STOPS;
    }
  },

  /**
   * Returns decoded SMTT route polylines (116 paths across 58 lines) from /api/mobile/transit/network.
   */
  async getTransitNetworkPaths(): Promise<TransitNetworkPath[]> {
    try {
      const { paths } = await fetchPmtTransitNetwork();
      return paths;
    } catch {
      return [];
    }
  },

  /**
   * Fetches real scheduled departures for a specific SMTT stop today from
   * GET https://cont.primariatm.ro/api/mobile/transit/stops/{stopId}/timetable
   */
  async getStopTimetable(stopId: string): Promise<{
    nextDepartures: string[];
    nextArrivalMinutes?: number;
  }> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);
    try {
      const now = new Date();
      const yyyy = now.getFullYear();
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const dd = String(now.getDate()).padStart(2, '0');
      const dateStr = `${yyyy}-${mm}-${dd}`;

      const res = await fetch(
        `${PMT_BASE_URL}/api/mobile/transit/stops/${encodeURIComponent(
          stopId
        )}/timetable?date=${dateStr}`,
        {
          headers: PMT_HEADERS,
          signal: controller.signal,
        }
      );
      clearTimeout(timeoutId);
      if (!res.ok) return { nextDepartures: [] };

      const data = await res.json();
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      const upcoming: { minsFromNow: number; label: string }[] = [];

      if (Array.isArray(data.lines)) {
        for (const line of data.lines) {
          const lineCode = String(line.routeId || '')
            .replace(/^R_(TV|TB|AB|EX|M)_/i, '');
          const times: string[] = Array.isArray(line.times) ? line.times : [];
          for (const t of times) {
            const parts = String(t).split(':');
            if (parts.length >= 2) {
              const mins = parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
              if (!isNaN(mins) && mins >= currentMinutes && mins <= currentMinutes + 90) {
                upcoming.push({
                  minsFromNow: mins - currentMinutes,
                  label: `${lineCode ? `Linija ${lineCode} u ` : ''}${t} (${
                    mins - currentMinutes
                  } min)`,
                });
                break; // First upcoming departure for this line/direction
              }
            }
          }
        }
      }

      upcoming.sort((a, b) => a.minsFromNow - b.minsFromNow);
      return {
        nextDepartures: upcoming.slice(0, 3).map((u) => u.label),
        nextArrivalMinutes: upcoming[0]?.minsFromNow,
      };
    } catch {
      clearTimeout(timeoutId);
      return { nextDepartures: [] };
    }
  },

  /**
   * Returns real TimPark parking lots from Backend /parkings + Primăria Timișoara /api/mobile/parking.
   */
  async getParkings(): Promise<ParkingDetail[]> {
    const [backendRes, pmtRes] = await Promise.allSettled([
      !API_CONFIG.USE_MOCK_FALLBACK
        ? apiFetch<BackendParkingLotDto[]>('/parkings')
        : Promise.resolve([]),
      fetchPmtParkings(),
    ]);

    const backendParkings =
      backendRes.status === 'fulfilled' && Array.isArray(backendRes.value)
        ? backendRes.value.map(mapBackendParking)
        : [];

    if (pmtRes.status === 'fulfilled') {
      const merged = [...backendParkings];
      for (const lot of pmtRes.value) {
        if (!merged.some((b) => haversineDistanceMeters(b, lot) < 60)) {
          merged.push(lot);
        }
      }
      return merged.length > 0 ? merged : FALLBACK_PARKINGS;
    }

    if (backendParkings.length > 0) {
      return backendParkings;
    }

    return FALLBACK_PARKINGS;
  },

  /**
   * Returns the 20 official Timișoara landmarks from /api/mobile/pois + key hubs.
   */
  async getCityLandmarks(): Promise<CityLandmarkPoi[]> {
    if (cachedLandmarks) return cachedLandmarks;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4500);
    try {
      const res = await fetch(`${PMT_BASE_URL}/api/mobile/pois`, {
        headers: PMT_HEADERS,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (!res.ok) throw new Error(`PMT pois HTTP ${res.status}`);

      const data = await res.json();
      if (Array.isArray(data.pois) && data.pois.length > 0) {
        const parsed: CityLandmarkPoi[] = data.pois
          .filter(
            (p: any) =>
              typeof p.latitude === 'number' && typeof p.longitude === 'number'
          )
          .map((p: any) => ({
            id: String(p.id),
            name: String(p.name),
            nameEn: p.nameEn ? String(p.nameEn) : undefined,
            address: p.address ? String(p.address) : undefined,
            description: p.descriptionEn || p.description || undefined,
            lat: Number(p.latitude),
            lng: Number(p.longitude),
          }));

        // Combine with key student/transit hubs (UPT, Complex, Iulius, Gara de Nord)
        const combined = [...FALLBACK_LANDMARKS];
        for (const item of parsed) {
          if (!combined.some((c) => c.id === item.id)) {
            combined.push(item);
          }
        }
        cachedLandmarks = combined;
        return combined;
      }
    } catch {
      clearTimeout(timeoutId);
    }
    return FALLBACK_LANDMARKS;
  },

  /**
   * Live geocoding search for any street address, house number, building, or place in Timișoara
   * via OpenStreetMap (Photon / Nominatim bounded to Timișoara).
   */
  async searchExternalAddresses(query: string): Promise<
    {
      id: string;
      name: string;
      subtitle: string;
      icon: string;
      lat: number;
      lng: number;
    }[]
  > {
    const trimmed = query.trim();
    if (trimmed.length < 2) return [];

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    try {
      const encodedQ = encodeURIComponent(`${trimmed}, Timișoara`);
      const url = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=8&viewbox=21.13,45.81,21.32,45.69&bounded=1&q=${encodedQ}`;
      const res = await fetch(url, {
        headers: {
          Accept: 'application/json',
          'Accept-Language': 'ro,en,hr',
          'User-Agent': 'BeGreen-UniHack8-Timisoara/1.0',
        },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!res.ok) return [];
      const data = await res.json();
      if (!Array.isArray(data)) return [];

      return data
        .filter((item: any) => item.lat && item.lon)
        .map((item: any, idx: number) => {
          const addr = item.address || {};
          const road = addr.road || addr.pedestrian || addr.suburb || '';
          const houseNumber = addr.house_number ? ` ${addr.house_number}` : '';
          const primaryName =
            item.name ||
            (road ? `${road}${houseNumber}` : String(item.display_name || '').split(',')[0]);
          const neighbourhood =
            addr.Salvation || addr.neighbourhood || addr.suburb || 'Timișoara';
          const subtitle =
            road && item.name && item.name !== road
              ? `${road}${houseNumber}, ${neighbourhood}`
              : String(item.display_name || 'Adresa • Timișoara')
                  .split(',')
                  .slice(1, 3)
                  .join(',')
                  .trim() || 'Adresa • Timișoara';

          return {
            id: `osm_${item.place_id || idx}`,
            name: primaryName || trimmed,
            subtitle,
            icon: '📍',
            lat: Number(parseFloat(String(item.lat)).toFixed(6)),
            lng: Number(parseFloat(String(item.lon)).toFixed(6)),
          };
        });
    } catch {
      clearTimeout(timeoutId);
      return [];
    }
  },
};

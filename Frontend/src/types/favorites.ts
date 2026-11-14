import { GeoPoint, TransportMode } from './route';

/** A server record associated with this account, without a durability assertion. */
export interface FavoriteRoute {
  id: string;
  userId: string;
  name: string;
  originName: string;
  origin: GeoPoint;
  destinationName: string;
  destination: GeoPoint;
  preferredMode: TransportMode;
  requiresStepFreeAccess: boolean;
}

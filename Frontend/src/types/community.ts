/** Supported values from the backend CommunityReportCategory enum. */
export const issueCategories = [
  'RoadBlockade',
  'BlockedBikeLane',
  'InaccessibleArea',
  'MissingBikeLane',
  'TransitDisruption',
] as const;

export type IssueCategory = typeof issueCategories[number];

/** EcoMutare.Domain.TransportMode used by CreateCommunityReportRequestDto. */
export const reportTransportModes = ['Walk', 'Bike', 'Scooter', 'PublicTransport', 'Car', 'Carpool', 'Combined'] as const;
export type ReportTransportMode = typeof reportTransportModes[number];

export interface ReportLocation {
  latitude: number;
  longitude: number;
}

export function isReportLocation(value: ReportLocation | null): value is ReportLocation {
  return value !== null && Number.isFinite(value.latitude) && Math.abs(value.latitude) <= 90 &&
    Number.isFinite(value.longitude) && Math.abs(value.longitude) <= 180;
}

/** Definitions only: the current backend cannot attest to progress provenance. */
export interface ChallengeDefinition {
  id: string;
  title: string;
  description: string;
  category: string;
  targetValue: number;
  unit: string;
  rewardPoints: number;
  adaptedForAccessibility: boolean;
}

export interface CreateIssueReport {
  category: IssueCategory;
  title: string;
  description: string;
  affectedModes: ReportTransportMode[];
  affectsWheelchair: boolean;
  streetOrZone?: string;
  latitude: number;
  longitude: number;
}

/** Acknowledges server receipt, not durable storage or a points award. */
export interface IssueReportReceipt {
  id: number;
  category: IssueCategory;
  title: string;
  description: string;
  affectedModes: ReportTransportMode[];
  affectsWheelchair: boolean;
  streetOrZone: string;
  latitude: number;
  longitude: number;
}

/** Supported values from the backend CommunityReportCategory enum. */
export const issueCategories = [
  'RoadBlockade',
  'BlockedBikeLane',
  'InaccessibleArea',
  'MissingBikeLane',
  'TransitDisruption',
] as const;

export type IssueCategory = typeof issueCategories[number];

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
  description: string;
  streetOrZone?: string;
  latitude: number;
  longitude: number;
}

/** Acknowledges server receipt, not durable storage or a points award. */
export interface IssueReportReceipt {
  id: number;
  category: IssueCategory;
  description: string;
  streetOrZone: string;
  latitude: number;
  longitude: number;
}

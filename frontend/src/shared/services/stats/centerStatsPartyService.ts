//  CenterStatsPartyService

import { apiClient } from "../../lib/apiClient";

export type PageResponse<T> = {
  content: T[];
  number: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
};

export type CenterStatsPartyRow = {
  orgId?: string;

  electionId: string;
  contestId: string;

  centerId: string;
  centerCode?: string;
  centerName?: string;

  districtId: string;
  districtName?: string;

  countyId: string;
  countyName?: string;

  registeredVoters?: number;

  // ✅ NEW backend fields
  ballotsIssued?: number;

  ballotsCast?: number;
  validVotes?: number;
  invalidTotal?: number;

  turnoutPct?: number;
  invalidPct?: number;

  // ✅ NEW backend fields (coverage / reporting)
  placesTotal?: number;
  placesReported?: number;
  placesReportingPct?: number;

  // ✅ NEW backend fields (allocation + status rollups)
  hasPlaceAllocation?: number;
  centerStarted?: number;
  centerPartial?: number;
  centerCompleted?: number;

  // kept
  centerLatitude?: number;
  centerLongitude?: number;
};

export type CenterStatsPartyQuery = {
  orgId?: string; // optional (TENANT/NEC derives it)
  electionId: string;
  contestId?: string;

  countyId?: string;
  districtId?: string;
  centerId?: string;

  page?: number;
  size?: number;
  sort?: string[];
};

export async function searchCenterStatsParty(
  q: CenterStatsPartyQuery
): Promise<PageResponse<CenterStatsPartyRow>> {
  const res = await apiClient.get(`/stats/party/centers`, {
    params: {
      // ✅ only send orgId when provided
      ...(q.orgId ? { orgId: q.orgId } : {}),
      electionId: q.electionId,
      ...(q.contestId ? { contestId: q.contestId } : {}),
      ...(q.countyId ? { countyId: q.countyId } : {}),
      ...(q.districtId ? { districtId: q.districtId } : {}),
      ...(q.centerId ? { centerId: q.centerId } : {}),
      page: q.page ?? 0,
      size: q.size ?? 25,
      sort: q.sort,
    },
  });

  return res.data as PageResponse<CenterStatsPartyRow>;
}


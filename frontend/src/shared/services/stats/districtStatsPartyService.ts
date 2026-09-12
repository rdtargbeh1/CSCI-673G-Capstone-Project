

// ✅ FILE: src/shared/services/stats/districtStatsPartyService.ts

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

export type DistrictStatsPartyRow = {
  orgId?: string;
  electionId: string;
  contestId: string;

  districtId: string;
  districtName: string;

  countyId: string;
  countyName: string;

  registeredVoters?: number;
  ballotsCast?: number;
  validVotes?: number;
  invalidTotal?: number;

  turnoutPct?: number;
  invalidPct?: number;

  // ✅ NEW (backend view / DTO)
  centersReported?: number;
  centersTotal?: number;
  reportingPct?: number;
  centersStarted?: number;
};

export type DistrictStatsPartyQuery = {
  orgId?: string;
  electionId: string;
  contestId?: string;

  countyId?: string;
  districtId?: string;

  page?: number;
  size?: number;
  sort?: string[];
};

export async function searchDistrictStatsParty(
  q: DistrictStatsPartyQuery
): Promise<PageResponse<DistrictStatsPartyRow>> {
  const res = await apiClient.get(`/stats/party/districts`, {
    params: {
      orgId: q.orgId,
      electionId: q.electionId,
      contestId: q.contestId,
      countyId: q.countyId,
      districtId: q.districtId,
      page: q.page ?? 0,
      size: q.size ?? 25,
      sort: q.sort,
    },
  });

  return res.data as PageResponse<DistrictStatsPartyRow>;
}

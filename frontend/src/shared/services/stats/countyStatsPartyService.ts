
// CountyStatsPartyService

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

export type CountyStatsPartyRow = {
  orgId?: string;
  electionId: string;
  contestId?: string;

  countyId: string;
  countyName: string;

  registeredVoters: number;
  ballotsCast: number;
  validVotes: number;
  invalidTotal: number;

  turnoutPct: number;
  invalidPct: number;

  // ✅ NEW (from CountyStatsPartyDto)
  centersReported?: number;
  centersTotal?: number;
  reportingPct?: number;

  districtsReported?: number;
  districtsTotal?: number;
  districtsCompleted?: number;
  districtsStarted?: number;

  centersStarted?: number;
};

export type CountyStatsPartyQuery = {
  orgId?: string;
  electionId: string;
  contestId?: string;

  countyId?: string;

  page?: number;
  size?: number;
  sort?: string[];
};

export async function searchCountyStatsParty(
  q: CountyStatsPartyQuery
): Promise<PageResponse<CountyStatsPartyRow>> {
  const res = await apiClient.get(`/stats/party/counties`, {
    params: {
      orgId: q.orgId, // ✅ ALWAYS pass if available (fixes 400 when derivedOrgId is null)
      electionId: q.electionId,
      contestId: q.contestId,
      countyId: q.countyId,
      page: q.page ?? 0,
      size: q.size ?? 25,
      sort: q.sort,
    },
  });

  return res.data as PageResponse<CountyStatsPartyRow>;
}



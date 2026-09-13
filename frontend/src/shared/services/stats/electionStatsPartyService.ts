
// ElectionStatsPartyService

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

export type ElectionStatsPartyRow = {
  orgId?: string;
  electionId: string;
  contestId?: string;

  registeredVoters: number | string; // backend is Long; axios may parse as number, keep flexible
  ballotsCast: number | string;
  validVotes: number | string;
  invalidTotal: number | string;

  turnoutPct: number | string;
  invalidPct: number | string;

  centersReported: number | string;
  centersTotal: number | string;
  reportingPct: number | string;

  // ✅ NEW: from ElectionStatsPartyDto (progress signal)
  centersStarted: number | string;
};

export type ElectionStatsPartyQuery = {
  orgId?: string;
  electionId: string;
  contestId?: string;

  page?: number;
  size?: number;
  sort?: string[];
};

export async function searchElectionStatsParty(
  q: ElectionStatsPartyQuery
): Promise<PageResponse<ElectionStatsPartyRow>> {
  const res = await apiClient.get(`/stats/party/elections`, {
    params: {
      orgId: q.orgId, // ✅ always pass if available
      electionId: q.electionId,
      contestId: q.contestId,
      page: q.page ?? 0,
      size: q.size ?? 25,
      sort: q.sort,
    },
  });

  return res.data as PageResponse<ElectionStatsPartyRow>;
}


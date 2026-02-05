

// src/shared/services/stats/candidateCenterStatsPartyService.ts

import { apiClient } from "../../lib/apiClient";

export type PageResponse<T> = {
  content: T[];
  number: number; // current page index
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
};

export type CandidateCenterStatsPartyRow = {
  orgId?: string;

  electionId: string;
  contestId: string;

  countyId: string;
  countyName: string;

  districtId: string;
  districtName: string;

  centerId: string;
  centerCode: string;
  centerName: string;

  candidateId: string;
  candidateName: string;

  partyId?: string;
  partyName?: string;
  partyCode?: string;

  candidateVotes: number;
  registeredVoters: number;
  ballotsCast: number;
  centerValidVotes: number;
  centerInvalidTotal: number;

  voteSharePct: number;
};

export type CandidateCenterStatsPartyQuery = {
  orgId?: string; // optional: backend can derive (header/JWT)
  electionId: string;
  contestId: string;

  countyId?: string;
  districtId?: string;
  centerId?: string;
  candidateId?: string;
  partyId?: string;

  page?: number; // default 0
  size?: number; // default 25
  sort?: string[]; // Spring style: sort=field,dir (repeatable)
};

/**
 * Calls:
 *   GET /api/stats/party/candidates/centers
 *
 * Backend expects:
 *   electionId (required)
 *   contestId (required)
 * Optional:
 *   countyId, districtId, centerId, candidateId, partyId, page, size, sort
 */
export async function searchCandidateCenterStatsParty(
  q: CandidateCenterStatsPartyQuery
): Promise<PageResponse<CandidateCenterStatsPartyRow>> {
  const res = await apiClient.get(`/stats/party/candidates/centers`, {
    params: {
      orgId: q.orgId,
      electionId: q.electionId,
      contestId: q.contestId,
      countyId: q.countyId,
      districtId: q.districtId,
      centerId: q.centerId,
      candidateId: q.candidateId,
      partyId: q.partyId,
      page: q.page ?? 0,
      size: q.size ?? 25,
      // IMPORTANT: axios will serialize arrays; Spring supports repeated `sort` params
      sort: q.sort,
    },
    // If your backend needs "sort" repeated exactly (sort=a&sort=b),
    // axios does that by default in many setups. If not, configure paramsSerializer in apiClient.
  });

  return res.data as PageResponse<CandidateCenterStatsPartyRow>;
}

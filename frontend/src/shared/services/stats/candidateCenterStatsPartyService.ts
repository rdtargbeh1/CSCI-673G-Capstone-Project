
//  CandidateCenterStatsPartyService

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
  partyCode?: string; // abbreviation

  candidateVotes: number;
  registeredVoters: number;
  ballotsCast: number;
  centerValidVotes: number;
  centerInvalidTotal: number;

  voteSharePct: number;

  // ✅ NEW: outcomes/insights added to v_candidate_center_stats_party
  rankInCenter?: number;
  winnerVotes?: number;
  winnerVoteSharePct?: number;
  marginVotes?: number;
  marginPct?: number;
  isCenterWinner?: boolean;
  rankCenterInDistrictForCandidate?: number;
};

export type CandidateCenterStatsPartyQuery = {
  orgId?: string;
  electionId: string;
  contestId?: string; // ✅ optional now

  countyId?: string;
  districtId?: string;
  centerId?: string;
  candidateId?: string;
  partyId?: string;

  page?: number;
  size?: number;
  sort?: string[];
};

export async function searchCandidateCenterStatsParty(
  q: CandidateCenterStatsPartyQuery
): Promise<PageResponse<CandidateCenterStatsPartyRow>> {
  const res = await apiClient.get(`/stats/party/candidates/centers`, {
    params: {
      orgId: q.orgId,
      electionId: q.electionId,
      contestId: q.contestId, // ✅ optional
      countyId: q.countyId,
      districtId: q.districtId,
      centerId: q.centerId,
      candidateId: q.candidateId,
      partyId: q.partyId,
      page: q.page ?? 0,
      size: q.size ?? 25,
      sort: q.sort,
    },
  });

  return res.data as PageResponse<CandidateCenterStatsPartyRow>;
}



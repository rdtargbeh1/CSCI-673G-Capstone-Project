

// ✅ FILE: src/shared/services/stats/candidateCountyStatsPartyService.ts

import { apiClient } from "../../lib/apiClient";

export type CandidateCountyStatsPartyRow = {
  orgId: string;
  electionId: string;
  contestId: string;

  countyId: string;
  countyName: string;

  candidateId: string;
  candidateName: string;

  partyId?: string;
  partyName?: string;

  // backend DTO uses "abbreviation"
  abbreviation?: string;

  candidateVotes: number;
  ballotsCast: number;
  totalValidVotes: number;
  totalInvalidVotes: number;

  voteSharePct: number;

  // ✅ NEW fields (winner / margin / rank)
  rankInCounty?: number;
  winnerVotes?: number;
  winnerVoteSharePct?: number;
  marginVotes?: number;
  marginPct?: number;
  isCountyWinner?: boolean;
};

export type PageResp<T> = {
  content: T[];
  number: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
};

export async function searchCandidateCountyStatsParty(params: {
  orgId: string;
  electionId: string;
  contestId?: string;
  countyId?: string;
  candidateId?: string;
  partyId?: string;
  page?: number;
  size?: number;
  sort?: string[];
}): Promise<PageResp<CandidateCountyStatsPartyRow>> {
  const res = await apiClient.get<PageResp<CandidateCountyStatsPartyRow>>(
    "/stats/party/candidates/counties",
    {
      params,
      paramsSerializer: {
        serialize: (p: any) => {
          const sp = new URLSearchParams();
          Object.entries(p ?? {}).forEach(([k, v]) => {
            if (v == null || v === "") return;
            if (Array.isArray(v)) v.forEach((x) => sp.append(k, String(x)));
            else sp.set(k, String(v));
          });
          return sp.toString();
        },
      } as any,
    }
  );

  return res.data;
}


// ✅ FILE: src/shared/services/stats/candidateCountyStatsOfficialService.ts

import { apiClient } from "../../lib/apiClient";

export type CandidateCountyStatsOfficialRow = {
  electionId: string;
  contestId?: string;

  countyId?: string;
  countyName?: string;

  candidateId?: string;
  candidateName?: string;

  partyId?: string;
  partyName?: string;
  partyCode?: string;

  candidateVotes?: number;

  ballotsCast?: number;
  totalValidVotes?: number;
  totalInvalidVotes?: number;

  voteSharePct?: number;

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

export async function searchCandidateCountyStatsOfficial(params: {
  electionId: string;
  contestId?: string; // ✅ optional
  countyId?: string;
  candidateId?: string;
  partyId?: string;
  page?: number;
  size?: number;
  sort?: string[];
}): Promise<PageResp<CandidateCountyStatsOfficialRow>> {
  const res = await apiClient.get<PageResp<CandidateCountyStatsOfficialRow>>(
    // ✅ IMPORTANT: no "/api" here
    "/stats/official/candidates/counties",
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

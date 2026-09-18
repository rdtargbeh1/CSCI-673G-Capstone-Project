
// ✅ FILE: src/shared/services/stats/candidateDistrictStatsOfficialService.ts

import { apiClient } from "../../lib/apiClient";

export type CandidateDistrictStatsOfficialRow = {
  electionId: string;
  contestId?: string;

  countyId?: string;
  countyName?: string;

  districtId?: string;
  districtName?: string;

  candidateId?: string;
  candidateName?: string;

  partyId?: string;
  partyName?: string;

  // ✅ frontend standard name
  partyCode?: string; // maps from backend "abbreviation"

  candidateVotes?: number;

  ballotsCast?: number;
  totalValidVotes?: number;
  totalInvalidVotes?: number;

  voteSharePct?: number;

  rankInDistrict?: number;
  winnerVotes?: number;
  winnerVoteSharePct?: number;
  marginVotes?: number;
  marginPct?: number;
  isDistrictWinner?: boolean;
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

export async function searchCandidateDistrictStatsOfficial(params: {
  electionId: string;
  contestId?: string; // ✅ optional
  countyId?: string;
  districtId?: string;
  candidateId?: string;
  partyId?: string;
  page?: number;
  size?: number;
  sort?: string[];
}): Promise<PageResp<CandidateDistrictStatsOfficialRow>> {
  const res = await apiClient.get<PageResp<any>>(
    // ✅ IMPORTANT: no "/api" here
    "/stats/official/candidates/districts",
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

  // ✅ map backend "abbreviation" -> frontend "partyCode"
  const data = res.data as PageResp<any>;
  return {
    ...data,
    content: (data.content ?? []).map((r: any) => ({
      ...r,
      partyCode: r.partyCode ?? r.abbreviation ?? undefined,
    })),
  };
}

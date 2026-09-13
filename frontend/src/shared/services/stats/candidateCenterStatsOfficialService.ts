
// ✅ FILE: src/shared/services/stats/candidateCenterStatsOfficialService.ts


import { apiClient } from "../../lib/apiClient";

export type CandidateCenterStatsOfficialRow = {
  electionId: string;
  contestId?: string;

  countyId?: string;
  countyName?: string;

  districtId?: string;
  districtName?: string;

  centerId?: string;
  centerCode?: string;
  centerName?: string;

  candidateId?: string;
  candidateName?: string;

  partyId?: string;
  partyName?: string;
  partyCode?: string;

  candidateVotes?: number;
  registeredVoters?: number;
  ballotsCast?: number;
  centerValidVotes?: number;
  centerInvalidTotal?: number;

  voteSharePct?: number;

  rankInCenter?: number;
  winnerVotes?: number;
  winnerVoteSharePct?: number;
  marginVotes?: number;
  marginPct?: number;
  isCenterWinner?: boolean;

  rankCenterInDistrictForCandidate?: number;
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

export async function searchCandidateCenterStatsOfficial(params: {
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
}): Promise<PageResp<CandidateCenterStatsOfficialRow>> {
  const res = await apiClient.get<PageResp<CandidateCenterStatsOfficialRow>>(
    // ✅ IMPORTANT: no "/api" here
    "/stats/official/candidates/centers",
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



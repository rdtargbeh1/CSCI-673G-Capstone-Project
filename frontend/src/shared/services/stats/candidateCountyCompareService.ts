

import { apiClient } from "../../lib/apiClient";

export type CandidateCountyCompareRow = {
  orgId?: string;

  electionId: string;
  contestId?: string;

  countyId?: string;
  countyName?: string;

  candidateId?: string;
  candidateName?: string;

  partyId?: string;
  partyName?: string;
  partyCode?: string;

  partyCandidateVotes?: number;
  officialCandidateVotes?: number;
  diffVotes?: number;

  partyVoteSharePct?: number;
  officialVoteSharePct?: number;
  diffVoteSharePct?: number;
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

export async function searchCandidateCountyCompare(params: {
  electionId: string;
  contestId?: string;     // ✅ optional
  countyId?: string;
  candidateId?: string;
  orgId?: string;         // ✅ optional, but required on SYSTEM when no derived org exists
  partyId?: string;

  page?: number;
  size?: number;
  sort?: string[];
}): Promise<PageResp<CandidateCountyCompareRow>> {
  const res = await apiClient.get<PageResp<CandidateCountyCompareRow>>(
    // ✅ do NOT include "/api" here; apiClient baseURL usually already handles it
    "/stats/compare/candidates/counties",
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

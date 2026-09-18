
// ✅ FILE: src/shared/services/stats/candidateElectionStatsPartyService.ts


import { apiClient } from "../../lib/apiClient";

export type CandidateElectionStatsPartyRow = {
  orgId: string;
  electionId: string;
  contestId: string;

  candidateId: string;
  candidateName: string;

  partyId?: string;
  partyName?: string;
  partyCode?: string;

  candidateVotes: number;
  ballotsCast: number;
  totalValidVotes: number;
  totalInvalidVotes: number;

  voteSharePct: number;

  rankInElection?: number;
  winnerVotes?: number;
  winnerVoteSharePct?: number;
  marginVotes?: number;
  marginPct?: number;
  isElectionWinner?: boolean;
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

export async function searchCandidateElectionStatsParty(params: {
  orgId: string;
  electionId: string;
  contestId?: string; // ✅ optional
  candidateId?: string;
  partyId?: string;
  page?: number;
  size?: number;
  sort?: string[];
}): Promise<PageResp<CandidateElectionStatsPartyRow>> {
  // apiClient should already handle params; we ensure sort repeats properly
  const res = await apiClient.get<PageResp<CandidateElectionStatsPartyRow>>(
    "/stats/party/candidates/elections",
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

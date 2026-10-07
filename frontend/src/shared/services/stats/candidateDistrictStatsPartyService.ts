
//  CandidateDistrictStatsPartyService

import { apiClient } from "../../lib/apiClient";

/**
 * ✅ Aligns 1:1 with backend DTO:
 * election.ems_backend.views.dto.CandidateDistrictStatsPartyDto
 *
 * Notes:
 * - UUID => string in TS
 * - Long/BigDecimal => number in TS (but UI should tolerate string too)
 */
export type CandidateDistrictStatsPartyRow = {
  orgId: string;
  electionId: string;
  contestId: string;

  countyId: string;
  countyName: string;

  districtId: string;
  districtName: string;

  candidateId: string;
  candidateName: string;

  partyId?: string;
  partyName?: string;
  partyCode?: string; // ✅ backend uses partyCode
  abbreviation?: string; // ✅ tolerate older payloads

  // ✅ SUM() outputs -> BIGINT
  candidateVotes: number;
  ballotsCast: number;
  totalValidVotes: number;
  totalInvalidVotes: number;

  // ✅ BigDecimal
  voteSharePct: number;

  // ✅ window outputs
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

export async function searchCandidateDistrictStatsParty(params: {
  orgId: string;
  electionId: string;
  contestId?: string;
  countyId?: string;
  districtId?: string;
  candidateId?: string;
  partyId?: string;
  page?: number;
  size?: number;
  sort?: string[];
}): Promise<PageResp<CandidateDistrictStatsPartyRow>> {
  const { orgId, electionId, ...rest } = params;

  const res = await apiClient.get<PageResp<CandidateDistrictStatsPartyRow>>(
    "/stats/party/candidates/districts",
    {
      params: {
        orgId,
        electionId,
        ...rest,
      },
      paramsSerializer: {
        // ensure sort=field,dir repeats in query string
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


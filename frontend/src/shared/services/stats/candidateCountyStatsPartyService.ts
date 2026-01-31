import { apiClient } from "../../lib/apiClient";

export type CandidateCountyStatsPartyDto = {
  orgId: string;
  electionId: string;

  countyId: string;
  countyName: string;

  candidateId: string;
  candidateName: string;

  partyId?: string | null;
  partyName?: string | null;
  abbreviation?: string | null;

  candidateVotes?: number | null;
  ballotsCast?: number | null;
  totalValidVotes?: number | null;
  totalInvalidVotes?: number | null;

  voteSharePct?: number | null;
};

export type SpringPage<T> = {
  content: T[];
  number: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
};

export type CandidateCountyStatsPartyQuery = {
  orgId: string;       // REQUIRED for SYSTEM+TENANT+NEC for this controller
  electionId: string;  // REQUIRED
  countyId?: string;
  candidateId?: string;
  partyId?: string;
  page?: number;
  size?: number;
  sort?: string[];     // e.g. ["candidateVotes,desc","countyName,asc"]
};

export async function fetchCandidateCountyStatsParty(
  q: CandidateCountyStatsPartyQuery
): Promise<SpringPage<CandidateCountyStatsPartyDto>> {
  if (!q.orgId) throw new Error("orgId is required");
  if (!q.electionId) throw new Error("electionId is required");

  const p = new URLSearchParams();
  p.set("orgId", q.orgId);
  p.set("electionId", q.electionId);
  p.set("page", String(q.page ?? 0));
  p.set("size", String(q.size ?? 50));

  // ✅ IMPORTANT: use repeated `sort=` not `sort[]`
  (q.sort ?? []).forEach((s) => p.append("sort", s));

  if (q.countyId) p.set("countyId", q.countyId);
  if (q.candidateId) p.set("candidateId", q.candidateId);
  if (q.partyId) p.set("partyId", q.partyId);

  const url = `/stats/party/candidates/counties?${p.toString()}`;
  const { data } = await apiClient.get(url);
  return data as SpringPage<CandidateCountyStatsPartyDto>;
}

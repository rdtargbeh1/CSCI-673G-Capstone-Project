import { apiClient } from "../lib/apiClient";

export type ElectionPartyDto = {
  electionId: string;
  partyId: string;
  partyName?: string | null;
  partyAbbreviation?: string | null;
  partyLogoUrl?: string | null;
  ballotOrder?: number | null;
  isQualified: boolean;
};

export type ElectionPartyAssignRequest = {
  electionId: string;
  partyId: string;
  ballotOrder?: number | null;
  isQualified?: boolean;
};

export type ElectionPartyUpdateRequest = {
  ballotOrder?: number | null;
  isQualified?: boolean;
};

/**
 * Normalize backend boolean field name differences.
 * Backend may return: isQualified | qualified | is_qualified
 */
function normalizeIsQualified(raw: any): boolean {
  // preserve explicit false
  if (raw?.isQualified === true || raw?.isQualified === false)
    return raw.isQualified;
  if (raw?.qualified === true || raw?.qualified === false) return raw.qualified;
  if (raw?.is_qualified === true || raw?.is_qualified === false)
    return raw.is_qualified;

  // fallback (if backend omitted field): treat as false (safe)
  return false;
}

export async function fetchElectionParties(
  electionId: string
): Promise<ElectionPartyDto[]> {
  // GET /api/elections/{electionId}/parties
  const res = await apiClient.get<any[]>(`/elections/${electionId}/parties`);

  // ✅ normalize response so UI always gets correct isQualified
  return (res.data ?? []).map((r: any) => ({
    electionId: r.electionId,
    partyId: r.partyId,
    partyName: r.partyName ?? null,
    partyAbbreviation: r.partyAbbreviation ?? r.partyAbbrev ?? null,
    partyLogoUrl: r.partyLogoUrl ?? null,
    ballotOrder: r.ballotOrder ?? null,
    isQualified: normalizeIsQualified(r),
  }));
}

export async function addPartyToElection(
  electionId: string,
  req: ElectionPartyAssignRequest
): Promise<ElectionPartyDto> {
  const res = await apiClient.post<any>(
    `/elections/${electionId}/parties`,
    req
  );

  const r = res.data;
  return {
    electionId: r.electionId,
    partyId: r.partyId,
    partyName: r.partyName ?? null,
    partyAbbreviation: r.partyAbbreviation ?? r.partyAbbrev ?? null,
    partyLogoUrl: r.partyLogoUrl ?? null,
    ballotOrder: r.ballotOrder ?? null,
    isQualified: normalizeIsQualified(r),
  };
}

export async function updateElectionParty(
  electionId: string,
  partyId: string,
  req: ElectionPartyUpdateRequest
): Promise<ElectionPartyDto> {
  const res = await apiClient.put<any>(
    `/elections/${electionId}/parties/${partyId}`,
    req
  );

  const r = res.data;
  return {
    electionId: r.electionId,
    partyId: r.partyId,
    partyName: r.partyName ?? null,
    partyAbbreviation: r.partyAbbreviation ?? r.partyAbbrev ?? null,
    partyLogoUrl: r.partyLogoUrl ?? null,
    ballotOrder: r.ballotOrder ?? null,
    isQualified: normalizeIsQualified(r),
  };
}

export async function deleteElectionParty(
  electionId: string,
  partyId: string
): Promise<void> {
  await apiClient.delete(`/elections/${electionId}/parties/${partyId}`);
}

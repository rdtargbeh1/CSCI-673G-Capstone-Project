// src/shared/services/electionCandidateService.ts
import { apiClient } from "../lib/apiClient";

export type ElectionCandidateDto = {
  electId: string;
  electionId: string;
  electionName?: string;

  candidateId: string;
  fullName: string;

  centerId?: string | null;
  centerName?: string | null;

  partyId?: string | null;
  partyAbbrev?: string | null;

  dateCreated?: string;
  dateUpdated?: string;
};

export type ElectionCandidateCreateRequest = {
  electionId: string;
  candidateId: string;
  centerId?: string | null;
};

export type ElectionCandidateUpdateRequest = {
  centerId?: string | null;
};

export async function fetchElectionCandidates(electionId: string) {
  // GET /api/election-candidates/{electionId}/candidates
  const res = await apiClient.get<ElectionCandidateDto[]>(
    `/election-candidates/${electionId}/candidates`
  );
  return res.data;
}

export async function createElectionCandidate(
  req: ElectionCandidateCreateRequest
) {
  // POST /api/election-candidates
  const res = await apiClient.post<ElectionCandidateDto>(
    `/election-candidates`,
    req
  );
  return res.data;
}

export async function updateElectionCandidate(
  electId: string,
  req: ElectionCandidateUpdateRequest
) {
  // PUT /api/election-candidates/{id}
  const res = await apiClient.put<ElectionCandidateDto>(
    `/election-candidates/${electId}`,
    req
  );
  return res.data;
}

export async function deleteElectionCandidate(electId: string) {
  // DELETE /api/election-candidates/{id}
  await apiClient.delete(`/election-candidates/${electId}`);
}

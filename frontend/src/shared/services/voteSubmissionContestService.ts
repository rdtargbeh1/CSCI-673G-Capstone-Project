// src/shared/services/voteSubmissionContestService.ts
import { apiClient } from "../lib/apiClient";

export type VoteSubmissionContestDto = {
  scvId: string;

  submissionId: string;
  orgId: string;

  electionId: string;
  contestId: string;
  optionId: string;

  voteValue: number;
  rank?: number | null;

  dateCreated?: string;

  // optional convenience (UI)
  contestName?: string;
  optionLabel?: string;
};

export type VoteSubmissionContestCreateRequest = {
  submissionId: string;
  orgId: string;

  electionId: string;
  contestId: string;
  optionId: string;

  voteValue: number;
  rank?: number | null;
};

export type VoteSubmissionContestUpdateRequest = {
  voteValue?: number;
  rank?: number | null;
};

export async function createOrUpdateSubmissionContestVote(
  req: VoteSubmissionContestCreateRequest
): Promise<VoteSubmissionContestDto> {
  // Backend: POST /api/admin/normalize
  const { data } = await apiClient.post<VoteSubmissionContestDto>(
    "/admin/normalize",
    req
  );
  return data;
}

export async function updateSubmissionContestVote(
  scvId: string,
  req: VoteSubmissionContestUpdateRequest
): Promise<VoteSubmissionContestDto> {
  // Backend: PUT /api/admin/normalize/{scvId}
  const { data } = await apiClient.put<VoteSubmissionContestDto>(
    `/admin/normalize/${scvId}`,
    req
  );
  return data;
}

export async function listSubmissionContestVotes(params: {
  submissionId: string;
  contestId?: string;
}): Promise<VoteSubmissionContestDto[]> {
  // Backend: GET /api/admin/normalize?submissionId=...&contestId=...
  const { data } = await apiClient.get<VoteSubmissionContestDto[]>(
    "/admin/normalize",
    { params }
  );
  return Array.isArray(data) ? data : [];
}

export async function deleteSubmissionContestVote(
  scvId: string
): Promise<void> {
  // Backend: DELETE /api/admin/normalize/{scvId}
  await apiClient.delete(`/admin/normalize/${scvId}`);
}

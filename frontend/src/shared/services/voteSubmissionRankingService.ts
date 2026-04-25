// src/shared/services/voteSubmissionRankingService.ts
import { apiClient } from "../lib/apiClient";

export type VoteSubmissionRankingDto = {
  svrId?: string;

  submissionId: string;
  contestId: string;

  // ranking JSON in backend (JsonNode). We send an array of optionIds for simplicity.
  ranking: any;

  dateCreated?: string;

  // optional convenience
  contestName?: string;
};

export async function createOrUpdateSubmissionRanking(
  dto: VoteSubmissionRankingDto
): Promise<VoteSubmissionRankingDto> {
  // Backend: POST /api/admin/submission-rankings
  const { data } = await apiClient.post<VoteSubmissionRankingDto>(
    "/admin/submission-rankings",
    dto
  );
  return data;
}

export async function getSubmissionRanking(svrId: string) {
  const { data } = await apiClient.get<VoteSubmissionRankingDto>(
    `/admin/submission-rankings/${svrId}`
  );
  return data;
}

export async function listRankingsBySubmission(submissionId: string) {
  const { data } = await apiClient.get<VoteSubmissionRankingDto[]>(
    `/admin/submission-rankings/by-submission/${submissionId}`
  );
  return Array.isArray(data) ? data : [];
}

export async function listRankingsByContest(contestId: string) {
  const { data } = await apiClient.get<VoteSubmissionRankingDto[]>(
    `/admin/submission-rankings/by-contest/${contestId}`
  );
  return Array.isArray(data) ? data : [];
}

export async function deleteRanking(svrId: string): Promise<void> {
  await apiClient.delete(`/admin/submission-rankings/${svrId}`);
}

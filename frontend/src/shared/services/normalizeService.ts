// // src/shared/services/normalizeService.ts
// import { apiClient } from "../lib/apiClient";

// export type VoteSubmissionContestCreateRequest = {
//   submissionId: string;
//   orgId: string;
//   electionId: string;
//   contestId: string;
//   optionId: string;
//   voteValue?: number; // default 0
//   rank?: number | null;
// };

// export type VoteSubmissionContestUpdateRequest = {
//   voteValue?: number;
//   rank?: number | null;
// };

// export type VoteSubmissionContestBulkItem = {
//   optionId: string;
//   voteValue?: number;
//   rank?: number | null;
// };

// export type VoteSubmissionContestBulkRequest = {
//   submissionId: string;
//   orgId: string;
//   electionId: string;
//   contestId: string;
//   items: VoteSubmissionContestBulkItem[];
// };

// export type VoteSubmissionContestDto = {
//   scvId: string;
//   submissionId: string;
//   orgId: string;
//   electionId: string;
//   contestId: string;
//   optionId: string;
//   voteValue: number;
//   rank?: number | null;
//   dateCreated?: string | null;

//   contestName?: string | null;
//   optionLabel?: string | null;
// };

// // ===================== Ranking DTO (matches backend controller) =====================
// export type VoteSubmissionRankingDto = {
//   svrId?: string | null;
//   submissionId: string;
//   contestId: string;
//   ranking: any; // json array
//   dateCreated?: string | null;
//   contestName?: string | null;
// };

// // ---------------- SCV ----------------

// // Single upsert (create-or-update) a contest row
// export async function createOrUpdateScv(
//   req: VoteSubmissionContestCreateRequest
// ): Promise<VoteSubmissionContestDto> {
//   const res = await apiClient.post<VoteSubmissionContestDto>(
//     "/admin/normalize",
//     req
//   );
//   return res.data;
// }

// // Update a single SCV row
// export async function updateScv(
//   scvId: string,
//   req: VoteSubmissionContestUpdateRequest
// ): Promise<VoteSubmissionContestDto> {
//   const res = await apiClient.put<VoteSubmissionContestDto>(
//     `/admin/normalize/${scvId}`,
//     req
//   );
//   return res.data;
// }

// // Delete a single SCV row
// export async function deleteScv(scvId: string): Promise<void> {
//   await apiClient.delete(`/admin/normalize/${scvId}`);
// }

// // Bulk replace all contest votes for submission+contest
// export async function replaceContestVotes(
//   req: VoteSubmissionContestBulkRequest
// ): Promise<VoteSubmissionContestDto[]> {
//   const res = await apiClient.post<VoteSubmissionContestDto[]>(
//     "/admin/normalize/replace",
//     req
//   );
//   return res.data;
// }

// // Normalize one submission by id
// export async function normalizeSubmission(
//   submissionId: string
// ): Promise<{ submissionId: string; rowsCreated: number }> {
//   const res = await apiClient.post(
//     `/admin/normalize/submission/${submissionId}`
//   );
//   return res.data;
// }

// // Backfill verified submissions for election
// export async function normalizeVerifiedSubmissionsForElection(
//   electionId: string
// ): Promise<{ electionId: string; rowsCreated: number }> {
//   const res = await apiClient.post(
//     `/admin/normalize/election/${electionId}/verified-submissions`
//   );
//   return res.data;
// }

// // List normalized contest rows for a submission
// export async function listScvBySubmission(
//   submissionId: string,
//   contestId?: string
// ): Promise<VoteSubmissionContestDto[]> {
//   const res = await apiClient.get<VoteSubmissionContestDto[]>(
//     "/admin/normalize",
//     { params: { submissionId, contestId } }
//   );
//   return res.data;
// }

// // ---------------- Rankings ----------------

// // Create or update ranking (DTO body, matches your controller)
// export async function createOrUpdateRanking(
//   dto: VoteSubmissionRankingDto
// ): Promise<VoteSubmissionRankingDto> {
//   const res = await apiClient.post<VoteSubmissionRankingDto>(
//     "/admin/submission-rankings",
//     dto
//   );
//   return res.data;
// }

// export async function deleteRanking(svrId: string): Promise<void> {
//   await apiClient.delete(`/admin/submission-rankings/${svrId}`);
// }

// export async function listRankingsBySubmission(
//   submissionId: string
// ): Promise<VoteSubmissionRankingDto[]> {
//   const res = await apiClient.get<VoteSubmissionRankingDto[]>(
//     `/admin/submission-rankings/by-submission/${submissionId}`
//   );
//   return res.data;
// }

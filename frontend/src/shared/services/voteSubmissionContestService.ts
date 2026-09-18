

import { apiClient } from "../lib/apiClient";

/** Spring Page response */
export type PageResp<T> = {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
};

export type VoteSubmissionContestSearchRow = {
  scvId: string;

  submissionId: string;
  orgId: string;
  electionId: string;

  contestId: string;
  contestName?: string | null;

  optionId: string;
  optionLabel?: string | null;

  voteValue: number;
  rank?: number | null;

  countyId?: string | null;
  countyName?: string | null;

  districtId?: string | null;
  districtName?: string | null;

  centerId?: string | null;
  centerName?: string | null;

  electId?: string | null;
  candidateId?: string | null;
  candidateFullName?: string | null;

  partyId?: string | null;
  partyAbbreviation?: string | null;

  dateCreated?: string | null;
};

/** Used ONLY if some older UI still imports it */
export type VoteSubmissionContestCreateRequest = {
  submissionId: string;
  orgId: string;
  electionId: string;
  contestId: string;
  optionId: string;
  voteValue?: number | null;
  rank?: number | null;
};

/** ---------- ✅ READ: Search normalized rows (your table) ---------- */
export async function searchNormalizedSubmissionContestVotes(p: {
  orgId: string;
  electionId: string;

  countyId?: string;
  districtId?: string;
  centerId?: string;
  contestId?: string;
  candidateId?: string;

  page?: number;
  size?: number;
}): Promise<PageResp<VoteSubmissionContestSearchRow>> {
  const {
    orgId,
    electionId,
    countyId,
    districtId,
    centerId,
    contestId,
    candidateId,
    page = 0,
    size = 25,
  } = p;

  const { data } = await apiClient.get<PageResp<VoteSubmissionContestSearchRow>>(
    `/org/${orgId}/elections/${electionId}/normalize`,
    {
      params: {
        countyId: countyId || undefined,
        districtId: districtId || undefined,
        centerId: centerId || undefined,
        contestId: contestId || undefined,
        candidateId: candidateId || undefined,
        page,
        size,
      },
    }
  );

  return {
    content: data?.content ?? [],
    totalElements: Number(data?.totalElements ?? 0),
    totalPages: Number(data?.totalPages ?? 1),
    number: Number(data?.number ?? 0),
    size: Number(data?.size ?? size),
  };
}

/** ---------- ✅ WRITE (official): Normalize one submission ---------- */
export async function normalizeSubmission(p: {
  orgId: string;
  electionId: string;
  submissionId: string;
}): Promise<{ submissionId: string; rowsCreated: number }> {
  const { data } = await apiClient.post(
    `/org/${p.orgId}/elections/${p.electionId}/normalize/submission/${p.submissionId}`
  );
  return data as { submissionId: string; rowsCreated: number };
}

/** ---------- ✅ WRITE (official): Normalize verified submissions for election ---------- */
export async function normalizeVerifiedSubmissionsRun(p: {
  orgId: string;
  electionId: string;
}): Promise<{ electionId: string; rowsCreated: number }> {
  const { data } = await apiClient.post(
    `/org/${p.orgId}/elections/${p.electionId}/normalize/verified-submissions/run`
  );
  return data as { electionId: string; rowsCreated: number };
}

/**
 * ---------- ✅ Backward compatibility ----------
 * Some old UI still imports createOrUpdateSubmissionContestVote().
 *
 * Since normalized table should be auto-populated, we redirect this call to normalizeSubmission()
 * so the UI still "works" without manual edits.
 */


// --- COMPAT EXPORT (do not remove yet) ---
export async function createOrUpdateSubmissionContestVote(body: any) {
  // keep old callers from crashing; normalize instead
  const { orgId, electionId, submissionId } = body ?? {};
  if (!orgId || !electionId || !submissionId) {
    throw new Error(
      "createOrUpdateSubmissionContestVote requires orgId, electionId, submissionId (used to call normalizeSubmission)."
    );
  }

  const { data } = await apiClient.post(
    `/org/${orgId}/elections/${electionId}/normalize/submission/${submissionId}`
  );

  return data;
}

// src/shared/services/contestOptionService.ts
import { apiClient } from "../lib/apiClient";

export type ContestOptionType = "CANDIDATE" | "LABEL";

export type ContestOptionDto = {
  optionId: string;
  contestId: string;
  electionId: string;

  optionType: ContestOptionType;

  electId?: string | null; // ✅ electionCandidate FK
  optionLabel?: string | null;

  optionOrder: number;
  isActive: boolean;

  dateCreated?: string | null;
  dateUpdated?: string | null;

  // optional UI convenience (if backend returns them)
  electionCandidate?: string | null; // fullName
  partyName?: string | null;
  abbreviation?: string | null;
};

export async function listOptionsByContest(params: {
  contestId: string;
  onlyActive: boolean;
}): Promise<ContestOptionDto[]> {
  const { data } = await apiClient.get(
    `/admin/contest-options/contest/${params.contestId}`,
    {
      params: { onlyActive: params.onlyActive },
    }
  );
  return (data ?? []) as ContestOptionDto[];
}

export async function createOption(body: {
  contestId: string;
  optionType: ContestOptionType;
  optionOrder: number;
  isActive: boolean;

  electId?: string | null; // ✅ was candidateId
  optionLabel?: string | null;
}): Promise<ContestOptionDto> {
  const { data } = await apiClient.post(`/admin/contest-options`, body);
  return data as ContestOptionDto;
}

export async function updateOption(
  optionId: string,
  body: {
    optionType?: ContestOptionType;
    optionOrder?: number;
    isActive?: boolean;

    electId?: string | null; // ✅ was candidateId
    optionLabel?: string | null;
  }
): Promise<ContestOptionDto> {
  const { data } = await apiClient.put(
    `/admin/contest-options/${optionId}`,
    body
  );
  return data as ContestOptionDto;
}

export async function deleteOption(optionId: string): Promise<void> {
  await apiClient.delete(`/admin/contest-options/${optionId}`);
}

/**
 * Bulk assign election candidates to contest as options
 * Backend must accept electIds now.
 */
export async function bulkAssignCandidates(body: {
  contestId: string;
  electIds: string[]; // ✅ was candidateIds
  replace: boolean;
}): Promise<ContestOptionDto[]> {
  const { data } = await apiClient.post(
    `/admin/contest-options/bulk-candidates`,
    body
  );
  return (data ?? []) as ContestOptionDto[];
}

export async function listContestOptionsByContest(args: {
  contestId: string;
  onlyActive?: boolean;
}): Promise<ContestOptionDto[]> {
  const { contestId, onlyActive = true } = args;
  const res = await apiClient.get(`/api/admin/contest-options`, {
    params: { contestId, onlyActive },
  });
  return res.data;
}

/* ============================================================
   ✅ ADDITIONS ONLY (do not change existing behavior)
   ============================================================ */

/**
 * Convenience wrapper: active options for a contest.
 * Uses your existing listOptionsByContest.
 */
export async function listActiveOptionsByContestId(
  contestId: string
): Promise<ContestOptionDto[]> {
  return listOptionsByContest({ contestId, onlyActive: true });
}

/**
 * ✅ For Vote Submissions UI:
 * Backend validates candidateVotes keys against contest_option.electId.
 * This helper returns only the allowed electIds for CANDIDATE options.
 */
export async function listActiveCandidateElectIdsByContest(
  contestId: string
): Promise<string[]> {
  const opts = await listOptionsByContest({ contestId, onlyActive: true });
  return (opts ?? [])
    .filter((o) => o.optionType === "CANDIDATE" && !!o.electId)
    .map((o) => o.electId as string);
}

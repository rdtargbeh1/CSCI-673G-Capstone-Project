

// src/shared/services/voteTallyService.ts
import { apiClient } from "../lib/apiClient";

export type VoteTallyDto = {
  tallyId: string;

  orgId: string;
  orgName: string;

  electionId: string;
  electionName: string;

  partyId?: string | null;
  partyName?: string | null;
  abbreviation?: string | null;

  electId: string;
  fullName: string;

  contestId: string;
  contestName: string;

  voteCount: number;

  lastRecomputedAt?: string | null;
  recomputedByUserId?: string | null;
  recomputedByUserName?: string | null;

  lastUpdated?: string | null;
};

export type PageDto<T> = {
  items: T[];
  page: number;
  size: number;
  totalItems: number;
  totalPages: number;
};

function normalizePage<T>(data: any): PageDto<T> {
  // If your backend returns Spring Page directly:
  // { content, number, size, totalElements, totalPages }
  if (Array.isArray(data?.content)) {
    return {
      items: data.content as T[],
      page: Number(data.number ?? 0),
      size: Number(data.size ?? data.content.length ?? 20),
      totalItems: Number(data.totalElements ?? data.content.length ?? 0),
      totalPages: Number(data.totalPages ?? 1),
    };
  }

  // If your backend returns your own shape:
  if (Array.isArray(data?.items)) return data as PageDto<T>;

  // fallback
  return { items: [], page: 0, size: 20, totalItems: 0, totalPages: 0 };
}

export async function searchVoteTallies(p: {
  orgId: string;
  electionId: string;
  page?: number;
  size?: number;
  electId?: string;
  partyId?: string;
  contestId?: string;
}) {
  const { orgId, electionId, page = 0, size = 20, electId, partyId, contestId } = p;

  const { data } = await apiClient.get(
    `/org/${orgId}/elections/${electionId}/vote-tallies`,
    {
      params: {
        page,
        size,
        electId: electId || undefined,
        partyId: partyId || undefined,
        contestId: contestId || undefined,
      },
    }
  );

  return normalizePage<VoteTallyDto>(data);
}

export async function recomputeVoteTallies(p: {
  orgId: string;
  electionId: string;
  recomputedByUserId?: string;
}) {
  const { orgId, electionId, recomputedByUserId } = p;

  const { data } = await apiClient.post(
    `/org/${orgId}/elections/${electionId}/vote-tallies/recompute`,
    null,
    { params: { recomputedByUserId: recomputedByUserId || undefined } }
  );

  return data as VoteTallyDto[];
}

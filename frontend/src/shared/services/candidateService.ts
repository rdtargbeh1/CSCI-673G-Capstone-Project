// src/shared/services/candidateService.ts
import { apiClient } from "../lib/apiClient";

export type CandidateDto = {
  candidateId: string;
  fullName: string;
  position?: string | null;
  photoUrl?: string | null;
  isActive: boolean;
  active: boolean;
  independent: boolean;
  dateCreated?: string | null;
  dateUpdated?: string | null;

  partyId?: string | null;
  partyName?: string | null;
  abbreviation?: string | null;
};

export type CandidateCreateRequest = {
  fullName: string;
  position?: string | null;
  partyId?: string | null;
  photoUrl?: string | null;
  isActive?: boolean;
  independent?: boolean | null;
};

export type CandidateUpdateRequest = {
  fullName?: string | null;
  position?: string | null;
  partyId?: string | null;
  photoUrl?: string | null;
  isActive?: boolean | null;
  independent?: boolean | null;
};

export type PageResult<T> = {
  items: T[];
  page: number;
  size: number;
  totalItems: number;
  totalPages: number;
};

function mapSpringPage<T>(p: any): PageResult<T> {
  const items = (p?.content ?? []) as T[];
  return {
    items,
    page: Number(p?.number ?? 0),
    size: Number(p?.size ?? items.length ?? 0),
    totalItems: Number(p?.totalElements ?? items.length ?? 0),
    totalPages: Math.max(1, Number(p?.totalPages ?? 1)),
  };
}

export async function searchCandidates(params: {
  page: number;
  size: number;
  q?: string;
  position?: string;
  partyId?: string;
  active?: boolean;
  independent?: boolean; // ✅ NEW
}): Promise<PageResult<CandidateDto>> {
  const res = await apiClient.get(`/candidates`, {
    params: {
      page: params.page,
      size: params.size,
      q: params.q?.trim() || undefined,
      position: params.position?.trim() || undefined,
      partyId: params.partyId || undefined,
      active: params.active,
      independent: params.independent, // ✅ NEW
    },
  });

  return mapSpringPage<CandidateDto>(res.data);
}

export async function getCandidate(candidateId: string): Promise<CandidateDto> {
  const res = await apiClient.get(`/candidates/${candidateId}`);
  return res.data as CandidateDto;
}

export async function createCandidate(
  req: CandidateCreateRequest
): Promise<CandidateDto> {
  const res = await apiClient.post(`/candidates`, req);
  return res.data as CandidateDto;
}

export async function updateCandidate(
  candidateId: string,
  req: CandidateUpdateRequest
): Promise<CandidateDto> {
  const res = await apiClient.put(`/candidates/${candidateId}`, req);
  return res.data as CandidateDto;
}

export async function deleteCandidate(candidateId: string): Promise<void> {
  await apiClient.delete(`/candidates/${candidateId}`);
}

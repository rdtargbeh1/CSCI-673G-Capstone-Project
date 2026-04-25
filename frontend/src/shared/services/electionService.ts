

// src/shared/services/electionService.ts


import { apiClient } from "../lib/apiClient";

export type ElectionType =
  | "PRESIDENTIAL"
  | "LEGISLATIVE"
  | "SENATORIAL"
  | "REPRESENTATIVE"
  | "REFERENDUM"
  | "PRESIDENTIAL_GENERAL"
  | "BY_ELECTION"
  | "LOCAL";

export type ElectionDto = {
  electionId: string;
  electionName: string;
  year: number;
  electionType: ElectionType;
  isActive: boolean;
  ballotSparePercent?: number | null; // 0..100 or null (not configured)
  enforceBallotsGteRegistered?: boolean; // default true

  dateCreated?: string | null;
  dateUpdated?: string | null;
};

export type ElectionCreateRequest = {
  electionName: string;
  year: number;
  electionType: ElectionType;
  isActive: boolean;
  ballotSparePercent?: number | null;
  enforceBallotsGteRegistered?: boolean;
};

export type ElectionUpdateRequest = {
  electionName?: string;
  year: number;
  electionType: ElectionType;
  isActive: boolean;
  ballotSparePercent?: number | null;
  enforceBallotsGteRegistered?: boolean;
};

type PageResp<T> = {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
};

/** ✅ NEW: fetch single election by id (GET /api/elections/{id}) */
export async function fetchElectionById(id: string): Promise<ElectionDto> {
  const { data } = await apiClient.get<ElectionDto>(`/elections/${id}`);
  return data;
}

/** ✅ NEW: list active elections (GET /api/elections?activeOnly=true) */
export async function listActiveElections(): Promise<ElectionDto[]> {
  const { data } = await apiClient.get<ElectionDto[]>("/elections", {
    params: { activeOnly: true },
  });
  return Array.isArray(data) ? data : [];
}

/** Optional: list all elections (GET /api/elections) */
export async function listAllElections(): Promise<ElectionDto[]> {
  const { data } = await apiClient.get<ElectionDto[]>("/elections", {
    params: { activeOnly: false },
  });
  return Array.isArray(data) ? data : [];
}

export async function searchElections(params: {
  page: number;
  size: number;
  q?: string;
  year?: number;
  type?: ElectionType;
  active?: boolean;
}): Promise<{
  items: ElectionDto[];
  totalPages: number;
  totalElements: number;
}> {
  const { data } = await apiClient.get<PageResp<ElectionDto>>(
    "/elections/search",
    {
      params: {
        page: params.page,
        size: params.size,
        q: params.q || undefined,
        year: params.year ?? undefined,
        type: params.type || undefined,
        active: params.active ?? undefined,
      },
    }
  );

  return {
    items: data?.content ?? [],
    totalPages: data?.totalPages ?? 1,
    totalElements: data?.totalElements ?? 0,
  };
}

export async function createElection(
  req: ElectionCreateRequest
): Promise<ElectionDto> {
  const { data } = await apiClient.post<ElectionDto>("/elections", req);
  return data;
}

export async function updateElection(
  id: string,
  req: ElectionUpdateRequest
): Promise<ElectionDto> {
  const { data } = await apiClient.put<ElectionDto>(`/elections/${id}`, req);
  return data;
}

export async function deleteElection(id: string): Promise<void> {
  await apiClient.delete(`/elections/${id}`);
}

export async function setElectionActive(
  id: string,
  active: boolean
): Promise<ElectionDto> {
  const { data } = await apiClient.patch<ElectionDto>(
    `/elections/${id}/active`,
    null,
    { params: { active } }
  );
  return data;
}

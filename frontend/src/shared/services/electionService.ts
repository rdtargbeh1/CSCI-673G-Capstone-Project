// src/shared/services/electionService.ts

import { apiClient } from "../lib/apiClient";

// ============================================================================
// ELECTION TYPE
// ============================================================================

export type ElectionType =
  | "PRESIDENTIAL"
  | "LEGISLATIVE"
  | "SENATORIAL"
  | "REPRESENTATIVE"
  | "REFERENDUM"
  | "PRESIDENTIAL_GENERAL"
  | "BY_ELECTION"
  | "LOCAL";

// ============================================================================
// DTO
// ============================================================================

export type ElectionDto = {
  // Election
  electionId: string;

  electionName: string;

  year: number;

  electionType: ElectionType;

  isActive: boolean;

  // Ballot policy
  ballotSparePercent?: number | null;

  enforceBallotsGteRegistered?: boolean | null;

  // Audit dates
  dateCreated?: string | null;

  dateUpdated?: string | null;

  // Raw audit values
  //
  // Keep these for traceability only.
  // UI should use createdByName / updatedByName.
  createdBy?: string | null;

  updatedBy?: string | null;

  // Human-readable audit names
  createdByName?: string | null;

  updatedByName?: string | null;
};

// ============================================================================
// CREATE REQUEST
// ============================================================================

export type ElectionCreateRequest = {
  electionName: string;

  year: number;

  electionType: ElectionType;

  isActive: boolean;

  ballotSparePercent?: number | null;

  enforceBallotsGteRegistered?: boolean;
};

// ============================================================================
// UPDATE REQUEST
// ============================================================================

export type ElectionUpdateRequest = {
  electionName?: string;

  year: number;

  electionType: ElectionType;

  isActive: boolean;

  ballotSparePercent?: number | null;

  enforceBallotsGteRegistered?: boolean;
};

// ============================================================================
// PAGE RESPONSE
// ============================================================================

type PageResp<T> = {
  content: T[];

  totalElements: number;

  totalPages: number;

  number: number;

  size: number;
};

// ============================================================================
// GET ONE
// ============================================================================

export async function fetchElectionById(id: string): Promise<ElectionDto> {
  const { data } = await apiClient.get<ElectionDto>(`/elections/${id}`);

  return data;
}

// ============================================================================
// LIST ACTIVE
// ============================================================================

export async function listActiveElections(): Promise<ElectionDto[]> {
  const { data } = await apiClient.get<ElectionDto[]>("/elections", {
    params: {
      activeOnly: true,
    },
  });

  return Array.isArray(data) ? data : [];
}

// ============================================================================
// LIST ALL
// ============================================================================

export async function listAllElections(): Promise<ElectionDto[]> {
  const { data } = await apiClient.get<ElectionDto[]>("/elections", {
    params: {
      activeOnly: false,
    },
  });

  return Array.isArray(data) ? data : [];
}

// ============================================================================
// SEARCH
// ============================================================================

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
    },
  );

  return {
    items: data?.content ?? [],

    totalPages: data?.totalPages ?? 1,

    totalElements: data?.totalElements ?? 0,
  };
}

// ============================================================================
// CREATE
// ============================================================================

export async function createElection(
  req: ElectionCreateRequest,
): Promise<ElectionDto> {
  const { data } = await apiClient.post<ElectionDto>("/elections", req);

  return data;
}

// ============================================================================
// UPDATE
// ============================================================================

export async function updateElection(
  id: string,

  req: ElectionUpdateRequest,
): Promise<ElectionDto> {
  const { data } = await apiClient.put<ElectionDto>(`/elections/${id}`, req);

  return data;
}

// ============================================================================
// DELETE
// ============================================================================

export async function deleteElection(id: string): Promise<void> {
  await apiClient.delete(`/elections/${id}`);
}

// ============================================================================
// ACTIVATE / DEACTIVATE
// ============================================================================

export async function setElectionActive(
  id: string,

  active: boolean,
): Promise<ElectionDto> {
  const { data } = await apiClient.patch<ElectionDto>(
    `/elections/${id}/active`,
    null,
    {
      params: {
        active,
      },
    },
  );

  return data;
}

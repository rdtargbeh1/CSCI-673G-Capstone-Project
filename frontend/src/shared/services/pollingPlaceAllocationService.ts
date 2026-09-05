// src/shared/services/pollingPlaceAllocationService.ts

import { apiClient } from "../lib/apiClient";

export type PollingPlaceAllocationDto = {
  // Allocation
  placeAllocationId: string;

  // Election
  electionId: string;
  electionName?: string | null;
  year?: number | null;

  // Polling Place
  placeId: string;
  placeCode?: string | null;
  placeNumber?: number | null;
  placeLabel?: string | null;

  // Polling Center
  centerId?: string | null;
  centerCode?: string | null;
  centerName?: string | null;

  // Allocation Values
  registeredVoters: number;
  ballotsIssued?: number | null;

  // Audit
  dateCreated?: string | null;
  dateUpdated?: string | null;

  createdBy?: string | null;
  createdByName?: string | null;

  updatedBy?: string | null;
  updatedByName?: string | null;

  active?: boolean | null;
  version?: number | null;
};

export type PollingPlaceAllocationCreateRequest = {
  electionId: string;
  placeId: string;

  registeredVoters: number;

  ballotsIssued?: number | null;
};

export type PollingPlaceAllocationUpdateRequest = {
  registeredVoters?: number | null;

  ballotsIssued?: number | null;
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

// ============================================================================
// SEARCH
// ============================================================================

export async function searchPlaceAllocations(params: {
  electionId?: string;

  centerId?: string;

  placeId?: string;

  page?: number;

  size?: number;
}): Promise<PageResult<PollingPlaceAllocationDto>> {
  const res = await apiClient.get("/polling-place-allocations", {
    params: {
      electionId: params.electionId,

      centerId: params.centerId,

      placeId: params.placeId,

      page: params.page ?? 0,

      size: params.size ?? 20,
    },
  });

  return mapSpringPage<PollingPlaceAllocationDto>(res.data);
}

// ============================================================================
// GET ONE
// ============================================================================

export async function getPlaceAllocation(
  id: string,
): Promise<PollingPlaceAllocationDto> {
  const res = await apiClient.get(`/polling-place-allocations/${id}`);

  return res.data as PollingPlaceAllocationDto;
}

// ============================================================================
// CREATE
// ============================================================================

export async function createPlaceAllocation(
  req: PollingPlaceAllocationCreateRequest,
): Promise<PollingPlaceAllocationDto> {
  const res = await apiClient.post("/polling-place-allocations", req);

  return res.data as PollingPlaceAllocationDto;
}

// ============================================================================
// UPDATE
// ============================================================================

export async function updatePlaceAllocation(
  id: string,

  req: PollingPlaceAllocationUpdateRequest,
): Promise<PollingPlaceAllocationDto> {
  const res = await apiClient.put(`/polling-place-allocations/${id}`, req);

  return res.data as PollingPlaceAllocationDto;
}

// ============================================================================
// DELETE
// ============================================================================

export async function deletePlaceAllocation(id: string): Promise<void> {
  await apiClient.delete(`/polling-place-allocations/${id}`);
}

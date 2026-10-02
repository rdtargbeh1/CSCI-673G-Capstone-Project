// src/shared/services/pollingPlaceService.ts

import type { AxiosResponse } from "axios";

import { apiClient } from "../lib/apiClient";

// ============================================================================
// TYPES
// ============================================================================

export type PollingPlaceDto = {
  // Place
  placeId: string;
  placeNumber: number;

  code: string;

  label?: string | null;

  // Center
  centerId: string;

  centerName?: string | null;
  centerCode?: string | null;

  // District
  districtId?: string | null;
  districtName?: string | null;

  // County
  countyId?: string | null;
  countyName?: string | null;

  active: boolean;
};

export type PollingPlaceCreateRequest = {
  centerId: string;

  label?: string;
};

export type PollingPlaceBulkCreateRequest = {
  centerId: string;

  labelPrefix: string;

  quantity: number;
};

export type PollingPlaceUpdateRequest = {
  label?: string | null;

  active?: boolean | null;
};

export type FetchPollingPlacesParams = {
  page: number;
  size: number;

  q?: string;

  countyId?: string;
  districtId?: string;
  centerId?: string;

  active?: boolean;

  /**
   * Required for operational geography access.
   *
   * Administrative geography may omit it.
   */
  electionId?: string;
};

// ============================================================================
// LIST
// ============================================================================

export async function fetchPollingPlaces(
  params: FetchPollingPlacesParams,
): Promise<{
  items: PollingPlaceDto[];
  totalElements: number;
  totalPages: number;
}> {
  const res: AxiosResponse<any> = await apiClient.get("/polling-places", {
    params: {
      page: params.page,

      size: params.size,

      q: params.q || undefined,

      countyId: params.countyId || undefined,

      districtId: params.districtId || undefined,

      centerId: params.centerId || undefined,

      active: params.active ?? undefined,

      electionId: params.electionId || undefined,
    },
  });

  const data = res.data ?? {};

  return {
    items: data.content ?? [],

    totalElements: data.totalElements ?? 0,

    totalPages: data.totalPages ?? 0,
  };
}

// ============================================================================
// CREATE
// ============================================================================

export async function createPollingPlace(
  body: PollingPlaceCreateRequest,
): Promise<PollingPlaceDto> {
  const { data } = await apiClient.post("/polling-places", body);

  return data as PollingPlaceDto;
}

// ============================================================================
// BULK CREATE
// ============================================================================

export async function createPollingPlacesBulk(
  body: PollingPlaceBulkCreateRequest,
): Promise<PollingPlaceDto[]> {
  const { data } = await apiClient.post("/polling-places/bulk", body);

  return Array.isArray(data) ? (data as PollingPlaceDto[]) : [];
}

// ============================================================================
// UPDATE
// ============================================================================

export async function updatePollingPlace(
  id: string,
  body: PollingPlaceUpdateRequest,
): Promise<PollingPlaceDto> {
  const { data } = await apiClient.put(`/polling-places/${id}`, body);

  return data as PollingPlaceDto;
}

// ============================================================================
// ACTIVE STATE
// ============================================================================

export async function setPollingPlaceActive(
  id: string,
  active: boolean,
): Promise<PollingPlaceDto> {
  const { data } = await apiClient.put(`/polling-places/${id}/active`, null, {
    params: {
      active,
    },
  });

  return data as PollingPlaceDto;
}

// ============================================================================
// HARD DELETE
// ============================================================================

export async function deletePollingPlace(id: string): Promise<void> {
  await apiClient.delete(`/polling-places/${id}`);
}

// ============================================================================
// DEACTIVATE
//
// NOTE:
//
// This preserves your existing backend call exactly as currently implemented.
// It is separate from setPollingPlaceActive() because existing callers may
// already rely on this function.
// ============================================================================

export async function deactivatePollingPlace(
  id: string,
): Promise<PollingPlaceDto> {
  const { data } = await apiClient.delete(`/polling-places/${id}`);

  return data as PollingPlaceDto;
}

// src/shared/services/pollingCenterService.ts

import type { AxiosResponse } from "axios";

import { apiClient } from "../lib/apiClient";

// ============================================================================
// TYPES
// ============================================================================

export type PollingCenterDto = {
  centerId: string;

  centerName: string;

  code?: string | null;

  districtId: string;
  districtName?: string | null;

  countyId: string;
  countyName?: string | null;

  latitude?: number | null;
  longitude?: number | null;

  createdAt?: string | null;
};

export type PollingCenterCreateRequest = {
  centerName: string;
  districtId: string;
};

export type PollingCenterUpdateRequest = {
  centerName?: string;
  code?: string;
  districtId?: string;
};

export type FetchPollingCentersParams = {
  page: number;
  size: number;

  q?: string;

  countyId?: string;
  districtId?: string;

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

export async function fetchPollingCenters(
  params: FetchPollingCentersParams,
): Promise<{
  items: PollingCenterDto[];
  totalElements: number;
  totalPages: number;
}> {
  const res: AxiosResponse<any> = await apiClient.get("/polling-centers", {
    params: {
      page: params.page,

      size: params.size,

      q: params.q || undefined,

      countyId: params.countyId || undefined,

      districtId: params.districtId || undefined,

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

export async function createPollingCenter(
  body: PollingCenterCreateRequest,
): Promise<PollingCenterDto> {
  const { data } = await apiClient.post("/polling-centers", body);

  return data as PollingCenterDto;
}

// ============================================================================
// UPDATE
// ============================================================================

export async function updatePollingCenter(
  id: string,
  body: PollingCenterUpdateRequest,
): Promise<PollingCenterDto> {
  const { data } = await apiClient.put(`/polling-centers/${id}`, body);

  return data as PollingCenterDto;
}

// ============================================================================
// DELETE
// ============================================================================

export async function deletePollingCenter(id: string): Promise<void> {
  await apiClient.delete(`/polling-centers/${id}`);
}

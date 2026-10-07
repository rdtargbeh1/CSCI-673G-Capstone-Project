// src/shared/services/districtService.ts

import type { AxiosResponse } from "axios";

import { apiClient } from "../lib/apiClient";

// ============================================================================
// TYPES
// ============================================================================

export type DistrictDto = {
  districtId: string;
  districtName: string;

  countyId: string;
  countyName?: string | null;
};

export type DistrictRequest = {
  districtName: string;
  countyId: string;
};

export type FetchDistrictsParams = {
  page: number;
  size: number;

  q?: string;
  countyId?: string;

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

export async function fetchDistricts(params: FetchDistrictsParams): Promise<{
  items: DistrictDto[];
  totalElements: number;
  totalPages: number;
}> {
  const res: AxiosResponse<any> = await apiClient.get("/districts", {
    params: {
      page: params.page,

      size: params.size,

      q: params.q || undefined,

      countyId: params.countyId || undefined,

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

export async function createDistrict(
  body: DistrictRequest,
): Promise<DistrictDto> {
  const { data } = await apiClient.post("/districts", body);

  return data as DistrictDto;
}

// ============================================================================
// UPDATE
// ============================================================================

export async function updateDistrict(
  districtId: string,
  body: DistrictRequest,
): Promise<DistrictDto> {
  const { data } = await apiClient.put(`/districts/${districtId}`, body);

  return data as DistrictDto;
}

// ============================================================================
// DELETE
// ============================================================================

export async function deleteDistrict(districtId: string): Promise<void> {
  await apiClient.delete(`/districts/${districtId}`);
}

// ============================================================================
// LIST BY COUNTY
// ============================================================================

export async function fetchDistrictsByCounty(
  countyId: string,
  electionId?: string,
): Promise<DistrictDto[]> {
  const { data } = await apiClient.get(`/districts/by-county/${countyId}`, {
    params: {
      electionId: electionId || undefined,
    },
  });

  return (data ?? []) as DistrictDto[];
}

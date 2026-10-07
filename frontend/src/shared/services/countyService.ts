// src/shared/services/countyService.ts

import type { AxiosResponse } from "axios";

import { apiClient } from "../lib/apiClient";

// ============================================================================
// TYPES
// ============================================================================

export type CountyDto = {
  countyId: string;
  countyName: string;
};

export type FetchCountiesParams = {
  page: number;
  size: number;

  q?: string;

  /**
   * Required by the backend when the authenticated user has an
   * operational role.
   *
   * Administrative geography may omit it.
   */
  electionId?: string;
};

// ============================================================================
// LIST
// ============================================================================

export async function fetchCounties(params: FetchCountiesParams): Promise<{
  items: CountyDto[];
  totalElements: number;
  totalPages: number;
}> {
  const res: AxiosResponse<any> = await apiClient.get("/counties", {
    params: {
      page: params.page,

      size: params.size,

      q: params.q || undefined,

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

export async function createCounty(body: {
  countyName: string;
}): Promise<CountyDto> {
  const { data } = await apiClient.post("/counties", body);

  return data as CountyDto;
}

// ============================================================================
// UPDATE
// ============================================================================

export async function updateCounty(
  countyId: string,
  body: {
    countyName: string;
  },
): Promise<CountyDto> {
  const { data } = await apiClient.put(`/counties/${countyId}`, body);

  return data as CountyDto;
}

// ============================================================================
// DELETE
// ============================================================================

export async function deleteCounty(countyId: string): Promise<void> {
  await apiClient.delete(`/counties/${countyId}`);
}

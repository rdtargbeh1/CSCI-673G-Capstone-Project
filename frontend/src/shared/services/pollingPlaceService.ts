// src/shared/services/pollingPlaceService.ts

import { apiClient } from "../lib/apiClient";
import type { AxiosResponse } from "axios";

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

export type PollingPlaceUpdateRequest = {
  label?: string | null; // only updatable field
  active?: boolean | null;
};

export async function fetchPollingPlaces(params: {
  page: number;
  size: number;
  q?: string;
  countyId?: string;
  districtId?: string;
  centerId?: string;
  active?: boolean;
}): Promise<{
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
    },
  });

  const data = res.data ?? {};
  return {
    items: data.content ?? [],
    totalElements: data.totalElements ?? 0,
    totalPages: data.totalPages ?? 0,
  };
}

export async function createPollingPlace(
  body: PollingPlaceCreateRequest
): Promise<PollingPlaceDto> {
  const { data } = await apiClient.post("/polling-places", body);
  return data as PollingPlaceDto;
}

/** ✅ Only label is updatable */
export async function updatePollingPlace(
  id: string,
  body: PollingPlaceUpdateRequest
): Promise<PollingPlaceDto> {
  const { data } = await apiClient.put(`/polling-places/${id}`, body);
  return data as PollingPlaceDto;
}

/**
 * ✅ Toggle active (soft delete / reactivate)
 * PUT /api/polling-places/{id}/active?active=true|false
 */
export async function setPollingPlaceActive(
  id: string,
  active: boolean
): Promise<PollingPlaceDto> {
  const { data } = await apiClient.put(`/polling-places/${id}/active`, null, {
    params: { active },
  });
  return data as PollingPlaceDto;
}

/**
 * Hard delete (permanent)
 * DELETE /api/polling-places/{id}
 */
export async function deletePollingPlace(id: string): Promise<void> {
  await apiClient.delete(`/polling-places/${id}`);
}

/** Soft delete (deactivate) */
export async function deactivatePollingPlace(
  id: string
): Promise<PollingPlaceDto> {
  const { data } = await apiClient.delete(`/polling-places/${id}`);
  return data as PollingPlaceDto;
}

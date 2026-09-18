// src/shared/services/districtService.ts

import { apiClient } from "../lib/apiClient";
import type { AxiosResponse } from "axios";

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

export async function fetchDistricts(params: {
  page: number;
  size: number;
  q?: string;
  countyId?: string;
}): Promise<{
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
    },
  });

  const data = res.data ?? {};
  return {
    items: data.content ?? [],
    totalElements: data.totalElements ?? 0,
    totalPages: data.totalPages ?? 0,
  };
}

export async function createDistrict(
  body: DistrictRequest
): Promise<DistrictDto> {
  const { data } = await apiClient.post("/districts", body);
  return data as DistrictDto;
}

export async function updateDistrict(
  districtId: string,
  body: DistrictRequest
): Promise<DistrictDto> {
  const { data } = await apiClient.put(`/districts/${districtId}`, body);
  return data as DistrictDto;
}

export async function deleteDistrict(districtId: string): Promise<void> {
  await apiClient.delete(`/districts/${districtId}`);
}

/** Optional helper if you need it later */
export async function fetchDistrictsByCounty(
  countyId: string
): Promise<DistrictDto[]> {
  const { data } = await apiClient.get(`/districts/by-county/${countyId}`);
  return (data ?? []) as DistrictDto[];
}

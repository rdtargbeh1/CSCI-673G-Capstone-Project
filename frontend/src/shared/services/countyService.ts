// countyService.ts

import { apiClient } from "../lib/apiClient";
import type { AxiosResponse } from "axios";

export type CountyDto = {
  countyId: string;
  countyName: string;
};

export async function fetchCounties(params: {
  page: number;
  size: number;
  q?: string;
}): Promise<{ items: CountyDto[]; totalElements: number; totalPages: number }> {
  const res: AxiosResponse<any> = await apiClient.get("/counties", {
    params: {
      page: params.page,
      size: params.size,
      q: params.q || undefined,
    },
  });

  const data = res.data ?? {};
  return {
    items: data.content ?? [],
    totalElements: data.totalElements ?? 0,
    totalPages: data.totalPages ?? 0,
  };
}

export async function createCounty(body: {
  countyName: string;
}): Promise<CountyDto> {
  const { data } = await apiClient.post("/counties", body);
  return data as CountyDto;
}

export async function updateCounty(
  countyId: string,
  body: { countyName: string }
): Promise<CountyDto> {
  const { data } = await apiClient.put(`/counties/${countyId}`, body);
  return data as CountyDto;
}

export async function deleteCounty(countyId: string): Promise<void> {
  await apiClient.delete(`/counties/${countyId}`);
}

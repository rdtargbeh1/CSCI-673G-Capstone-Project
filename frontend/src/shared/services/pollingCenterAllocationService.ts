// src/shared/services/pollingCenterAllocationService.ts

import { apiClient } from "../lib/apiClient";

export type PollingCenterAllocationDto = {
  allocationId: string;

  electionId: string;
  electionName?: string | null;
  electionYear?: number | null;

  pollingCenterId?: string | null;
  centerCode?: string | null;
  centerName?: string | null;

  districtId?: string | null;
  districtName?: string | null;

  countyId?: string | null;
  countyName?: string | null;

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
};

export type PollingCenterAllocationCreateRequest = {
  electionId: string;
  centerId: string;
  registeredVoters: number;
  ballotsIssued?: number | null;
};

export type PollingCenterAllocationUpdateRequest = {
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

export async function fetchAllocations(params: {
  electionId?: string;
  countyId?: string;
  districtId?: string;
  centerId?: string;
  page?: number;
  size?: number;
}): Promise<PageResult<PollingCenterAllocationDto>> {
  const res = await apiClient.get("/polling-center-allocations", {
    params: {
      electionId: params.electionId,
      countyId: params.countyId,
      districtId: params.districtId,
      centerId: params.centerId,
      page: params.page ?? 0,
      size: params.size ?? 20,
    },
  });

  return mapSpringPage<PollingCenterAllocationDto>(res.data);
}

export async function getAllocation(
  allocationId: string,
): Promise<PollingCenterAllocationDto> {
  const res = await apiClient.get(
    `/polling-center-allocations/${allocationId}`,
  );

  return res.data as PollingCenterAllocationDto;
}

export async function createAllocation(
  req: PollingCenterAllocationCreateRequest,
): Promise<PollingCenterAllocationDto> {
  const res = await apiClient.post("/polling-center-allocations", req);

  return res.data as PollingCenterAllocationDto;
}

export async function updateAllocation(
  allocationId: string,
  req: PollingCenterAllocationUpdateRequest,
): Promise<PollingCenterAllocationDto> {
  const res = await apiClient.put(
    `/polling-center-allocations/${allocationId}`,
    req,
  );

  return res.data as PollingCenterAllocationDto;
}

export async function deleteAllocation(allocationId: string): Promise<void> {
  await apiClient.delete(`/polling-center-allocations/${allocationId}`);
}

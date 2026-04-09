// src/shared/services/statsService

import { apiClient } from "../lib/apiClient";
import type { PageResponse } from "../../auth/api";

type PageParams = {
  page?: number;
  size?: number;
  sort?: string[]; // "field,asc"
};

function toParams(obj: Record<string, any>) {
  const params: Record<string, any> = {};
  Object.entries(obj).forEach(([k, v]) => {
    if (v === undefined || v === null || v === "") return;
    params[k] = v;
  });
  return params;
}

// OFFICIAL (published by NEC)
export async function fetchOfficialElectionStats(
  electionId: string,
  p: PageParams = {}
) {
  const res = await apiClient.get<PageResponse<any>>(
    "/stats/official/elections",
    {
      params: toParams({
        electionId,
        page: p.page ?? 0,
        size: p.size ?? 20,
        sort: p.sort,
      }),
    }
  );
  return res.data;
}

export async function fetchOfficialCenterStats(
  electionId: string,
  filters: { countyId?: string; districtId?: string; centerId?: string } = {},
  p: PageParams = {}
) {
  const res = await apiClient.get<PageResponse<any>>(
    "/stats/official/centers",
    {
      params: toParams({
        electionId,
        ...filters,
        page: p.page ?? 0,
        size: p.size ?? 20,
        sort: p.sort,
      }),
    }
  );
  return res.data;
}

export async function fetchOfficialDistrictStats(
  electionId: string,
  filters: { countyId?: string; districtId?: string } = {},
  p: PageParams = {}
) {
  const res = await apiClient.get<PageResponse<any>>(
    "/stats/official/districts",
    {
      params: toParams({
        electionId,
        ...filters,
        page: p.page ?? 0,
        size: p.size ?? 20,
        sort: p.sort,
      }),
    }
  );
  return res.data;
}

export async function fetchOfficialCandidateElectionStats(
  electionId: string,
  filters: { candidateId?: string; partyId?: string } = {},
  p: PageParams = {}
) {
  const res = await apiClient.get<PageResponse<any>>(
    "/stats/official/candidates/elections",
    {
      params: toParams({
        electionId,
        ...filters,
        page: p.page ?? 0,
        size: p.size ?? 20,
        sort: p.sort,
      }),
    }
  );
  return res.data;
}

// PARTY (org scoped by X-Org-Id; orgId param optional but validated server-side)
export async function fetchPartyElectionStats(
  electionId: string,
  p: PageParams = {}
) {
  const res = await apiClient.get<PageResponse<any>>("/stats/party/elections", {
    params: toParams({
      electionId,
      page: p.page ?? 0,
      size: p.size ?? 20,
      sort: p.sort,
    }),
  });
  return res.data;
}

export async function fetchPartyCountyStats(
  electionId: string,
  filters: { countyId?: string } = {},
  p: PageParams = {}
) {
  const res = await apiClient.get<PageResponse<any>>("/stats/party/counties", {
    params: toParams({
      electionId,
      ...filters,
      page: p.page ?? 0,
      size: p.size ?? 20,
      sort: p.sort,
    }),
  });
  return res.data;
}

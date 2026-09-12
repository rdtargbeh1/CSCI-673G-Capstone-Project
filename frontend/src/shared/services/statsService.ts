
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

/**
 * ============================================================================
 * MODE: SYSTEM DASHBOARD
 * ============================================================================
 * Platform-wide observability: orgs, elections, security, audit signals.
 * No election scope. No org scope. Global views only.
 */

export async function fetchSystemOrgCount() {
  const res = await apiClient.get<PageResponse<any>>("/orgs", {
    params: toParams({ page: 0, size: 1 }),
  });
  return res.data?.totalElements ?? 0;
}

export async function fetchSystemElectionsCount() {
  const res = await apiClient.get<PageResponse<any>>("/elections", {
    params: toParams({ page: 0, size: 1 }),
  });
  return res.data?.totalElements ?? 0;
}

export async function fetchSystemElectionsPreview() {
  const res = await apiClient.get<PageResponse<any>>("/elections", {
    params: toParams({
      page: 0,
      size: 5,
      sort: ["dateCreated,desc"],
    }),
  });
  return res.data;
}

/**
 * ============================================================================
 * MODE: NEC DASHBOARD
 * ============================================================================
 * Official results monitoring (published by NEC).
 * NEC is a special tenant, but dashboard shows global official data.
 * Election scoped. Read-only published results.
 */

export async function fetchNecOfficialElectionStats(
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

export async function fetchNecOfficialCenterStats(
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

export async function fetchNecOfficialDistrictStats(
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

export async function fetchNecOfficialCandidateStats(
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

/**
 * ✅ Check if NEC has published official results (NECResult.isPublished = true)
 * Used for conditional UI rendering in TENANT & NEC dashboards
 */
export async function fetchNecPublishStatus(electionId: string) {
  const data = await fetchNecOfficialElectionStats(electionId, {
    page: 0,
    size: 1,
  });
  const row = data?.content?.[0] ?? null;

  // Try multiple possible field names from backend
  const isPublished =
    !!row?.isPublished ||
    !!row?.published ||
    !!row?.officialPublished ||
    !!row?.officialReady;

  const publishedDate = row?.publishedDate || row?.publicationDate;

  return {
    isPublished,
    publishedDate,
  };
}

/**
 * ============================================================================
 * MODE: TENANT DASHBOARD
 * ============================================================================
 * Organization-scoped party results (local, unverified).
 * 3 sub-modes: HOME, LOCAL RESULTS, OFFICIAL RESULTS
 * - HOME: Summary of org stats + guidance
 * - LOCAL RESULTS: Party-side aggregates (unverified)
 * - OFFICIAL RESULTS: NEC-published results (read-only, conditional visibility)
 */

/**
 * TENANT MODE - HOME TAB
 * Org's party-side aggregates from submissions
 */
export async function fetchTenantElectionStats(
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

export async function fetchTenantCountyStats(
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

/**
 * TENANT MODE - LOCAL RESULTS TAB
 * Detailed party vote breakdown by position/candidate (unverified)
 */
export async function fetchTenantVoteBreakdown(
  electionId: string,
  orgId: string,
  p: PageParams = {}
) {
  const res = await apiClient.get<PageResponse<any>>(
    "/stats/party/vote-breakdown",
    {
      params: toParams({
        electionId,
        orgId,
        page: p.page ?? 0,
        size: p.size ?? 20,
        sort: p.sort,
      }),
    }
  );
  return res.data;
}

/**
 * TENANT MODE - OFFICIAL RESULTS TAB (conditional visibility)
 * Read-only official results from NEC (same as NEC dashboard views)
 * Hidden until fetchNecPublishStatus.isPublished = true
 */
export async function fetchTenantOfficialResults(electionId: string) {
  return fetchNecOfficialElectionStats(electionId, { page: 0, size: 1 });
}

export async function fetchTenantOfficialCenterStats(
  electionId: string,
  filters: { countyId?: string; districtId?: string; centerId?: string } = {},
  p: PageParams = {}
) {
  return fetchNecOfficialCenterStats(electionId, filters, p);
}

/**
 * ✅ Check if TENANT can view official results tab
 * Same as fetchNecPublishStatus - NEC controls publication
 */
export async function fetchTenantOfficialPublishStatus(electionId: string) {
  return fetchNecPublishStatus(electionId);
}


// src/shared/services/overviewService.ts

import { apiClient, sysClient } from "../lib/apiClient";
import type { DashboardMode } from "../store/authStore";

export type OverviewDto = {
  readiness: {
    qualifiedParties: number;
    candidatesAssigned: number;
    activeContests: number;
    contestsMissingOptions: number;
    centerAllocations: number;
    placeAllocations: number;
    submissionsEnabled: boolean;
    stagingImported: number;
    stagingUnvalidated: number;
    officialPublished: number;
  };
  orgQueues: {
    byStatus: Record<string, number>;
    missingTallySheets: number;
  };
  integrity: {
    openDiscrepancies: number;
    anomaliesTotal: number;
  };
  activity: {
    lastSubmissionTime: string | null;
    submittedLast24h: number;
    verifiedLast24h: number;
    distinctCentersWithSubmissions: number;
    distinctPlacesWithSubmissions: number;
  };
};

export async function fetchElectionOverview(
  electionId: string,
  mode: DashboardMode,
  orgId?: string
) {
  const isTenantMode = mode === "TENANT" || mode === "NEC";

  // ✅ SYSTEM → sysClient
  // ✅ NEC + TENANT → apiClient (tenant-aware, adds X-Org-Id)
  const client = isTenantMode ? apiClient : sysClient;

  // ✅ send orgId as request param for tenant modes
  const params: Record<string, string> = { mode };

  if (isTenantMode) {
    if (!orgId) {
      // Fail fast instead of backend 500
      throw new Error(`orgId is required for ${mode} election overview`);
    }
    params.orgId = orgId;
  }

  const res = await client.get<OverviewDto>(
    `/workspace/elections/${electionId}/overview`,
    { params }
  );

  return res.data;
}



// import { apiClient, sysClient } from "../lib/apiClient";
// import type { DashboardMode } from "../store/authStore";

// export type OverviewDto = {
//   readiness: {
//     qualifiedParties: number;
//     candidatesAssigned: number;
//     activeContests: number;
//     contestsMissingOptions: number;
//     centerAllocations: number;
//     placeAllocations: number;
//     submissionsEnabled: boolean;
//     stagingImported: number;
//     stagingUnvalidated: number;
//     officialPublished: number;
//   };
//   orgQueues: {
//     byStatus: Record<string, number>;
//     missingTallySheets: number;
//   };
//   integrity: {
//     openDiscrepancies: number;
//     anomaliesTotal: number;
//   };
//   activity: {
//     lastSubmissionTime: string | null;
//     submittedLast24h: number;
//     verifiedLast24h: number;
//     distinctCentersWithSubmissions: number;
//     distinctPlacesWithSubmissions: number;
//   };
// };

// export async function fetchElectionOverview(
//   electionId: string,
//   mode: DashboardMode
// ) {
//   const client = mode === "SYSTEM" || mode === "NEC" ? sysClient : apiClient;

//   const res = await client.get<OverviewDto>(
//     `/workspace/elections/${electionId}/overview`,
//     { params: { mode } }
//   );

//   return res.data;
// }

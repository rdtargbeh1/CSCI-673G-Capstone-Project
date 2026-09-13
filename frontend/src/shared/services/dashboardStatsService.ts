// src/shared/services/dashboardStatsService.ts
import { apiClient } from "../lib/apiClient";
import type { PageResponse, UUID } from "../../auth/api";

export type DashboardMode = "SYSTEM" | "NEC" | "TENANT";

/**
 * NOTE:
 * We intentionally keep DTOs permissive because your backend DTO field names
 * may vary slightly between Official vs Party view DTOs.
 * We normalize in UI helpers.
 */
export type AnyRow = Record<string, any>;

export async function fetchElectionStats(
  mode: DashboardMode,
  electionId: UUID
): Promise<PageResponse<AnyRow>> {
  const url =
    mode === "TENANT" ? "/stats/party/elections" : "/stats/official/elections";

  const res = await apiClient.get<PageResponse<AnyRow>>(url, {
    params: { electionId, page: 0, size: 20 },
  });
  return res.data;
}

export async function fetchCountyStats(
  mode: DashboardMode,
  electionId: UUID,
  countyId?: UUID
): Promise<PageResponse<AnyRow>> {
  const url =
    mode === "TENANT" ? "/stats/party/counties" : "/stats/official/counties";

  const res = await apiClient.get<PageResponse<AnyRow>>(url, {
    params: { electionId, countyId, page: 0, size: 50 },
  });
  return res.data;
}

export async function fetchDistrictStats(
  mode: DashboardMode,
  electionId: UUID,
  countyId?: UUID,
  districtId?: UUID
): Promise<PageResponse<AnyRow>> {
  const url =
    mode === "TENANT" ? "/stats/party/districts" : "/stats/official/districts";

  const res = await apiClient.get<PageResponse<AnyRow>>(url, {
    params: { electionId, countyId, districtId, page: 0, size: 50 },
  });
  return res.data;
}

export async function fetchCenterStats(
  mode: DashboardMode,
  electionId: UUID,
  countyId?: UUID,
  districtId?: UUID,
  centerId?: UUID
): Promise<PageResponse<AnyRow>> {
  const url =
    mode === "TENANT" ? "/stats/party/centers" : "/stats/official/centers";

  const res = await apiClient.get<PageResponse<AnyRow>>(url, {
    params: { electionId, countyId, districtId, centerId, page: 0, size: 50 },
  });
  return res.data;
}

export async function fetchCandidateElectionStats(
  mode: DashboardMode,
  electionId: UUID
): Promise<PageResponse<AnyRow>> {
  // Candidate-election stats endpoints
  const url =
    mode === "TENANT"
      ? "/stats/party/candidates/elections"
      : "/stats/official/candidates/elections";

  const res = await apiClient.get<PageResponse<AnyRow>>(url, {
    params: { electionId, page: 0, size: 50 },
  });
  return res.data;
}

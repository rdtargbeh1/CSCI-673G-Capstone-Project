
// src/shared/services/integrityService.ts

import { apiClient } from "../lib/apiClient";

/** ========= Discrepancies ========= */
export type DiscrepancyStatus = "OPEN" | "INVESTIGATING" | "RESOLVED";

export type DiscrepancyDto = {
  discId: string;
  electionId: string;
  centerId: string;
  centerCode: string;
  centerName: string;
  districtId: string;
  districtName: string;
  countyId: string;
  countyName: string;

  orgId?: string | null;
  partyValid?: number | null;
  officialValid?: number | null;
  partyInvalid?: number | null;
  officialInvalid?: number | null;
  deltaValid?: number | null;
  deltaInvalid?: number | null;

  status: DiscrepancyStatus;
  notedAt?: string | null;
};

export type DiscrepancySearchParams = {
  electionId?: string;
  countyId?: string;
  districtId?: string;
  centerId?: string;
  status?: DiscrepancyStatus;
  page?: number;
  size?: number;
};

export async function searchDiscrepancies(params: DiscrepancySearchParams) {
  const { data } = await apiClient.get("/discrepancies", { params });
  return data as {
    items?: DiscrepancyDto[];
    content?: DiscrepancyDto[];
    totalElements?: number;
    totalPages?: number;
    number?: number;
    size?: number;
  };
}

export async function reconcileDiscrepancies(args: {
  orgId: string;
  electionId: string;
}) {
  const { data } = await apiClient.post("/discrepancies/reconcile", null, {
    params: { orgId: args.orgId, electionId: args.electionId },
  });
  return data as DiscrepancyDto[];
}

export async function patchDiscrepancyStatus(args: {
  discId: string;
  status: DiscrepancyStatus;
}) {
  const { data } = await apiClient.patch(`/discrepancies/${args.discId}/status`, {
    status: args.status,
  });
  return data as DiscrepancyDto;
}

/** ========= Anomaly Events ========= */
export type AnomalyKind =
  | "VOTES_EXCEED_BALLOTS_ISSUED"
  | "VOTES_EXCEED_ALLOCATION"
  | "LATE_REPORTING_CENTER"
  | "OTHER";

export type AnomalyEventDto = {
  anomalyId: string;
  orgId: string;
  electionId: string;
  centerId?: string | null;
  kind: AnomalyKind;
  details: Record<string, any>;
  dateCreated?: string | null;
};

export type AnomalySearchParams = {
  orgId?: string;
  electionId?: string;
  centerId?: string;
  kind?: AnomalyKind;
  from?: string; // ISO date-time
  to?: string;   // ISO date-time
  q?: string;
  page?: number;
  size?: number;
};

export async function searchAnomalies(params: AnomalySearchParams) {
  const { data } = await apiClient.get("/v1/anomalies", { params });
  return data as {
    items?: AnomalyEventDto[];
    content?: AnomalyEventDto[];
    totalElements?: number;
    totalPages?: number;
    number?: number;
    size?: number;
  };
}
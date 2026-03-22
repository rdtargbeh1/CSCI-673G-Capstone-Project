
// ✅ FILE: src/shared/services/observerReportService.ts

// ✅ FILE: src/shared/services/observerReportService.ts

import { apiClient } from "../lib/apiClient";

export type ReportType =
  | "VIOLENCE"
  | "INTIMIDATION"
  | "EQUIPMENT_ISSUE"
  | "LATE_OPENING"
  | "QUEUE_ISSUE"
  | "OTHER";

export type ObserverReportVisibility =
  | "PRIVATE"
  | "SHARED"
  | "PUBLIC";

// ✅ UPDATED: New verification statuses (Model 2)
export type ObserverReportVerificationStatus =
  | "PENDING"
  | "INTERNAL_VERIFIED"
  | "UNDER_INVESTIGATION"
  | "NEC_VERIFIED"
  | "REJECTED";


// ✅ COMPLETE DTO WITH ALL MODEL 2 FIELDS
export type ObserverReportDto = {
  reportId: string;
  orgId: string;
  orgName?: string;
  organizationName?: string;

  observerId: string;
  observerName?: string;
  observerFirstName?: string;
  observerLastName?: string;

  countyId?: string | null;
  countyName?: string | null;

  districtId?: string | null;
  districtName?: string | null;

  centerId?: string | null;
  centerCode?: string | null;
  centerName?: string | null;

  type: ReportType;
  description: string;

  mediaUrl?: string | null;

  latitude?: number | null;
  longitude?: number | null;

  timestamp?: string | null;


  // ✅ VERIFICATION FIELDS
  verificationStatus: ObserverReportVerificationStatus;
  visibility: ObserverReportVisibility;
  verifiedBy?: string | null;
  verifiedAt?: string | null;
  verificationNote?: string | null;

  // ✅ NEW MODEL 2 FIELDS
  isCritical: boolean;
  isResolved: boolean;

  // ✅ RESOLUTION FIELDS
  resolvedAt?: string | null;
  resolvedBy?: string | null;
  resolvedNote?: string | null;

  // Timestamps
  createdAt?: string | null;
  updatedAt?: string | null;

  [key: string]: any;
};

export type ObserverReportCreateRequest = {
  orgId: string;
  observerId: string;
  countyId?: string;
  districtId?: string;
  centerId?: string;
  type: string;
  description: string;
  mediaUrl?: string;
  latitude?: number;
  longitude?: number;
  timestamp?: string;
};

export type ObserverReportUpdateRequest = {
  countyId?: string | null;
  districtId?: string | null;
  centerId?: string | null;
  type?: string | null;
  description?: string | null;
  mediaUrl?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  timestamp?: string | null;
};


// ✅ UPDATED: For tenant verification (INTERNAL_VERIFIED or UNDER_INVESTIGATION)
export interface ObserverReportVerificationRequest {
  status: "INTERNAL_VERIFIED" | "UNDER_INVESTIGATION" | "NEC_VERIFIED" | "REJECTED";
  visibility?: "PRIVATE" | "SHARED" | "PUBLIC";
  note?: string;
  isCritical?: boolean;
}




// ✅ UPDATED: For resolving reports
export type ObserverReportResolveRequest = {
  note: string;
};



export type Paged<T> = {
  items: T[];
  page: number;
  size: number;
  totalPages: number;
  totalItems: number;
};

// ✅ Helper to convert FormData
function toFormData(data: any, files: File[]) {
  const fd = new FormData();
  fd.append(
    "data",
    new Blob([JSON.stringify(data)], { type: "application/json" })
  );
  for (const f of files || []) fd.append("files", f);
  return fd;
}

// ============================================================
// ✅ SEARCH ENDPOINTS
// ============================================================

/**
 * ✅ TENANT SEARCH - See own + shared/public reports
 * Tenant can see:
 * - Own organization's ALL reports (any status/visibility)
 * - Other tenants' NEC_VERIFIED + SHARED reports
 * - Any tenant's NEC_VERIFIED + PUBLIC reports
 */
export async function searchObserverReports(params: {
  orgId?: string;
  page: number;
  size: number;
  observerId?: string;
  countyId?: string;
  centerId?: string;
  q?: string;
  type?: string;
  isCritical?: boolean;
  resolved?: boolean;
  verificationStatus?: string;
  visibility?: string;
  from?: string;
  to?: string;
}): Promise<Paged<ObserverReportDto>> {
  const res = await apiClient.get(`/observer-reports`, {
    params: {
      orgId: params.orgId || undefined,
      page: params.page,
      size: params.size,
      observerId: params.observerId,
      countyId: params.countyId,
      centerId: params.centerId,
      q: params.q,
      type: params.type,
      isCritical: params.isCritical,
      resolved: params.resolved,
      verificationStatus: params.verificationStatus,
      visibility: params.visibility,
      from: params.from,
      to: params.to,
    },
  });

  if (res.data?.content) {
    const d = res.data;
    return {
      items: d.content,
      page: d.number,
      size: d.size,
      totalPages: d.totalPages,
      totalItems: d.totalElements,
    } as Paged<ObserverReportDto>;
  }

  return res.data as Paged<ObserverReportDto>;
}

/**
 * ✅ NEC DASHBOARD SEARCH - See ALL reports
 * NEC can see:
 * - ALL statuses (PENDING, INTERNAL_VERIFIED, UNDER_INVESTIGATION, NEC_VERIFIED, REJECTED)
 * - ALL visibilities (PRIVATE, SHARED, PUBLIC)
 * - Reports from ALL tenants
 */
export async function searchObserverReportsNec(params: {
  page: number;
  size: number;
  observerId?: string;
  countyId?: string;
  centerId?: string;
  q?: string;
  type?: string;
  isCritical?: boolean;
  resolved?: boolean;
  verificationStatus?: string;
  visibility?: string;
  from?: string;
  to?: string;
}): Promise<Paged<ObserverReportDto>> {
  const res = await apiClient.get(`/observer-reports/nec/dashboard`, {
    params: {
      page: params.page,
      size: params.size,
      observerId: params.observerId,
      countyId: params.countyId,
      centerId: params.centerId,
      q: params.q,
      type: params.type,
      isCritical: params.isCritical,
      resolved: params.resolved,
      verificationStatus: params.verificationStatus,
      visibility: params.visibility,
      from: params.from,
      to: params.to,
    },
  });

  if (res.data?.content) {
    const d = res.data;
    return {
      items: d.content,
      page: d.number,
      size: d.size,
      totalPages: d.totalPages,
      totalItems: d.totalElements,
    } as Paged<ObserverReportDto>;
  }

  return res.data as Paged<ObserverReportDto>;
}

// ============================================================
// ✅ CRUD ENDPOINTS
// ============================================================

export async function getObserverReport(id: string): Promise<ObserverReportDto> {
  const res = await apiClient.get(`/observer-reports/${id}`);
  return res.data as ObserverReportDto;
}

export async function createObserverReport(
  req: ObserverReportCreateRequest,
  files: File[]
): Promise<ObserverReportDto> {
  const fd = toFormData(req, files);
  const res = await apiClient.post(`/observer-reports`, fd, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data as ObserverReportDto;
}

export async function updateObserverReport(
  reportId: string,
  req: ObserverReportUpdateRequest,
  filesToAppend: File[]
): Promise<ObserverReportDto> {
  const fd = toFormData(req, filesToAppend);
  const res = await apiClient.put(`/observer-reports/${reportId}`, fd, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data as ObserverReportDto;
}

export async function deleteObserverReport(reportId: string): Promise<void> {
  await apiClient.delete(`/observer-reports/${reportId}`);
}

// ============================================================
// ✅ VERIFICATION ENDPOINT
// ============================================================

/**
 * ✅ VERIFY REPORT - Tenant or NEC verification
 * 
 * TENANT can:
 * - PENDING → INTERNAL_VERIFIED (minor, internal only)
 * - PENDING → UNDER_INVESTIGATION (critical, escalate to NEC)
 * - UNDER_INVESTIGATION → PENDING (withdraw)
 * - REJECTED → UNDER_INVESTIGATION (re-escalate)
 * 
 * NEC can:
 * - UNDER_INVESTIGATION → NEC_VERIFIED (approved)
 * - UNDER_INVESTIGATION → REJECTED (not substantiated)
 */
export async function verifyObserverReport(
  reportId: string,
  req: ObserverReportVerificationRequest
): Promise<ObserverReportDto> {
  const res = await apiClient.put(
    `/observer-reports/${reportId}/verify`,
    req
  );
  return res.data as ObserverReportDto;
}

// ============================================================
// ✅ RESOLUTION ENDPOINT
// ============================================================

/**
 * ✅ RESOLVE REPORT - Mark case as closed
 * 
 * Can only resolve if status is:
 * - INTERNAL_VERIFIED (tenant resolved internally)
 * - NEC_VERIFIED (NEC verified)
 * 
 * Sets isResolved = true, closes the case
 */
export async function resolveObserverReport(
  reportId: string,
  req: ObserverReportResolveRequest
): Promise<ObserverReportDto> {
  const res = await apiClient.put(
    `/observer-reports/${reportId}/resolve`,
    req
  );
  return res.data as ObserverReportDto;
}

// ============================================================
// ✅ HELPER CONSTANTS
// ============================================================

export const VERIFICATION_STATUS_LABELS: Record<ObserverReportVerificationStatus, string> = {
  PENDING: "Pending Review",
  INTERNAL_VERIFIED: "Verified Internally",
  UNDER_INVESTIGATION: "Under Investigation",
  NEC_VERIFIED: "NEC Verified",
  REJECTED: "Rejected",
};

export const VERIFICATION_STATUS_COLORS: Record<ObserverReportVerificationStatus, string> = {
  PENDING: "yellow",
  INTERNAL_VERIFIED: "green",
  UNDER_INVESTIGATION: "blue",
  NEC_VERIFIED: "green",
  REJECTED: "red",
};

export const VISIBILITY_LABELS: Record<ObserverReportVisibility, string> = {
  PRIVATE: "Private (Tenant Only)",
  SHARED: "Shared (Tenant + NEC)",
  PUBLIC: "Public (Everyone)",
};

export const VISIBILITY_COLORS: Record<ObserverReportVisibility, string> = {
  PRIVATE: "gray",
  SHARED: "orange",
  PUBLIC: "purple",
};

export const REPORT_TYPE_LABELS: Record<ReportType, string> = {
  VIOLENCE: "Violence",
  INTIMIDATION: "Intimidation",
  EQUIPMENT_ISSUE: "Equipment Issue",
  LATE_OPENING: "Late Opening",
  QUEUE_ISSUE: "Queue Issue",
  OTHER: "Other",
};

export const REPORT_TYPE_COLORS: Record<ReportType, string> = {
  VIOLENCE: "red",
  INTIMIDATION: "orange",
  EQUIPMENT_ISSUE: "yellow",
  LATE_OPENING: "blue",
  QUEUE_ISSUE: "purple",
  OTHER: "gray",
};


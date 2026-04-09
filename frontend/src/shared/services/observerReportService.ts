// ✅ FILE: src/shared/services/observerReportService.ts

import { apiClient } from "../lib/apiClient";

export type ReportType =
  | "VIOLENCE"
  | "INTIMIDATION"
  | "EQUIPMENT_ISSUE"
  | "LATE_OPENING"
  | "QUEUE_ISSUE"
  | "OTHER";

export type ObserverReportDto = {
  reportId: string;
  orgId: string;
  orgName?: string;

  observerId: string;
  observerName?: string;

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
  resolved?: boolean | null;
};

export type ObserverReportCreateRequest = {
  orgId: string;
  observerId: string;
  countyId?: string;
  districtId?: string;
  centerId?: string;
  type: string; // backend expects enum name string
  description: string;
  mediaUrl?: string;
  latitude?: number;
  longitude?: number;
  timestamp?: string; // ISO string
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
  resolved?: boolean | null;
};

export type Paged<T> = {
  items: T[];
  page: number;
  size: number;
  totalPages: number;
  totalItems: number;
};

function toFormData(data: any, files: File[]) {
  const fd = new FormData();
  fd.append(
    "data",
    new Blob([JSON.stringify(data)], { type: "application/json" })
  );
  for (const f of files || []) fd.append("files", f);
  return fd;
}

export async function searchObserverReports(params: {
  orgId: string;
  page: number;
  size: number;
  q?: string;
  type?: string;
  resolved?: boolean;
}) {
  const res = await apiClient.get(`/observer-reports`, {
    params: {
      orgId: params.orgId,
      page: params.page,
      size: params.size,
      q: params.q,
      type: params.type,
      resolved: params.resolved,
    },
  });

  // If backend returns Spring Page, adapt it:
  // content -> items
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

export async function getObserverReport(id: string) {
  const res = await apiClient.get(`/observer-reports/${id}`);
  return res.data as ObserverReportDto;
}

export async function createObserverReport(
  req: ObserverReportCreateRequest,
  files: File[]
) {
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
) {
  const fd = toFormData(req, filesToAppend);
  const res = await apiClient.put(`/observer-reports/${reportId}`, fd, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data as ObserverReportDto;
}

export async function deleteObserverReport(reportId: string) {
  await apiClient.delete(`/observer-reports/${reportId}`);
}

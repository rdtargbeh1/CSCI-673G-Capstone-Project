// src/shared/services/systemDashboardService.ts
import { http } from "../../api/http";
import type { PageResponse } from "../../auth/api";

// SYSTEM dashboard endpoints must NOT require org context
const SYS = { orgMode: "none" as const };

export async function fetchSystemSummary() {
  return http.get<any>("/dashboard/system/summary", SYS);
}

export async function fetchSystemTenantHealth(params: {
  page?: number;
  q?: string;
}) {
  const page = params.page ?? 0;
  const q = params.q ? `&q=${encodeURIComponent(params.q)}` : "";
  return http.get<PageResponse<any>>(
    `/dashboard/system/tenant-health?page=${page}${q}`,
    SYS
  );
}

export async function fetchSystemSecurity() {
  return http.get<any>("/dashboard/system/security", SYS);
}

export async function fetchSystemActivity(limit = 50) {
  return http.get<any>(`/dashboard/system/activity?limit=${limit}`, SYS);
}

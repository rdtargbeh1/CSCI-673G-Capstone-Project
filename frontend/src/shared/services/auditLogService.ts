

// src/shared/services/auditLogService.ts
//
// Audit Logs API
// - TENANT/NEC: GET /api/admin/audit   (requires X-Org-Id header)
// - SYSTEM:     GET /api/admin/audit/system (global logs; NO X-Org-Id)

import { apiClient, sysClient } from "../lib/apiClient";
import { useAuthStore } from "../store/authStore";

export type ActivityType = string;

export type AuditLogDto = {
  logId: string;

  orgId?: string | null;
  orgName?: string | null;

  userId?: string | null;
  userName?: string | null;

  activityType?: ActivityType | null;
  entityAffected?: string | null;
  actionDescription?: string | null;

  dateCreated?: string | null;
  metadata?: string | null;
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

/* ---------------- ctx helpers ---------------- */

function getCtx() {
  const s = useAuthStore.getState();
  return {
    mode: s.dashboardMode,
    storeOrgId: s.currentOrgId ?? null,
  };
}

function tenantHeaders(requiredOrgId?: string | null) {
  const { mode, storeOrgId } = getCtx();

  // SYSTEM must never send tenant header
  if (mode === "SYSTEM") return undefined;

  const orgId = requiredOrgId ?? storeOrgId;
  return orgId ? { "X-Org-Id": orgId } : undefined;
}

/* ---------------- TENANT/NEC ---------------- */

export async function searchAuditLogs(params: {
  orgId?: string; // REQUIRED for TENANT/NEC
  userId?: string;
  type?: ActivityType;
  from?: string; // ISO string
  to?: string; // ISO string
  q?: string;
  page?: number;
  size?: number;
}): Promise<PageResult<AuditLogDto>> {
  const { mode, storeOrgId } = getCtx();

  if (mode === "SYSTEM") {
    throw new Error("Use searchSystemAuditLogs() in SYSTEM mode.");
  }

  const effectiveOrgId = params.orgId ?? storeOrgId ?? undefined;
  if (!effectiveOrgId) throw new Error("orgId is required for tenant audit logs");

  const res = await apiClient.get("/admin/audit", {
    headers: tenantHeaders(effectiveOrgId),
    params: {
      page: params.page ?? 0,
      size: params.size ?? 25,
      orgId: effectiveOrgId,

      userId: params.userId || undefined,
      type: params.type || undefined,
      from: params.from || undefined,
      to: params.to || undefined,
      q: params.q || undefined,
    },
  });

  return mapSpringPage<AuditLogDto>(res.data);
}

/* ---------------- SYSTEM (GLOBAL) ---------------- */

export async function searchSystemAuditLogs(params: {
  userId?: string;
  type?: ActivityType;
  from?: string; // ISO string
  to?: string; // ISO string
  q?: string;
  page?: number;
  size?: number;
}): Promise<PageResult<AuditLogDto>> {
  const { mode } = getCtx();
  if (mode !== "SYSTEM") {
    throw new Error("searchSystemAuditLogs() is SYSTEM-only.");
  }

  const res = await sysClient.get("/admin/audit/system", {
    // ✅ never send X-Org-Id
    params: {
      page: params.page ?? 0,
      size: params.size ?? 25,
      userId: params.userId || undefined,
      type: params.type || undefined,
      from: params.from || undefined,
      to: params.to || undefined,
      q: params.q || undefined,
    },
  });

  return mapSpringPage<AuditLogDto>(res.data);
}



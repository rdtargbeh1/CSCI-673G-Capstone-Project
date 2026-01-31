

// src/pages/oversight/AuditLogsPage.tsx
/**
 * OVERSIGHT: AUDIT LOGS (REAL DATA)
 *
 * - TENANT/NEC: tenant-scoped logs
 *    GET /api/admin/audit (requires X-Org-Id)
 *
 * - SYSTEM: global logs (org_id is NULL)
 *    GET /api/admin/audit/system (NO X-Org-Id)
 *
 * UI:
 * - Show Organization name only (never orgId)
 * - TENANT/NEC: resolves actor full name via /user/{userId} (tenant-safe)
 * - SYSTEM: uses DTO.userName if backend provides it (no tenant lookup here)
 */

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { keepPreviousData } from "@tanstack/react-query";
import { RefreshCw, X } from "lucide-react";

import { AdminShell, Badge, Card, Note, Table } from "../shared/admin-ui";
import { useAuthStore } from "../../../shared/store/authStore";

import {
  searchAuditLogs,
  searchSystemAuditLogs,
  type AuditLogDto,
  type ActivityType,
} from "../../../shared/services/auditLogService";

import { fetchUserById } from "../../../shared/services/userService";
import type { UserDto } from "../../../auth/userTypes";

import {
  fetchOrganizationById,
  type Organization,
} from "../../../shared/services/organizationService";

function safeStr(v: any) {
  return typeof v === "string" ? v : v == null ? "" : String(v);
}
function friendlyError(err: any): string {
  return (
    safeStr(err?.response?.data?.message) ||
    safeStr(err?.response?.data?.error) ||
    safeStr(err?.message) ||
    "Request failed."
  );
}
function safeDate(dt?: string | null) {
  if (!dt) return "—";
  const d = new Date(dt);
  return Number.isNaN(d.getTime()) ? dt : d.toLocaleString();
}
function trunc(s?: string | null, n = 70) {
  const t = String(s ?? "").trim();
  if (!t) return "—";
  return t.length > n ? t.slice(0, n) + "…" : t;
}
function fullName(u?: Partial<UserDto> | null) {
  const fn = String((u as any)?.firstName ?? "").trim();
  const ln = String((u as any)?.lastName ?? "").trim();
  const nm = `${fn} ${ln}`.trim();
  return nm || String((u as any)?.userName ?? "").trim();
}

export default function AuditLogsPage() {
  const mode = useAuthStore((s) => s.dashboardMode);
  const currentOrgId = useAuthStore((s) => s.currentOrgId);

  // Filters
  const [q, setQ] = useState("");
  const [type, setType] = useState<ActivityType>("");
  const [userId, setUserId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  // Pagination
  const [page, setPage] = useState(0);
  const size = 25;

  // ✅ Tenant scope enforcement
  const effectiveOrgId = mode === "SYSTEM" ? undefined : currentOrgId ?? undefined;

  useEffect(() => {
    setPage(0);
  }, [q, type, userId, from, to, effectiveOrgId, mode]);

  const enabled = mode === "SYSTEM" ? true : Boolean(effectiveOrgId);

  const logsQ = useQuery({
    enabled,
    queryKey: ["audit-logs", mode, effectiveOrgId, page, size, q, type, userId, from, to],
    queryFn: async () => {
      const toIso = (v: string) => (v ? new Date(v).toISOString() : undefined);

      // ✅ SYSTEM uses global endpoint
      if (mode === "SYSTEM") {
        return searchSystemAuditLogs({
          page,
          size,
          q: q.trim() || undefined,
          type: type || undefined,
          userId: userId.trim() || undefined,
          from: toIso(from),
          to: toIso(to),
        });
      }

      // ✅ TENANT/NEC uses tenant endpoint (requires orgId)
      return searchAuditLogs({
        orgId: effectiveOrgId,
        page,
        size,
        q: q.trim() || undefined,
        type: type || undefined,
        userId: userId.trim() || undefined,
        from: toIso(from),
        to: toIso(to),
      });
    },
    placeholderData: keepPreviousData,
    staleTime: 5_000,
    retry: 1,
  });

  const items: AuditLogDto[] = (logsQ.data?.items ?? []) as any;

  /**
   * ✅ Actor name resolution
   * - TENANT/NEC: lookup /user/{id} with X-Org-Id
   * - SYSTEM: do NOT call tenant user endpoint; use DTO.userName (backend should populate)
   */
  const actorIds = useMemo(() => {
    if (mode === "SYSTEM") return [];
    const set = new Set<string>();
    for (const x of items) {
      const id = String(x.userId ?? "").trim();
      if (id) set.add(id);
    }
    return Array.from(set);
  }, [items, mode]);

  const actorMapQ = useQuery({
    enabled: mode !== "SYSTEM" && Boolean(effectiveOrgId) && actorIds.length > 0,
    queryKey: ["audit-actors", effectiveOrgId, actorIds.join("|")],
    queryFn: async () => {
      const orgId = effectiveOrgId as string;

      const results = await Promise.all(
        actorIds.map(async (id) => {
          try {
            const u = await fetchUserById(orgId, id);
            return [id, u] as const;
          } catch {
            return [id, null] as const;
          }
        })
      );

      const map: Record<string, UserDto | null> = {};
      results.forEach(([id, u]) => (map[id] = u));
      return map;
    },
    staleTime: 60_000,
    retry: 0,
  });

  const actorMap = actorMapQ.data ?? {};

  /**
   * ✅ Org name resolution (never show orgId)
   * - If backend sends orgName -> use it
   * - Else fetch /orgs/{orgId} and use orgName
   */
  const orgIdsToResolve = useMemo(() => {
    const set = new Set<string>();
    for (const x of items) {
      const hasName = Boolean(String(x.orgName ?? "").trim());
      const id = String(x.orgId ?? "").trim();
      if (!hasName && id) set.add(id);
    }
    return Array.from(set);
  }, [items]);

  const orgMapQ = useQuery({
    enabled: orgIdsToResolve.length > 0,
    queryKey: ["audit-orgs", orgIdsToResolve.join("|")],
    queryFn: async () => {
      const results = await Promise.all(
        orgIdsToResolve.map(async (id) => {
          try {
            const org = await fetchOrganizationById(id);
            return [id, org] as const;
          } catch {
            return [id, null] as const;
          }
        })
      );

      const map: Record<string, Organization | null> = {};
      results.forEach(([id, org]) => (map[id] = org));
      return map;
    },
    staleTime: 5 * 60_000,
    retry: 0,
  });

  const orgMap = orgMapQ.data ?? {};

  const rows = useMemo(() => {
    return items.map((x) => {
      const orgId = String(x.orgId ?? "").trim();

      const orgLabel =
        String(x.orgName ?? "").trim() ||
        String(orgMap[orgId]?.orgName ?? "").trim() ||
        (mode === "SYSTEM" ? "System" : "—"); // ✅ never orgId

      const actorId = String(x.userId ?? "").trim();

      const resolvedActor =
        mode === "SYSTEM" ? "" : fullName(actorMap[actorId]) || "";

      // ✅ SYSTEM: prefer DTO.userName (backend should populate)
      // ✅ NEVER show userId in UI
      const actorLabel =
        resolvedActor ||
        String(x.userName ?? "").trim() ||
        "—";

      return [
        orgLabel,
        safeStr(x.activityType || "—"),
        trunc(x.entityAffected, 18),
        actorLabel,
        trunc(x.actionDescription, 70),
        safeDate(x.dateCreated),
      ];
    });
  }, [items, actorMap, orgMap, mode]);

  const totalPages = logsQ.data?.totalPages ?? 1;

  const clear = () => {
    setQ("");
    setType("");
    setUserId("");
    setFrom("");
    setTo("");
    setPage(0);
  };

  return (
    <AdminShell
      title="Oversight • Audit Logs"
      subtitle={mode === "SYSTEM" ? "Global system audit events." : "Tenant-scoped audit events."}
      right={<Badge>Audit</Badge>}
    >
      <Card
        title="Audit Logs"
        right={
          <button
            type="button"
            onClick={() => logsQ.refetch()}
            disabled={!enabled || logsQ.isFetching}
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md border bg-white text-sm font-extrabold ${
              !enabled || logsQ.isFetching ? "opacity-60" : ""
            }`}
          >
            <RefreshCw size={14} />
            Refresh
          </button>
        }
      >
        {mode !== "SYSTEM" && !effectiveOrgId ? (
          <div className="mb-3 p-2 rounded-md border border-red-200 bg-red-50 text-red-700 text-sm font-bold">
            Tenant scope required: currentOrgId is missing. Audit logs cannot load without org context.
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2 items-center mb-3">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search (description, entity, metadata)…"
            className="h-10 w-[320px] rounded-xl border px-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-blue-200"
          />

          <input
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            placeholder="Actor userId (optional)"
            className="h-10 w-[240px] rounded-xl border px-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-blue-200"
          />

          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="h-10 rounded-xl border px-3 text-sm font-extrabold bg-white"
            title="Activity type"
          >
            <option value="">All types</option>
            <option value="AUTH">AUTH</option>
            <option value="SUBMISSION">SUBMISSION</option>
            <option value="NEC">NEC</option>
            <option value="ADMIN">ADMIN</option>
            <option value="SYSTEM">SYSTEM</option>
          </select>

          <div className="flex items-center gap-2">
            <label className="text-xs font-extrabold text-slate-600">From</label>
            <input
              type="datetime-local"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="h-10 rounded-xl border px-3 text-sm font-semibold bg-white"
            />
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs font-extrabold text-slate-600">To</label>
            <input
              type="datetime-local"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="h-10 rounded-xl border px-3 text-sm font-semibold bg-white"
            />
          </div>

          <button
            type="button"
            onClick={clear}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md border bg-white text-sm font-extrabold"
          >
            <X size={14} />
            Clear
          </button>
        </div>

        {logsQ.isError ? (
          <div className="mb-3 p-2 rounded-md border border-red-200 bg-red-50 text-red-700 text-sm font-bold">
            {friendlyError(logsQ.error)}
          </div>
        ) : null}

        <Table
          columns={["Organization", "Type", "Entity", "Actor", "Description", "Time"]}
          rows={
            logsQ.isLoading
              ? [["Loading…", "", "", "", "", ""]]
              : rows.length
              ? rows
              : [["No audit events found.", "", "", "", "", ""]]
          }
        />

        <div className="mt-3 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={!logsQ.data || page <= 0 || logsQ.isFetching}
            className="px-3 py-1.5 rounded-md border bg-white text-sm font-extrabold"
          >
            Prev
          </button>

          <div className="text-xs text-slate-600">
            Page {page + 1} / {totalPages}
          </div>

          <button
            type="button"
            onClick={() => setPage((p) => (p + 1 < totalPages ? p + 1 : p))}
            disabled={!logsQ.data || logsQ.isFetching || page + 1 >= totalPages}
            className="px-3 py-1.5 rounded-md border bg-white text-sm font-extrabold"
          >
            Next
          </button>
        </div>

        <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
          <Note
            title="Global vs tenant logs"
            bullets={[
              "SYSTEM loads global logs from /api/admin/audit/system (no X-Org-Id).",
              "TENANT/NEC loads tenant logs from /api/admin/audit (requires X-Org-Id).",
            ]}
          />
          <Note
            title="Org display"
            bullets={[
              "UI shows orgName only (never orgId).",
              "If orgName missing, UI resolves via /orgs/{orgId}.",
            ]}
          />
        </div>
      </Card>
    </AdminShell>
  );
}



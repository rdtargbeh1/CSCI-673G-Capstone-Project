
//  ✅ FILE: src/pages/operations/ObserverReportsPage.tsx


import { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, RefreshCw, Pencil, Trash2, Eye, CheckCircle } from "lucide-react";

import {
  Badge,
  Card,
  Note,
  OpsPageShell,
  Table,
} from "./shared/ops-ui";
import { useAuthStore } from "../../shared/store/authStore";

import {
  fetchCounties,
  type CountyDto,
} from "../../shared/services/countyService";
import {
  fetchPollingCenters,
  type PollingCenterDto,
} from "../../shared/services/pollingCenterService";

import {
  fetchDistricts,
  type DistrictDto,
} from "../../shared/services/districtService";

import {
  searchObserverReports,
  searchObserverReportsNec,
  createObserverReport,
  updateObserverReport,
  deleteObserverReport,
  verifyObserverReport,
  resolveObserverReport,
  type ObserverReportDto,
  type ObserverReportCreateRequest,
  type ObserverReportUpdateRequest,
  type ObserverReportVerificationRequest,
  type ObserverReportResolveRequest,
  type ReportType,
} from "../../shared/services/observerReportService";

import ObserverReportFormModal from "./modal/ObserverReportFormModal";
import ObserverReportVerifyModal from "./modal/ObserverReportVerifyModal";
import ObserverReportResolveModal from "./modal/ObserverReportResolveModal";
import ObserverReportViewModal from "./modal/ObserverReportViewModal";

import {
  fetchOrganizations,
  type Organization,
} from "../../shared/services/organizationService";

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

function fullName(u: any) {
  const fn = String(u?.firstName ?? "").trim();
  const ln = String(u?.lastName ?? "").trim();
  const nm = `${fn} ${ln}`.trim();
  return nm || String(u?.userName ?? "—");
}

function evidenceLabel(r: any) {
  const url = String(r?.mediaUrl ?? "").trim();
  return url ? "Attached" : "Missing";
}

function reporterFullName(r: any) {
  const first = String(r?.observerFirstName ?? r?.observer_first_name ?? "").trim();
  const last = String(r?.observerLastName ?? r?.observer_last_name ?? "").trim();
  const full = `${first} ${last}`.trim();
  if (full) return full;
  const name = String(r?.observerName ?? "").trim();
  if (name) return name;
  const id = String(r?.observerId ?? "").trim();
  return id ? `ID: ${id.slice(0, 8)}…` : "—";
}

function getTenantName(r: any) {
  return String(r?.organizationName ?? r?.organization?.orgName ?? r?.orgName ?? "—");
}

function getTenantId(r: any) {
  return String(r?.organizationId ?? r?.organization?.orgId ?? r?.orgId ?? "");
}

function verificationStatusBadge(status?: string) {
  if (!status || status === "PENDING") {
    return (
      <span className="inline-flex rounded-full px-2 py-0.5 text-xs font-bold border bg-slate-100 text-slate-700 border-slate-200">
        ⏳ Pending
      </span>
    );
  }
  if (status === "INTERNAL_VERIFIED") {
    return (
      <span className="inline-flex rounded-full px-2 py-0.5 text-xs font-bold border bg-green-100 text-green-700 border-green-200">
        ✓ Internal
      </span>
    );
  }
  if (status === "UNDER_INVESTIGATION") {
    return (
      <span className="inline-flex rounded-full px-2 py-0.5 text-xs font-bold border bg-yellow-100 text-yellow-700 border-yellow-200">
        🔍 Investigating
      </span>
    );
  }
  if (status === "NEC_VERIFIED") {
    return (
      <span className="inline-flex rounded-full px-2 py-0.5 text-xs font-bold border bg-emerald-100 text-emerald-700 border-emerald-200">
        ✓ NEC Verified
      </span>
    );
  }
  if (status === "REJECTED") {
    return (
      <span className="inline-flex rounded-full px-2 py-0.5 text-xs font-bold border bg-rose-100 text-rose-700 border-rose-200">
        ✕ Rejected
      </span>
    );
  }
  return null;
}

function isCriticalBadge(isCritical?: boolean) {
  if (isCritical) {
    return (
      <span className="inline-flex rounded-full px-2 py-0.5 text-xs font-bold border bg-red-100 text-red-700 border-red-200">
        🔴 Critical
      </span>
    );
  }
  return (
    <span className="inline-flex rounded-full px-2 py-0.5 text-xs font-bold border bg-slate-100 text-slate-700 border-slate-200">
      ⚪ Normal
    </span>
  );
}

function resolvedBadge(resolved?: boolean) {
  if (resolved) {
    return (
      <span className="inline-flex rounded-full px-2 py-0.5 text-xs font-bold border bg-emerald-100 text-emerald-700 border-emerald-200">
        ✓ Resolved
      </span>
    );
  }
  return (
    <span className="inline-flex rounded-full px-2 py-0.5 text-xs font-bold border bg-amber-100 text-amber-700 border-amber-200">
      ⏳ Open
    </span>
  );
}

function visibilityBadge(visibility?: string) {
  const vis = String(visibility ?? "PRIVATE").toUpperCase();

  if (vis === "PRIVATE") {
    return (
      <span className="text-xs font-bold px-2 py-0.5 rounded-full border bg-slate-50 text-slate-700 border-slate-200">
        🔒 Private
      </span>
    );
  }
  if (vis === "SHARED") {
    return (
      <span className="text-xs font-bold px-2 py-0.5 rounded-full border bg-blue-50 text-blue-700 border-blue-200">
        👥 Shared
      </span>
    );
  }
  if (vis === "PUBLIC") {
    return (
      <span className="text-xs font-bold px-2 py-0.5 rounded-full border bg-purple-50 text-purple-700 border-purple-200">
        🌍 Public
      </span>
    );
  }
  return (
    <span className="text-xs font-bold px-2 py-0.5 rounded-full border bg-slate-50 text-slate-700 border-slate-200">
      🔒 Private
    </span>
  );
}

function ClampCell(props: { text?: any; className?: string; title?: string }) {
  const t = String(props.text ?? "").trim();
  return (
    <div title={props.title || t || ""} className={["min-w-0 truncate text-sm text-slate-800", props.className ?? "max-w-[180px]"].join(" ")}>
      {t || "—"}
    </div>
  );
}

export default function ObserverReportsPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();

  const user = useAuthStore((s) => s.user);
  const dashboardMode = useAuthStore((s) => s.dashboardMode);
  const currentOrgId = useAuthStore((s) => s.currentOrgId);

  const roleLabel = useAuthStore((s: any) =>
    typeof s.getRoleLabel === "function" ? s.getRoleLabel() : ""
  );

  const userRole = (user as any)?.role?.roleName;

  // ✅ FIX: Distinguish SYSTEM_ADMIN from NEC_ADMIN
  const isSystemAdmin = userRole === "SYSTEM_ADMIN" || dashboardMode === "SYSTEM";
  const isNecAdmin = userRole === "NEC_ADMIN" || dashboardMode === "NEC";
  const isNEC = isNecAdmin || isSystemAdmin; // isNEC includes both for query routing

  // ✅ canCrud: SYSTEM_ADMIN cannot create (read-only)
  const canCrud =
    (Boolean(currentOrgId) && !isSystemAdmin) ||
    userRole === "NEC_ADMIN";

  const isSystemDashboard = isSystemAdmin && !isNecAdmin;
  const [systemSelectedOrgId, setSystemSelectedOrgId] = useState<string>("");

  const effectiveOrgId = isSystemDashboard
    ? systemSelectedOrgId || undefined
    : currentOrgId || undefined;

  const me = user as any;
  const meName = fullName(me);

  const orgsQ = useQuery<{ items: Organization[]; totalElements: number }>({
    enabled: isSystemDashboard,
    queryKey: ["orgs", "dropdown", "observer-reports", "system"],
    queryFn: async () => {
      return await fetchOrganizations({
        page: 0,
        size: 500,
        search: "",
        active: true,
        orgId: undefined,
      } as any);
    },
    staleTime: 60_000,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  const orgOptions = orgsQ.data?.items ?? [];

  const countiesQ = useQuery<CountyDto[]>({
    queryKey: ["counties", "all", "observer-reports"],
    queryFn: async () =>
      (await fetchCounties({ page: 0, size: 500 })).items as CountyDto[],
    staleTime: 60_000,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  const districtsQ = useQuery<DistrictDto[]>({
    queryKey: ["districts", "all", "observer-reports"],
    queryFn: async () =>
      (await fetchDistricts({ page: 0, size: 1000 })).items as DistrictDto[],
    staleTime: 60_000,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  const centersQ = useQuery<PollingCenterDto[]>({
    queryKey: ["polling-centers", "all", "observer-reports"],
    queryFn: async () => {
      const p = await fetchPollingCenters({ page: 0, size: 1000 });
      return p.items as PollingCenterDto[];
    },
    staleTime: 60_000,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  const counties = countiesQ.data ?? [];
  const districts = districtsQ.data ?? [];
  const centers = centersQ.data ?? [];

  const [q, setQ] = useState("");
  const [type, setType] = useState<ReportType | "">("");
  const [resolved, setResolved] = useState<"" | "true" | "false">("");
  const [verStatus, setVerStatus] = useState("");
  const [isCritical, setIsCritical] = useState<"" | "true" | "false">("");
  const [visibility, setVisibility] = useState("");

  const [page, setPage] = useState(0);
  const size = 20;

  const listEnabled = isNEC || Boolean(effectiveOrgId);

  const listQ = useQuery({
    enabled: listEnabled,
    queryKey: [
      isNEC ? "observer-reports-nec" : "observer-reports",
      "search",
      effectiveOrgId,
      page,
      size,
      q,
      type,
      resolved,
      verStatus,
      isCritical,
      visibility,
    ],
    queryFn: () => {
      if (isNEC) {
        return searchObserverReportsNec({
          page,
          size,
          q: q.trim() ? q.trim() : undefined,
          type: type || undefined,
          resolved: resolved === "" ? undefined : resolved === "true",
          verificationStatus: verStatus || undefined,
          isCritical: isCritical === "" ? undefined : isCritical === "true",
          visibility: visibility || undefined,
        });
      } else {
        return searchObserverReports({
          orgId: effectiveOrgId!,
          page,
          size,
          q: q.trim() ? q.trim() : undefined,
          type: type || undefined,
          resolved: resolved === "" ? undefined : resolved === "true",
          isCritical: isCritical === "" ? undefined : isCritical === "true",
          visibility: visibility || undefined,
        });
      }
    },
    staleTime: 10_000,
    retry: 1,
  });

  const items: ObserverReportDto[] = (listQ.data?.items ?? []) as any;
  const totalPages = (listQ.data as any)?.totalPages ?? 1;

  const [openView, setOpenView] = useState(false);
  const [viewId, setViewId] = useState<string>("");

  const [openForm, setOpenForm] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [editId, setEditId] = useState<string>("");

  const editQ = useQuery<ObserverReportDto>({
    enabled: openForm && formMode === "edit" && Boolean(editId),
    queryKey: ["observer-reports", "edit", editId],
    queryFn: async () => {
      const { getObserverReport } = await import("../../shared/services/observerReportService");
      return await getObserverReport(editId);
    },
    staleTime: 10_000,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  const createM = useMutation({
    mutationFn: async (p: {
      req: ObserverReportCreateRequest;
      files: File[];
    }) => createObserverReport(p.req, p.files),
    onSuccess: async () => {
      await qc.invalidateQueries({
        queryKey: [isNEC ? "observer-reports-nec" : "observer-reports", "search"],
      });
      setOpenForm(false);
    },
  });

  const updateM = useMutation({
    mutationFn: async (p: {
      id: string;
      req: ObserverReportUpdateRequest;
      files: File[];
    }) => updateObserverReport(p.id, p.req, p.files),
    onSuccess: async () => {
      await qc.invalidateQueries({
        queryKey: [isNEC ? "observer-reports-nec" : "observer-reports", "search"],
      });
      setOpenForm(false);
    },
  });

  const delM = useMutation({
    mutationFn: async (id: string) => {
      const { deleteObserverReport: deleteReport } = await import("../../shared/services/observerReportService");
      return await deleteReport(id);
    },
    onSuccess: async () => {
      await qc.invalidateQueries({
        queryKey: [isNEC ? "observer-reports-nec" : "observer-reports", "search"],
      });
    },
  });

  const [openVerify, setOpenVerify] = useState(false);
  const [verifyId, setVerifyId] = useState<string>("");

  const verifyM = useMutation({
    mutationFn: async (p: {
      id: string;
      req: ObserverReportVerificationRequest;
    }) => verifyObserverReport(p.id, p.req),
    onSuccess: async () => {
      await qc.invalidateQueries({
        queryKey: [isNEC ? "observer-reports-nec" : "observer-reports", "search"],
      });
      setOpenVerify(false);
    },
  });

  const [openResolve, setOpenResolve] = useState(false);
  const [resolveId, setResolveId] = useState<string>("");

  const resolveM = useMutation({
    mutationFn: async (p: {
      id: string;
      req: ObserverReportResolveRequest;
    }) => resolveObserverReport(p.id, p.req),
    onSuccess: async () => {
      await qc.invalidateQueries({
        queryKey: [isNEC ? "observer-reports-nec" : "observer-reports", "search"],
      });
      setOpenResolve(false);
    },
  });

  const rows = useMemo(() => {
    return items.map((r) => {
      const county = r.countyName ?? "—";
      const district = (r as any).districtName ?? "—";
      const centerCode = r.centerCode ? String(r.centerCode) : "—";
      const centerName = String(r.centerName ?? "—");
      const reporter = reporterFullName(r as any);
      const tenantName = getTenantName(r as any);
      const orgId = getTenantId(r as any);
      const desc = String(r.description ?? "");
      const evidence = evidenceLabel(r);
      const verStatus = String(r.verificationStatus ?? "PENDING");
      const visibility = String(r.visibility ?? "PRIVATE");
      const isCrit = Boolean(r.isCritical ?? false);
      const isResol = Boolean(r.resolved ?? false);

      const isLocked = verStatus === "INTERNAL_VERIFIED" || verStatus === "NEC_VERIFIED";

      // ✅ SYSTEM_ADMIN: READ-ONLY - Cannot edit any report
      const canEditThisReport = 
        !isSystemAdmin &&
        !isLocked && 
        effectiveOrgId === orgId;

      // ✅ SYSTEM_ADMIN: Cannot verify any report
      const canVerifyThisReport =
        !isSystemAdmin &&
        !isLocked && 
        !isResol &&
        (isNecAdmin || effectiveOrgId === orgId);

      // ✅ FIXED: Only tenant owner can resolve (NOT SYSTEM_ADMIN, NOT NEC_ADMIN)
      const canResolveThisReport =
        !isSystemAdmin &&
        !isNecAdmin &&
        !isResol &&
        verStatus !== "PENDING" &&
        effectiveOrgId === orgId;

      // ✅ SYSTEM_ADMIN: Cannot delete any report
      const canDeleteThisReport = 
        !isSystemAdmin && 
        !isLocked && 
        effectiveOrgId === orgId;

      // ✅ Can ALWAYS view verification/resolution details (read-only when locked/resolved)
      const canViewVerificationDetails = verStatus !== "PENDING";
      const canViewResolutionDetails = isResol;

      return [
        <Badge key={`t-${r.reportId}`}>{String(r.type ?? "—")}</Badge>,

        <ClampCell
          key={`rep-${r.reportId}`}
          text={reporter}
          className="max-w-[140px]"
        />,

        <ClampCell
          key={`tn-${r.reportId}`}
          text={tenantName}
          className="max-w-[140px]"
        />,

        <ClampCell
          key={`co-${r.reportId}`}
          text={county}
          className="max-w-[120px]"
        />,

        <ClampCell
          key={`di-${r.reportId}`}
          text={district}
          className="max-w-[120px]"
        />,

        <span key={`cc-${r.reportId}`} className="text-sm">
          {centerCode}
        </span>,

        <ClampCell
          key={`cn-${r.reportId}`}
          text={centerName}
          className="max-w-[140px]"
        />,

        <ClampCell
          key={`sum-${r.reportId}`}
          text={desc}
          className="max-w-[180px]"
        />,

        <span
          key={`e-${r.reportId}`}
          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-bold border ${
            evidence === "Attached"
              ? "bg-green-50 text-green-700 border-green-200"
              : "bg-red-50 text-red-700 border-red-200"
          }`}
        >
          {evidence}
        </span>,

        <div key={`vstat-${r.reportId}`}>
          {verificationStatusBadge(verStatus)}
        </div>,

        <div key={`crit-${r.reportId}`}>
          {isCriticalBadge(isCrit)}
        </div>,

        <div key={`vis-${r.reportId}`}>
          {visibilityBadge(visibility)}
        </div>,

        <div key={`res-${r.reportId}`}>
          {resolvedBadge(isResol)}
        </div>,

        <div key={`a-${r.reportId}`} className="flex items-center gap-1">
          {/* ✅ VIEW: Everyone can view */}
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-lg border bg-white px-2 py-1 hover:bg-slate-50"
            onClick={() => {
              setViewId(String(r.reportId));
              setOpenView(true);
            }}
            title="View full report details"
          >
            <Eye size={14} className="text-slate-600" />
          </button>

          {/* ✅ EDIT: Only tenant owner (not locked, not resolved) */}
          {canEditThisReport ? (
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-lg border bg-white px-2 py-1 hover:bg-green-50"
              onClick={() => {
                if (isSystemDashboard && !effectiveOrgId) {
                  alert("Select a tenant organization first.");
                  return;
                }
                setFormMode("edit");
                setEditId(String(r.reportId));
                setOpenForm(true);
              }}
              title="Edit report"
            >
              <Pencil size={14} className="text-green-600" />
            </button>
          ) : null}

          {/* ✅ VERIFY: Show for unlocked reports, but also when locked (read-only view) */}
          {(canVerifyThisReport || canViewVerificationDetails) ? (
            <button
              type="button"
              disabled={verifyM.isPending}
              className={`inline-flex items-center gap-1.5 rounded-lg border bg-white px-2 py-1 ${
                canVerifyThisReport ? "hover:bg-blue-50" : "hover:bg-slate-100 opacity-70"
              }`}
              onClick={() => {
                setVerifyId(String(r.reportId));
                setOpenVerify(true);
              }}
              title={canVerifyThisReport ? "Verify report" : "View verification details"}
            >
              <CheckCircle size={14} className={canVerifyThisReport ? "text-blue-600" : "text-slate-500"} />
            </button>
          ) : null}

          {/* ✅ RESOLVE: Only tenant owner can resolve (not system/nec admin) */}
          {(canResolveThisReport || canViewResolutionDetails) ? (
            <button
              type="button"
              disabled={resolveM.isPending}
              className={`inline-flex items-center gap-1.5 rounded-lg border bg-white px-2 py-1 ${
                canResolveThisReport ? "hover:bg-emerald-50" : "hover:bg-slate-100 opacity-50 cursor-not-allowed"
              }`}
              onClick={() => {
                setResolveId(String(r.reportId));
                setOpenResolve(true);
              }}
              title={canResolveThisReport ? "Mark as resolved" : canViewResolutionDetails ? "View resolution details" : "Only tenant owner can resolve"}
            >
              <CheckCircle size={14} className={canResolveThisReport ? "text-emerald-600" : "text-slate-500"} />
            </button>
          ) : null}

          {/* ✅ DELETE: Only tenant owner (not locked, not resolved) */}
          {canDeleteThisReport ? (
            <button
              type="button"
              disabled={delM.isPending}
              className={`inline-flex items-center gap-1.5 rounded-lg border bg-white px-2 py-1 hover:bg-red-50 ${
                delM.isPending ? "opacity-50" : ""
              }`}
              onClick={() => {
                if (isSystemDashboard && !effectiveOrgId) {
                  alert("Select a tenant organization first.");
                  return;
                }
                if (!confirm("Delete this report?")) return;
                delM.mutate(String(r.reportId));
              }}
              title="Delete report"
            >
              <Trash2 size={14} className="text-red-600" />
            </button>
          ) : null}
        </div>,
      ];
    });
  }, [
    items,
    effectiveOrgId,
    isNEC,
    isSystemAdmin,
    isNecAdmin,
    delM.isPending,
    resolveM.isPending,
    verifyM.isPending,
    isSystemDashboard,
  ]);

  return (
    <OpsPageShell
      title="Operations • Observer Reports"
      subtitle={`Actor: ${meName} • Role: ${roleLabel || "—"} • Mode: ${
        isSystemAdmin ? "🔒 SYSTEM ADMIN (READ-ONLY)" : isNecAdmin ? "🔍 NEC VERIFICATION" : "📝 TENANT REPORTING"
      }`}
      right={
        <Badge>
          {isSystemAdmin ? "Monitor Only" : isNecAdmin ? "Verification Authority" : "Evidence-first"}
        </Badge>
      }
    >
      <Card
        title="Observer Reports"
        right={
          <div className="flex flex-wrap gap-2">
            <button
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-lg font-semibold hover:bg-slate-50 inline-flex items-center gap-2"
              onClick={() => listQ.refetch()}
              disabled={!listEnabled || listQ.isFetching}
              type="button"
            >
              <RefreshCw size={18} />
              Refresh
            </button>

            {/* ✅ NEW REPORT: Only for NEC_ADMIN and Tenant (not SYSTEM_ADMIN) */}
            {canCrud && !isSystemAdmin && (
              <button
                className="rounded-xl border px-3 py-2 text-lg font-extrabold inline-flex items-center gap-2 bg-blue-600 text-white border-blue-700 hover:bg-blue-700"
                type="button"
                onClick={() => {
                  if (isSystemDashboard && !effectiveOrgId) {
                    alert("Select a tenant organization first.");
                    return;
                  }
                  setFormMode("create");
                  setEditId("");
                  setOpenForm(true);
                }}
                title="Create report"
              >
                <Plus size={16} />
                New Report
              </button>
            )}
          </div>
        }
      >
        {/* ✅ System tenant selector */}
        {isSystemDashboard && !isNecAdmin ? (
          <div className="mb-3 rounded-2xl border border-slate-200 bg-white p-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="text-base font-extrabold text-slate-900">
                  Select Tenant Organization
                </div>
                <div className="text-xs text-slate-500">
                  View tenant reports (read-only monitoring).
                </div>
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={systemSelectedOrgId}
                  onChange={(e) => {
                    setSystemSelectedOrgId(e.target.value);
                    setPage(0);
                  }}
                  className="h-10 w-full sm:w-[320px] rounded-xl border bg-white px-3 text-base font-semibold"
                  disabled={orgsQ.isLoading}
                >
                  <option value="">— Select tenant —</option>
                  {orgOptions.map((o) => (
                    <option key={o.orgId} value={o.orgId}>
                      {o.orgName}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  className="h-10 rounded-xl border bg-white px-3 text-sm font-extrabold hover:bg-slate-50 inline-flex items-center gap-2"
                  onClick={() => orgsQ.refetch()}
                  disabled={orgsQ.isFetching}
                  title="Reload tenants"
                >
                  <RefreshCw size={16} />
                  Reload
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {!listEnabled ? (
          <div className="p-3 rounded-xl border border-amber-200 bg-amber-50 text-amber-900 text-sm font-bold">
            Missing orgId. Select a tenant first.
          </div>
        ) : listQ.isError ? (
          <div className="p-3 rounded-xl border border-red-200 bg-red-50 text-red-700 text-base font-bold">
            {friendlyError(listQ.error)}
          </div>
        ) : null}

        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between flex-wrap">
          <div className="flex flex-wrap gap-2">
            <input
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(0);
              }}
              placeholder="Search…"
              className="h-9 rounded-lg border bg-white px-3 text-base w-[220px]"
              disabled={!listEnabled}
            />

            <select
              value={type}
              onChange={(e) => {
                setType(e.target.value as any);
                setPage(0);
              }}
              className="h-9 rounded-lg border bg-white px-3 text-base font-semibold"
              disabled={!listEnabled}
            >
              <option value="">All types</option>
              <option value="VIOLENCE">VIOLENCE</option>
              <option value="INTIMIDATION">INTIMIDATION</option>
              <option value="EQUIPMENT_ISSUE">EQUIPMENT_ISSUE</option>
              <option value="LATE_OPENING">LATE_OPENING</option>
              <option value="QUEUE_ISSUE">QUEUE_ISSUE</option>
              <option value="OTHER">OTHER</option>
            </select>

            <select
              value={resolved}
              onChange={(e) => {
                setResolved(e.target.value as any);
                setPage(0);
              }}
              className="h-9 rounded-lg border bg-white px-3 text-base font-semibold"
              disabled={!listEnabled}
            >
              <option value="">All</option>
              <option value="false">Open</option>
              <option value="true">Resolved</option>
            </select>

            {isNEC && (
              <>
                <select
                  value={verStatus}
                  onChange={(e) => {
                    setVerStatus(e.target.value);
                    setPage(0);
                  }}
                  className="h-9 rounded-lg border bg-white px-3 text-base font-semibold"
                >
                  <option value="">All Verification</option>
                  <option value="PENDING">PENDING</option>
                  <option value="INTERNAL_VERIFIED">INTERNAL_VERIFIED</option>
                  <option value="UNDER_INVESTIGATION">UNDER_INVESTIGATION</option>
                  <option value="NEC_VERIFIED">NEC_VERIFIED</option>
                  <option value="REJECTED">REJECTED</option>
                </select>

                <select
                  value={isCritical}
                  onChange={(e) => {
                    setIsCritical(e.target.value as any);
                    setPage(0);
                  }}
                  className="h-9 rounded-lg border bg-white px-3 text-base font-semibold"
                >
                  <option value="">All Critical</option>
                  <option value="false">Normal</option>
                  <option value="true">Critical</option>
                </select>

                <select
                  value={visibility}
                  onChange={(e) => {
                    setVisibility(e.target.value);
                    setPage(0);
                  }}
                  className="h-9 rounded-lg border bg-white px-3 text-base font-semibold"
                >
                  <option value="">All Visibility</option>
                  <option value="PRIVATE">PRIVATE</option>
                  <option value="SHARED">SHARED</option>
                  <option value="PUBLIC">PUBLIC</option>
                </select>
              </>
            )}
          </div>

          <div className="text-sm text-slate-500">
            Page {page + 1} / {totalPages}
          </div>
        </div>

        <Table
          columns={[
            "Report Type",
            "Reporter",
            "Reported Tenant",
            "County",
            "District",
            "Center Code",
            "Center Name",
            "Description",
            "Evidence",
            "Verification",
            "Critical",
            "Visibility",
            "Status",
            "Actions",
          ]}
          rows={
            listQ.isLoading
              ? [
                  [
                    <span key="loading" className="text-sm text-slate-600">
                      Loading…
                    </span>,
                    "",
                    "",
                    "",
                    "",
                    "",
                    "",
                    "",
                    "",
                    "",
                    "",
                    "",
                    "",
                    "",
                  ],
                ]
              : rows.length === 0
              ? [
                  [
                    <span key="empty" className="text-sm text-slate-600">
                      No reports found.
                    </span>,
                    "",
                    "",
                    "",
                    "",
                    "",
                    "",
                    "",
                    "",
                    "",
                    "",
                    "",
                    "",
                    "",
                  ],
                ]
              : rows
          }
        />

        <div className="mt-3 flex items-center justify-between gap-2">
          <div className="flex gap-2">
            <button
              type="button"
              className="h-9 rounded-lg border bg-white px-3 text-sm font-bold"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page <= 0 || listQ.isFetching || !listEnabled}
            >
              Prev
            </button>
            <button
              type="button"
              className="h-9 rounded-lg border bg-white px-3 text-sm font-bold"
              onClick={() => setPage((p) => (p + 1 < totalPages ? p + 1 : p))}
              disabled={listQ.isFetching || page + 1 >= totalPages || !listEnabled}
            >
              Next
            </button>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
          {isSystemAdmin ? (
            <>
              <Note
                title="🔒 System Admin (Read-Only Access)"
                bullets={[
                  "✅ View all reports across all tenants",
                  "✅ Monitor report status and trends",
                  "✅ See all verification states",
                  "✅ Cannot create, edit, or delete reports",
                  "✅ Cannot verify or resolve reports",
                  "✅ For administrative oversight only",
                ]}
              />
              <Note
                title="Workflow (System Admin)"
                bullets={[
                  "1. Select tenant organization",
                  "2. Review reports and status",
                  "3. Monitor verification progress",
                  "4. Track critical reports",
                  "5. View all resolutions",
                  "6. Audit compliance",
                ]}
              />
            </>
          ) : isNecAdmin ? (
            <>
              <Note
                title="🔍 NEC Verification Authority"
                bullets={[
                  "✅ Create & manage your own NEC reports",
                  "✅ See all your org reports (PRIVATE/SHARED/PUBLIC)",
                  "✅ See SHARED + PUBLIC from other orgs",
                  "✅ Cannot edit/delete tenant reports",
                  "✅ Can verify any org's PENDING/UNDER_INVESTIGATION",
                  "✅ Can only resolve your own NEC reports",
                ]}
              />
              <Note
                title="Workflow (NEC)"
                bullets={[
                  "1. Create & manage own NEC reports",
                  "2. Review all your org reports",
                  "3. Verify UNDER_INVESTIGATION reports",
                  "4. Set NEC_VERIFIED or REJECTED",
                  "5. Monitor shared/public cases",
                  "6. Resolve your own NEC reports only",
                ]}
              />
            </>
          ) : (
            <>
              <Note
                title="📝 Tenant Reporting Rules"
                bullets={[
                  "✅ Create reports with evidence",
                  "✅ Edit/delete own PENDING reports only",
                  "✅ Verify internally or escalate to NEC",
                  "✅ See NEC_VERIFIED shared/public from others",
                  "✅ Cannot edit/delete locked reports",
                  "✅ Resolve your own reports when verified",
                ]}
              />
              <Note
                title="Workflow (Tenant)"
                bullets={[
                  "1. Create report with evidence",
                  "2. Edit/delete before verification",
                  "3. Click verify button",
                  "4. Choose: Internal or Escalate",
                  "5. Mark critical if needed",
                  "6. Click resolve to close case",
                ]}
              />
            </>
          )}
        </div>
      </Card>

      <ObserverReportFormModal
        open={openForm}
        mode={formMode}
        busy={createM.isPending || updateM.isPending}
        canSubmit={canCrud}
        effectiveOrgId={(effectiveOrgId || currentOrgId) as string}
        me={me}
        counties={counties}
        districts={districts}
        centers={centers}
        initial={formMode === "edit" ? editQ.data ?? null : null}
        onClose={() => setOpenForm(false)}
        onSubmitCreate={async (req, files) => {
          await createM.mutateAsync({ req, files });
        }}
        onSubmitUpdate={async (id, req, files) => {
          await updateM.mutateAsync({ id, req, files });
        }}
        error={createM.error || updateM.error || editQ.error}
      />

      <ObserverReportViewModal
        open={openView}
        reportId={viewId}
        onClose={() => setOpenView(false)}
        effectiveOrgId={effectiveOrgId}
      />

      <ObserverReportVerifyModal
        open={openVerify}
        reportId={verifyId}
        busy={verifyM.isPending}
        onClose={() => setOpenVerify(false)}
        onSubmit={async (req: ObserverReportVerificationRequest) => {
          await verifyM.mutateAsync({ id: verifyId, req });
        }}
        error={verifyM.error}
        reportData={items.find((r) => String(r.reportId) === verifyId)}
      />

      <ObserverReportResolveModal
        open={openResolve}
        reportId={resolveId}
        busy={resolveM.isPending}
        readOnly={isSystemAdmin || isNecAdmin}
        onClose={() => setOpenResolve(false)}
        onSubmit={async (req: ObserverReportResolveRequest) => {
          await resolveM.mutateAsync({ id: resolveId, req });
        }}
        error={resolveM.error}
        reportData={items.find((r) => String(r.reportId) === resolveId)}
      />
    </OpsPageShell>
  );
}


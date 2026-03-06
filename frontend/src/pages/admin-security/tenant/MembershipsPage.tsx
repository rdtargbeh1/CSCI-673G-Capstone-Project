

// src/pages/admin-security/security/MembershipsPage.tsx

import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "../../../shared/store/authStore";

import {
  fetchOrganizations as fetchOrganizationsPaged,
  type Organization,
} from "../../../shared/services/organizationService";

import { apiClient } from "../../../shared/lib/apiClient";

import { AdminShell, Badge, Card, Note } from "../shared/admin-ui";
import { RefreshCw, Power, PowerOff, Search, Trash2 } from "lucide-react";

/** ---------------- helpers ---------------- */
function safeStr(v: any) {
  return typeof v === "string" ? v : v == null ? "" : String(v);
}
function fmtDate(v?: string | null) {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v);
  return d.toLocaleString();
}
function fullName(m: any) {
  const n = `${safeStr(m?.firstName)} ${safeStr(m?.lastName)}`.trim();
  return (
    n ||
    safeStr(m?.fullName) ||
    safeStr(m?.userName) ||
    safeStr(m?.email) ||
    "—"
  );
}
function pickEnabled(m: any): boolean {
  const v = m?.isEnabled ?? m?.enabled;
  return v === true || v === "true" || v === 1;
}
function unwrapPage<T = any>(data: any): { rows: T[]; totalPages: number } {
  const rows =
    (Array.isArray(data?.content) && data.content) ||
    (Array.isArray(data?.items) && data.items) ||
    (Array.isArray(data) && data) ||
    [];
  const totalPages =
    (typeof data?.totalPages === "number" && data.totalPages) ||
    (typeof data?.page?.totalPages === "number" && data.page.totalPages) ||
    0;
  return { rows, totalPages };
}

/** ---------------- API (tenant scoped; requires X-Org-Id) ---------------- */
// ✅ correct path:
const BASE_URL = "/members";

async function fetchMemberships(
  orgId: string,
  params: {
    page: number;
    size: number;
    q?: string;
    roleName?: string;
    enabled?: boolean;
  }
) {
  const { data } = await apiClient.get(BASE_URL, {
    params: {
      page: params.page,
      size: params.size,
      q: params.q || undefined,
      roleName: params.roleName || undefined,
      enabled: params.enabled ?? undefined,
    },
    headers: {
      "X-Org-Id": orgId, // ✅ membership endpoints require org context
    },
  });
  return data;
}

async function setMembershipEnabled(
  orgId: string,
  userId: string,
  enabled: boolean
) {
  await apiClient.patch(
    `${BASE_URL}/${userId}/enabled`,
    { enabled },
    { headers: { "X-Org-Id": orgId } }
  );
}

async function removeMembership(orgId: string, userId: string) {
  await apiClient.delete(`${BASE_URL}/${userId}`, {
    headers: { "X-Org-Id": orgId },
  });
}

export default function MembershipsPage() {
  const qc = useQueryClient();

  const dashboardMode = useAuthStore((s) => s.dashboardMode);
  const currentOrgId = useAuthStore((s) => s.currentOrgId);

  const isSystemMode = dashboardMode === "SYSTEM";

  // ✅ SYSTEM: must pick org to view tenant memberships
  const [selectedOrgId, setSelectedOrgId] = useState<string>("");

  const effectiveOrgId = isSystemMode
    ? selectedOrgId.trim()
    : safeStr(currentOrgId).trim();

  const hasOrgContext = !!effectiveOrgId;

  // ✅ Permissions per your rules:
  // - SYSTEM: can view any tenant memberships once org selected; can also enable/disable/remove
  // - TENANT (including NEC): can ONLY enable/disable/remove within their org
  const canManage = hasOrgContext;

  // filters/paging
  const [q, setQ] = useState("");
  const [roleName, setRoleName] = useState(""); // optional filter
  const [enabledFilter, setEnabledFilter] = useState<"" | "true" | "false">("");
  const [page, setPage] = useState(0);

  /** ✅ SYSTEM org dropdown options */
  const orgsQ = useQuery({
    queryKey: ["lookups", "orgs", "system"],
    queryFn: async () => {
      const res = await fetchOrganizationsPaged({
        page: 0,
        size: 200,
        search: undefined,
        active: undefined,
        orgType: undefined,
        orgId: undefined,
      } as any);
      return (res.items ?? []) as Organization[];
    },
    enabled: isSystemMode,
    staleTime: 1000 * 60 * 10,
    retry: 1,
  });

  const orgOptions = useMemo(() => {
    return (orgsQ.data ?? []).map((o) => ({
      value: o.orgId,
      label: o.subdomain ? `${o.orgName} (${o.subdomain})` : o.orgName,
    }));
  }, [orgsQ.data]);

  /** ✅ Memberships query */
  const membershipsQ = useQuery({
    queryKey: [
      "memberships",
      effectiveOrgId || "no-org",
      page,
      q,
      roleName,
      enabledFilter,
    ],
    queryFn: async () => {
      const enabled =
        enabledFilter === "" ? undefined : enabledFilter === "true";
      return fetchMemberships(effectiveOrgId, {
        page,
        size: 20,
        q: q.trim() || undefined,
        roleName: roleName.trim() || undefined,
        enabled,
      });
    },
    enabled: hasOrgContext, // ✅ require org context always
    staleTime: 10_000,
    retry: 1,
  });

  const { rows, totalPages } = unwrapPage<any>(membershipsQ.data);

  const refreshNow = async () => {
    await qc.invalidateQueries({ queryKey: ["memberships"] });
    await membershipsQ.refetch();
  };

  const enabledM = useMutation({
    mutationFn: async (args: { userId: string; next: boolean }) => {
      if (!canManage) throw new Error("Select an organization first.");
      await setMembershipEnabled(effectiveOrgId, args.userId, args.next);
    },
    onSuccess: refreshNow,
  });

  const removeM = useMutation({
    mutationFn: async (args: { userId: string }) => {
      if (!canManage) throw new Error("Select an organization first.");
      await removeMembership(effectiveOrgId, args.userId);
    },
    onSuccess: refreshNow,
  });

  return (
    <AdminShell
      title="Admin • Memberships"
      subtitle={
        isSystemMode
          ? "SYSTEM: select an organization to view its tenant memberships (tenant-scoped)."
          : "Tenant-scoped: enable/disable and remove members."
      }
      right={
        <Badge>
          {isSystemMode
            ? hasOrgContext
              ? "Org Selected"
              : "Select Org"
            : "Tenant"}
        </Badge>
      }
    >
      <Card
        title="Memberships"
        right={
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={refreshNow}
              disabled={!hasOrgContext || membershipsQ.isFetching}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-base font-semibold hover:bg-slate-50 disabled:opacity-50"
              title={
                !hasOrgContext ? "Select an organization first" : "Refresh"
              }
            >
              <RefreshCw size={16} />
              Refresh
            </button>
          </div>
        }
      >
        {/* ✅ SYSTEM: Organization selector */}
        {isSystemMode ? (
          <div className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <label className="block">
              <div className="mb-1 text-base font-semibold text-slate-600">
                Organization <span className="text-red-600">*</span>
              </div>
              <select
                value={selectedOrgId}
                onChange={(e) => {
                  setSelectedOrgId(e.target.value);
                  setPage(0);
                  setQ("");
                  setRoleName("");
                  setEnabledFilter("");
                }}
                disabled={orgsQ.isLoading || orgsQ.isError}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-base outline-none focus:ring-2 focus:ring-(--org-primary)"
              >
                <option value="">
                  {orgsQ.isLoading
                    ? "Loading organizations…"
                    : "— Select Organization —"}
                </option>
                {orgOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              {orgsQ.isError ? (
                <div className="mt-1 text-[12px] font-semibold text-red-600">
                  Failed to load organizations
                </div>
              ) : null}
            </label>
          </div>
        ) : null}

        {/* Filters */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex w-full flex-wrap items-center gap-2 sm:max-w-3xl">
            <div className="relative w-full sm:max-w-xl">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                size={16}
              />
              <input
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setPage(0);
                }}
                placeholder="Search members (name, username, email)…"
                disabled={!hasOrgContext}
                className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-base outline-none focus:ring-2 focus:ring-(--org-primary) disabled:bg-slate-50"
              />
            </div>

            <input
              value={roleName}
              onChange={(e) => {
                setRoleName(e.target.value);
                setPage(0);
              }}
              placeholder="Role filter (optional)"
              disabled={!hasOrgContext}
              className="w-full sm:w-56 rounded-xl border border-slate-200 bg-white px-3 py-2 text-base outline-none focus:ring-2 focus:ring-(--org-primary) disabled:bg-slate-50"
            />

            <select
              value={enabledFilter}
              onChange={(e) => {
                setEnabledFilter(e.target.value as any);
                setPage(0);
              }}
              disabled={!hasOrgContext}
              className="w-full sm:w-44 rounded-xl border border-slate-200 bg-white px-3 py-2 text-base outline-none focus:ring-2 focus:ring-(--org-primary) disabled:bg-slate-50"
            >
              <option value="">All statuses</option>
              <option value="true">Enabled</option>
              <option value="false">Disabled</option>
            </select>

            <button
              type="button"
              onClick={() => {
                setQ("");
                setRoleName("");
                setEnabledFilter("");
                setPage(0);
              }}
              disabled={!hasOrgContext}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-base font-semibold hover:bg-slate-50 disabled:opacity-50"
            >
              Clear
            </button>
          </div>
        </div>

        {/* Status messages */}
        <div className="mt-3">
          {!hasOrgContext ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-base text-amber-800">
              {isSystemMode
                ? "Select an organization to view its memberships."
                : "Missing organization context."}
            </div>
          ) : membershipsQ.isLoading ? (
            <div className="text-sm text-slate-600">Loading memberships…</div>
          ) : membershipsQ.isError ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-base text-red-700">
              {(membershipsQ.error as any)?.message ??
                "Failed to load memberships."}
            </div>
          ) : null}
        </div>

        {/* Table */}
        <div className="mt-3 overflow-x-auto rounded-2xl border border-slate-200 bg-white">
          <table className="min-w-1100px w-full">
            <thead className="sticky top-0 z-10 bg-slate-50">
              <tr className="text-left">
                {[
                  "Name",
                  "Username",
                  "Email",
                  "Organization",
                  "Role",
                  "Created",
                  "Status",
                  "Actions",
                ].map((h) => (
                  <th
                    key={h}
                    className="whitespace-nowrap border-b border-slate-200 px-3 py-2 text-base font-extrabold text-slate-700"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {rows.length === 0 && hasOrgContext && !membershipsQ.isLoading ? (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-base text-slate-600">
                    No members found.
                  </td>
                </tr>
              ) : (
                rows.map((m: any) => {
                  const enabled = pickEnabled(m);

                  const orgName =
                    safeStr(m?.orgName) ||
                    safeStr(m?.organizationName) ||
                    safeStr(m?.organization?.orgName) ||
                    "—";

                  const role = safeStr(m?.roleName) || "—";

                  const userId = safeStr(m?.userId) || safeStr(m?.user?.userId);
                  const membershipKey =
                    safeStr(m?.membershipId) ||
                    `${userId}-${safeStr(m?.orgId)}`;

                  return (
                    <tr key={membershipKey} className="hover:bg-slate-50">
                      {/* Full Name */}
                      <td className="border-b border-slate-100 px-3 py-2 text-base font-bold text-slate-900">
                        {fullName(m)}
                      </td>

                      {/* Username */}
                      <td className="border-b border-slate-100 px-3 py-2 text-base text-slate-700">
                        {safeStr(m?.userName)
                          ? `@${safeStr(m?.userName)}`
                          : "—"}
                      </td>

                      {/* Email */}
                      <td className="border-b border-slate-100 px-3 py-2 text-base text-slate-700">
                        {safeStr(m?.email) || "—"}
                      </td>

                      <td className="border-b border-slate-100 px-3 py-2 text-base text-slate-700">
                        {orgName}
                      </td>

                      <td className="border-b border-slate-100 px-3 py-2 text-base text-slate-700">
                        {role}
                      </td>

                      <td className="border-b border-slate-100 px-3 py-2 text-base text-slate-700">
                        {fmtDate(m?.dateCreated)}
                      </td>

                      <td className="border-b border-slate-100 px-3 py-2 text-base">
                        <span
                          className={[
                            "inline-flex items-center rounded-full px-2 py-1 text-base font-extrabold",
                            enabled
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-slate-100 text-slate-700",
                          ].join(" ")}
                        >
                          {enabled ? "Enabled" : "Disabled"}
                        </span>
                      </td>

                      <td className="border-b border-slate-100 px-3 py-2">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            className="h-9 w-9 rounded-xl border border-slate-200 hover:bg-slate-50 disabled:opacity-50"
                            title={enabled ? "Disable" : "Enable"}
                            disabled={
                              !canManage || enabledM.isPending || !userId
                            }
                            onClick={() =>
                              enabledM.mutate({ userId, next: !enabled })
                            }
                          >
                            {enabled ? (
                              <PowerOff
                                size={18}
                                className="mx-auto text-amber-600"
                              />
                            ) : (
                              <Power
                                size={18}
                                className="mx-auto text-emerald-600"
                              />
                            )}
                          </button>

                          <button
                            type="button"
                            className="h-9 w-9 rounded-xl border border-slate-200 hover:bg-slate-50 disabled:opacity-50"
                            title="Remove member"
                            disabled={
                              !canManage || removeM.isPending || !userId
                            }
                            onClick={() => {
                              const ok = window.confirm(
                                `Remove "${fullName(
                                  m
                                )}" from this organization?`
                              );
                              if (ok) removeM.mutate({ userId });
                            }}
                          >
                            <Trash2
                              size={16}
                              className="mx-auto text-red-600"
                            />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="mt-3 flex items-center justify-between">
          <div className="text-sm text-slate-600">
            Page <span className="font-bold">{page + 1}</span> of{" "}
            <span className="font-bold">{Math.max(totalPages, 1)}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50"
              disabled={page <= 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
            >
              Prev
            </button>
            <button
              type="button"
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50"
              disabled={totalPages === 0 || page >= totalPages - 1}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </button>
          </div>
        </div>

        {/* Notes */}
        <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
          <Note
            title="Scope rules (as requested)"
            bullets={[
              "Memberships are tenant-scoped and require org-id.",
              "SYSTEM admin can access memberships by selecting an org (header X-Org-Id).",
              "Tenant admins can only enable/disable and remove members here.",
              "All CRUD (add user, role assignment, etc.) remains on Users page.",
            ]}
          />
          <Note
            title="API mapping used here"
            bullets={[
              `GET ${BASE_URL}?q=&roleName=&enabled=`,
              `PATCH ${BASE_URL}/{userId}/enabled`,
              `DELETE ${BASE_URL}/{userId}`,
              "All calls send X-Org-Id header from the selected org.",
            ]}
          />
        </div>
      </Card>
    </AdminShell>
  );
}


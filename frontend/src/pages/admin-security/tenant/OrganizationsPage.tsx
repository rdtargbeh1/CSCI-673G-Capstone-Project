
// ✅ FILE: src/pages/admin-security/security/OrganizationsPage.tsx



import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "../../../shared/store/authStore";

import {
  fetchOrganizations,
  createOrganization,
  updateOrganization,
  setOrganizationActive,
  type Organization,
  type OrganizationType,
} from "../../../shared/services/organizationService";

import { apiClient } from "../../../shared/lib/apiClient";

import {
  AdminShell,
  Badge,
  Card,
  Note,
  Modal,
  TextField,
  SelectField,
} from "../shared/admin-ui";

import { RefreshCw, Power, PowerOff, Search, Pencil, Plus, UserPlus } from "lucide-react";

// ✅ ADD
import TenantAdminFormModal from "./TenantAdminFormModal"
import type { RoleName, UserCreateRequest } from "../../../auth/userTypes";
import { createTenantAdmin } from "../../../shared/services/userService";

/** ---------------- helpers ---------------- */
function safeStr(v: any) {
  return typeof v === "string" ? v : v == null ? "" : String(v);
}

function orgTypeLabel(t?: OrganizationType | null) {
  const v = safeStr(t);
  return v || "—";
}

function partyLabel(o: Organization) {
  const name = safeStr(o.partyName);
  const abbr = safeStr(o.partyAbbreviation);
  if (!name && !abbr) return "—";
  if (name && abbr) return `${name} (${abbr})`;
  return name || abbr || "—";
}

const ORG_TYPES: OrganizationType[] = [
  "POLITICAL_PARTY",
  "COALITION",
  "NEC",
  "NGO",
  "MEDIA",
  "OTHER",
];

type PartyOption = {
  partyId: string;
  partyName: string;
  abbreviation?: string | null;
};

function unwrapList<T = any>(data: any): T[] {
  if (Array.isArray(data)) return data as T[];
  if (Array.isArray(data?.content)) return data.content as T[];
  if (Array.isArray(data?.items)) return data.items as T[];
  return [];
}

async function fetchParties(): Promise<PartyOption[]> {
  const { data } = await apiClient.get("/parties");
  const rows = unwrapList<PartyOption>(data);

  return rows.map((p: any) => ({
    partyId: safeStr(p.partyId ?? p.id),
    partyName: safeStr(p.partyName ?? p.name),
    abbreviation: safeStr(p.abbreviation ?? p.partyAbbreviation ?? p.abbr) || null,
  }));
}

// ✅ ADD (same validators pattern as UsersPage)
function isValidEmail(email: string) {
  const v = email.trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}
function isValidPhoneDigitsOnly(phone: string) {
  if (!phone.trim()) return true; // optional
  return /^[0-9]+$/.test(phone.trim());
}

export default function OrganizationsPage() {
  const qc = useQueryClient();

  const dashboardMode = useAuthStore((s) => s.dashboardMode);
  const isSystemMode = dashboardMode === "SYSTEM";
  const canEdit = isSystemMode; // ✅ ONLY SYSTEM can manage orgs

  // filters/paging
  const [q, setQ] = useState("");
  const [page, setPage] = useState(0);

  // modal / form
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Organization | null>(null);
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const [form, setForm] = useState({
    orgName: "",
    organizationType: "" as OrganizationType | "",
    subdomain: "",
    primaryColor: "",
    logoUrl: "",
    partyId: "", // ✅ SELECTED PARTY ID (not typed)
  });

  // ✅ ADD: Tenant Admin modal state (Organizations page)
  const [tenantAdminOpen, setTenantAdminOpen] = useState(false);
  const [tenantAdminForm, setTenantAdminForm] = useState({
    orgId: "",
    partyId: "",
    firstName: "",
    lastName: "",
    userName: "",
    email: "",
    position: "",
    phoneNumber: "",
    password: "",
    roleName: "" as RoleName | "",
  });
  const [tenantAdminTouched, setTenantAdminTouched] = useState<{ [k: string]: boolean }>({});
  const [tenantAdminPhoneHasIllegalChar, setTenantAdminPhoneHasIllegalChar] = useState(false);

  function openCreate() {
    if (!canEdit) return;
    setEditing(null);
    setTouched({});
    setForm({
      orgName: "",
      organizationType: "",
      subdomain: "",
      primaryColor: "",
      logoUrl: "",
      partyId: "",
    });
    setModalOpen(true);
  }

  function openEdit(o: Organization) {
    if (!canEdit) return;
    setEditing(o);
    setTouched({});
    setForm({
      orgName: safeStr(o.orgName),
      organizationType: (o.organizationType as any) ?? "",
      subdomain: safeStr(o.subdomain),
      primaryColor: safeStr(o.primaryColor),
      logoUrl: safeStr(o.logoUrl),
      partyId: safeStr(o.partyId), // ✅ select will show name from options
    });
    setModalOpen(true);
  }

  // ✅ ADD: open tenant admin modal (blue btn on this page)
  function openTenantAdminCreate() {
    if (!isSystemMode) return;
    setTenantAdminTouched({});
    setTenantAdminPhoneHasIllegalChar(false);
    setTenantAdminForm({
      orgId: "",
      partyId: "",
      firstName: "",
      lastName: "",
      userName: "",
      email: "",
      position: "",
      phoneNumber: "",
      password: "",
      roleName: "",
    });
    setTenantAdminOpen(true);
  }

  /** ✅ Parties lookup (for create + edit select) */
  const partiesQ = useQuery({
    queryKey: ["lookups", "parties"],
    queryFn: fetchParties,
    enabled: canEdit,
    staleTime: 1000 * 60 * 10,
    retry: 1,
  });

  const partyOptions = useMemo(() => {
    const list = partiesQ.data ?? [];
    const options = list
      .filter((p) => safeStr(p.partyId))
      .map((p) => {
        const abbr = safeStr(p.abbreviation);
        const label = abbr ? `${safeStr(p.partyName)} (${abbr})` : safeStr(p.partyName);
        return { value: safeStr(p.partyId), label };
      })
      .sort((a, b) => a.label.localeCompare(b.label));

    return [{ value: "", label: "None" }, ...options];
  }, [partiesQ.data]);

  const orgsQ = useQuery({
    queryKey: ["orgs", page, q],
    queryFn: () =>
      fetchOrganizations({
        page,
        size: 20,
        search: q.trim() || undefined,
        active: undefined,
        orgType: undefined,
      }),
    staleTime: 10_000,
    retry: 1,
  });

  const rows: Organization[] = useMemo(() => orgsQ.data?.items ?? [], [orgsQ.data]);

  const totalElements = orgsQ.data?.totalElements ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalElements / 20));

  // ✅ ADD: org options for TenantAdminFormModal (loads a bigger list)
  const orgsAllQ = useQuery({
    queryKey: ["lookups", "orgs", "all", "system"],
    queryFn: async () => {
      const res = await fetchOrganizations({
        page: 0,
        size: 200,
        search: undefined,
        active: undefined,
        orgType: undefined,
      } as any);
      return (res.items ?? []) as Organization[];
    },
    enabled: isSystemMode,
    staleTime: 1000 * 60 * 10,
    retry: 1,
  });

  const orgOptions = useMemo(() => {
    return (orgsAllQ.data ?? []).map((o) => ({
      value: o.orgId,
      label: o.subdomain ? `${o.orgName} (${o.subdomain})` : o.orgName,
    }));
  }, [orgsAllQ.data]);

  const refreshNow = async () => {
    await qc.invalidateQueries({ queryKey: ["orgs"] });
    await orgsQ.refetch();
  };

  const activeM = useMutation({
    mutationFn: async (args: { orgId: string; active: boolean }) => {
      if (!canEdit) throw new Error("SYSTEM admin only.");
      await setOrganizationActive(args);
    },
    onSuccess: refreshNow,
  });

  const saveM = useMutation({
    mutationFn: async () => {
      if (!canEdit) throw new Error("SYSTEM admin only.");
      if (!isValid) throw new Error("Please fix validation errors.");

      const common = {
        orgName: form.orgName.trim(),
        organizationType: form.organizationType as OrganizationType,
        subdomain: form.subdomain.trim() || undefined,
        logoUrl: form.logoUrl.trim() || undefined,
        primaryColor: form.primaryColor.trim() || undefined,
        partyId: form.partyId.trim() ? form.partyId.trim() : undefined,
      };

      if (!editing) {
        return await createOrganization({
          ...common,
          isActive: true,
        });
      }

      return await updateOrganization({
        orgId: editing.orgId,
        orgName: common.orgName,
        organizationType: common.organizationType,
        subdomain: form.subdomain.trim() ? form.subdomain.trim() : null,
        logoUrl: form.logoUrl.trim() ? form.logoUrl.trim() : null,
        primaryColor: form.primaryColor.trim() ? form.primaryColor.trim() : null,
        partyId: form.partyId.trim() ? form.partyId.trim() : null,
      });
    },
    onSuccess: async () => {
      await refreshNow();
      setModalOpen(false);
      setEditing(null);
    },
  });

  // ✅ ADD: Create Tenant Admin mutation (used by modal)
  const tenantAdminErrors = useMemo(() => {
    const e: Record<string, string> = {};
    const orgId = tenantAdminForm.orgId.trim();
    const fn = tenantAdminForm.firstName.trim();
    const ln = tenantAdminForm.lastName.trim();
    const un = tenantAdminForm.userName.trim();
    const em = tenantAdminForm.email.trim();
    const rl = String(tenantAdminForm.roleName || "").trim();

    if (!orgId) e.orgId = "Required";
    if (!fn) e.firstName = "Required";
    if (!ln) e.lastName = "Required";
    if (!un) e.userName = "Required";

    if (!em) e.email = "Required";
    else if (!isValidEmail(em)) e.email = "Invalid email";

    if (tenantAdminPhoneHasIllegalChar) e.phoneNumber = "Digits only.";

    if (!tenantAdminForm.password.trim()) e.password = "Required";
    if (!rl) e.roleName = "Required";

    return e;
  }, [tenantAdminForm, tenantAdminPhoneHasIllegalChar]);

  const tenantAdminIsValid = Object.keys(tenantAdminErrors).length === 0;

  const createTenantAdminM = useMutation({
    mutationFn: async () => {
      if (!isSystemMode) throw new Error("SYSTEM only.");
      if (!tenantAdminIsValid) throw new Error("Please fix validation errors.");

      if (
        tenantAdminForm.phoneNumber.trim() &&
        !isValidPhoneDigitsOnly(tenantAdminForm.phoneNumber)
      ) {
        throw new Error("Phone must contain digits only.");
      }

      const payload: UserCreateRequest = {
        firstName: tenantAdminForm.firstName.trim(),
        lastName: tenantAdminForm.lastName.trim(),
        userName: tenantAdminForm.userName.trim(),
        email: tenantAdminForm.email.trim(),
        position: tenantAdminForm.position.trim() || undefined,
        phoneNumber: tenantAdminForm.phoneNumber.trim() || undefined,
        password: tenantAdminForm.password.trim(),
        roleName: tenantAdminForm.roleName as RoleName,
        partyId: tenantAdminForm.partyId.trim() || null,
      } as any;

      return await createTenantAdmin(tenantAdminForm.orgId, payload);
    },
    onSuccess: async () => {
      await refreshNow();
      setTenantAdminOpen(false);
    },
  });

  const errors = useMemo(() => {
    const e: Record<string, string> = {};
    const name = form.orgName.trim();
    const type = safeStr(form.organizationType).trim();

    if (!name) e.orgName = "Required";
    if (!type) e.organizationType = "Required";

    return e;
  }, [form]);

  const isValid = Object.keys(errors).length === 0;

  const typeOptions = useMemo(
    () => [{ value: "", label: "Select type…" }, ...ORG_TYPES.map((t) => ({ value: t, label: t }))],
    []
  );

  return (
    <AdminShell
      title="Admin • Organizations"
      subtitle="System-wide tenant management (SYSTEM only to modify)."
      right={<Badge>{canEdit ? "Editable (SYSTEM)" : "Read-only"}</Badge>}
    >
      <Card
        title="Organizations"
        right={
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={refreshNow}
              disabled={orgsQ.isFetching}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-blue-100 px-3 py-2 text-base font-semibold hover:bg-slate-50 disabled:opacity-50"
            >
              <RefreshCw size={18} />
              Refresh
            </button>

            <button
              type="button"
              onClick={openCreate}
              disabled={!canEdit || saveM.isPending}
              title={canEdit ? "Create Organization" : "SYSTEM only"}
              className="inline-flex items-center gap-2 rounded-xl bg-[#0000CD]  bg-(--org-primary) px-3 py-2 text-lg font-semibold text-white disabled:opacity-50"
            >
              <Plus size={16} />
              Create Organization
            </button>

            {/* ✅ NEW: Blue button on Organizations page */}
            {isSystemMode ? (
              <button
                type="button"
                onClick={openTenantAdminCreate}
                disabled={createTenantAdminM.isPending}
                title="SYSTEM: Create first tenant admin for a target org"
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-3 py-2 text-lg font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
              >
                <UserPlus size={18} />
                Add Tenant Admin
              </button>
            ) : null}
          </div>
        }
      >
        {/* Filters */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex w-full items-center gap-2 sm:max-w-xl">
            <div className="relative w-full">
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
                placeholder="Search organizations..."
                className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-base outline-none focus:ring-2 focus:ring-(--org-primary)"
              />
            </div>
            <button
              type="button"
              onClick={() => {
                setQ("");
                setPage(0);
              }}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-base font-semibold hover:bg-slate-50"
            >
              Clear
            </button>
          </div>
        </div>

        {/* Status messages */}
        <div className="mt-3">
          {orgsQ.isLoading ? (
            <div className="text-sm text-slate-600">Loading organizations…</div>
          ) : orgsQ.isError ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {(orgsQ.error as any)?.message ?? "Failed to load organizations."}
            </div>
          ) : null}
        </div>

        {/* Table */}
        <div className="mt-3 overflow-x-auto rounded-2xl border border-slate-200 bg-white">
          <table className="min-w-1100px w-full">
            <thead className="sticky top-0 z-10 bg-slate-50">
              <tr className="text-left">
                {[
                  "Organization Name",
                  "Organization Type",
                  "Party",
                  "Subdomain",
                  "Status",
                  "Actions",
                ].map((h) => (
                  <th
                    key={h}
                    className="whitespace-nowrap border-b border-slate-200 px-2 py-1 text-base font-extrabold text-slate-700 leading-none"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {rows.length === 0 && !orgsQ.isLoading ? (
                <tr>
                  <td colSpan={6} className="px-2 py-4 text-base text-slate-600">
                    No organizations found.
                  </td>
                </tr>
              ) : (
                rows.map((o) => {
                  const active = !!o.active;
                  return (
                    <tr key={o.orgId} className="hover:bg-slate-50">
                      <td className="border-b border-slate-100 px-2 py-1 align-middle">
                        <div className="text-base font-bold text-slate-900 leading-tight">
                          {safeStr(o.orgName) || "—"}
                        </div>
                      </td>

                      <td className="border-b border-slate-100 px-2 py-1 text-base text-slate-700 align-middle leading-none">
                        {orgTypeLabel(o.organizationType)}
                      </td>

                      <td className="border-b border-slate-100 px-2 py-1 text-base text-slate-700 align-middle leading-none">
                        {partyLabel(o)}
                      </td>

                      <td className="border-b border-slate-100 px-2 py-1 text-base text-slate-700 align-middle leading-none">
                        {safeStr(o.subdomain) || "—"}
                      </td>

                      <td className="border-b border-slate-100 px-2 py-1 text-base align-middle">
                        <span
                          className={[
                            "inline-flex items-center rounded-full px-1.5 py-0 text-base font-extrabold leading-none",
                            active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-700",
                          ].join(" ")}
                        >
                          {active ? "Active" : "Inactive"}
                        </span>
                      </td>

                      <td className="border-b border-slate-100 px-2 py-1 align-middle">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <button
                            type="button"
                            className="h-7 w-7 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-50 inline-flex items-center justify-center mr-4"
                            title={canEdit ? (active ? "Deactivate" : "Activate") : "SYSTEM only"}
                            disabled={!canEdit || activeM.isPending}
                            onClick={() => activeM.mutate({ orgId: o.orgId, active: !active })}
                          >
                            {active ? (
                              <PowerOff size={20} className="text-[#B80000]" />
                            ) : (
                              <Power size={20} className="text-[#028EFB] font-extrabold" />
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => openEdit(o)}
                            disabled={!canEdit || saveM.isPending}
                            title={canEdit ? "Edit" : "SYSTEM only"}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white text-[#008000] -5 px-2 py-1 text-lg font-semibold leading-none hover:bg-slate-50 disabled:opacity-50"
                          >
                            <Pencil size={20} />
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
            <span className="font-bold">{totalPages}</span>
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
              disabled={page >= totalPages - 1}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </button>
          </div>
        </div>

        {/* Notes */}
        <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
          <Note
            title="SYSTEM-only tenant management"
            bullets={[
              "Organizations are tenants and cannot manage themselves.",
              "Only SYSTEM_ADMIN can create/update/activate/deactivate orgs.",
              "NEC/Org dashboards should not show this tab (remove from their nav).",
            ]}
          />
          <Note
            title="Party mapping"
            bullets={[
              "Create/Edit now selects Party by name (from DB).",
              "Table renders party as: Party Name (ABBR), e.g., Unity Party (UP).",
            ]}
          />
        </div>
      </Card>

      {/* Create/Edit Modal */}
            <Modal
        open={modalOpen}
        onClose={() => {
          if (saveM.isPending) return;
          setModalOpen(false);
          setEditing(null);
        }}
        title={editing ? "✏️ Edit Organization" : "🏢 Create Organization"}
        subtitle="SYSTEM only. Required fields must be filled before saving."
        footer={
          <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => {
                if (saveM.isPending) return;
                setModalOpen(false);
                setEditing(null);
              }}
              disabled={saveM.isPending}
              className="px-4 h-10 rounded-lg border border-slate-300 bg-white text-slate-900 text-sm font-semibold hover:bg-slate-50 transition disabled:opacity-50 sm:min-w-fit"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={() => {
                setTouched({
                  orgName: true,
                  organizationType: true,
                });
                if (!isValid) return;
                saveM.mutate();
              }}
              disabled={!canEdit || saveM.isPending || !isValid}
              className={`px-4 h-10 rounded-lg text-sm font-semibold text-white transition flex items-center justify-center gap-2 sm:min-w-fit ${
                !canEdit || saveM.isPending || !isValid
                  ? "bg-slate-300 cursor-not-allowed opacity-60"
                  : "bg-blue-600 hover:bg-blue-700 shadow-sm"
              }`}
            >
              {saveM.isPending ? (
                <>
                  <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span className="hidden sm:inline">Saving…</span>
                </>
              ) : (
                <>
                  <Plus size={16} className="text-red-500" />
                  <span className="hidden sm:inline">
                    {editing ? "Update" : "Create"}
                  </span>
                </>
              )}
            </button>
          </div>
        }
      >
  
        {/* Error Message */}
        {saveM.isError && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3">
            <div className="text-sm text-red-700 font-semibold">
              ⚠️ {(saveM.error as any)?.message ?? "Save failed."}
            </div>
          </div>
        )}

        {/* Form Fields */}
        <div className="space-y-4">
          {/* Row 1: Organization Name & Type */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-slate-900">
                Organization Name <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                value={form.orgName}
                onChange={(v) => setForm((p) => ({ ...p, orgName: v.target.value }))}
                onBlur={() => setTouched((t) => ({ ...t, orgName: true }))}
                placeholder="e.g., Unity Party"
                className={`w-full rounded-lg border px-3 py-2.5 text-base outline-none transition ${
                  touched.orgName && errors.orgName
                    ? "border-red-300 bg-red-50 text-red-900 placeholder:text-red-400 focus:ring-2 focus:ring-red-400"
                    : "border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500"
                }`}
              />
              {touched.orgName && errors.orgName && (
                <div className="text-xs text-red-600 font-semibold">⚠️ {errors.orgName}</div>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-slate-900">
                Organization Type <span className="text-red-600">*</span>
              </label>
              <select
                value={safeStr(form.organizationType)}
                onChange={(v) => setForm((p) => ({ ...p, organizationType: v.target.value as any }))}
                onBlur={() => setTouched((t) => ({ ...t, organizationType: true }))}
                className={`w-full rounded-lg border px-3 py-2.5 text-base outline-none transition ${
                  touched.organizationType && errors.organizationType
                    ? "border-red-300 bg-red-50 text-red-900 focus:ring-2 focus:ring-red-400"
                    : "border-slate-300 bg-white text-slate-900 focus:ring-2 focus:ring-blue-500"
                }`}
              >
                <option value="">Select type…</option>
                {typeOptions.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
              {touched.organizationType && errors.organizationType && (
                <div className="text-xs text-red-600 font-semibold">⚠️ {errors.organizationType}</div>
              )}
            </div>
          </div>

          {/* Row 2: Party & Subdomain */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-slate-900">Party</label>
              <select
                value={form.partyId}
                onChange={(v) => setForm((p) => ({ ...p, partyId: v.target.value }))}
                disabled={partiesQ.isLoading || partiesQ.isError}
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base outline-none focus:ring-2 focus:ring-blue-500 transition disabled:opacity-50 bg-white text-slate-900"
              >
                <option value="">None</option>
                {partyOptions.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-slate-900">Subdomain</label>
              <input
                type="text"
                value={form.subdomain}
                onChange={(v) => setForm((p) => ({ ...p, subdomain: v.target.value }))}
                placeholder="optional"
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base outline-none focus:ring-2 focus:ring-blue-500 transition bg-white text-slate-900 placeholder:text-slate-400"
              />
            </div>
          </div>

          {/* Row 3: Primary Color & Logo URL */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-slate-900">Primary Color</label>
              <input
                type="text"
                value={form.primaryColor}
                onChange={(v) => setForm((p) => ({ ...p, primaryColor: v.target.value }))}
                placeholder="e.g., #0ea5e9"
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base outline-none focus:ring-2 focus:ring-blue-500 transition bg-white text-slate-900 placeholder:text-slate-400"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-slate-900">Logo URL</label>
              <input
                type="text"
                value={form.logoUrl}
                onChange={(v) => setForm((p) => ({ ...p, logoUrl: v.target.value }))}
                placeholder="optional"
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base outline-none focus:ring-2 focus:ring-blue-500 transition bg-white text-slate-900 placeholder:text-slate-400"
              />
            </div>
          </div>

          {/* Helper Text - Party Optional */}
          <div className="rounded-lg bg-blue-50 border border-blue-200 p-3">
            <p className="text-xs sm:text-sm text-blue-800 font-semibold">
              💡 Party is optional. Link this organization to a political party if applicable.
            </p>
          </div>
        </div>
      </Modal>

      {/* ✅ NEW: Tenant Admin Modal on Organizations page */}
      <TenantAdminFormModal
        open={tenantAdminOpen}
        onClose={() => {
          if (createTenantAdminM.isPending) return;
          setTenantAdminOpen(false);
        }}
        createM={createTenantAdminM}
        isValid={tenantAdminIsValid}
        errors={tenantAdminErrors}
        touched={tenantAdminTouched}
        setTouched={setTenantAdminTouched}
        form={tenantAdminForm}
        setForm={setTenantAdminForm}
        phoneHasIllegalChar={tenantAdminPhoneHasIllegalChar}
        setPhoneHasIllegalChar={setTenantAdminPhoneHasIllegalChar}
        orgOptions={orgOptions}
        partyOptions={partyOptions.filter((o) => o.value !== "")} // modal uses its own "None (no party)"
        partiesQ={orgsAllQ.isLoading ? { isLoading: true, isError: false } : partiesQ} // keep same shape expected
      />
    </AdminShell>
  );
}


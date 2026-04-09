// src/pages/admin-security/security/OrganizationsPage.tsx
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

import { RefreshCw, Power, PowerOff, Search, Pencil, Plus } from "lucide-react";

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
  // ✅ Adjust path only if your backend uses something else
  const { data } = await apiClient.get("/parties");
  const rows = unwrapList<PartyOption>(data);

  // normalize keys defensively in case backend uses different naming
  return rows.map((p: any) => ({
    partyId: safeStr(p.partyId ?? p.id),
    partyName: safeStr(p.partyName ?? p.name),
    abbreviation:
      safeStr(p.abbreviation ?? p.partyAbbreviation ?? p.abbr) || null,
  }));
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

  const errors = useMemo(() => {
    const e: Record<string, string> = {};
    const name = form.orgName.trim();
    const type = safeStr(form.organizationType).trim();

    if (!name) e.orgName = "Required";
    if (!type) e.organizationType = "Required";

    return e;
  }, [form]);

  const isValid = Object.keys(errors).length === 0;

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

  /** ✅ Parties lookup (for create + edit select) */
  const partiesQ = useQuery({
    queryKey: ["lookups", "parties"],
    queryFn: fetchParties,
    enabled: canEdit, // system-only page anyway
    staleTime: 1000 * 60 * 10,
    retry: 1,
  });

  const partyOptions = useMemo(() => {
    const list = partiesQ.data ?? [];
    const options = list
      .filter((p) => safeStr(p.partyId))
      .map((p) => {
        const abbr = safeStr(p.abbreviation);
        const label = abbr
          ? `${safeStr(p.partyName)} (${abbr})`
          : safeStr(p.partyName);
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

  const rows: Organization[] = useMemo(
    () => orgsQ.data?.items ?? [],
    [orgsQ.data]
  );

  const totalElements = orgsQ.data?.totalElements ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalElements / 20));

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
        // CREATE
        return await createOrganization({
          ...common,
          isActive: true,
        });
      }

      // UPDATE (allow clearing to null)
      return await updateOrganization({
        orgId: editing.orgId,
        orgName: common.orgName,
        organizationType: common.organizationType,
        subdomain: form.subdomain.trim() ? form.subdomain.trim() : null,
        logoUrl: form.logoUrl.trim() ? form.logoUrl.trim() : null,
        primaryColor: form.primaryColor.trim()
          ? form.primaryColor.trim()
          : null,
        partyId: form.partyId.trim() ? form.partyId.trim() : null,
      });
    },
    onSuccess: async () => {
      await refreshNow();
      setModalOpen(false);
      setEditing(null);
    },
  });

  const typeOptions = useMemo(
    () => [
      { value: "", label: "Select type…" },
      ...ORG_TYPES.map((t) => ({ value: t, label: t })),
    ],
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
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50"
            >
              <RefreshCw size={16} />
              Refresh
            </button>

            <button
              type="button"
              onClick={openCreate}
              disabled={!canEdit || saveM.isPending}
              title={canEdit ? "Create Organization" : "SYSTEM only"}
              className="inline-flex items-center gap-2 rounded-xl bg-(--org-primary) px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              <Plus size={16} />
              Create Organization
            </button>
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
                className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-(--org-primary)"
              />
            </div>
            <button
              type="button"
              onClick={() => {
                setQ("");
                setPage(0);
              }}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold hover:bg-slate-50"
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
                  "Org Name",
                  "Type",
                  "Party",
                  "Subdomain",
                  "Status",
                  "Actions",
                ].map((h) => (
                  <th
                    key={h}
                    className="whitespace-nowrap border-b border-slate-200 px-2 py-1 text-[11px] font-extrabold text-slate-700 leading-none"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {rows.length === 0 && !orgsQ.isLoading ? (
                <tr>
                  <td colSpan={6} className="px-2 py-4 text-sm text-slate-600">
                    No organizations found.
                  </td>
                </tr>
              ) : (
                rows.map((o) => {
                  const active = !!o.active;
                  return (
                    <tr key={o.orgId} className="hover:bg-slate-50">
                      <td className="border-b border-slate-100 px-2 py-1 align-middle">
                        <div className="text-sm font-bold text-slate-900 leading-tight">
                          {safeStr(o.orgName) || "—"}
                        </div>
                      </td>

                      <td className="border-b border-slate-100 px-2 py-1 text-sm text-slate-700 align-middle leading-none">
                        {orgTypeLabel(o.organizationType)}
                      </td>

                      <td className="border-b border-slate-100 px-2 py-1 text-sm text-slate-700 align-middle leading-none">
                        {partyLabel(o)}
                      </td>

                      <td className="border-b border-slate-100 px-2 py-1 text-sm text-slate-700 align-middle leading-none">
                        {safeStr(o.subdomain) || "—"}
                      </td>

                      <td className="border-b border-slate-100 px-2 py-1 text-sm align-middle">
                        <span
                          className={[
                            "inline-flex items-center rounded-full px-1.5 py-0 text-[11px] font-extrabold leading-none",
                            active
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-slate-100 text-slate-700",
                          ].join(" ")}
                        >
                          {active ? "Active" : "Inactive"}
                        </span>
                      </td>

                      <td className="border-b border-slate-100 px-2 py-1 align-middle">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <button
                            type="button"
                            className="h-7 w-7 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-50 inline-flex items-center justify-center"
                            title={
                              canEdit
                                ? active
                                  ? "Deactivate"
                                  : "Activate"
                                : "SYSTEM only"
                            }
                            disabled={!canEdit || activeM.isPending}
                            onClick={() =>
                              activeM.mutate({
                                orgId: o.orgId,
                                active: !active,
                              })
                            }
                          >
                            {active ? (
                              <PowerOff size={14} className="text-amber-600" />
                            ) : (
                              <Power size={14} className="text-emerald-600" />
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => openEdit(o)}
                            disabled={!canEdit || saveM.isPending}
                            title={canEdit ? "Edit" : "SYSTEM only"}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm font-semibold leading-none hover:bg-slate-50 disabled:opacity-50"
                          >
                            <Pencil size={14} />
                            {/* Edit */}
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
          <div className="text-xs text-slate-600">
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
        title={editing ? "Edit Organization" : "Create Organization"}
        subtitle="SYSTEM only. Required fields must be filled before saving."
        footer={
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                if (saveM.isPending) return;
                setModalOpen(false);
                setEditing(null);
              }}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold hover:bg-slate-50"
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
              className="rounded-xl bg-(--org-primary) px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {saveM.isPending ? "Saving…" : "Save"}
            </button>
          </div>
        }
      >
        {saveM.isError ? (
          <div className="mb-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {(saveM.error as any)?.message ?? "Save failed."}
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <TextField
            label="Org Name"
            required
            value={form.orgName}
            onChange={(v) => setForm((p) => ({ ...p, orgName: v }))}
            error={touched.orgName ? errors.orgName : ""}
            onBlur={() => setTouched((t) => ({ ...t, orgName: true }))}
          />

          <SelectField
            label="Type"
            required
            value={safeStr(form.organizationType)}
            onChange={(v) =>
              setForm((p) => ({ ...p, organizationType: v as any }))
            }
            options={typeOptions}
            error={touched.organizationType ? errors.organizationType : ""}
            onBlur={() => setTouched((t) => ({ ...t, organizationType: true }))}
          />

          {/* ✅ Party select (name instead of id) */}
          <SelectField
            label="Party"
            value={form.partyId}
            onChange={(v) => setForm((p) => ({ ...p, partyId: v }))}
            options={partyOptions}
            disabled={partiesQ.isLoading || partiesQ.isError}
            helper={
              partiesQ.isLoading
                ? "Loading parties…"
                : partiesQ.isError
                ? "Failed to load parties"
                : "Optional: link org to a party"
            }
          />

          <TextField
            label="Subdomain"
            value={form.subdomain}
            onChange={(v) => setForm((p) => ({ ...p, subdomain: v }))}
            placeholder="optional"
          />

          <TextField
            label="Primary Color"
            value={form.primaryColor}
            onChange={(v) => setForm((p) => ({ ...p, primaryColor: v }))}
            placeholder="optional (e.g. #0ea5e9)"
          />

          <TextField
            label="Logo URL"
            value={form.logoUrl}
            onChange={(v) => setForm((p) => ({ ...p, logoUrl: v }))}
            placeholder="optional"
          />
        </div>
      </Modal>
    </AdminShell>
  );
}

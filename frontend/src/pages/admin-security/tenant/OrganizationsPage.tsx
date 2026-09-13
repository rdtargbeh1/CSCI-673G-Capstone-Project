// src/pages/admin-security/tenant/OrganizationsPage.tsx

import { useMemo, useState } from "react";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useNavigate } from "react-router-dom";

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

import { AdminShell, Badge, Card, Note, Modal } from "../shared/admin-ui";

import {
  RefreshCw,
  Power,
  PowerOff,
  Search,
  Pencil,
  Plus,
  UserPlus,
} from "lucide-react";

// ============================================================================
// HELPERS
// ============================================================================

function safeStr(value: any) {
  return typeof value === "string" ? value : value == null ? "" : String(value);
}

function orgTypeLabel(type?: OrganizationType | null) {
  const value = safeStr(type);

  return value || "—";
}

function partyLabel(organization: Organization) {
  const name = safeStr(organization.partyName);

  const abbreviation = safeStr(organization.partyAbbreviation);

  if (!name && !abbreviation) {
    return "—";
  }

  if (name && abbreviation) {
    return `${name} (${abbreviation})`;
  }

  return name || abbreviation || "—";
}

// ============================================================================
// ORGANIZATION TYPES
// ============================================================================

const ORG_TYPES: OrganizationType[] = [
  "POLITICAL_PARTY",
  "COALITION",
  "NEC",
  "NGO",
  "MEDIA",
  "OTHER",
];

// ============================================================================
// PARTY OPTION
// ============================================================================

type PartyOption = {
  partyId: string;
  partyName: string;
  abbreviation?: string | null;
};

// ============================================================================
// RESPONSE LIST HELPER
// ============================================================================

function unwrapList<T = any>(data: any): T[] {
  if (Array.isArray(data)) {
    return data as T[];
  }

  if (Array.isArray(data?.content)) {
    return data.content as T[];
  }

  if (Array.isArray(data?.items)) {
    return data.items as T[];
  }

  return [];
}

// ============================================================================
// PARTY LOOKUP
// ============================================================================

async function fetchParties(): Promise<PartyOption[]> {
  const { data } = await apiClient.get("/parties");

  const rows = unwrapList<PartyOption>(data);

  return rows.map((party: any) => ({
    partyId: safeStr(party.partyId ?? party.id),

    partyName: safeStr(party.partyName ?? party.name),

    abbreviation:
      safeStr(party.abbreviation ?? party.partyAbbreviation ?? party.abbr) ||
      null,
  }));
}

// ============================================================================
// PAGE
// ============================================================================

export default function OrganizationsPage() {
  const navigate = useNavigate();

  const queryClient = useQueryClient();

  // ==========================================================================
  // AUTH CONTEXT
  // ==========================================================================

  const dashboardMode = useAuthStore((state) => state.dashboardMode);

  const isSystemMode = dashboardMode === "SYSTEM";

  /*
   * Organization management remains SYSTEM-only.
   */
  const canEdit = isSystemMode;

  // ==========================================================================
  // FILTER / PAGING
  // ==========================================================================

  const [q, setQ] = useState("");

  const [page, setPage] = useState(0);

  // ==========================================================================
  // ORGANIZATION CREATE / EDIT FORM
  // ==========================================================================

  const [modalOpen, setModalOpen] = useState(false);

  const [editing, setEditing] = useState<Organization | null>(null);

  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const [form, setForm] = useState({
    orgName: "",
    organizationType: "" as OrganizationType | "",
    subdomain: "",
    primaryColor: "",
    logoUrl: "",
    partyId: "",
  });

  // ==========================================================================
  // OPEN CREATE ORGANIZATION
  // ==========================================================================

  function openCreate() {
    if (!canEdit) {
      return;
    }

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

  // ==========================================================================
  // OPEN EDIT ORGANIZATION
  // ==========================================================================

  function openEdit(organization: Organization) {
    if (!canEdit) {
      return;
    }

    setEditing(organization);

    setTouched({});

    setForm({
      orgName: safeStr(organization.orgName),

      organizationType: (organization.organizationType as any) ?? "",

      subdomain: safeStr(organization.subdomain),

      primaryColor: safeStr(organization.primaryColor),

      logoUrl: safeStr(organization.logoUrl),

      partyId: safeStr(organization.partyId),
    });

    setModalOpen(true);
  }

  // ==========================================================================
  // OPEN TENANT ADMIN PAGE
  //
  // Tenant administrator creation is now a dedicated page owned by:
  //
  // /admin-security/tenant/admins/new
  //
  // OrganizationsPage no longer owns tenant-admin form state or mutations.
  // ==========================================================================

  function openTenantAdminCreate() {
    if (!isSystemMode) {
      return;
    }

    navigate("/admin-security/tenant/admins/new");
  }

  // ==========================================================================
  // PARTIES
  //
  // Still required by organization Create/Edit.
  // ==========================================================================

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
      .filter((party) => safeStr(party.partyId))
      .map((party) => {
        const abbreviation = safeStr(party.abbreviation);

        const label = abbreviation
          ? `${safeStr(party.partyName)} (${abbreviation})`
          : safeStr(party.partyName);

        return {
          value: safeStr(party.partyId),

          label,
        };
      })
      .sort((a, b) => a.label.localeCompare(b.label));

    return [
      {
        value: "",
        label: "None",
      },

      ...options,
    ];
  }, [partiesQ.data]);

  // ==========================================================================
  // ORGANIZATIONS
  // ==========================================================================

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
    [orgsQ.data],
  );

  const totalElements = orgsQ.data?.totalElements ?? 0;

  const totalPages = Math.max(1, Math.ceil(totalElements / 20));

  // ==========================================================================
  // REFRESH
  // ==========================================================================

  const refreshNow = async () => {
    await queryClient.invalidateQueries({
      queryKey: ["orgs"],
    });

    await orgsQ.refetch();
  };

  // ==========================================================================
  // ACTIVE / INACTIVE
  // ==========================================================================

  const activeM = useMutation({
    mutationFn: async (args: { orgId: string; active: boolean }) => {
      if (!canEdit) {
        throw new Error("SYSTEM admin only.");
      }

      await setOrganizationActive(args);
    },

    onSuccess: refreshNow,
  });

  // ==========================================================================
  // ORGANIZATION FORM VALIDATION
  // ==========================================================================

  const errors = useMemo(() => {
    const result: Record<string, string> = {};

    const name = form.orgName.trim();

    const type = safeStr(form.organizationType).trim();

    if (!name) {
      result.orgName = "Required";
    }

    if (!type) {
      result.organizationType = "Required";
    }

    return result;
  }, [form]);

  const isValid = Object.keys(errors).length === 0;

  // ==========================================================================
  // CREATE / UPDATE ORGANIZATION
  // ==========================================================================

  const saveM = useMutation({
    mutationFn: async () => {
      if (!canEdit) {
        throw new Error("SYSTEM admin only.");
      }

      if (!isValid) {
        throw new Error("Please fix validation errors.");
      }

      const common = {
        orgName: form.orgName.trim(),

        organizationType: form.organizationType as OrganizationType,

        subdomain: form.subdomain.trim() || undefined,

        logoUrl: form.logoUrl.trim() || undefined,

        primaryColor: form.primaryColor.trim() || undefined,

        partyId: form.partyId.trim() ? form.partyId.trim() : undefined,
      };

      // ================================================================
      // CREATE
      // ================================================================

      if (!editing) {
        return await createOrganization({
          ...common,
          isActive: true,
        });
      }

      // ================================================================
      // UPDATE
      // ================================================================

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

  // ==========================================================================
  // ORGANIZATION TYPE OPTIONS
  // ==========================================================================

  const typeOptions = useMemo(
    () => [
      {
        value: "",
        label: "Select type…",
      },

      ...ORG_TYPES.map((type) => ({
        value: type,

        label: type,
      })),
    ],
    [],
  );

  // ==========================================================================
  // RENDER
  // ==========================================================================

  return (
    <AdminShell
      title="Admin • Organizations"
      subtitle="System-wide tenant management (SYSTEM only to modify)."
      right={<Badge>{canEdit ? "Editable (SYSTEM)" : "Read-only"}</Badge>}
    >
      <Card
        title="Organizations"
        right={
          <div
            className="
              flex
              flex-wrap
              items-center
              gap-2
            "
          >
            {/* ============================================================ */}
            {/* REFRESH */}
            {/* ============================================================ */}
            <button
              type="button"
              onClick={refreshNow}
              disabled={orgsQ.isFetching}
              className="
                inline-flex
                items-center
                gap-2
                rounded-xl
                border
                border-slate-200
                bg-blue-100
                px-3
                py-2
                text-base
                font-semibold
                hover:bg-slate-50
                disabled:opacity-50
              "
            >
              <RefreshCw
                size={18}
                className={orgsQ.isFetching ? "animate-spin" : ""}
              />
              Refresh
            </button>
            {/* ============================================================ */}
            {/* CREATE ORGANIZATION */}
            {/* ============================================================ */}
            <button
              type="button"
              onClick={openCreate}
              disabled={!canEdit || saveM.isPending}
              title={canEdit ? "Create Organization" : "SYSTEM only"}
              className="
                inline-flex
                items-center
                gap-2
                rounded-xl
                bg-[#0000CD]
                bg-(--org-primary)
                px-3
                py-2
                text-lg
                font-semibold
                text-white
                disabled:opacity-50
              "
            >
              <Plus size={16} />
              Create Organization
            </button>
            {/* ============================================================ */}
            {/* CREATE TENANT ADMIN */}
            {/* ============================================================ */}
            {isSystemMode ? (
              <button
                type="button"
                onClick={openTenantAdminCreate}
                title="SYSTEM: Create first tenant administrator"
                className="
                  inline-flex
                  items-center
                  gap-2
                  rounded-xl
                  bg-blue-600
                  px-3
                  py-2
                  text-lg
                  font-semibold
                  text-white
                  transition
                  hover:bg-blue-700
                "
              >
                <UserPlus size={18} />
                Create Tenant Admin
              </button>
            ) : null}
          </div>
        }
      >
        {/* ================================================================== */}
        {/* FILTERS */}
        {/* ================================================================== */}

        <div
          className="
            flex
            flex-col
            gap-2

            sm:flex-row
            sm:items-center
            sm:justify-between
          "
        >
          <div
            className="
              flex
              w-full
              items-center
              gap-2

              sm:max-w-xl
            "
          >
            <div
              className="
                relative
                w-full
              "
            >
              <Search
                className="
                  absolute
                  left-3
                  top-1/2
                  -translate-y-1/2
                  text-slate-400
                "
                size={16}
              />

              <input
                value={q}
                onChange={(event) => {
                  setQ(event.target.value);

                  setPage(0);
                }}
                placeholder="Search organizations..."
                className="
                  w-full
                  rounded-xl
                  border
                  border-slate-200
                  bg-white
                  py-2
                  pl-9
                  pr-3
                  text-base
                  outline-none
                  focus:ring-2
                  focus:ring-(--org-primary)
                "
              />
            </div>

            <button
              type="button"
              onClick={() => {
                setQ("");

                setPage(0);
              }}
              className="
                rounded-xl
                border
                border-slate-200
                bg-white
                px-3
                py-2
                text-base
                font-semibold
                hover:bg-slate-50
              "
            >
              Clear
            </button>
          </div>
        </div>

        {/* ================================================================== */}
        {/* STATUS */}
        {/* ================================================================== */}

        <div className="mt-3">
          {orgsQ.isLoading ? (
            <div
              className="
                text-sm
                text-slate-600
              "
            >
              Loading organizations…
            </div>
          ) : orgsQ.isError ? (
            <div
              className="
                rounded-xl
                border
                border-red-200
                bg-red-50
                p-3
                text-sm
                text-red-700
              "
            >
              {(orgsQ.error as any)?.message ?? "Failed to load organizations."}
            </div>
          ) : null}
        </div>

        {/* ================================================================== */}
        {/* TABLE */}
        {/* ================================================================== */}

        <div
          className="
            mt-3
            overflow-x-auto
            rounded-2xl
            border
            border-slate-200
            bg-white
          "
        >
          <table
            className="
              min-w-1100px
              w-full
            "
          >
            <thead
              className="
                sticky
                top-0
                z-10
                bg-slate-50
              "
            >
              <tr className="text-left">
                {[
                  "Organization Name",
                  "Organization Type",
                  "Party",
                  "Subdomain",
                  "Status",
                  "Actions",
                ].map((heading) => (
                  <th
                    key={heading}
                    className="
                        whitespace-nowrap
                        border-b
                        border-slate-200
                        px-2
                        py-1
                        text-base
                        font-extrabold
                        leading-none
                        text-slate-700
                      "
                  >
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {rows.length === 0 && !orgsQ.isLoading ? (
                <tr>
                  <td
                    colSpan={6}
                    className="
                      px-2
                      py-4
                      text-base
                      text-slate-600
                    "
                  >
                    No organizations found.
                  </td>
                </tr>
              ) : (
                rows.map((organization) => {
                  const active = Boolean(organization.active);

                  return (
                    <tr
                      key={organization.orgId}
                      className="
                          hover:bg-slate-50
                        "
                    >
                      {/* ================================================= */}
                      {/* NAME */}
                      {/* ================================================= */}

                      <td
                        className="
                            border-b
                            border-slate-100
                            px-2
                            py-1
                            align-middle
                          "
                      >
                        <div
                          className="
                              text-base
                              font-bold
                              leading-tight
                              text-slate-900
                            "
                        >
                          {safeStr(organization.orgName) || "—"}
                        </div>
                      </td>

                      {/* ================================================= */}
                      {/* TYPE */}
                      {/* ================================================= */}

                      <td
                        className="
                            border-b
                            border-slate-100
                            px-2
                            py-1
                            align-middle
                            text-base
                            leading-none
                            text-slate-700
                          "
                      >
                        {orgTypeLabel(organization.organizationType)}
                      </td>

                      {/* ================================================= */}
                      {/* PARTY */}
                      {/* ================================================= */}

                      <td
                        className="
                            border-b
                            border-slate-100
                            px-2
                            py-1
                            align-middle
                            text-base
                            leading-none
                            text-slate-700
                          "
                      >
                        {partyLabel(organization)}
                      </td>

                      {/* ================================================= */}
                      {/* SUBDOMAIN */}
                      {/* ================================================= */}

                      <td
                        className="
                            border-b
                            border-slate-100
                            px-2
                            py-1
                            align-middle
                            text-base
                            leading-none
                            text-slate-700
                          "
                      >
                        {safeStr(organization.subdomain) || "—"}
                      </td>

                      {/* ================================================= */}
                      {/* STATUS */}
                      {/* ================================================= */}

                      <td
                        className="
                            border-b
                            border-slate-100
                            px-2
                            py-1
                            align-middle
                            text-base
                          "
                      >
                        <span
                          className={[
                            `
                                inline-flex
                                items-center
                                rounded-full
                                px-1.5
                                py-0
                                text-base
                                font-extrabold
                                leading-none
                              `,
                            active
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-slate-100 text-slate-700",
                          ].join(" ")}
                        >
                          {active ? "Active" : "Inactive"}
                        </span>
                      </td>

                      {/* ================================================= */}
                      {/* ACTIONS */}
                      {/* ================================================= */}

                      <td
                        className="
                            border-b
                            border-slate-100
                            px-2
                            py-1
                            align-middle
                          "
                      >
                        <div
                          className="
                              flex
                              flex-wrap
                              items-center
                              gap-1.5
                            "
                        >
                          {/* ACTIVE */}

                          <button
                            type="button"
                            className="
                                mr-4
                                inline-flex
                                h-7
                                w-7
                                items-center
                                justify-center
                                rounded-lg
                                border
                                border-slate-200
                                hover:bg-slate-50
                                disabled:opacity-50
                              "
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
                                orgId: organization.orgId,

                                active: !active,
                              })
                            }
                          >
                            {active ? (
                              <PowerOff size={20} className="text-[#B80000]" />
                            ) : (
                              <Power
                                size={20}
                                className="
                                    font-extrabold
                                    text-[#028EFB]
                                  "
                              />
                            )}
                          </button>

                          {/* EDIT */}

                          <button
                            type="button"
                            onClick={() => openEdit(organization)}
                            disabled={!canEdit || saveM.isPending}
                            title={canEdit ? "Edit" : "SYSTEM only"}
                            className="
                                inline-flex
                                items-center
                                gap-1.5
                                rounded-lg
                                border
                                border-slate-200
                                bg-white
                                px-2
                                py-1
                                text-lg
                                font-semibold
                                leading-none
                                text-[#008000]
                                hover:bg-slate-50
                                disabled:opacity-50
                              "
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

        {/* ================================================================== */}
        {/* PAGINATION */}
        {/* ================================================================== */}

        <div
          className="
            mt-3
            flex
            items-center
            justify-between
          "
        >
          <div
            className="
              text-sm
              text-slate-600
            "
          >
            Page <span className="font-bold">{page + 1}</span> of{" "}
            <span className="font-bold">{totalPages}</span>
          </div>

          <div
            className="
              flex
              items-center
              gap-2
            "
          >
            <button
              type="button"
              className="
                rounded-xl
                border
                border-slate-200
                bg-white
                px-3
                py-2
                text-sm
                font-semibold
                hover:bg-slate-50
                disabled:opacity-50
              "
              disabled={page <= 0}
              onClick={() => setPage((current) => Math.max(0, current - 1))}
            >
              Prev
            </button>

            <button
              type="button"
              className="
                rounded-xl
                border
                border-slate-200
                bg-white
                px-3
                py-2
                text-sm
                font-semibold
                hover:bg-slate-50
                disabled:opacity-50
              "
              disabled={page >= totalPages - 1}
              onClick={() => setPage((current) => current + 1)}
            >
              Next
            </button>
          </div>
        </div>

        {/* ================================================================== */}
        {/* NOTES */}
        {/* ================================================================== */}

        <div
          className="
            mt-3
            grid
            grid-cols-1
            gap-3

            lg:grid-cols-2
          "
        >
          <Note
            title="SYSTEM-only tenant management"
            bullets={[
              "Organizations are tenants and cannot manage themselves.",
              "Only SYSTEM_ADMIN can create/update/activate/deactivate orgs.",
              "NEC/Org dashboards should not show this tab.",
            ]}
          />

          <Note
            title="Party mapping"
            bullets={[
              "Create/Edit selects Party by name from the database.",
              "The organization table displays Party Name and abbreviation when available.",
            ]}
          />
        </div>
      </Card>
      {/* ==================================================================== */}
      {/* CREATE / EDIT ORGANIZATION MODAL */}
      // // This modal remains because it belongs to organization management. //
      // Tenant-admin creation is no longer rendered here.
      {/* ==================================================================== */}
      <Modal
        open={modalOpen}
        onClose={() => {
          if (saveM.isPending) {
            return;
          }

          setModalOpen(false);

          setEditing(null);
        }}
        title={editing ? "✏️ Edit Organization" : "🏢 Create Organization"}
        subtitle="SYSTEM only. Required fields must be filled before saving."
        footer={
          <div
            className="
              flex
              flex-col-reverse
              items-stretch
              justify-end
              gap-2

              sm:flex-row
              sm:items-center
              sm:gap-3
            "
          >
            <button
              type="button"
              onClick={() => {
                if (saveM.isPending) {
                  return;
                }

                setModalOpen(false);

                setEditing(null);
              }}
              disabled={saveM.isPending}
              className="
                h-10
                rounded-lg
                border
                border-slate-300
                bg-white
                px-4
                text-sm
                font-semibold
                text-slate-900
                transition
                hover:bg-slate-50
                disabled:opacity-50
              "
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

                if (!isValid) {
                  return;
                }

                saveM.mutate();
              }}
              disabled={!canEdit || saveM.isPending || !isValid}
              className={[
                `
                  flex
                  h-10
                  items-center
                  justify-center
                  gap-2
                  rounded-lg
                  px-4
                  text-sm
                  font-semibold
                  text-white
                  transition
                `,
                !canEdit || saveM.isPending || !isValid
                  ? `
                      cursor-not-allowed
                      bg-slate-300
                      opacity-60
                    `
                  : `
                      bg-blue-600
                      shadow-sm
                      hover:bg-blue-700
                    `,
              ].join(" ")}
            >
              {saveM.isPending ? (
                <>
                  <div
                    className="
                      h-3
                      w-3
                      animate-spin
                      rounded-full
                      border-2
                      border-white
                      border-t-transparent
                    "
                  />

                  <span>Saving…</span>
                </>
              ) : (
                <>
                  <Plus size={16} className="text-red-500" />

                  <span>{editing ? "Update" : "Create"}</span>
                </>
              )}
            </button>
          </div>
        }
      >
        {/* ================================================================== */}
        {/* SAVE ERROR */}
        {/* ================================================================== */}

        {saveM.isError ? (
          <div
            className="
              mb-4
              rounded-lg
              border
              border-red-200
              bg-red-50
              p-3
            "
          >
            <div
              className="
                text-sm
                font-semibold
                text-red-700
              "
            >
              ⚠️ {(saveM.error as any)?.message ?? "Save failed."}
            </div>
          </div>
        ) : null}

        {/* ================================================================== */}
        {/* FORM */}
        {/* ================================================================== */}

        <div className="space-y-4">
          {/* ================================================================ */}
          {/* NAME + TYPE */}
          {/* ================================================================ */}

          <div
            className="
              grid
              grid-cols-1
              gap-4

              sm:grid-cols-2
            "
          >
            {/* NAME */}

            <div
              className="
                flex
                flex-col
                gap-2
              "
            >
              <label
                className="
                  text-sm
                  font-semibold
                  text-slate-900
                "
              >
                Organization Name <span className="text-red-600">*</span>
              </label>

              <input
                type="text"
                value={form.orgName}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,

                    orgName: event.target.value,
                  }))
                }
                onBlur={() =>
                  setTouched((current) => ({
                    ...current,

                    orgName: true,
                  }))
                }
                placeholder="e.g., Unity Party"
                className={[
                  `
                    w-full
                    rounded-lg
                    border
                    px-3
                    py-2.5
                    text-base
                    outline-none
                    transition
                  `,
                  touched.orgName && errors.orgName
                    ? `
                        border-red-300
                        bg-red-50
                        text-red-900
                        placeholder:text-red-400
                        focus:ring-2
                        focus:ring-red-400
                      `
                    : `
                        border-slate-300
                        bg-white
                        text-slate-900
                        placeholder:text-slate-400
                        focus:ring-2
                        focus:ring-blue-500
                      `,
                ].join(" ")}
              />

              {touched.orgName && errors.orgName ? (
                <div
                  className="
                    text-xs
                    font-semibold
                    text-red-600
                  "
                >
                  ⚠️ {errors.orgName}
                </div>
              ) : null}
            </div>

            {/* TYPE */}

            <div
              className="
                flex
                flex-col
                gap-2
              "
            >
              <label
                className="
                  text-sm
                  font-semibold
                  text-slate-900
                "
              >
                Organization Type <span className="text-red-600">*</span>
              </label>

              <select
                value={safeStr(form.organizationType)}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,

                    organizationType: event.target.value as any,
                  }))
                }
                onBlur={() =>
                  setTouched((current) => ({
                    ...current,

                    organizationType: true,
                  }))
                }
                className={[
                  `
                    w-full
                    rounded-lg
                    border
                    px-3
                    py-2.5
                    text-base
                    outline-none
                    transition
                  `,
                  touched.organizationType && errors.organizationType
                    ? `
                        border-red-300
                        bg-red-50
                        text-red-900
                        focus:ring-2
                        focus:ring-red-400
                      `
                    : `
                        border-slate-300
                        bg-white
                        text-slate-900
                        focus:ring-2
                        focus:ring-blue-500
                      `,
                ].join(" ")}
              >
                <option value="">Select type…</option>

                {typeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>

              {touched.organizationType && errors.organizationType ? (
                <div
                  className="
                    text-xs
                    font-semibold
                    text-red-600
                  "
                >
                  ⚠️ {errors.organizationType}
                </div>
              ) : null}
            </div>
          </div>

          {/* ================================================================ */}
          {/* PARTY + SUBDOMAIN */}
          {/* ================================================================ */}

          <div
            className="
              grid
              grid-cols-1
              gap-4

              sm:grid-cols-2
            "
          >
            {/* PARTY */}

            <div
              className="
                flex
                flex-col
                gap-2
              "
            >
              <label
                className="
                  text-sm
                  font-semibold
                  text-slate-900
                "
              >
                Party
              </label>

              <select
                value={form.partyId}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,

                    partyId: event.target.value,
                  }))
                }
                disabled={partiesQ.isLoading || partiesQ.isError}
                className="
                  w-full
                  rounded-lg
                  border
                  border-slate-300
                  bg-white
                  px-3
                  py-2.5
                  text-base
                  text-slate-900
                  outline-none
                  transition
                  focus:ring-2
                  focus:ring-blue-500
                  disabled:opacity-50
                "
              >
                <option value="">None</option>

                {partyOptions
                  .filter((option) => option.value !== "")
                  .map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
              </select>
            </div>

            {/* SUBDOMAIN */}

            <div
              className="
                flex
                flex-col
                gap-2
              "
            >
              <label
                className="
                  text-sm
                  font-semibold
                  text-slate-900
                "
              >
                Subdomain
              </label>

              <input
                type="text"
                value={form.subdomain}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,

                    subdomain: event.target.value,
                  }))
                }
                placeholder="optional"
                className="
                  w-full
                  rounded-lg
                  border
                  border-slate-300
                  bg-white
                  px-3
                  py-2.5
                  text-base
                  text-slate-900
                  outline-none
                  transition
                  placeholder:text-slate-400
                  focus:ring-2
                  focus:ring-blue-500
                "
              />
            </div>
          </div>

          {/* ================================================================ */}
          {/* COLOR + LOGO URL */}
          {/* ================================================================ */}

          <div
            className="
              grid
              grid-cols-1
              gap-4

              sm:grid-cols-2
            "
          >
            {/* COLOR */}

            <div
              className="
                flex
                flex-col
                gap-2
              "
            >
              <label
                className="
                  text-sm
                  font-semibold
                  text-slate-900
                "
              >
                Primary Color
              </label>

              <input
                type="text"
                value={form.primaryColor}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,

                    primaryColor: event.target.value,
                  }))
                }
                placeholder="e.g., #0ea5e9"
                className="
                  w-full
                  rounded-lg
                  border
                  border-slate-300
                  bg-white
                  px-3
                  py-2.5
                  text-base
                  text-slate-900
                  outline-none
                  transition
                  placeholder:text-slate-400
                  focus:ring-2
                  focus:ring-blue-500
                "
              />
            </div>

            {/* LOGO */}

            <div
              className="
                flex
                flex-col
                gap-2
              "
            >
              <label
                className="
                  text-sm
                  font-semibold
                  text-slate-900
                "
              >
                Logo URL
              </label>

              <input
                type="text"
                value={form.logoUrl}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,

                    logoUrl: event.target.value,
                  }))
                }
                placeholder="optional"
                className="
                  w-full
                  rounded-lg
                  border
                  border-slate-300
                  bg-white
                  px-3
                  py-2.5
                  text-base
                  text-slate-900
                  outline-none
                  transition
                  placeholder:text-slate-400
                  focus:ring-2
                  focus:ring-blue-500
                "
              />
            </div>
          </div>

          {/* ================================================================ */}
          {/* PARTY NOTE */}
          {/* ================================================================ */}

          <div
            className="
              rounded-lg
              border
              border-blue-200
              bg-blue-50
              p-3
            "
          >
            <p
              className="
                text-xs
                font-semibold
                text-blue-800

                sm:text-sm
              "
            >
              💡 Party is optional. Link this organization to a political party
              if applicable.
            </p>
          </div>
        </div>
      </Modal>
    </AdminShell>
  );
}

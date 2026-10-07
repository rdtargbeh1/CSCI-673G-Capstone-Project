import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation, useNavigate } from "react-router-dom";
import {
  AlertCircle,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  X,
} from "lucide-react";

import { useAuthStore } from "../../shared/store/authStore";

import {
  deleteCounty,
  fetchCounties,
  updateCounty,
  type CountyDto,
} from "../../shared/services/countyService";

import { Badge, Card, Note, PageShell } from "./shared/geo-ui";

// ============================================================================
// HELPERS
// ============================================================================

function safeStr(value: unknown) {
  return typeof value === "string" ? value : value == null ? "" : String(value);
}

function normalizeName(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

// ============================================================================
// COUNTIES PAGE
// ============================================================================

export default function CountiesPage() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const queryClient = useQueryClient();

  // ==========================================================================
  // PORTAL CONTEXT
  // ==========================================================================
  //
  // Operations Geography is always read-only.
  //
  // Administrative / Setup keeps the existing NEC / SYSTEM permissions.
  //
  // ==========================================================================

  const isOperations =
    pathname === "/operations" || pathname.startsWith("/operations/");

  const dashboardMode = useAuthStore((state) => state.dashboardMode);

  const hasAdministrativeEditAccess =
    dashboardMode === "NEC" || dashboardMode === "SYSTEM";

  const canEdit = !isOperations && hasAdministrativeEditAccess;

  // ==========================================================================
  // STATE
  // ==========================================================================

  const [q, setQ] = useState("");

  const [editing, setEditing] = useState<CountyDto | null>(null);

  const [name, setName] = useState("");

  // ==========================================================================
  // COUNTIES QUERY
  // ==========================================================================

  const countiesQuery = useQuery({
    queryKey: ["counties", q],

    queryFn: () =>
      fetchCounties({
        page: 0,
        size: 250,
        q: q.trim() || undefined,
      }),

    staleTime: 10_000,

    retry: 1,
  });

  // ==========================================================================
  // SORTED COUNTIES
  // ==========================================================================

  const counties = useMemo(
    () =>
      [...(countiesQuery.data?.items ?? [])].sort((a, b) =>
        safeStr(a.countyName).localeCompare(safeStr(b.countyName)),
      ),
    [countiesQuery.data],
  );

  // ==========================================================================
  // REFRESH
  // ==========================================================================

  const refreshNow = async () => {
    await queryClient.invalidateQueries({
      queryKey: ["counties"],
    });

    await countiesQuery.refetch();
  };

  // ==========================================================================
  // UPDATE COUNTY
  // ==========================================================================
  //
  // Even though Operations does not render the edit controls, the mutation
  // also checks canEdit so Operations cannot update a county through this
  // component.
  //
  // ==========================================================================

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!canEdit) {
        throw new Error("Geography is read-only in Operations.");
      }

      if (!editing) {
        throw new Error("No county selected.");
      }

      const countyName = normalizeName(name);

      if (!countyName) {
        throw new Error("County name is required.");
      }

      return updateCounty(editing.countyId, {
        countyName,
      });
    },

    onSuccess: async () => {
      setEditing(null);
      setName("");

      await refreshNow();
    },
  });

  // ==========================================================================
  // DELETE COUNTY
  // ==========================================================================

  const deleteMutation = useMutation({
    mutationFn: async (countyId: string) => {
      if (!canEdit) {
        throw new Error("Geography is read-only in Operations.");
      }

      await deleteCounty(countyId);
    },

    onSuccess: refreshNow,
  });

  // ==========================================================================
  // CREATE
  // ==========================================================================

  const openCreate = () => {
    if (!canEdit) {
      return;
    }

    navigate("new");
  };

  // ==========================================================================
  // EDIT
  // ==========================================================================

  const openEdit = (county: CountyDto) => {
    if (!canEdit) {
      return;
    }

    setEditing(county);

    setName(safeStr(county.countyName));
  };

  // ==========================================================================
  // CLOSE EDIT
  // ==========================================================================

  const closeEdit = () => {
    if (updateMutation.isPending) {
      return;
    }

    setEditing(null);
    setName("");
  };

  // ==========================================================================
  // RENDER
  // ==========================================================================

  return (
    <PageShell
      title="Geography • Counties"
      subtitle="Global master data used across allocations, submissions, and results drilldowns."
      right={
        <div className="flex w-full items-center gap-2 sm:w-auto">
          {/* ==============================================================
              ACCESS BADGE
          ============================================================== */}

          <div className="hidden sm:block">
            <Badge>
              {isOperations
                ? "Read-only (Operations)"
                : canEdit
                  ? "Editable (NEC/SYSTEM)"
                  : "Read-only (Tenant)"}
            </Badge>
          </div>

          {/* ==============================================================
              REFRESH

              Refresh remains available in Operations because it does not
              modify geography data.
          ============================================================== */}

          <button
            type="button"
            onClick={refreshNow}
            disabled={countiesQuery.isFetching}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-blue-100 px-3 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw
              size={16}
              className={countiesQuery.isFetching ? "animate-spin" : ""}
            />
            Refresh
          </button>

          {/* ==============================================================
              CREATE

              Completely hidden in Operations.

              Administrative / Setup behavior remains unchanged.
          ============================================================== */}

          {canEdit && (
            <button
              type="button"
              onClick={openCreate}
              className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-[#0000CD] px-3 text-sm font-semibold text-white hover:bg-blue-700 sm:flex-none"
              title="Create counties"
            >
              <Plus size={16} />
              Create Counties
            </button>
          )}
        </div>
      }
    >
      <Card title="Counties">
        {/* ==================================================================
            SEARCH
        ================================================================== */}

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_120px]">
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              size={16}
            />

            <input
              value={q}
              onChange={(event) => setQ(event.target.value)}
              placeholder="Search counties…"
              className="h-10 w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <button
            type="button"
            onClick={() => setQ("")}
            className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold hover:bg-slate-50"
          >
            Clear
          </button>
        </div>

        {/* ==================================================================
            STATUS
        ================================================================== */}

        {countiesQuery.isLoading ? (
          <div className="mt-3 text-sm text-slate-600">Loading counties…</div>
        ) : countiesQuery.isError ? (
          <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {(countiesQuery.error as any)?.message ??
              "Failed to load counties."}
          </div>
        ) : null}

        {/* ==================================================================
            COUNTY GRID
        ================================================================== */}

        <div className="mt-3">
          {counties.length === 0 && !countiesQuery.isLoading ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
              No counties found.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {counties.map((county, index) => {
                const countyName = safeStr(county.countyName) || "—";

                return (
                  <article
                    key={county.countyId}
                    className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm"
                  >
                    {/* ==================================================
                          NUMBER
                      ================================================== */}

                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-xs font-extrabold text-blue-700">
                      {index + 1}
                    </div>

                    {/* ==================================================
                          COUNTY NAME
                      ================================================== */}

                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-extrabold text-slate-900">
                        {countyName}
                      </div>
                    </div>

                    {/* ==================================================
                          ACTIONS

                          Completely removed from the Operations portal.

                          They are only rendered when canEdit === true.
                      ================================================== */}

                    {canEdit && (
                      <div className="flex shrink-0 items-center gap-1">
                        {/* ==============================================
                              EDIT
                          ============================================== */}

                        <button
                          type="button"
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-green-600 hover:bg-slate-50"
                          title="Edit county"
                          onClick={() => openEdit(county)}
                        >
                          <Pencil size={14} />
                        </button>

                        {/* ==============================================
                              DELETE
                          ============================================== */}

                        <button
                          type="button"
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50"
                          disabled={deleteMutation.isPending}
                          title="Delete county"
                          onClick={() => {
                            const confirmed = window.confirm(
                              `Delete county "${countyName}"?`,
                            );

                            if (confirmed) {
                              deleteMutation.mutate(county.countyId);
                            }
                          }}
                        >
                          <Trash2 size={14} className="text-red-600" />
                        </button>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </div>

        {/* ==================================================================
            COUNT
        ================================================================== */}

        <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
          <span>
            {counties.length} {counties.length === 1 ? "county" : "counties"}
          </span>
        </div>

        {/* ==================================================================
            ADMINISTRATIVE NOTES

            These are hidden from Operations because the Operations portal
            does not need create/edit/delete API information.
        ================================================================== */}

        {!isOperations && (
          <div className="mt-3 hidden grid-cols-1 gap-3 md:grid lg:grid-cols-2">
            <Note
              title="Access rules"
              bullets={[
                "NEC_ADMIN and SYSTEM_ADMIN can create/edit/delete counties.",
                "Tenants can view counties read-only.",
                "Counties drive district and polling-center drilldowns.",
              ]}
            />

            <Note
              title="API mapping"
              bullets={[
                "GET /api/counties?q=&page=&size=",
                "PUT /api/counties/{countyId}",
                "DELETE /api/counties/{countyId}",
              ]}
            />
          </div>
        )}
      </Card>

      {/* ====================================================================
          EDIT MODAL

          IMPORTANT:

          The modal requires BOTH:

          editing !== null
          canEdit === true

          Therefore it can never render in Operations.
      ==================================================================== */}

      {canEdit && editing ? (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 backdrop-blur-sm"
          onClick={closeEdit}
        >
          <div
            className="flex w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            {/* ============================================================
                MODAL HEADER
            ============================================================ */}

            <div className="flex items-start justify-between gap-4 bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-5 text-white">
              <div>
                <h2 className="text-xl font-bold">Edit County</h2>

                <p className="mt-1 text-sm text-blue-100">
                  Update county master data.
                </p>
              </div>

              <button
                type="button"
                onClick={closeEdit}
                disabled={updateMutation.isPending}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/20 text-white hover:bg-white/30 disabled:opacity-50"
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>

            {/* ============================================================
                MODAL BODY
            ============================================================ */}

            <div className="space-y-4 px-6 py-5">
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-700">
                  County Name *
                </label>

                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  disabled={updateMutation.isPending}
                  type="text"
                  maxLength={120}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100"
                />
              </div>

              {updateMutation.error ? (
                <div className="flex gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
                  <AlertCircle
                    className="mt-0.5 shrink-0 text-red-600"
                    size={20}
                  />

                  <div>
                    <div className="text-sm font-bold text-red-900">Error</div>

                    <div className="mt-1 text-sm text-red-800">
                      {(updateMutation.error as any)?.message ??
                        "Failed to update county."}
                    </div>
                  </div>
                </div>
              ) : null}
            </div>

            {/* ============================================================
                MODAL FOOTER
            ============================================================ */}

            <div className="flex items-center justify-end gap-3 border-t border-slate-200 bg-white px-6 py-4">
              <button
                type="button"
                onClick={closeEdit}
                disabled={updateMutation.isPending}
                className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() => updateMutation.mutate()}
                disabled={
                  updateMutation.isPending || !canEdit || !normalizeName(name)
                }
                className="rounded-xl bg-blue-600 px-5 py-2.5 font-semibold text-white shadow-md hover:bg-blue-700 disabled:opacity-50"
              >
                {updateMutation.isPending ? "Saving…" : "Update County"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </PageShell>
  );
}

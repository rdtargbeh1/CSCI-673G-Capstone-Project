import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation, useNavigate } from "react-router-dom";
import {
  AlertCircle,
  ChevronDown,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  X,
} from "lucide-react";

import { useAuthStore } from "../../shared/store/authStore";

import {
  fetchCounties,
  type CountyDto,
} from "../../shared/services/countyService";

import {
  deleteDistrict,
  fetchDistricts,
  updateDistrict,
  type DistrictDto,
} from "../../shared/services/districtService";

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
// DISTRICTS PAGE
// ============================================================================

export default function DistrictsPage() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const queryClient = useQueryClient();

  // ==========================================================================
  // PORTAL CONTEXT
  // ==========================================================================

  const isOperations =
    pathname === "/operations" || pathname.startsWith("/operations/");

  const dashboardMode = useAuthStore((state) => state.dashboardMode);

  const hasAdministrativeEditAccess =
    dashboardMode === "NEC" || dashboardMode === "SYSTEM";

  const canEdit = !isOperations && hasAdministrativeEditAccess;

  // ==========================================================================
  // PAGINATION / FILTER STATE
  // ==========================================================================

  const countyGroupsPerPage = 12;

  const [page, setPage] = useState(0);
  const [q, setQ] = useState("");
  const [countyFilter, setCountyFilter] = useState("");

  // ==========================================================================
  // EDIT STATE
  // ==========================================================================

  const [editing, setEditing] = useState<DistrictDto | null>(null);

  const [districtName, setDistrictName] = useState("");

  const [countyId, setCountyId] = useState("");

  // ==========================================================================
  // COUNTY LOOKUP
  // ==========================================================================

  const countiesQuery = useQuery({
    queryKey: ["counties-lookup", "districts"],

    queryFn: async () => {
      const response = await fetchCounties({
        page: 0,
        size: 200,
        q: undefined,
      });

      return (response.items ?? []) as CountyDto[];
    },

    staleTime: 1000 * 60 * 10,
    retry: 1,
  });

  // ==========================================================================
  // COUNTY OPTIONS
  // ==========================================================================

  const countyOptions = useMemo(
    () =>
      (countiesQuery.data ?? []).map((county) => ({
        value: safeStr(county.countyId),
        label: safeStr(county.countyName) || "—",
      })),
    [countiesQuery.data],
  );

  // ==========================================================================
  // DISTRICTS QUERY
  // ==========================================================================

  const districtsQuery = useQuery({
    queryKey: ["districts", q, countyFilter],

    queryFn: () =>
      fetchDistricts({
        page: 0,
        size: 1000,
        q: q.trim() || undefined,
        countyId: countyFilter.trim() || undefined,
      }),

    staleTime: 10_000,
    retry: 1,
  });

  // ==========================================================================
  // DISTRICTS
  // ==========================================================================

  const districts = useMemo(
    () => districtsQuery.data?.items ?? [],
    [districtsQuery.data],
  );

  // ==========================================================================
  // GROUP DISTRICTS BY COUNTY
  // ==========================================================================

  const groupedDistricts = useMemo(() => {
    const groups = new Map<
      string,
      {
        countyId: string;
        countyName: string;
        districts: DistrictDto[];
      }
    >();

    for (const district of districts) {
      const groupCountyId = safeStr(district.countyId) || "unknown";

      const groupCountyName = safeStr(district.countyName) || "Unknown County";

      const current = groups.get(groupCountyId);

      if (current) {
        current.districts.push(district);
      } else {
        groups.set(groupCountyId, {
          countyId: groupCountyId,
          countyName: groupCountyName,
          districts: [district],
        });
      }
    }

    return Array.from(groups.values());
  }, [districts]);

  // ==========================================================================
  // SORT COUNTY GROUPS
  // ==========================================================================

  const sortedDistrictGroups = useMemo(() => {
    return [...groupedDistricts].sort((a, b) => {
      const countDifference = b.districts.length - a.districts.length;

      if (countDifference !== 0) {
        return countDifference;
      }

      return a.countyName.localeCompare(b.countyName);
    });
  }, [groupedDistricts]);

  // ==========================================================================
  // PAGINATION
  // ==========================================================================

  const totalPages = Math.max(
    1,
    Math.ceil(sortedDistrictGroups.length / countyGroupsPerPage),
  );

  const pagedDistrictGroups = useMemo(() => {
    const start = page * countyGroupsPerPage;

    return sortedDistrictGroups.slice(start, start + countyGroupsPerPage);
  }, [sortedDistrictGroups, page]);

  // ==========================================================================
  // REFRESH
  // ==========================================================================

  const refreshNow = async () => {
    await queryClient.invalidateQueries({
      queryKey: ["districts"],
    });

    await districtsQuery.refetch();
  };

  // ==========================================================================
  // UPDATE DISTRICT
  // ==========================================================================

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!canEdit) {
        throw new Error("Geography is read-only in Operations.");
      }

      if (!editing) {
        throw new Error("No district selected.");
      }

      const name = normalizeName(districtName);

      const selectedCountyId = safeStr(countyId).trim();

      if (!name) {
        throw new Error("District name is required.");
      }

      if (!selectedCountyId) {
        throw new Error("County is required.");
      }

      return updateDistrict(editing.districtId, {
        districtName: name,
        countyId: selectedCountyId,
      });
    },

    onSuccess: async () => {
      setEditing(null);
      setDistrictName("");
      setCountyId("");

      await refreshNow();
    },
  });

  // ==========================================================================
  // DELETE DISTRICT
  // ==========================================================================

  const deleteMutation = useMutation({
    mutationFn: async (districtId: string) => {
      if (!canEdit) {
        throw new Error("Geography is read-only in Operations.");
      }

      await deleteDistrict(districtId);
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

  const openEdit = (district: DistrictDto) => {
    if (!canEdit) {
      return;
    }

    setEditing(district);

    setDistrictName(safeStr(district.districtName));

    setCountyId(safeStr(district.countyId));
  };

  // ==========================================================================
  // CLOSE EDIT
  // ==========================================================================

  const closeEdit = () => {
    if (updateMutation.isPending) {
      return;
    }

    setEditing(null);
    setDistrictName("");
    setCountyId("");
  };

  // ==========================================================================
  // RENDER
  // ==========================================================================

  return (
    <PageShell
      title="Geography • Districts"
      subtitle="Districts are organized under counties for election reporting and operations."
      right={
        <div className="flex w-full items-center gap-2 sm:w-auto">
          <div className="hidden sm:block">
            <Badge>
              {isOperations
                ? "Read-only (Operations)"
                : canEdit
                  ? "Editable (NEC/SYSTEM)"
                  : "Read-only (Tenant)"}
            </Badge>
          </div>

          <button
            type="button"
            onClick={refreshNow}
            disabled={districtsQuery.isFetching}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-blue-100 px-3 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw
              size={16}
              className={districtsQuery.isFetching ? "animate-spin" : ""}
            />
            Refresh
          </button>

          {canEdit && (
            <button
              type="button"
              onClick={openCreate}
              className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-[#0000CD] px-3 text-sm font-semibold text-white hover:bg-blue-700 sm:flex-none"
              title="Create districts"
            >
              <Plus size={16} />
              Create Districts
            </button>
          )}
        </div>
      }
    >
      <Card title="Districts">
        {/* ==================================================================
            FILTERS
        ================================================================== */}

        <div className="mb-4 grid grid-cols-2 gap-2 lg:grid-cols-12">
          <div className="relative col-span-2 lg:col-span-6">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              size={16}
            />

            <input
              value={q}
              onChange={(event) => {
                setQ(event.target.value);
                setPage(0);
              }}
              placeholder="Search district…"
              className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="relative col-span-1 lg:col-span-4">
            <select
              value={countyFilter}
              onChange={(event) => {
                setCountyFilter(event.target.value);

                setPage(0);
              }}
              disabled={countiesQuery.isLoading || countiesQuery.isError}
              className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-3 py-2 pr-10 text-sm outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50"
            >
              <option value="">
                {countiesQuery.isLoading ? "Loading…" : "All Counties"}
              </option>

              {countyOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <ChevronDown
              size={16}
              className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
          </div>

          <button
            type="button"
            onClick={() => {
              setQ("");
              setCountyFilter("");
              setPage(0);
            }}
            className="col-span-1 h-10 whitespace-nowrap rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold hover:bg-slate-50 lg:col-span-2"
          >
            Clear All
          </button>
        </div>

        {/* ==================================================================
            STATUS
        ================================================================== */}

        {districtsQuery.isLoading ? (
          <div className="mt-3 text-sm text-slate-600">Loading districts…</div>
        ) : districtsQuery.isError ? (
          <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {(districtsQuery.error as any)?.message ??
              "Failed to load districts."}
          </div>
        ) : null}

        {/* ==================================================================
            RESPONSIVE COUNTY / DISTRICT GRID

            Mobile:  1 column
            Tablet:  2 columns
            Laptop:  3 columns
            Desktop: 4 columns

            Tailwind:
            default = 1
            md      = 2
            lg      = 3
            xl      = 4
        ================================================================== */}

        <div className="mt-3">
          {districts.length === 0 && !districtsQuery.isLoading ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
              No districts found.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {pagedDistrictGroups.map((group) => (
                <section
                  key={group.countyId}
                  className="min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white"
                >
                  {/* ====================================================
                        COUNTY HEADER
                    ==================================================== */}

                  <div className="flex items-center justify-between gap-2 border-b border-slate-200 bg-slate-50 px-3 py-2.5">
                    <div className="min-w-0 flex-1">
                      <div
                        className="truncate text-sm font-extrabold text-slate-900"
                        title={group.countyName}
                      >
                        {group.countyName}
                      </div>
                    </div>

                    <span className="shrink-0 rounded-full bg-white px-2 py-0.5 text-[10px] font-bold text-slate-500 ring-1 ring-slate-200">
                      {group.districts.length}{" "}
                      {group.districts.length === 1 ? "district" : "districts"}
                    </span>
                  </div>

                  {/* ====================================================
                        DISTRICTS
                    ==================================================== */}

                  <div className="divide-y divide-slate-100">
                    {group.districts.map((district) => {
                      const name = safeStr(district.districtName) || "—";

                      return (
                        <div
                          key={district.districtId}
                          className="flex min-w-0 items-center gap-2 px-3 py-2"
                        >
                          <div className="min-w-0 flex-1">
                            <div
                              className="truncate text-sm font-semibold text-slate-800"
                              title={name}
                            >
                              {name}
                            </div>
                          </div>

                          {/* ==========================================
                                  ADMIN ACTIONS

                                  Hidden completely in Operations.
                              ========================================== */}

                          {canEdit && (
                            <div className="flex shrink-0 items-center gap-1">
                              <button
                                type="button"
                                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-green-600 hover:bg-slate-50"
                                title="Edit district"
                                onClick={() => openEdit(district)}
                              >
                                <Pencil size={14} />
                              </button>

                              <button
                                type="button"
                                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50"
                                disabled={deleteMutation.isPending}
                                title="Delete district"
                                onClick={() => {
                                  const confirmed = window.confirm(
                                    `Delete district "${name}"?`,
                                  );

                                  if (confirmed) {
                                    deleteMutation.mutate(district.districtId);
                                  }
                                }}
                              >
                                <Trash2 size={14} className="text-red-600" />
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>

        {/* ==================================================================
            PAGINATION
        ================================================================== */}

        <div className="mt-3 flex items-center justify-between">
          <div className="text-xs text-slate-600">
            Page <span className="font-bold">{page + 1}</span> of{" "}
            <span className="font-bold">{totalPages}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              className="h-10 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50"
              disabled={page <= 0}
              onClick={() => setPage((value) => Math.max(0, value - 1))}
            >
              Prev
            </button>

            <button
              type="button"
              className="h-10 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50"
              disabled={page >= totalPages - 1}
              onClick={() => setPage((value) => value + 1)}
            >
              Next
            </button>
          </div>
        </div>

        {/* ==================================================================
            ADMINISTRATIVE NOTES
        ================================================================== */}

        {!isOperations && (
          <div className="mt-3 hidden grid-cols-1 gap-3 md:grid lg:grid-cols-2">
            <Note
              title="Access rules"
              bullets={[
                "NEC_ADMIN and SYSTEM_ADMIN can create/edit/delete districts.",
                "Tenants can view districts read-only.",
                "Districts must belong to a county.",
                "Pagination is by county group so one county is never split across pages.",
              ]}
            />

            <Note
              title="API mapping"
              bullets={[
                "GET /api/districts?q=&countyId=&page=0&size=1000",
                "GET /api/districts/by-county/{countyId}",
                "PUT /api/districts/{id}",
                "DELETE /api/districts/{id}",
              ]}
            />
          </div>
        )}
      </Card>

      {/* ====================================================================
          EDIT MODAL

          Administrative portal only.
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
            <div className="flex items-start justify-between gap-4 bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-5 text-white">
              <div>
                <h2 className="text-xl font-bold">Edit District</h2>

                <p className="mt-1 text-sm text-blue-100">
                  Update district master data.
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

            <div className="space-y-4 px-6 py-5">
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-700">
                  County *
                </label>

                <div className="relative">
                  <select
                    value={countyId}
                    onChange={(event) => setCountyId(event.target.value)}
                    disabled={
                      updateMutation.isPending ||
                      countiesQuery.isLoading ||
                      countiesQuery.isError
                    }
                    className="w-full appearance-none rounded-xl border border-slate-300 bg-white px-4 py-3 pr-10 text-sm outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100"
                  >
                    <option value="">Select County</option>

                    {countyOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>

                  <ChevronDown
                    size={16}
                    className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-700">
                  District Name *
                </label>

                <input
                  value={districtName}
                  onChange={(event) => setDistrictName(event.target.value)}
                  disabled={updateMutation.isPending}
                  type="text"
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
                        "Failed to update district."}
                    </div>
                  </div>
                </div>
              ) : null}
            </div>

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
                  updateMutation.isPending ||
                  !canEdit ||
                  !normalizeName(districtName) ||
                  !safeStr(countyId).trim()
                }
                className="rounded-xl bg-blue-600 px-5 py-2.5 font-semibold text-white shadow-md hover:bg-blue-700 disabled:opacity-50"
              >
                {updateMutation.isPending ? "Saving…" : "Update District"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </PageShell>
  );
}

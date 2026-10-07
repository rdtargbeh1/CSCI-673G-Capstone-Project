import React, { useMemo, useState } from "react";
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
  fetchDistricts,
  type DistrictDto,
} from "../../shared/services/districtService";

import {
  deletePollingCenter,
  fetchPollingCenters,
  updatePollingCenter,
  type PollingCenterDto,
} from "../../shared/services/pollingCenterService";

import { Badge, Card, Note, PageShell, Table } from "./shared/geo-ui";

// ============================================================================
// HELPERS
// ============================================================================

function safeStr(value: unknown) {
  return typeof value === "string" ? value : value == null ? "" : String(value);
}

function normalizeName(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function fmtDate(value?: string | null) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleString();
}

type FilterMode = "CENTER" | "COUNTY" | "DISTRICT";

// ============================================================================
// COMPONENT
// ============================================================================

export default function PollingCentersPage() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const queryClient = useQueryClient();

  // ==========================================================================
  // PORTAL CONTEXT
  // ==========================================================================
  //
  // Operations Geography is always read-only.
  //
  // Outside Operations, NEC / SYSTEM retain their normal create/edit/delete
  // permissions.
  //
  // ==========================================================================

  const isOperations =
    pathname === "/operations" || pathname.startsWith("/operations/");

  const dashboardMode = useAuthStore((state) => state.dashboardMode);

  const hasAdministrativeEditAccess =
    dashboardMode === "SYSTEM" || dashboardMode === "NEC";

  const canEdit = !isOperations && hasAdministrativeEditAccess;

  // ==========================================================================
  // LIST / FILTER STATE
  // ==========================================================================

  const size = 20;

  const [page, setPage] = useState(0);

  const [mode, setMode] = useState<FilterMode>("CENTER");

  const [qCenter, setQCenter] = useState("");

  const [countyId, setCountyId] = useState("");

  const [districtId, setDistrictId] = useState("");

  const [districtClickWarn, setDistrictClickWarn] = useState(false);

  // ==========================================================================
  // EDIT STATE
  // ==========================================================================

  const [editing, setEditing] = useState<PollingCenterDto | null>(null);

  const [centerName, setCenterName] = useState("");

  const [formCountyId, setFormCountyId] = useState("");

  const [formDistrictId, setFormDistrictId] = useState("");

  // ==========================================================================
  // FILTER LOOKUPS
  // ==========================================================================

  const countiesQuery = useQuery({
    queryKey: ["counties-lookup", "polling-centers"],

    queryFn: async () => {
      const response = await fetchCounties({
        page: 0,
        size: 250,
        q: undefined,
      });

      return (response.items ?? []) as CountyDto[];
    },

    staleTime: 1000 * 60 * 10,

    retry: 1,
  });

  const countyOptions = useMemo(
    () =>
      (countiesQuery.data ?? []).map((county) => ({
        value: safeStr(county.countyId),

        label: safeStr(county.countyName) || "—",
      })),
    [countiesQuery.data],
  );

  // ==========================================================================
  // DISTRICT FILTER LOOKUP
  // ==========================================================================

  const districtsQuery = useQuery({
    queryKey: [
      "districts-filter",
      "by-county-required",
      countyId || "no-county",
    ],

    queryFn: async () => {
      const response = await fetchDistricts({
        page: 0,
        size: 800,
        q: undefined,

        countyId: countyId || undefined,
      });

      return (response.items ?? []) as DistrictDto[];
    },

    enabled: Boolean(countyId),

    staleTime: 1000 * 60 * 10,

    retry: 1,
  });

  const districtOptions = useMemo(
    () =>
      (districtsQuery.data ?? []).map((district) => ({
        value: safeStr(district.districtId),

        label: safeStr(district.districtName) || "—",
      })),
    [districtsQuery.data],
  );

  React.useEffect(() => {
    setDistrictId("");
  }, [countyId]);

  // ==========================================================================
  // EDIT LOOKUPS
  // ==========================================================================
  //
  // This query can only run when the administrative edit modal is active.
  //
  // ==========================================================================

  const editDistrictsQuery = useQuery({
    queryKey: ["districts-center-edit", formCountyId || "no-county"],

    queryFn: async () => {
      const response = await fetchDistricts({
        page: 0,
        size: 800,
        q: undefined,

        countyId: formCountyId || undefined,
      });

      return (response.items ?? []) as DistrictDto[];
    },

    enabled: canEdit && Boolean(editing) && Boolean(formCountyId),

    staleTime: 1000 * 60 * 10,

    retry: 1,
  });

  const editDistrictOptions = useMemo(
    () =>
      (editDistrictsQuery.data ?? []).map((district) => ({
        value: safeStr(district.districtId),

        label: safeStr(district.districtName) || "—",
      })),
    [editDistrictsQuery.data],
  );

  // ==========================================================================
  // EFFECTIVE FILTER PARAMETERS
  // ==========================================================================

  const effectiveParams = useMemo(() => {
    if (mode === "CENTER") {
      return {
        q: qCenter.trim() || undefined,

        countyId: undefined,

        districtId: undefined,
      };
    }

    if (mode === "COUNTY") {
      return {
        q: undefined,

        countyId: countyId.trim() || undefined,

        districtId: undefined,
      };
    }

    return {
      q: undefined,

      countyId: countyId.trim() || undefined,

      districtId: districtId.trim() || undefined,
    };
  }, [mode, qCenter, countyId, districtId]);

  // ==========================================================================
  // POLLING CENTER LIST
  // ==========================================================================

  const centersQuery = useQuery({
    queryKey: [
      "polling-centers",
      page,
      mode,
      effectiveParams.q,
      effectiveParams.countyId,
      effectiveParams.districtId,
    ],

    queryFn: () =>
      fetchPollingCenters({
        page,
        size,

        q: effectiveParams.q,

        countyId: effectiveParams.countyId,

        districtId: effectiveParams.districtId,
      }),

    staleTime: 10_000,

    retry: 1,
  });

  const centers = useMemo(
    () => centersQuery.data?.items ?? [],
    [centersQuery.data],
  );

  const totalPages = Math.max(1, centersQuery.data?.totalPages ?? 1);

  // ==========================================================================
  // REFRESH
  // ==========================================================================

  const refreshNow = async () => {
    await queryClient.invalidateQueries({
      queryKey: ["polling-centers"],
    });

    await centersQuery.refetch();
  };

  // ==========================================================================
  // UPDATE POLLING CENTER
  // ==========================================================================

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!canEdit) {
        throw new Error("Geography is read-only in Operations.");
      }

      if (!editing) {
        throw new Error("No center selected.");
      }

      const name = normalizeName(centerName);

      const district = safeStr(formDistrictId).trim();

      if (!name) {
        throw new Error("Center name is required.");
      }

      if (!district) {
        throw new Error("District is required.");
      }

      return updatePollingCenter(editing.centerId, {
        centerName: name,
        districtId: district,
      });
    },

    onSuccess: async () => {
      setEditing(null);

      setCenterName("");

      setFormCountyId("");

      setFormDistrictId("");

      await refreshNow();
    },
  });

  // ==========================================================================
  // DELETE POLLING CENTER
  // ==========================================================================

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!canEdit) {
        throw new Error("Geography is read-only in Operations.");
      }

      return deletePollingCenter(id);
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

  const openEdit = (center: PollingCenterDto) => {
    if (!canEdit) {
      return;
    }

    setEditing(center);

    setCenterName(safeStr(center.centerName));

    setFormCountyId(safeStr(center.countyId));

    setFormDistrictId(safeStr(center.districtId));
  };

  // ==========================================================================
  // CLOSE EDIT
  // ==========================================================================

  const closeEdit = () => {
    if (updateMutation.isPending) {
      return;
    }

    setEditing(null);

    setCenterName("");

    setFormCountyId("");

    setFormDistrictId("");
  };

  // ==========================================================================
  // DISTRICT FILTER WARNING
  // ==========================================================================

  const warnDistrictNeedsCounty = () => {
    if (!countyId) {
      setDistrictClickWarn(true);

      window.setTimeout(() => setDistrictClickWarn(false), 2000);
    }
  };

  const districtDisabled = !countyId;

  const districtDropdownLoading = Boolean(countyId) && districtsQuery.isLoading;

  const districtDropdownError = Boolean(countyId) && districtsQuery.isError;

  // ==========================================================================
  // TABLE COLUMNS
  // ==========================================================================
  //
  // Operations has no Actions column.
  //
  // Administrative portal retains Actions when canEdit is true.
  //
  // ==========================================================================

  const tableColumns = useMemo(() => {
    const baseColumns =
      mode === "DISTRICT"
        ? ["District", "Code", "Center", "Created"]
        : ["County", "District", "Code", "Center", "Created"];

    if (canEdit) {
      return [...baseColumns, "Actions"];
    }

    return baseColumns;
  }, [mode, canEdit]);

  // ==========================================================================
  // TABLE ROWS
  // ==========================================================================

  const tableRows = useMemo(() => {
    if (centers.length === 0 && !centersQuery.isLoading) {
      return [
        [
          <span key="empty" className="text-slate-600">
            No polling centers found.
          </span>,
          "",
          "",
          "",
          "",
        ],
      ];
    }

    return centers.map((center) => {
      const county = safeStr(center.countyName) || "—";

      const district = safeStr(center.districtName) || "—";

      const code = safeStr(center.code) || "—";

      const name = safeStr(center.centerName) || "—";

      const created = fmtDate(center.createdAt);

      const actions = (
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-green-600 hover:bg-slate-50"
            onClick={() => openEdit(center)}
            title="Edit polling center"
          >
            <Pencil size={16} />
          </button>

          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50"
            disabled={deleteMutation.isPending}
            onClick={() => {
              const confirmed = window.confirm(
                `Delete polling center "${name}"?`,
              );

              if (confirmed) {
                deleteMutation.mutate(center.centerId);
              }
            }}
            title="Delete polling center"
          >
            <Trash2 size={16} className="text-red-600" />
          </button>
        </div>
      );

      if (mode === "DISTRICT") {
        const row: React.ReactNode[] = [district, code, name, created];

        if (canEdit) {
          row.push(actions);
        }

        return row;
      }

      const row: React.ReactNode[] = [county, district, code, name, created];

      if (canEdit) {
        row.push(actions);
      }

      return row;
    });
  }, [
    centers,
    centersQuery.isLoading,
    mode,
    canEdit,
    deleteMutation.isPending,
  ]);

  // ==========================================================================
  // RENDER
  // ==========================================================================

  return (
    <PageShell
      title="Geography • Polling Centers"
      subtitle="Global centers used by allocations, submissions, and official geo reporting."
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
          ============================================================== */}

          <button
            type="button"
            onClick={refreshNow}
            disabled={centersQuery.isFetching}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-blue-100 px-3 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw
              size={16}
              className={centersQuery.isFetching ? "animate-spin" : ""}
            />
            Refresh
          </button>

          {/* ==============================================================
              CREATE

              Completely absent from Operations.
          ============================================================== */}

          {canEdit && (
            <button
              type="button"
              onClick={openCreate}
              className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-[#0000CD] px-3 text-sm font-semibold text-white hover:bg-blue-700 sm:flex-none"
              title="Create polling centers"
            >
              <Plus size={16} />
              Create Centers
            </button>
          )}
        </div>
      }
    >
      <Card title="Polling Centers">
        {/* ================================================================ */}
        {/* FILTERS */}
        {/* ================================================================ */}

        <div className="mb-4 grid grid-cols-2 gap-2 lg:grid-cols-12">
          {/* ==============================================================
              CENTER SEARCH
          ============================================================== */}

          <div className="relative col-span-2 lg:col-span-4">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              size={16}
            />

            <input
              value={qCenter}
              onChange={(event) => {
                setQCenter(event.target.value);

                setPage(0);

                setMode("CENTER");
              }}
              placeholder="Search center…"
              className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* ==============================================================
              COUNTY FILTER
          ============================================================== */}

          <div className="relative col-span-1 lg:col-span-3">
            <select
              value={countyId}
              onChange={(event) => {
                setMode("COUNTY");

                setCountyId(event.target.value);

                setDistrictId("");

                setPage(0);
              }}
              disabled={countiesQuery.isLoading || countiesQuery.isError}
              className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-3 py-2 pr-10 text-sm outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50"
            >
              <option value="">
                {countiesQuery.isLoading ? "Loading…" : "County"}
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

          {/* ==============================================================
              DISTRICT FILTER
          ============================================================== */}

          <div
            className="relative col-span-1 lg:col-span-3"
            onMouseDown={warnDistrictNeedsCounty}
            onTouchStart={warnDistrictNeedsCounty}
          >
            {districtClickWarn ? (
              <div className="pointer-events-none absolute -top-8 left-0 z-10 whitespace-nowrap rounded-xl border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800 shadow-sm">
                Select a county first.
              </div>
            ) : null}

            <select
              value={districtId}
              onChange={(event) => {
                setMode("DISTRICT");

                setDistrictId(event.target.value);

                setPage(0);
              }}
              disabled={
                districtDisabled ||
                districtDropdownLoading ||
                districtDropdownError
              }
              className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-3 py-2 pr-10 text-sm outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50"
              title={
                districtDisabled ? "Select county first" : "Select district"
              }
            >
              <option value="">
                {districtDisabled
                  ? "Select county…"
                  : districtDropdownLoading
                    ? "Loading…"
                    : "District"}
              </option>

              {districtOptions.map((option) => (
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

          {/* ==============================================================
              CLEAR FILTERS
          ============================================================== */}

          <button
            type="button"
            onClick={() => {
              setMode("CENTER");

              setQCenter("");

              setCountyId("");

              setDistrictId("");

              setPage(0);
            }}
            className="col-span-2 h-10 whitespace-nowrap rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold hover:bg-slate-50 lg:col-span-2"
          >
            Clear All
          </button>
        </div>

        {/* ================================================================ */}
        {/* STATUS */}
        {/* ================================================================ */}

        <div className="mt-3">
          {centersQuery.isLoading ? (
            <div className="text-sm text-slate-600">
              Loading polling centers…
            </div>
          ) : centersQuery.isError ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {(centersQuery.error as any)?.message ??
                "Failed to load polling centers."}
            </div>
          ) : null}
        </div>

        {/* ================================================================ */}
        {/* DESKTOP / TABLET TABLE */}
        {/* ================================================================ */}

        <div className="mt-3 hidden md:block">
          <Table columns={tableColumns} rows={tableRows} />
        </div>

        {/* ================================================================ */}
        {/* MOBILE CARDS */}
        {/* ================================================================ */}

        <div className="mt-3 space-y-2 md:hidden">
          {centers.length === 0 && !centersQuery.isLoading ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
              No polling centers found.
            </div>
          ) : (
            centers.map((center) => {
              const county = safeStr(center.countyName) || "—";

              const district = safeStr(center.districtName) || "—";

              const code = safeStr(center.code) || "—";

              const name = safeStr(center.centerName) || "—";

              return (
                <article
                  key={center.centerId}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm"
                >
                  <div className="flex items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <div
                        className="truncate text-sm font-extrabold text-slate-900"
                        title={name}
                      >
                        {name}
                      </div>

                      <div className="mt-0.5 truncate text-[11px] font-medium text-slate-500">
                        {code}
                      </div>
                    </div>

                    {/* ==================================================
                          MOBILE ACTIONS

                          Completely absent in Operations.
                      ================================================== */}

                    {canEdit && (
                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          type="button"
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-green-600 hover:bg-slate-50"
                          onClick={() => openEdit(center)}
                          title="Edit center"
                        >
                          <Pencil size={14} />
                        </button>

                        <button
                          type="button"
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50"
                          disabled={deleteMutation.isPending}
                          onClick={() => {
                            const confirmed = window.confirm(
                              `Delete polling center "${name}"?`,
                            );

                            if (confirmed) {
                              deleteMutation.mutate(center.centerId);
                            }
                          }}
                          title="Delete center"
                        >
                          <Trash2 size={14} className="text-red-600" />
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="mt-2 grid grid-cols-2 gap-x-3 border-t border-slate-100 pt-2 text-[11px]">
                    <div>
                      <span className="font-bold text-slate-400">County:</span>{" "}
                      <span className="font-semibold text-slate-700">
                        {county}
                      </span>
                    </div>

                    <div>
                      <span className="font-bold text-slate-400">
                        District:
                      </span>{" "}
                      <span className="font-semibold text-slate-700">
                        {district}
                      </span>
                    </div>
                  </div>
                </article>
              );
            })
          )}
        </div>

        {/* ================================================================ */}
        {/* PAGINATION */}
        {/* ================================================================ */}

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

        {/* ================================================================ */}
        {/* ADMINISTRATIVE NOTES */}
        {/* ================================================================ */}

        {!isOperations && (
          <div className="mt-3 hidden grid-cols-1 gap-3 md:grid lg:grid-cols-2">
            <Note
              title="Filter rules"
              bullets={[
                "By Center: shows County + District + Center.",
                "By County: filter centers by selected county.",
                "By District: County must be selected first.",
              ]}
            />

            <Note
              title="API mapping"
              bullets={[
                "GET /api/polling-centers?q=&countyId=&districtId=&page=&size=",
                "PUT /api/polling-centers/{id}",
                "DELETE /api/polling-centers/{id}",
              ]}
            />
          </div>
        )}
      </Card>

      {/* ================================================================ */}
      {/* EDIT MODAL                                                    */}
      {/*                                                                */}
      {/* Requires canEdit, so this can never render in Operations.      */}
      {/* ================================================================ */}

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
                HEADER
            ============================================================ */}

            <div className="flex items-start justify-between gap-4 bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-5 text-white">
              <div>
                <h2 className="text-xl font-bold">Edit Polling Center</h2>

                <p className="mt-1 text-sm text-blue-100">
                  Update polling center master data.
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
                BODY
            ============================================================ */}

            <div className="space-y-4 px-6 py-5">
              {/* ==========================================================
                  COUNTY
              ========================================================== */}

              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-700">
                  County *
                </label>

                <div className="relative">
                  <select
                    value={formCountyId}
                    onChange={(event) => {
                      setFormCountyId(event.target.value);

                      setFormDistrictId("");
                    }}
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

              {/* ==========================================================
                  DISTRICT
              ========================================================== */}

              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-700">
                  District *
                </label>

                <div className="relative">
                  <select
                    value={formDistrictId}
                    onChange={(event) => setFormDistrictId(event.target.value)}
                    disabled={
                      updateMutation.isPending ||
                      !formCountyId ||
                      editDistrictsQuery.isLoading ||
                      editDistrictsQuery.isError
                    }
                    className="w-full appearance-none rounded-xl border border-slate-300 bg-white px-4 py-3 pr-10 text-sm outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100"
                  >
                    <option value="">
                      {!formCountyId
                        ? "Select county first"
                        : editDistrictsQuery.isLoading
                          ? "Loading districts…"
                          : "Select District"}
                    </option>

                    {editDistrictOptions.map((option) => (
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

              {/* ==========================================================
                  CENTER NAME
              ========================================================== */}

              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-700">
                  Center Name *
                </label>

                <input
                  value={centerName}
                  onChange={(event) => setCenterName(event.target.value)}
                  disabled={updateMutation.isPending}
                  type="text"
                  maxLength={120}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100"
                />
              </div>

              {/* ==========================================================
                  ERROR
              ========================================================== */}

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
                        "Failed to update polling center."}
                    </div>
                  </div>
                </div>
              ) : null}
            </div>

            {/* ============================================================
                FOOTER
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
                  updateMutation.isPending ||
                  !canEdit ||
                  !normalizeName(centerName) ||
                  !safeStr(formDistrictId).trim()
                }
                className="rounded-xl bg-blue-600 px-5 py-2.5 font-semibold text-white shadow-md hover:bg-blue-700 disabled:opacity-50"
              >
                {updateMutation.isPending ? "Saving…" : "Update Center"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </PageShell>
  );
}

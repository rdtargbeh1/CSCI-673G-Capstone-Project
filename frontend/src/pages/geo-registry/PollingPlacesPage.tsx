import React, { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation, useNavigate } from "react-router-dom";
import {
  AlertCircle,
  ChevronDown,
  Pencil,
  Plus,
  Power,
  PowerOff,
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
  fetchPollingCenters,
  type PollingCenterDto,
} from "../../shared/services/pollingCenterService";

import {
  deletePollingPlace,
  fetchPollingPlaces,
  setPollingPlaceActive,
  updatePollingPlace,
  type PollingPlaceDto,
} from "../../shared/services/pollingPlaceService";

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

function friendlyPollingPlaceSaveError(error: any): string {
  const message =
    safeStr(error?.response?.data?.message) ||
    safeStr(error?.response?.data?.error) ||
    safeStr(error?.message) ||
    "Failed to save polling place.";

  const isDuplicate =
    safeStr(error?.response?.data?.code) === "23505" ||
    safeStr(error?.code) === "23505" ||
    /duplicate|unique|already exists|constraint/i.test(message);

  const mentionsLabel =
    /uq_place_center_label_norm/i.test(message) ||
    /center.*label/i.test(message) ||
    /label.*center/i.test(message);

  if (isDuplicate && mentionsLabel) {
    return "This label already exists in the selected center. Please choose a different label.";
  }

  return message;
}

type FilterMode = "PLACE" | "COUNTY" | "DISTRICT" | "CENTER";

// ============================================================================
// COMPONENT
// ============================================================================

export default function PollingPlacesPage() {
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

  // Operations is ALWAYS read-only.
  const canEdit = !isOperations && hasAdministrativeEditAccess;

  // ==========================================================================
  // LIST / FILTER STATE
  // ==========================================================================

  const size = 20;

  const [page, setPage] = useState(0);

  const [mode, setMode] = useState<FilterMode>("PLACE");

  const [qPlace, setQPlace] = useState("");

  const [countyId, setCountyId] = useState("");

  const [districtId, setDistrictId] = useState("");

  const [centerId, setCenterId] = useState("");

  const [activeFilter, setActiveFilter] = useState<"" | "true" | "false">("");

  const [districtPrereqAlert, setDistrictPrereqAlert] = useState(false);

  const [centerPrereqAlert, setCenterPrereqAlert] = useState(false);

  // ==========================================================================
  // EDIT STATE
  // ==========================================================================

  const [editing, setEditing] = useState<PollingPlaceDto | null>(null);

  const [editLabel, setEditLabel] = useState("");

  // ==========================================================================
  // COUNTY LOOKUP
  // ==========================================================================

  const countiesQuery = useQuery({
    queryKey: ["counties-lookup", "polling-places"],

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
  // DISTRICT LOOKUP
  // ==========================================================================

  const districtsQuery = useQuery({
    queryKey: ["districts-places-filter", "by-county", countyId || "no-county"],

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

  // ==========================================================================
  // POLLING CENTER LOOKUP
  // ==========================================================================

  const centersQuery = useQuery({
    queryKey: [
      "centers-places-filter",
      "by-district",
      districtId || "no-district",
    ],

    queryFn: async () => {
      const response = await fetchPollingCenters({
        page: 0,
        size: 800,
        q: undefined,
        countyId: undefined,
        districtId: districtId || undefined,
      });

      return (response.items ?? []) as PollingCenterDto[];
    },

    enabled: Boolean(districtId),

    staleTime: 1000 * 60 * 10,

    retry: 1,
  });

  const centerOptions = useMemo(
    () =>
      (centersQuery.data ?? []).map((center) => ({
        value: safeStr(center.centerId),

        label: `${safeStr(center.centerName) || "—"}${
          center.code ? ` • ${safeStr(center.code)}` : ""
        }`,
      })),
    [centersQuery.data],
  );

  // ==========================================================================
  // KEEP DISTRICT VALID FOR SELECTED COUNTY
  // ==========================================================================

  React.useEffect(() => {
    if (!countyId) {
      setDistrictId("");
      setCenterId("");
      return;
    }

    if (districtId) {
      const valid = (districtsQuery.data ?? []).some(
        (district) => safeStr(district.districtId) === safeStr(districtId),
      );

      if (!valid) {
        setDistrictId("");
      }
    }
  }, [countyId, districtId, districtsQuery.data]);

  // ==========================================================================
  // KEEP CENTER VALID FOR SELECTED DISTRICT
  // ==========================================================================

  React.useEffect(() => {
    if (!districtId) {
      setCenterId("");
      return;
    }

    if (centerId) {
      const valid = (centersQuery.data ?? []).some(
        (center) => safeStr(center.centerId) === safeStr(centerId),
      );

      if (!valid) {
        setCenterId("");
      }
    }
  }, [districtId, centerId, centersQuery.data]);

  React.useEffect(() => {
    if (countyId) {
      setDistrictPrereqAlert(false);
    }
  }, [countyId]);

  React.useEffect(() => {
    if (countyId && districtId) {
      setCenterPrereqAlert(false);
    }
  }, [countyId, districtId]);

  // ==========================================================================
  // EFFECTIVE FILTER PARAMETERS
  // ==========================================================================

  const activeValue: boolean | undefined =
    activeFilter === "" ? undefined : activeFilter === "true";

  const effectiveParams = useMemo(() => {
    if (mode === "PLACE") {
      return {
        q: qPlace.trim() || undefined,
        countyId: undefined,
        districtId: undefined,
        centerId: undefined,
        active: activeValue,
      };
    }

    if (mode === "COUNTY") {
      return {
        q: undefined,
        countyId: countyId || undefined,
        districtId: undefined,
        centerId: undefined,
        active: activeValue,
      };
    }

    if (mode === "DISTRICT") {
      return {
        q: undefined,
        countyId: undefined,
        districtId: districtId || undefined,
        centerId: undefined,
        active: activeValue,
      };
    }

    return {
      q: undefined,
      countyId: undefined,
      districtId: undefined,
      centerId: centerId || undefined,
      active: activeValue,
    };
  }, [mode, qPlace, countyId, districtId, centerId, activeValue]);

  // ==========================================================================
  // POLLING PLACES
  // ==========================================================================

  const placesQuery = useQuery({
    queryKey: [
      "polling-places",
      page,
      mode,
      effectiveParams.q,
      effectiveParams.countyId,
      effectiveParams.districtId,
      effectiveParams.centerId,
      effectiveParams.active,
    ],

    queryFn: () =>
      fetchPollingPlaces({
        page,
        size,
        q: effectiveParams.q,
        countyId: effectiveParams.countyId,
        districtId: effectiveParams.districtId,
        centerId: effectiveParams.centerId,
        active: effectiveParams.active,
      }),

    staleTime: 10_000,

    retry: 1,
  });

  const places = useMemo(
    () => placesQuery.data?.items ?? [],
    [placesQuery.data],
  );

  const totalPages = Math.max(1, placesQuery.data?.totalPages ?? 1);

  // ==========================================================================
  // REFRESH
  // ==========================================================================

  const refreshNow = async () => {
    await queryClient.invalidateQueries({
      queryKey: ["polling-places"],
    });

    await placesQuery.refetch();
  };

  // ==========================================================================
  // UPDATE
  // ==========================================================================

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!canEdit) {
        throw new Error("Geography is read-only in Operations.");
      }

      if (!editing) {
        throw new Error("No polling place selected.");
      }

      return updatePollingPlace(editing.placeId, {
        label: normalizeName(editLabel) || "",
      });
    },

    onSuccess: async () => {
      setEditing(null);
      setEditLabel("");

      await refreshNow();
    },
  });

  // ==========================================================================
  // ACTIVE / INACTIVE
  // ==========================================================================

  const setActiveMutation = useMutation({
    mutationFn: async (place: PollingPlaceDto) => {
      if (!canEdit) {
        throw new Error("Geography is read-only in Operations.");
      }

      return setPollingPlaceActive(place.placeId, !place.active);
    },

    onSuccess: refreshNow,
  });

  // ==========================================================================
  // DELETE
  // ==========================================================================

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!canEdit) {
        throw new Error("Geography is read-only in Operations.");
      }

      return deletePollingPlace(id);
    },

    onSuccess: refreshNow,
  });

  // ==========================================================================
  // ACTIONS
  // ==========================================================================

  const openCreate = () => {
    if (!canEdit) {
      return;
    }

    navigate("new");
  };

  const openEdit = (place: PollingPlaceDto) => {
    if (!canEdit) {
      return;
    }

    setEditing(place);

    setEditLabel(safeStr(place.label));
  };

  const closeEdit = () => {
    if (updateMutation.isPending) {
      return;
    }

    setEditing(null);

    setEditLabel("");
  };

  // ==========================================================================
  // TABLE COLUMNS
  // ==========================================================================
  //
  // Operations does not receive an Actions column at all.
  //
  // ==========================================================================

  const tableColumns = useMemo(() => {
    const columns = [
      "County",
      "District",
      "Center",
      "Place #",
      "Place Code",
      "Label",
      "Active",
    ];

    if (canEdit) {
      columns.push("Actions");
    }

    return columns;
  }, [canEdit]);

  const districtDisabled = !countyId;

  const centerDisabled = !countyId || !districtId;

  // ==========================================================================
  // TABLE ROWS
  // ==========================================================================

  const tableRows = useMemo(() => {
    if (places.length === 0 && !placesQuery.isLoading) {
      return [
        [
          <span key="empty" className="text-slate-600">
            No polling places found.
          </span>,
          "",
          "",
          "",
          "",
          "",
          "",
        ],
      ];
    }

    return places.map((place) => {
      const county = safeStr(place.countyName) || "—";

      const district = safeStr(place.districtName) || "—";

      const center = `${safeStr(place.centerName) || "—"}${
        place.centerCode ? ` • ${safeStr(place.centerCode)}` : ""
      }`;

      const placeNumber = String(place.placeNumber ?? "—");

      const placeCode = safeStr(place.code) || "—";

      const placeLabel = safeStr(place.label) || "—";

      const active = Boolean(place.active);

      const row: React.ReactNode[] = [
        county,
        district,
        center,
        placeNumber,
        placeCode,
        placeLabel,

        active ? (
          <span key="active" className="font-semibold text-emerald-700">
            Yes
          </span>
        ) : (
          <span key="inactive" className="font-semibold text-slate-500">
            No
          </span>
        ),
      ];

      // Administrative portal only.
      if (canEdit) {
        row.push(
          <div key="actions" className="flex items-center gap-2">
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-base font-semibold hover:bg-slate-50 disabled:opacity-50"
              disabled={setActiveMutation.isPending}
              title={active ? "Deactivate" : "Activate"}
              onClick={() => setActiveMutation.mutate(place)}
            >
              {active ? (
                <PowerOff size={16} className="text-red-600" />
              ) : (
                <Power size={16} className="text-blue-600" />
              )}
            </button>

            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-base font-semibold text-green-600 hover:bg-slate-50"
              onClick={() => openEdit(place)}
              title="Edit label"
            >
              <Pencil size={16} />
            </button>

            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-base font-semibold hover:bg-slate-50 disabled:opacity-50"
              disabled={deleteMutation.isPending}
              onClick={() => {
                const confirmed = window.confirm(
                  `Hard delete polling place "${placeCode}"?\nThis is permanent.`,
                );

                if (confirmed) {
                  deleteMutation.mutate(place.placeId);
                }
              }}
              title="Delete"
            >
              <Trash2 size={16} className="text-red-600" />
            </button>
          </div>,
        );
      }

      return row;
    });
  }, [
    places,
    placesQuery.isLoading,
    canEdit,
    setActiveMutation.isPending,
    deleteMutation.isPending,
  ]);

  // ==========================================================================
  // RENDER
  // ==========================================================================

  return (
    <PageShell
      title="Geography • Polling Places"
      subtitle="Places under centers. Allocation and submissions can be place-scoped."
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
            disabled={placesQuery.isFetching}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-blue-100 px-3 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw
              size={16}
              className={placesQuery.isFetching ? "animate-spin" : ""}
            />

            <span className="hidden xs:inline sm:inline">Refresh</span>
          </button>

          {/* ==============================================================
              CREATE

              Completely removed from Operations.
          ============================================================== */}

          {canEdit && (
            <button
              type="button"
              onClick={openCreate}
              className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-[#0000CD] px-3 text-sm font-semibold text-white hover:bg-blue-700 sm:flex-none"
              title="Create polling places"
            >
              <Plus size={16} />
              Create Places
            </button>
          )}
        </div>
      }
    >
      <Card title="Polling Places">
        {/* ================================================================ */}
        {/* FILTERS */}
        {/* ================================================================ */}

        <div className="mb-4 grid grid-cols-2 gap-2 lg:grid-cols-12">
          {/* PLACE SEARCH */}

          <div className="relative col-span-2 lg:col-span-3">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              size={16}
            />

            <input
              value={qPlace}
              onChange={(event) => {
                setQPlace(event.target.value);

                setPage(0);

                setMode("PLACE");
              }}
              placeholder="Search place…"
              className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* COUNTY */}

          <div className="relative col-span-1 lg:col-span-2">
            <select
              value={countyId}
              onChange={(event) => {
                setMode("COUNTY");

                setCountyId(event.target.value);

                setDistrictPrereqAlert(false);

                setCenterPrereqAlert(false);

                setDistrictId("");

                setCenterId("");

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

          {/* DISTRICT */}

          <div
            className="relative col-span-1 lg:col-span-2"
            onMouseDown={() => {
              if (!countyId) {
                setDistrictPrereqAlert(true);
              }
            }}
            onTouchStart={() => {
              if (!countyId) {
                setDistrictPrereqAlert(true);
              }
            }}
          >
            <select
              value={districtId}
              onChange={(event) => {
                setMode("DISTRICT");

                setDistrictId(event.target.value);

                setCenterId("");

                setCenterPrereqAlert(false);

                setPage(0);
              }}
              disabled={districtDisabled || districtsQuery.isError}
              className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-3 py-2 pr-10 text-sm outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50"
              title={
                districtDisabled ? "Select county first" : "Select district"
              }
            >
              <option value="">
                {!countyId
                  ? "Select county…"
                  : districtsQuery.isLoading
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

          {/* CENTER */}

          <div
            className="relative col-span-2 lg:col-span-3"
            onMouseDown={() => {
              if (!districtId) {
                setCenterPrereqAlert(true);
              }
            }}
            onTouchStart={() => {
              if (!districtId) {
                setCenterPrereqAlert(true);
              }
            }}
          >
            <select
              value={centerId}
              onChange={(event) => {
                setMode("CENTER");

                setCenterId(event.target.value);

                setPage(0);
              }}
              disabled={centerDisabled || centersQuery.isError}
              className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-3 py-2 pr-10 text-sm outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50"
              title={
                centerDisabled
                  ? "Select county + district first"
                  : "Select center"
              }
            >
              <option value="">
                {!districtId
                  ? "Select district…"
                  : centersQuery.isLoading
                    ? "Loading…"
                    : "Center"}
              </option>

              {centerOptions.map((option) => (
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

          {/* ACTIVE */}

          <div className="relative col-span-1 lg:col-span-1">
            <select
              value={activeFilter}
              onChange={(event) => {
                setActiveFilter(event.target.value as "" | "true" | "false");

                setPage(0);
              }}
              className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-3 py-2 pr-10 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All</option>

              <option value="true">Active</option>

              <option value="false">Inactive</option>
            </select>

            <ChevronDown
              size={16}
              className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
          </div>

          {/* CLEAR */}

          <button
            type="button"
            onClick={() => {
              setMode("PLACE");

              setQPlace("");

              setCountyId("");

              setDistrictId("");

              setCenterId("");

              setActiveFilter("");

              setDistrictPrereqAlert(false);

              setCenterPrereqAlert(false);

              setPage(0);
            }}
            className="col-span-1 h-10 whitespace-nowrap rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold hover:bg-slate-50 lg:col-span-1"
          >
            Clear All
          </button>
        </div>

        {/* ================================================================ */}
        {/* FILTER WARNINGS */}
        {/* ================================================================ */}

        {districtPrereqAlert && !countyId ? (
          <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800">
            Please select a <b>County</b> first before choosing a{" "}
            <b>District</b>.
          </div>
        ) : null}

        {centerPrereqAlert && (!countyId || !districtId) ? (
          <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800">
            Please select a <b>County</b> first, then a <b>District</b>, before
            choosing a <b>Center</b>.
          </div>
        ) : null}

        {/* ================================================================ */}
        {/* STATUS */}
        {/* ================================================================ */}

        <div className="mt-3">
          {placesQuery.isLoading ? (
            <div className="text-sm text-slate-600">
              Loading polling places…
            </div>
          ) : placesQuery.isError ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {(placesQuery.error as any)?.message ??
                "Failed to load polling places."}
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
        {/* MOBILE PLACE CARDS */}
        {/* ================================================================ */}

        <div className="mt-3 space-y-2 md:hidden">
          {places.length === 0 && !placesQuery.isLoading ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
              No polling places found.
            </div>
          ) : (
            places.map((place) => {
              const county = safeStr(place.countyName) || "—";

              const district = safeStr(place.districtName) || "—";

              const centerName = safeStr(place.centerName) || "—";

              const centerCode = safeStr(place.centerCode);

              const placeCode = safeStr(place.code) || "—";

              const placeLabel = safeStr(place.label) || "—";

              const active = Boolean(place.active);

              return (
                <article
                  key={place.placeId}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm"
                >
                  {/* ======================================================
                      TOP ROW
                  ====================================================== */}

                  <div className="flex items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="rounded-lg bg-[#00008B] px-2.5 py-1 text-sm font-extrabold text-white shadow-sm">
                          Place #{place.placeNumber}
                        </span>

                        <span
                          className={[
                            "rounded-md px-2 py-0.5 text-[11px] font-bold",
                            active
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-slate-100 text-slate-500",
                          ].join(" ")}
                        >
                          {active ? "Active" : "Inactive"}
                        </span>
                      </div>

                      <div className="mt-1 truncate text-xs font-semibold text-slate-500">
                        Room/Label:{" "}
                        <span className="font-bold text-slate-700">
                          {placeLabel}
                        </span>
                      </div>

                      <div className="mt-0.5 truncate text-sm font-semibold text-slate-700">
                        {centerName}
                      </div>

                      {centerCode ? (
                        <div className="truncate text-[11px] text-slate-500">
                          {centerCode}
                        </div>
                      ) : null}
                    </div>

                    {/* ====================================================
                        MOBILE ACTIONS

                        Completely absent in Operations.
                    ==================================================== */}

                    {canEdit && (
                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          type="button"
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50"
                          disabled={setActiveMutation.isPending}
                          title={active ? "Deactivate" : "Activate"}
                          onClick={() => setActiveMutation.mutate(place)}
                        >
                          {active ? (
                            <PowerOff size={14} className="text-red-600" />
                          ) : (
                            <Power size={14} className="text-blue-600" />
                          )}
                        </button>

                        <button
                          type="button"
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-green-600 hover:bg-slate-50"
                          onClick={() => openEdit(place)}
                          title="Edit label"
                        >
                          <Pencil size={14} />
                        </button>

                        <button
                          type="button"
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50"
                          disabled={deleteMutation.isPending}
                          onClick={() => {
                            const confirmed = window.confirm(
                              `Hard delete polling place "${placeCode}"?\nThis is permanent.`,
                            );

                            if (confirmed) {
                              deleteMutation.mutate(place.placeId);
                            }
                          }}
                          title="Delete"
                        >
                          <Trash2 size={14} className="text-red-600" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* ======================================================
                      COMPACT DETAILS
                  ====================================================== */}

                  <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 border-t border-slate-100 pt-2 text-[11px]">
                    <div className="min-w-0">
                      <span className="font-bold text-slate-400">County:</span>{" "}
                      <span className="font-semibold text-slate-700">
                        {county}
                      </span>
                    </div>

                    <div className="min-w-0">
                      <span className="font-bold text-slate-400">
                        District:
                      </span>{" "}
                      <span className="font-semibold text-slate-700">
                        {district}
                      </span>
                    </div>

                    <div className="col-span-2 min-w-0">
                      <span className="font-bold text-slate-400">Code:</span>{" "}
                      <span className="break-all font-mono text-slate-600">
                        {placeCode}
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
        {/* ADMIN NOTES                                                     */}
        {/* Hidden from Operations.                                         */}
        {/* ================================================================ */}

        {!isOperations && (
          <div className="mt-3 hidden grid-cols-1 gap-3 md:grid lg:grid-cols-2">
            <Note
              title="Filter rules"
              bullets={[
                "Search Place: search by place code/label/center name.",
                "County must be selected first to unlock District filter.",
                "District must be selected to unlock Center filter.",
                "Center filter lists places only for that center.",
                "Active Filter applies to any filter mode.",
              ]}
            />

            <Note
              title="API mapping"
              bullets={[
                "GET /api/polling-places?q=&countyId=&districtId=&centerId=&active=&page=&size=",
                "PUT /api/polling-places/{id} (label only)",
                "PUT /api/polling-places/{id}/active?active=true|false",
                "DELETE /api/polling-places/{id} (hard delete)",
              ]}
            />
          </div>
        )}
      </Card>

      {/* ================================================================== */}
      {/* EDIT MODAL                                                        */}
      {/*                                                                    */}
      {/* canEdit guarantees this can never render in Operations.           */}
      {/* ================================================================== */}

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
                <h2 className="text-xl font-bold">Edit Polling Place</h2>

                <p className="mt-1 text-sm text-blue-100">
                  Only the human-readable label can be updated.
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
              <div className="grid grid-cols-2 gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm">
                <div>
                  <div className="text-xs font-bold uppercase tracking-wide text-slate-400">
                    Place #
                  </div>

                  <div className="mt-1 font-semibold text-slate-800">
                    {editing.placeNumber}
                  </div>
                </div>

                <div>
                  <div className="text-xs font-bold uppercase tracking-wide text-slate-400">
                    Code
                  </div>

                  <div className="mt-1 font-semibold text-slate-800">
                    {editing.code}
                  </div>
                </div>

                <div className="col-span-2">
                  <div className="text-xs font-bold uppercase tracking-wide text-slate-400">
                    Center
                  </div>

                  <div className="mt-1 font-semibold text-slate-800">
                    {safeStr(editing.centerName) || "—"}
                  </div>
                </div>
              </div>

              {/* LABEL */}

              <div>
                <label className="mb-2 block text-sm font-bold uppercase tracking-wide text-slate-700">
                  Label
                </label>

                <input
                  type="text"
                  value={editLabel}
                  onChange={(event) => setEditLabel(event.target.value)}
                  disabled={updateMutation.isPending}
                  maxLength={100}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-base outline-none focus:border-transparent focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100"
                />
              </div>

              {/* ERROR */}

              {updateMutation.error ? (
                <div className="flex gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
                  <AlertCircle
                    className="mt-0.5 shrink-0 text-red-600"
                    size={20}
                  />

                  <div>
                    <div className="text-sm font-bold text-red-900">Error</div>

                    <div className="mt-1 text-sm text-red-800">
                      {friendlyPollingPlaceSaveError(updateMutation.error)}
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
                disabled={updateMutation.isPending || !canEdit}
                className="rounded-xl bg-blue-600 px-5 py-2.5 font-semibold text-white shadow-md hover:bg-blue-700 disabled:opacity-50"
              >
                {updateMutation.isPending ? "Saving…" : "Update Place"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </PageShell>
  );
}

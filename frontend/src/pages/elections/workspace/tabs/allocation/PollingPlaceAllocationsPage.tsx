// src/pages/elections/workspace/tabs/allocation/PollingPlaceAllocationsPage.tsx

import { useMemo, useState } from "react";

import { useNavigate, useParams } from "react-router-dom";

import { useQuery, useQueryClient } from "@tanstack/react-query";

import {
  Check,
  ChevronRight,
  FilterX,
  Plus,
  RefreshCw,
  Search,
} from "lucide-react";

import { useAuthStore } from "../../../../../shared/store/authStore";

import { Badge } from "../../../shared/elections-ui";

import {
  searchPlaceAllocations,
  type PollingPlaceAllocationDto,
} from "../../../../../shared/services/pollingPlaceAllocationService";

import {
  fetchCounties,
  type CountyDto,
} from "../../../../../shared/services/countyService";

import {
  fetchDistricts,
  type DistrictDto,
} from "../../../../../shared/services/districtService";

import {
  fetchPollingCenters,
  type PollingCenterDto,
} from "../../../../../shared/services/pollingCenterService";

// ============================================================================
// HELPERS
// ============================================================================

function allocationPlaceName(allocation: PollingPlaceAllocationDto) {
  if (allocation.placeNumber != null) {
    return `Polling Place #${String(allocation.placeNumber).padStart(2, "0")}`;
  }

  if (allocation.placeCode?.trim()) {
    return "Polling Place";
  }

  if (allocation.placeLabel?.trim()) {
    return "Polling Place";
  }

  return "Polling Place";
}

function formatNumber(value: number | null | undefined) {
  return Number(value ?? 0).toLocaleString();
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function PollingPlaceAllocationsPage() {
  const { electionId } = useParams<{
    electionId: string;
  }>();

  const navigate = useNavigate();

  const queryClient = useQueryClient();

  // ==========================================================================
  // ACCESS
  // ==========================================================================

  const dashboardMode = useAuthStore((state) => state.dashboardMode);

  const isSystemAdmin = useAuthStore((state) => state.isSystemAdmin());

  const canEdit =
    dashboardMode === "SYSTEM" || dashboardMode === "NEC" || isSystemAdmin;

  // ==========================================================================
  // FILTER / PAGINATION STATE
  // ==========================================================================

  const [countyId, setCountyId] = useState("");

  const [districtId, setDistrictId] = useState("");

  const [centerId, setCenterId] = useState("");

  const [search, setSearch] = useState("");

  const [page, setPage] = useState(0);

  const [size, setSize] = useState(25);

  // ==========================================================================
  // FILTER CHANGES
  // ==========================================================================

  const changeCounty = (value: string) => {
    setCountyId(value);

    setDistrictId("");
    setCenterId("");

    setPage(0);
  };

  const changeDistrict = (value: string) => {
    setDistrictId(value);

    setCenterId("");

    setPage(0);
  };

  const changeCenter = (value: string) => {
    setCenterId(value);

    setPage(0);
  };

  const clearFilters = () => {
    setCountyId("");
    setDistrictId("");
    setCenterId("");
    setSearch("");

    setPage(0);
  };

  // ==========================================================================
  // COUNTIES
  // ==========================================================================

  const countiesQuery = useQuery({
    queryKey: ["counties", "polling-place-allocation"],

    queryFn: async () => {
      const result = await fetchCounties({
        page: 0,
        size: 500,
      });

      return result.items as CountyDto[];
    },

    staleTime: 60_000,

    retry: 1,
  });

  // ==========================================================================
  // DISTRICTS
  // ==========================================================================

  const districtsQuery = useQuery({
    enabled: Boolean(countyId),

    queryKey: ["districts", "polling-place-allocation", countyId],

    queryFn: async () => {
      const result = await fetchDistricts({
        page: 0,
        size: 2000,
        countyId,
      });

      return result.items as DistrictDto[];
    },

    staleTime: 60_000,

    retry: 1,
  });

  // ==========================================================================
  // CENTERS
  // ==========================================================================

  const centersQuery = useQuery({
    enabled: Boolean(countyId && districtId),

    queryKey: [
      "polling-centers",
      "polling-place-allocation",
      countyId,
      districtId,
    ],

    queryFn: async () => {
      const result = await fetchPollingCenters({
        page: 0,
        size: 5000,
        countyId,
        districtId,
      });

      return result.items as PollingCenterDto[];
    },

    staleTime: 60_000,

    retry: 1,
  });

  // ==========================================================================
  // SELECTED FILTER VALUES
  // ==========================================================================

  const selectedCounty = useMemo(
    () =>
      (countiesQuery.data ?? []).find((county) => county.countyId === countyId),

    [countiesQuery.data, countyId],
  );

  const selectedDistrict = useMemo(
    () =>
      (districtsQuery.data ?? []).find(
        (district) => district.districtId === districtId,
      ),

    [districtsQuery.data, districtId],
  );

  const selectedCenter = useMemo(
    () =>
      (centersQuery.data ?? []).find((center) => center.centerId === centerId),

    [centersQuery.data, centerId],
  );

  // ==========================================================================
  // ALLOCATIONS
  // ==========================================================================

  const allocationsQuery = useQuery({
    enabled: Boolean(electionId),

    queryKey: ["polling-place-allocations", electionId, centerId, page, size],

    queryFn: () =>
      searchPlaceAllocations({
        electionId: electionId!,

        centerId: centerId || undefined,

        page,

        size,
      }),

    staleTime: 10_000,

    retry: 1,
  });

  // ==========================================================================
  // DATA
  // ==========================================================================

  const pageData = allocationsQuery.data;

  const allocations = pageData?.items ?? [];

  // ==========================================================================
  // SEARCH
  // ==========================================================================

  const visibleAllocations = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return allocations;
    }

    return allocations.filter((allocation) => {
      const searchable = [
        allocation.placeLabel,
        allocation.placeCode,
        allocation.placeNumber,
        allocation.centerName,
        allocation.countyName,
        allocation.districtName,
      ]
        .filter((value) => value != null && value !== "")
        .join(" ")
        .toLowerCase();

      return searchable.includes(query);
    });
  }, [allocations, search]);

  // ==========================================================================
  // REFRESH
  // ==========================================================================

  const refreshNow = async () => {
    if (!electionId) {
      return;
    }

    await queryClient.invalidateQueries({
      queryKey: ["polling-place-allocations", electionId],
    });

    await allocationsQuery.refetch();
  };

  // ==========================================================================
  // ROUTE GUARD
  // ==========================================================================

  if (!electionId) {
    return (
      <div className="app-content">
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <div className="text-base font-bold text-red-800">
            Polling Place Allocations
          </div>

          <div className="mt-1 text-sm text-red-700">Missing election ID.</div>
        </div>
      </div>
    );
  }

  // ==========================================================================
  // RENDER
  // ==========================================================================

  return (
    <div className="app-content">
      <div className="flex min-w-0 flex-col gap-3">
        {/* ================================================================
            ACTION ROW
        ================================================================ */}

        <div
          className="
            flex
            min-w-0
            flex-wrap
            items-center
            justify-between
            gap-2
          "
        >
          <div className="min-w-0 text-sm font-semibold text-slate-600">
            {selectedCenter ? (
              <>
                Showing allocations for{" "}
                <span className="font-bold text-slate-900">
                  {selectedCenter.centerName}
                </span>
              </>
            ) : (
              "Showing all polling-place allocations for this election"
            )}
          </div>

          <div
            className="
              ml-auto
              flex
              shrink-0
              items-center
              gap-2
            "
          >
            {canEdit ? (
              <button
                type="button"
                onClick={() =>
                  navigate(`/elections/${electionId}/allocation/places/new`, {
                    state: centerId
                      ? {
                          countyId,
                          districtId,
                          centerId,
                        }
                      : undefined,
                  })
                }
                className="
                  inline-flex
                  min-h-10
                  items-center
                  justify-center
                  gap-1.5
                  rounded-lg
                  bg-blue-600
                  px-3
                  py-2
                  text-sm
                  font-bold
                  text-white
                  shadow-sm
                  transition
                  hover:bg-blue-700
                "
              >
                <Plus size={17} />

                <span className="hidden sm:inline">Allocate Places</span>

                <span className="sm:hidden">Allocate</span>
              </button>
            ) : (
              <Badge text="Read-only" />
            )}

            <button
              type="button"
              onClick={refreshNow}
              disabled={allocationsQuery.isFetching}
              className="
                inline-flex
                min-h-10
                items-center
                justify-center
                gap-1.5
                rounded-lg
                border
                border-slate-300
                bg-white
                px-3
                py-2
                text-sm
                font-semibold
                text-slate-700
                transition
                hover:bg-slate-50
                disabled:cursor-not-allowed
                disabled:opacity-50
              "
            >
              <RefreshCw
                size={16}
                className={allocationsQuery.isFetching ? "animate-spin" : ""}
              />

              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </div>

        {/* ================================================================
            FILTERS
        ================================================================ */}

        <section
          className="
            rounded-xl
            border
            border-slate-200
            bg-white
            p-2.5
          "
        >
          <div
            className="
              grid
              min-w-0
              grid-cols-2
              gap-2

              lg:grid-cols-[minmax(200px,1.35fr)_minmax(140px,0.8fr)_minmax(140px,0.8fr)_minmax(180px,1fr)_auto]
              lg:items-center
            "
          >
            {/* SEARCH */}

            <div
              className="
                relative
                col-span-2
                min-w-0
                lg:col-span-1
              "
            >
              <Search
                size={17}
                className="
                  pointer-events-none
                  absolute
                  left-3
                  top-1/2
                  -translate-y-1/2
                  text-slate-400
                "
              />

              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search place or center..."
                className="
                  min-h-10
                  w-full
                  rounded-lg
                  border
                  border-slate-300
                  bg-white
                  py-2
                  pl-9
                  pr-3
                  text-sm
                  text-slate-900
                  outline-none
                  placeholder:text-slate-400
                  focus:border-blue-500
                  focus:ring-2
                  focus:ring-blue-100
                "
              />
            </div>

            {/* COUNTY */}

            <select
              value={countyId}
              onChange={(event) => changeCounty(event.target.value)}
              className="
                min-h-10
                w-full
                rounded-lg
                border
                border-slate-300
                bg-white
                px-2.5
                text-sm
                text-slate-900
                outline-none
                focus:border-blue-500
                focus:ring-2
                focus:ring-blue-100
              "
              aria-label="County filter"
            >
              <option value="">All counties</option>

              {(countiesQuery.data ?? []).map((county) => (
                <option key={county.countyId} value={county.countyId}>
                  {county.countyName}
                </option>
              ))}
            </select>

            {/* DISTRICT */}

            <select
              value={districtId}
              onChange={(event) => changeDistrict(event.target.value)}
              disabled={!countyId}
              className="
                min-h-10
                w-full
                rounded-lg
                border
                border-slate-300
                bg-white
                px-2.5
                text-sm
                text-slate-900
                outline-none
                focus:border-blue-500
                focus:ring-2
                focus:ring-blue-100
                disabled:cursor-not-allowed
                disabled:bg-slate-100
                disabled:text-slate-400
              "
              aria-label="District filter"
            >
              <option value="">
                {countyId ? "All districts" : "District"}
              </option>

              {(districtsQuery.data ?? []).map((district) => (
                <option key={district.districtId} value={district.districtId}>
                  {district.districtName}
                </option>
              ))}
            </select>

            {/* CENTER */}

            <select
              value={centerId}
              onChange={(event) => changeCenter(event.target.value)}
              disabled={!countyId || !districtId}
              className="
                min-h-10
                w-full
                rounded-lg
                border
                border-slate-300
                bg-white
                px-2.5
                text-sm
                text-slate-900
                outline-none
                focus:border-blue-500
                focus:ring-2
                focus:ring-blue-100
                disabled:cursor-not-allowed
                disabled:bg-slate-100
                disabled:text-slate-400
              "
              aria-label="Polling center filter"
            >
              <option value="">
                {countyId && districtId ? "All centers" : "Center"}
              </option>

              {(centersQuery.data ?? []).map((center) => (
                <option key={center.centerId} value={center.centerId}>
                  {center.centerName}
                </option>
              ))}
            </select>

            {/* CLEAR */}

            <button
              type="button"
              onClick={clearFilters}
              disabled={!countyId && !districtId && !centerId && !search}
              className="
                inline-flex
                min-h-10
                items-center
                justify-center
                gap-1.5
                rounded-lg
                border
                border-slate-300
                bg-white
                px-3
                text-sm
                font-semibold
                text-slate-700
                transition
                hover:bg-slate-50
                disabled:cursor-not-allowed
                disabled:opacity-50
              "
            >
              <FilterX size={16} />
              Clear
            </button>
          </div>

          {/* ACTIVE FILTER */}

          {(selectedCounty || selectedDistrict || selectedCenter) && (
            <div
              className="
                mt-2
                flex
                min-w-0
                flex-wrap
                items-center
                gap-x-1.5
                gap-y-0.5
                border-t
                border-slate-100
                pt-2
                text-xs
                text-slate-500
              "
            >
              <span className="font-semibold">Filter:</span>

              {selectedCounty && <span>{selectedCounty.countyName}</span>}

              {selectedDistrict && (
                <>
                  <span className="text-slate-300">/</span>

                  <span>{selectedDistrict.districtName}</span>
                </>
              )}

              {selectedCenter && (
                <>
                  <span className="text-slate-300">/</span>

                  <span className="font-semibold text-slate-700">
                    {selectedCenter.centerName}
                  </span>
                </>
              )}
            </div>
          )}
        </section>

        {/* ================================================================
            RESULT COUNT
        ================================================================ */}

        {!allocationsQuery.isLoading &&
          !allocationsQuery.isError &&
          allocations.length > 0 && (
            <div className="px-0.5 text-xs font-semibold text-slate-500 sm:text-sm">
              {visibleAllocations.length} allocation
              {visibleAllocations.length === 1 ? "" : "s"} on this page
            </div>
          )}

        {/* ================================================================
            LOADING
        ================================================================ */}

        {allocationsQuery.isLoading && (
          <div className="rounded-xl border border-slate-200 bg-white p-5 text-center text-sm text-slate-500">
            Loading polling-place allocations…
          </div>
        )}

        {/* ================================================================
            ERROR
        ================================================================ */}

        {allocationsQuery.isError && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
            {(allocationsQuery.error as any)?.message ??
              "Failed to load polling-place allocations."}
          </div>
        )}

        {/* ================================================================
            EMPTY
        ================================================================ */}

        {!allocationsQuery.isLoading &&
          !allocationsQuery.isError &&
          allocations.length === 0 && (
            <div
              className="
                rounded-xl
                border
                border-dashed
                border-slate-300
                bg-white
                px-4
                py-8
                text-center
              "
            >
              <div className="text-base font-bold text-slate-700">
                No polling-place allocations found
              </div>

              <div className="mt-1 text-sm text-slate-500">
                No place allocations match the current selection.
              </div>
            </div>
          )}

        {/* ================================================================
            SEARCH EMPTY
        ================================================================ */}

        {!allocationsQuery.isLoading &&
          !allocationsQuery.isError &&
          allocations.length > 0 &&
          visibleAllocations.length === 0 && (
            <div
              className="
                rounded-xl
                border
                border-dashed
                border-slate-300
                bg-white
                px-4
                py-8
                text-center
              "
            >
              <div className="text-base font-bold text-slate-700">
                No matching allocations
              </div>

              <div className="mt-1 text-sm text-slate-500">
                No allocation on this page matches your search.
              </div>
            </div>
          )}

        {/* ================================================================
            LIST
        ================================================================ */}

        {!allocationsQuery.isLoading &&
          !allocationsQuery.isError &&
          visibleAllocations.length > 0 && (
            <section className="entity-list">
              {/* ==========================================================
                  DESKTOP HEADER
              ========================================================== */}

              <div
                className="
                  hidden
                  border-b
                  border-slate-200
                  bg-slate-50
                  px-4
                  py-2
                  text-xs
                  font-bold
                  uppercase
                  tracking-wide
                  text-slate-500

                  md:grid
                  md:grid-cols-[minmax(0,1.15fr)_minmax(0,0.9fr)_120px_120px_105px_24px]
                  md:items-center
                  md:gap-4
                "
              >
                <div>Polling Place</div>

                <div>Polling Center</div>

                <div className="text-right">Registered</div>

                <div className="text-right">Ballots</div>

                <div className="text-center">Status</div>

                <div />
              </div>

              {/* ==========================================================
                  RECORDS
              ========================================================== */}

              {visibleAllocations.map((allocation) => {
                const placeName = allocationPlaceName(allocation);

                const isActive = allocation.active !== false;

                return (
                  <button
                    key={allocation.placeAllocationId}
                    type="button"
                    onClick={() =>
                      navigate(
                        `/elections/${electionId}/allocation/places/${allocation.placeAllocationId}`,
                      )
                    }
                    className="
                        group
                        block
                        w-full
                        border-b
                        border-slate-200
                        bg-white
                        text-left
                        transition
                        last:border-b-0
                        hover:bg-slate-50
                      "
                  >
                    {/* ==================================================
                          MOBILE
                      ================================================== */}

                    <div
                      className="
                          px-3.5
                          py-3

                          md:hidden
                        "
                    >
                      {/* =================================================
                            LINE 1
                            Polling Place Number | status | chevron
                        ================================================= */}

                      <div
                        className="
                            flex
                            min-w-0
                            items-center
                            gap-2
                          "
                      >
                        <div
                          className="
                              min-w-0
                              flex-1
                              truncate
                              text-base
                              font-bold
                              text-slate-900
                            "
                          title={placeName}
                        >
                          {placeName}
                        </div>

                        <span
                          className={
                            isActive
                              ? `
                                    inline-flex
                                    h-8
                                    w-8
                                    shrink-0
                                    items-center
                                    justify-center
                                    rounded-full
                                    bg-emerald-50
                                    text-emerald-600
                                  `
                              : `
                                    inline-flex
                                    h-8
                                    w-8
                                    shrink-0
                                    items-center
                                    justify-center
                                    rounded-full
                                    bg-slate-100
                                    text-slate-400
                                  `
                          }
                          title={isActive ? "Allocated" : "Inactive"}
                        >
                          <Check size={18} strokeWidth={2.6} />
                        </span>

                        <ChevronRight
                          size={20}
                          className="
                              shrink-0
                              text-slate-400
                              transition
                              group-hover:text-blue-600
                            "
                        />
                      </div>

                      {/* =================================================
                            LINE 2
                            Label + code | Registered | Ballots
                        ================================================= */}

                      <div
                        className="
                            mt-1.5
                            grid
                            min-w-0
                            grid-cols-[minmax(0,1fr)_72px_72px]
                            items-end
                            gap-2
                          "
                      >
                        {/* PLACE META */}

                        <div className="min-w-0">
                          {allocation.placeLabel && (
                            <div
                              className="
                                  truncate
                                  text-sm
                                  font-semibold
                                  text-slate-700
                                "
                              title={allocation.placeLabel}
                            >
                              {allocation.placeLabel}
                            </div>
                          )}

                          {allocation.placeCode && (
                            <div
                              className="
                                  mt-0.5
                                  truncate
                                  text-xs
                                  font-medium
                                  text-slate-500
                                "
                              title={allocation.placeCode}
                            >
                              {allocation.placeCode}
                            </div>
                          )}
                        </div>

                        {/* REGISTERED */}

                        <div>
                          <div
                            className="
                                text-[10px]
                                font-bold
                                uppercase
                                leading-none
                                tracking-wide
                                text-slate-400
                              "
                          >
                            Reg.
                          </div>

                          <div
                            className="
                                mt-1
                                text-base
                                font-bold
                                leading-none
                                text-slate-900
                              "
                          >
                            {formatNumber(allocation.registeredVoters)}
                          </div>
                        </div>

                        {/* BALLOTS */}

                        <div>
                          <div
                            className="
                                text-[10px]
                                font-bold
                                uppercase
                                leading-none
                                tracking-wide
                                text-slate-400
                              "
                          >
                            Ballots
                          </div>

                          <div
                            className="
                                mt-1
                                text-base
                                font-bold
                                leading-none
                                text-slate-900
                              "
                          >
                            {formatNumber(allocation.ballotsIssued)}
                          </div>
                        </div>
                      </div>

                      {/* =================================================
                            LINE 3
                            Center name
                        ================================================= */}

                      <div
                        className="
                            mt-1.5
                            min-w-0
                            truncate
                            text-xs
                            font-medium
                            text-slate-600
                          "
                        title={allocation.centerName ?? ""}
                      >
                        {allocation.centerName ?? "No polling center"}
                      </div>

                      {/* =================================================
                            LINE 4
                            County • District
                        ================================================= */}

                      {(allocation.countyName || allocation.districtName) && (
                        <div
                          className="
                              mt-0.5
                              flex
                              min-w-0
                              items-center
                              gap-1.5
                              text-xs
                              text-slate-500
                            "
                        >
                          {allocation.countyName && (
                            <span className="min-w-0 truncate">
                              {allocation.countyName}
                            </span>
                          )}

                          {allocation.countyName && allocation.districtName && (
                            <span className="shrink-0 text-slate-300">•</span>
                          )}

                          {allocation.districtName && (
                            <span className="min-w-0 truncate">
                              {allocation.districtName}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* ==================================================
                          TABLET / DESKTOP
                      ================================================== */}

                    <div
                      className="
                          hidden
                          min-w-0
                          px-4
                          py-3

                          md:grid
                          md:grid-cols-[minmax(0,1.15fr)_minmax(0,0.9fr)_120px_120px_105px_24px]
                          md:items-center
                          md:gap-4
                        "
                    >
                      {/* PLACE */}

                      <div className="min-w-0">
                        <div
                          className="
                              truncate
                              text-sm
                              font-bold
                              text-slate-900
                              lg:text-base
                            "
                          title={placeName}
                        >
                          {placeName}
                        </div>

                        {(allocation.placeLabel || allocation.placeCode) && (
                          <div
                            className="
                                mt-0.5
                                flex
                                min-w-0
                                items-center
                                gap-1.5
                                text-xs
                                text-slate-500
                              "
                            title={[allocation.placeLabel, allocation.placeCode]
                              .filter(Boolean)
                              .join(" • ")}
                          >
                            {allocation.placeLabel && (
                              <span className="min-w-0 truncate font-semibold text-slate-600">
                                {allocation.placeLabel}
                              </span>
                            )}

                            {allocation.placeLabel && allocation.placeCode && (
                              <span className="shrink-0 text-slate-300">•</span>
                            )}

                            {allocation.placeCode && (
                              <span className="min-w-0 truncate">
                                {allocation.placeCode}
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* CENTER / LOCATION */}

                      <div className="min-w-0">
                        <div
                          className="
                              truncate
                              text-sm
                              font-semibold
                              text-slate-800
                              lg:text-base
                            "
                          title={allocation.centerName ?? ""}
                        >
                          {allocation.centerName ?? "—"}
                        </div>

                        {(allocation.countyName || allocation.districtName) && (
                          <div
                            className="
                                mt-0.5
                                flex
                                min-w-0
                                items-center
                                gap-1.5
                                text-xs
                                text-slate-500
                              "
                            title={[
                              allocation.countyName,
                              allocation.districtName,
                            ]
                              .filter(Boolean)
                              .join(" • ")}
                          >
                            {allocation.countyName && (
                              <span className="min-w-0 truncate">
                                {allocation.countyName}
                              </span>
                            )}

                            {allocation.countyName &&
                              allocation.districtName && (
                                <span className="shrink-0 text-slate-300">
                                  •
                                </span>
                              )}

                            {allocation.districtName && (
                              <span className="min-w-0 truncate">
                                {allocation.districtName}
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* REGISTERED */}

                      <div className="text-right">
                        <div
                          className="
                              text-[10px]
                              font-bold
                              uppercase
                              tracking-wide
                              text-slate-400
                            "
                        >
                          Registered
                        </div>

                        <div
                          className="
                              mt-0.5
                              text-sm
                              font-bold
                              text-slate-900
                              lg:text-base
                            "
                        >
                          {formatNumber(allocation.registeredVoters)}
                        </div>
                      </div>

                      {/* BALLOTS */}

                      <div className="text-right">
                        <div
                          className="
                              text-[10px]
                              font-bold
                              uppercase
                              tracking-wide
                              text-slate-400
                            "
                        >
                          Ballots
                        </div>

                        <div
                          className="
                              mt-0.5
                              text-sm
                              font-bold
                              text-slate-900
                              lg:text-base
                            "
                        >
                          {formatNumber(allocation.ballotsIssued)}
                        </div>
                      </div>

                      {/* STATUS */}

                      <div className="flex justify-center">
                        <span
                          className={
                            isActive
                              ? `
                                    inline-flex
                                    rounded-full
                                    bg-emerald-50
                                    px-2.5
                                    py-1
                                    text-xs
                                    font-bold
                                    text-emerald-700
                                  `
                              : `
                                    inline-flex
                                    rounded-full
                                    bg-slate-100
                                    px-2.5
                                    py-1
                                    text-xs
                                    font-bold
                                    text-slate-600
                                  `
                          }
                        >
                          {isActive ? "Allocated" : "Inactive"}
                        </span>
                      </div>

                      {/* CHEVRON */}

                      <ChevronRight
                        size={19}
                        className="
                            text-slate-400
                            transition
                            group-hover:text-blue-600
                          "
                      />
                    </div>
                  </button>
                );
              })}
            </section>
          )}

        {/* ================================================================
            PAGINATION
        ================================================================ */}

        {pageData && allocations.length > 0 && (
          <section
            className="
                flex
                min-w-0
                flex-col
                gap-2
                rounded-xl
                border
                border-slate-200
                bg-white
                p-2.5

                sm:flex-row
                sm:items-center
                sm:justify-between
              "
          >
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((current) => Math.max(0, current - 1))}
                disabled={page <= 0 || allocationsQuery.isFetching}
                className="
                    min-h-10
                    rounded-lg
                    border
                    border-slate-300
                    bg-white
                    px-3
                    py-2
                    text-sm
                    font-semibold
                    text-slate-700
                    hover:bg-slate-50
                    disabled:cursor-not-allowed
                    disabled:opacity-40
                  "
              >
                Previous
              </button>

              <button
                type="button"
                onClick={() =>
                  setPage((current) =>
                    current + 1 < pageData.totalPages ? current + 1 : current,
                  )
                }
                disabled={
                  pageData.page + 1 >= pageData.totalPages ||
                  allocationsQuery.isFetching
                }
                className="
                    min-h-10
                    rounded-lg
                    border
                    border-slate-300
                    bg-white
                    px-3
                    py-2
                    text-sm
                    font-semibold
                    text-slate-700
                    hover:bg-slate-50
                    disabled:cursor-not-allowed
                    disabled:opacity-40
                  "
              >
                Next
              </button>
            </div>

            <div
              className="
                  flex
                  flex-wrap
                  items-center
                  gap-2
                  text-xs
                  font-semibold
                  text-slate-600
                  sm:justify-end
                  sm:text-sm
                "
            >
              <span>
                Page {pageData.page + 1} of {Math.max(pageData.totalPages, 1)}
              </span>

              <span className="hidden text-slate-300 sm:inline">•</span>

              <span>
                {pageData.totalItems} allocation
                {pageData.totalItems === 1 ? "" : "s"}
              </span>

              <select
                value={size}
                onChange={(event) => {
                  setSize(Number(event.target.value));

                  setPage(0);
                }}
                className="
                    min-h-9
                    rounded-lg
                    border
                    border-slate-300
                    bg-white
                    px-2
                    text-sm
                    font-semibold
                    text-slate-700
                  "
                aria-label="Page size"
              >
                <option value={10}>10</option>

                <option value={25}>25</option>

                <option value={50}>50</option>

                <option value={100}>100</option>
              </select>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

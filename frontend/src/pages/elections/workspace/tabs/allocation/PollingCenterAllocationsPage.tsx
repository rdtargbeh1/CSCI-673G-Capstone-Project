// src/pages/elections/workspace/tabs/allocation/PollingCenterAllocationPage.tsx

import { useState } from "react";
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

import {
  fetchAllocations,
  type PollingCenterAllocationDto,
} from "../../../../../shared/services/pollingCenterAllocationService";

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

function safeText(value: unknown, fallback = "—") {
  if (value === null || value === undefined || value === "") {
    return fallback;
  }

  return String(value);
}

function formatNumber(value: number | null | undefined) {
  if (value === null || value === undefined) {
    return "—";
  }

  return new Intl.NumberFormat().format(value);
}

export default function PollingCenterAllocationPage() {
  const { electionId } = useParams<{ electionId: string }>();

  const navigate = useNavigate();

  const queryClient = useQueryClient();

  // ================================================================
  // AUTHORIZATION
  // ================================================================

  const dashboardMode = useAuthStore((state) => state.dashboardMode);

  const isSystemAdmin = useAuthStore((state) => state.isSystemAdmin());

  const canEdit =
    dashboardMode === "SYSTEM" || dashboardMode === "NEC" || isSystemAdmin;

  // ================================================================
  // FILTER STATE
  // ================================================================

  const [countyId, setCountyId] = useState("");

  const [districtId, setDistrictId] = useState("");

  const [centerId, setCenterId] = useState("");

  const [search, setSearch] = useState("");

  const [page, setPage] = useState(0);

  const size = 20;

  // ================================================================
  // COUNTIES
  // ================================================================

  const countiesQ = useQuery({
    queryKey: ["counties", "allocation-page"],

    queryFn: async () => {
      const response = await fetchCounties({
        page: 0,
        size: 500,
      });

      return response.items as CountyDto[];
    },

    staleTime: 60_000,
    retry: 1,
  });

  // ================================================================
  // DISTRICTS
  // ================================================================

  const districtsQ = useQuery({
    enabled: Boolean(countyId),

    queryKey: ["districts", "allocation-page", countyId],

    queryFn: async () => {
      const response = await fetchDistricts({
        page: 0,
        size: 2000,
        countyId,
      });

      return response.items as DistrictDto[];
    },

    staleTime: 60_000,
    retry: 1,
  });

  // ================================================================
  // CENTERS
  // ================================================================

  const centersQ = useQuery({
    enabled: Boolean(countyId) && Boolean(districtId),

    queryKey: ["polling-centers", "allocation-page", countyId, districtId],

    queryFn: async () => {
      const response = await fetchPollingCenters({
        page: 0,
        size: 5000,
        countyId,
        districtId,
      });

      return response.items as PollingCenterDto[];
    },

    staleTime: 60_000,
    retry: 1,
  });

  // ================================================================
  // ALLOCATIONS
  // ================================================================

  const allocationsQ = useQuery({
    enabled: Boolean(electionId),

    queryKey: [
      "polling-center-allocations",
      electionId,
      page,
      size,
      countyId,
      districtId,
      centerId,
    ],

    queryFn: () =>
      fetchAllocations({
        electionId: electionId!,
        countyId: countyId || undefined,
        districtId: districtId || undefined,
        centerId: centerId || undefined,
        page,
        size,
      }),

    staleTime: 10_000,
    retry: 1,
  });

  // ================================================================
  // DISPLAY
  // ================================================================

  const allocations = allocationsQ.data?.items ?? [];

  const normalizedSearch = search.trim().toLowerCase();

  const visibleAllocations =
    normalizedSearch.length === 0
      ? allocations
      : allocations.filter((allocation) => {
          const text = [
            allocation.centerName,
            allocation.centerCode,
            allocation.countyName,
            allocation.districtName,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();

          return text.includes(normalizedSearch);
        });

  // ================================================================
  // ACTIONS
  // ================================================================

  const handleCountyChange = (nextCountyId: string) => {
    setCountyId(nextCountyId);

    setDistrictId("");
    setCenterId("");
    setPage(0);
  };

  const handleDistrictChange = (nextDistrictId: string) => {
    setDistrictId(nextDistrictId);

    setCenterId("");
    setPage(0);
  };

  const clearFilters = () => {
    setCountyId("");
    setDistrictId("");
    setCenterId("");
    setSearch("");
    setPage(0);
  };

  const refresh = async () => {
    if (!electionId) {
      return;
    }

    await queryClient.invalidateQueries({
      queryKey: ["polling-center-allocations", electionId],
    });
  };

  const goCreate = () => {
    if (!electionId) {
      return;
    }

    navigate(`/elections/${electionId}/allocation/centers/new`);
  };

  const goDetail = (allocationId: string) => {
    if (!electionId) {
      return;
    }

    navigate(`/elections/${electionId}/allocation/centers/${allocationId}`);
  };

  // ================================================================
  // GUARD
  // ================================================================

  if (!electionId) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        Election ID is missing from the route.
      </div>
    );
  }

  return (
    <div className="w-full">
      <div
        className="
          mx-auto
          w-full
          max-w-none
          px-2
          sm:px-3
          lg:px-4
          xl:px-5
          2xl:px-6
        "
      >
        <div className="flex flex-col gap-4 pb-6">
          {/* ========================================================
              HEADER
          ======================================================== */}

          <section
            className="
              flex flex-col
              gap-3

              sm:flex-row
              sm:items-center
              sm:justify-between
            "
          >
            <div className="min-w-0">
              <h2
                className="
                  text-lg
                  font-bold
                  text-slate-900

                  sm:text-xl

                  lg:text-2xl
                "
              >
                Polling Center Allocations
              </h2>

              <p
                className="
                  mt-1
                  text-sm
                  text-slate-500

                  lg:text-base
                "
              >
                Manage election allocations by polling center.
              </p>
            </div>

            <div
              className="
                flex
                flex-wrap
                items-center
                gap-2
              "
            >
              <button
                type="button"
                onClick={refresh}
                disabled={allocationsQ.isFetching}
                className="
                  inline-flex
                  min-h-11
                  items-center
                  justify-center
                  gap-2
                  rounded-lg
                  border
                  border-slate-300
                  bg-white
                  px-4
                  text-sm
                  font-semibold
                  text-slate-700
                  transition

                  hover:bg-slate-50

                  disabled:opacity-50

                  lg:text-base
                "
              >
                <RefreshCw
                  size={18}
                  className={allocationsQ.isFetching ? "animate-spin" : ""}
                />
                Refresh
              </button>

              {canEdit && (
                <button
                  type="button"
                  onClick={goCreate}
                  className="
                    inline-flex
                    min-h-11
                    items-center
                    justify-center
                    gap-2
                    rounded-lg
                    bg-blue-700
                    px-4
                    text-sm
                    font-semibold
                    text-white
                    transition

                    hover:bg-blue-800

                    lg:text-base
                  "
                >
                  <Plus size={18} />
                  Allocate
                </button>
              )}
            </div>
          </section>

          {/* ========================================================
              FILTERS
          ======================================================== */}

          <section
            className="
              rounded-xl
              border
              border-slate-200
              bg-white
              p-3

              sm:p-4

              lg:p-5
            "
          >
            <div
              className="
                grid
                grid-cols-1
                gap-3

                sm:grid-cols-2

                lg:grid-cols-4
                lg:gap-4
              "
            >
              {/* COUNTY */}

              <div>
                <label
                  className="
                    mb-1.5
                    block
                    text-xs
                    font-semibold
                    text-slate-600

                    lg:text-sm
                  "
                >
                  County
                </label>

                <select
                  value={countyId}
                  onChange={(event) => handleCountyChange(event.target.value)}
                  className="
                    min-h-11
                    w-full
                    rounded-lg
                    border
                    border-slate-300
                    bg-white
                    px-3
                    text-base
                    text-slate-900
                    outline-none

                    focus:border-blue-500
                    focus:ring-2
                    focus:ring-blue-100
                  "
                >
                  <option value="">All counties</option>

                  {(countiesQ.data ?? []).map((county) => (
                    <option key={county.countyId} value={county.countyId}>
                      {county.countyName}
                    </option>
                  ))}
                </select>
              </div>

              {/* DISTRICT */}

              <div>
                <label
                  className="
                    mb-1.5
                    block
                    text-xs
                    font-semibold
                    text-slate-600

                    lg:text-sm
                  "
                >
                  District
                </label>

                <select
                  value={districtId}
                  onChange={(event) => handleDistrictChange(event.target.value)}
                  disabled={!countyId}
                  className="
                    min-h-11
                    w-full
                    rounded-lg
                    border
                    border-slate-300
                    bg-white
                    px-3
                    text-base
                    text-slate-900
                    outline-none

                    focus:border-blue-500
                    focus:ring-2
                    focus:ring-blue-100

                    disabled:cursor-not-allowed
                    disabled:bg-slate-100
                    disabled:text-slate-400
                  "
                >
                  <option value="">
                    {countyId ? "All districts" : "Select county first"}
                  </option>

                  {(districtsQ.data ?? []).map((district) => (
                    <option
                      key={district.districtId}
                      value={district.districtId}
                    >
                      {district.districtName}
                    </option>
                  ))}
                </select>
              </div>

              {/* CENTER */}

              <div>
                <label
                  className="
                    mb-1.5
                    block
                    text-xs
                    font-semibold
                    text-slate-600

                    lg:text-sm
                  "
                >
                  Center
                </label>

                <select
                  value={centerId}
                  onChange={(event) => {
                    setCenterId(event.target.value);

                    setPage(0);
                  }}
                  disabled={!countyId || !districtId}
                  className="
                    min-h-11
                    w-full
                    rounded-lg
                    border
                    border-slate-300
                    bg-white
                    px-3
                    text-base
                    text-slate-900
                    outline-none

                    focus:border-blue-500
                    focus:ring-2
                    focus:ring-blue-100

                    disabled:cursor-not-allowed
                    disabled:bg-slate-100
                    disabled:text-slate-400
                  "
                >
                  <option value="">
                    {countyId && districtId
                      ? "All centers"
                      : "Select district first"}
                  </option>

                  {(centersQ.data ?? []).map((center) => (
                    <option key={center.centerId} value={center.centerId}>
                      {center.centerName}
                    </option>
                  ))}
                </select>
              </div>

              {/* CLEAR */}

              <div className="flex items-end">
                <button
                  type="button"
                  onClick={clearFilters}
                  className="
                    inline-flex
                    min-h-11
                    w-full
                    items-center
                    justify-center
                    gap-2
                    rounded-lg
                    border
                    border-slate-300
                    bg-white
                    px-4
                    text-sm
                    font-semibold
                    text-slate-700
                    transition

                    hover:bg-slate-50

                    lg:text-base
                  "
                >
                  <FilterX size={18} />
                  Clear
                </button>
              </div>
            </div>

            {/* SEARCH */}

            <div className="relative mt-3">
              <Search
                size={18}
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
                placeholder="Search center name, code, district or county..."
                className="
                  min-h-11
                  w-full
                  rounded-lg
                  border
                  border-slate-300
                  bg-white
                  py-2
                  pl-10
                  pr-3
                  text-base
                  text-slate-900
                  outline-none

                  focus:border-blue-500
                  focus:ring-2
                  focus:ring-blue-100
                "
              />
            </div>
          </section>

          {/* ========================================================
              COUNT
          ======================================================== */}

          {!allocationsQ.isLoading && !allocationsQ.isError && (
            <div className="px-1">
              <span
                className="
                    text-xs
                    font-medium
                    text-slate-500

                    lg:text-sm
                  "
              >
                {visibleAllocations.length} allocation
                {visibleAllocations.length === 1 ? "" : "s"} on this page
              </span>
            </div>
          )}

          {/* ========================================================
              LOADING
          ======================================================== */}

          {allocationsQ.isLoading && (
            <div
              className="
                rounded-xl
                border
                border-slate-200
                bg-white
                p-6
                text-center
                text-sm
                text-slate-500

                lg:text-base
              "
            >
              Loading allocations...
            </div>
          )}

          {/* ========================================================
              ERROR
          ======================================================== */}

          {allocationsQ.isError && (
            <div
              className="
                rounded-xl
                border
                border-red-200
                bg-red-50
                p-4
                text-sm
                font-medium
                text-red-700

                lg:text-base
              "
            >
              {(allocationsQ.error as any)?.message ??
                "Failed to load polling center allocations."}
            </div>
          )}

          {/* ========================================================
              ALLOCATION LIST
          ======================================================== */}

          {!allocationsQ.isLoading && !allocationsQ.isError && (
            <section
              className="
                  overflow-hidden
                  rounded-xl
                  border
                  border-slate-200
                  bg-white
                "
            >
              {visibleAllocations.length === 0 ? (
                <div
                  className="
                      p-8
                      text-center
                      text-sm
                      text-slate-500

                      lg:text-base
                    "
                >
                  No allocations found.
                </div>
              ) : (
                <div
                  className="
                      divide-y
                      divide-slate-200
                    "
                >
                  {visibleAllocations.map(
                    (allocation: PollingCenterAllocationDto) => (
                      <button
                        key={allocation.allocationId}
                        type="button"
                        onClick={() => goDetail(allocation.allocationId)}
                        className="
                            group
                            block
                            w-full
                            bg-white
                            px-3
                            py-3
                            text-left
                            transition

                            hover:bg-slate-50
                            active:bg-slate-100

                            sm:px-4
                            sm:py-3

                            lg:px-4
                            lg:py-3

                            xl:px-5
                          "
                      >
                        {/* ==================================================
                            MOBILE

                            Keep the center name readable instead of forcing
                            every value into one narrow row.
                        ================================================== */}

                        <div className="sm:hidden">
                          <div className="grid grid-cols-[minmax(0,1fr)_132px] gap-3">
                            {/* CENTER / LOCATION */}
                            <div className="min-w-0">
                              <h3 className="text-[15px] font-bold leading-5 text-slate-900">
                                {safeText(
                                  allocation.centerName,
                                  "Unnamed center",
                                )}
                              </h3>

                              <p className="mt-1 truncate text-[11px] font-medium text-slate-500">
                                {safeText(
                                  allocation.centerCode,
                                  "No center code",
                                )}
                              </p>

                              <p className="mt-0.5 truncate text-[11px] text-slate-500">
                                {safeText(allocation.countyName, "County")}
                                {" · "}
                                {safeText(allocation.districtName, "District")}
                              </p>
                            </div>

                            {/* VALUES / STATUS */}
                            <div className="grid grid-cols-[1fr_1fr_28px] items-end gap-2">
                              <div className="min-w-0">
                                <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">
                                  Reg.
                                </p>
                                <p className="mt-0.5 text-base font-bold leading-none text-slate-900">
                                  {formatNumber(allocation.registeredVoters)}
                                </p>
                              </div>

                              <div className="min-w-0">
                                <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">
                                  Ballots
                                </p>
                                <p className="mt-0.5 text-base font-bold leading-none text-slate-900">
                                  {formatNumber(allocation.ballotsIssued)}
                                </p>
                              </div>

                              <div className="flex flex-col items-center justify-between self-stretch">
                                <span
                                  className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-green-50 text-green-700"
                                  title="Allocated"
                                >
                                  <Check size={15} strokeWidth={3} />
                                </span>

                                <ChevronRight
                                  size={18}
                                  className="text-slate-400 transition group-hover:text-blue-600"
                                />
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* ==================================================
                            TABLET / DESKTOP

                            Keep location underneath the center name so the
                            center column remains useful when a sidebar is open.
                            Use a check icon instead of the Allocated pill.
                        ================================================== */}

                        <div
                          className="
                            hidden
                            min-w-0
                            items-center
                            gap-3

                            sm:grid
                            sm:grid-cols-[minmax(0,1fr)_76px_88px_34px_18px]

                            md:grid-cols-[minmax(0,1fr)_84px_96px_34px_18px]
                            md:gap-4

                            xl:grid-cols-[minmax(0,1fr)_96px_108px_34px_20px]
                            xl:gap-5

                            2xl:grid-cols-[minmax(0,1fr)_110px_120px_34px_20px]
                          "
                        >
                          {/* CENTER */}
                          <div className="min-w-0">
                            <div className="flex min-w-0 items-center gap-2">
                              <h3 className="min-w-0 truncate text-sm font-bold text-slate-900 md:text-[15px] xl:text-base">
                                {safeText(
                                  allocation.centerName,
                                  "Unnamed center",
                                )}
                              </h3>

                              <span className="hidden shrink-0 text-slate-300 2xl:inline">
                                •
                              </span>

                              <span className="hidden max-w-[150px] truncate text-xs font-medium text-slate-500 2xl:inline">
                                {safeText(
                                  allocation.centerCode,
                                  "No center code",
                                )}
                              </span>
                            </div>

                            <p className="mt-1 truncate text-[10px] text-slate-500 md:text-[11px] xl:text-xs">
                              {safeText(allocation.countyName, "County")}
                              {" · "}
                              {safeText(allocation.districtName, "District")}
                            </p>
                          </div>

                          {/* REGISTERED */}
                          <div className="min-w-0 whitespace-nowrap text-right">
                            <span className="text-[8px] font-semibold uppercase tracking-wide text-slate-500 md:text-[9px]">
                              Reg.
                            </span>
                            <span className="ml-1 text-sm font-bold text-slate-900 md:text-[15px] xl:text-base">
                              {formatNumber(allocation.registeredVoters)}
                            </span>
                          </div>

                          {/* BALLOTS */}
                          <div className="min-w-0 whitespace-nowrap text-right">
                            <span className="text-[8px] font-semibold uppercase tracking-wide text-slate-500 md:text-[9px]">
                              Ballots
                            </span>
                            <span className="ml-1 text-sm font-bold text-slate-900 md:text-[15px] xl:text-base">
                              {formatNumber(allocation.ballotsIssued)}
                            </span>
                          </div>

                          {/* STATUS */}
                          <span
                            className="inline-flex h-7 w-7 items-center justify-center justify-self-end rounded-full bg-green-50 text-green-700"
                            title="Allocated"
                          >
                            <Check size={15} strokeWidth={3} />
                          </span>

                          {/* CHEVRON */}
                          <ChevronRight
                            size={18}
                            className="justify-self-end text-slate-400 transition group-hover:text-blue-600"
                          />
                        </div>
                      </button>
                    ),
                  )}
                </div>
              )}
            </section>
          )}

          {/* ========================================================
              PAGINATION
          ======================================================== */}

          {!allocationsQ.isLoading &&
            allocationsQ.data &&
            allocationsQ.data.totalPages > 0 && (
              <section
                className="
                  flex
                  items-center
                  justify-between
                  gap-3
                  pt-1
                "
              >
                <button
                  type="button"
                  onClick={() => setPage((current) => Math.max(0, current - 1))}
                  disabled={page <= 0 || allocationsQ.isFetching}
                  className="
                    min-h-11
                    rounded-lg
                    border
                    border-slate-300
                    bg-white
                    px-4
                    text-sm
                    font-semibold
                    text-slate-700
                    transition

                    hover:bg-slate-50

                    disabled:opacity-40

                    lg:text-base
                  "
                >
                  Previous
                </button>

                <span
                  className="
                    text-xs
                    font-semibold
                    text-slate-500

                    sm:text-sm

                    lg:text-base
                  "
                >
                  Page {allocationsQ.data.page + 1}
                  {" of "}
                  {Math.max(allocationsQ.data.totalPages, 1)}
                </span>

                <button
                  type="button"
                  onClick={() => setPage((current) => current + 1)}
                  disabled={
                    allocationsQ.data.page + 1 >=
                      allocationsQ.data.totalPages || allocationsQ.isFetching
                  }
                  className="
                    min-h-11
                    rounded-lg
                    border
                    border-slate-300
                    bg-white
                    px-4
                    text-sm
                    font-semibold
                    text-slate-700
                    transition

                    hover:bg-slate-50

                    disabled:opacity-40

                    lg:text-base
                  "
                >
                  Next
                </button>
              </section>
            )}
        </div>
      </div>
    </div>
  );
}

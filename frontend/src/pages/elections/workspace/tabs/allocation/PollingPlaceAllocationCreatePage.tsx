// src/pages/elections/workspace/tabs/allocation/PollingPlaceAllocationCreatePage.tsx

import { useMemo, useState } from "react";

import { useLocation, useNavigate, useParams } from "react-router-dom";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  RefreshCw,
  Save,
} from "lucide-react";

import { useAuthStore } from "../../../../../shared/store/authStore";

import {
  createPlaceAllocation,
  searchPlaceAllocations,
  type PollingPlaceAllocationCreateRequest,
  type PollingPlaceAllocationDto,
} from "../../../../../shared/services/pollingPlaceAllocationService";

import {
  fetchAllocations as fetchCenterAllocations,
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

import {
  fetchPollingPlaces,
  type PollingPlaceDto,
} from "../../../../../shared/services/pollingPlaceService";

// ============================================================================
// TYPES
// ============================================================================

type NumericInput = number | "";

type DraftAllocation = {
  registeredVoters: NumericInput;
  ballotsIssued: NumericInput;
};

type LocationState = {
  countyId?: string;
  districtId?: string;
  centerId?: string;
};

// ============================================================================
// HELPERS
// ============================================================================

function placeDisplay(place: PollingPlaceDto) {
  const label = place.label?.trim();

  if (label) {
    return label;
  }

  if (place.placeNumber != null) {
    return `Place #${place.placeNumber}`;
  }

  if (place.code?.trim()) {
    return place.code;
  }

  return "Polling Place";
}

function formatNumber(value: number | null | undefined) {
  return Number(value ?? 0).toLocaleString();
}

function friendlySaveError(error: any) {
  return (
    error?.response?.data?.message ??
    error?.response?.data?.error ??
    error?.message ??
    "Failed to create allocation."
  );
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function PollingPlaceAllocationCreatePage() {
  const { electionId } = useParams<{
    electionId: string;
  }>();

  const navigate = useNavigate();

  const location = useLocation();

  const queryClient = useQueryClient();

  // ==========================================================================
  // ACCESS
  // ==========================================================================

  const dashboardMode = useAuthStore((state) => state.dashboardMode);

  const isSystemAdmin = useAuthStore((state) => state.isSystemAdmin());

  const canEdit =
    dashboardMode === "SYSTEM" || dashboardMode === "NEC" || isSystemAdmin;

  // ==========================================================================
  // ROUTE STATE
  // ==========================================================================

  const initialState = (location.state ?? {}) as LocationState;

  // ==========================================================================
  // LOCATION STATE
  // ==========================================================================

  const [countyId, setCountyId] = useState(initialState.countyId ?? "");

  const [districtId, setDistrictId] = useState(initialState.districtId ?? "");

  const [centerId, setCenterId] = useState(initialState.centerId ?? "");

  // ==========================================================================
  // PAGE STATE
  // ==========================================================================

  const [page, setPage] = useState(0);

  const [size, setSize] = useState(25);

  const [showUnallocatedOnly, setShowUnallocatedOnly] = useState(false);

  const [search, setSearch] = useState("");

  const [drafts, setDrafts] = useState<Record<string, DraftAllocation>>({});

  // ==========================================================================
  // LOCATION CHANGES
  // ==========================================================================

  const changeCounty = (value: string) => {
    setCountyId(value);

    setDistrictId("");
    setCenterId("");

    setPage(0);
    setDrafts({});
  };

  const changeDistrict = (value: string) => {
    setDistrictId(value);

    setCenterId("");

    setPage(0);
    setDrafts({});
  };

  const changeCenter = (value: string) => {
    setCenterId(value);

    setPage(0);
    setDrafts({});
  };

  // ==========================================================================
  // COUNTIES
  // ==========================================================================

  const countiesQuery = useQuery({
    queryKey: ["counties", "polling-place-allocation-create"],

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

    queryKey: ["districts", "polling-place-allocation-create", countyId],

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
      "polling-place-allocation-create",
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
  // SELECTED CENTER ALLOCATION
  // ==========================================================================

  const centerAllocationQuery = useQuery({
    enabled: Boolean(electionId && centerId),

    queryKey: [
      "polling-center-allocation",
      "polling-place-allocation-create",
      electionId,
      centerId,
    ],

    queryFn: async () => {
      const result = await fetchCenterAllocations({
        electionId: electionId!,

        centerId,

        page: 0,

        size: 1,
      });

      return (result.items?.[0] ?? null) as PollingCenterAllocationDto | null;
    },

    staleTime: 10_000,

    retry: 1,
  });

  const centerAllocation = centerAllocationQuery.data ?? null;

  // ==========================================================================
  // PLACES
  // ==========================================================================

  const placesQuery = useQuery({
    enabled: Boolean(centerId),

    queryKey: [
      "polling-places",
      "polling-place-allocation-create",
      centerId,
      page,
      size,
    ],

    queryFn: async () => {
      return fetchPollingPlaces({
        page,

        size,

        countyId: countyId || undefined,

        districtId: districtId || undefined,

        centerId,

        active: true,
      });
    },

    staleTime: 10_000,

    retry: 1,
  });

  // ==========================================================================
  // EXISTING PLACE ALLOCATIONS
  // ==========================================================================

  const allocationsQuery = useQuery({
    enabled: Boolean(electionId && centerId),

    queryKey: [
      "polling-place-allocations",
      "create-page",
      electionId,
      centerId,
    ],

    queryFn: () =>
      searchPlaceAllocations({
        electionId: electionId!,

        centerId,

        page: 0,

        size: 5000,
      }),

    staleTime: 10_000,

    retry: 1,
  });

  // ==========================================================================
  // SELECTED LOCATION
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
  // ALLOCATION MAP
  // ==========================================================================

  const allocationMap = useMemo(() => {
    const map = new Map<string, PollingPlaceAllocationDto>();

    for (const allocation of allocationsQuery.data?.items ?? []) {
      map.set(allocation.placeId, allocation);
    }

    return map;
  }, [allocationsQuery.data]);

  // ==========================================================================
  // CURRENT PLACES
  // ==========================================================================

  const currentPlaces = placesQuery.data?.items ?? [];

  // ==========================================================================
  // FILTERED PLACES
  // ==========================================================================

  const visiblePlaces = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return currentPlaces.filter((place) => {
      const existing = allocationMap.get(place.placeId);

      if (showUnallocatedOnly && existing) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      const haystack = [place.label, place.code, place.placeNumber]
        .filter((value) => value != null)
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalizedSearch);
    });
  }, [currentPlaces, allocationMap, showUnallocatedOnly, search]);

  // ==========================================================================
  // DRAFT HELPERS
  // ==========================================================================

  const getDraft = (placeId: string): DraftAllocation =>
    drafts[placeId] ?? {
      registeredVoters: "",

      ballotsIssued: "",
    };

  const updateDraft = (placeId: string, patch: Partial<DraftAllocation>) => {
    setDrafts((current) => ({
      ...current,

      [placeId]: {
        ...(current[placeId] ?? {
          registeredVoters: "",

          ballotsIssued: "",
        }),

        ...patch,
      },
    }));
  };

  // ==========================================================================
  // CREATE MUTATION
  // ==========================================================================

  const createMutation = useMutation({
    mutationFn: async (payload: {
      placeId: string;

      request: PollingPlaceAllocationCreateRequest;
    }) => {
      const allocation = await createPlaceAllocation(payload.request);

      return {
        placeId: payload.placeId,

        allocation,
      };
    },

    onSuccess: async (result) => {
      setDrafts((current) => {
        const next = {
          ...current,
        };

        delete next[result.placeId];

        return next;
      });

      await queryClient.invalidateQueries({
        queryKey: ["polling-place-allocations"],
      });

      await allocationsQuery.refetch();
    },
  });

  // ==========================================================================
  // SAVE
  // ==========================================================================

  const savePlace = (place: PollingPlaceDto) => {
    if (!canEdit || !electionId) {
      return;
    }

    if (allocationMap.has(place.placeId)) {
      return;
    }

    const draft = getDraft(place.placeId);

    if (draft.registeredVoters === "") {
      alert("Registered voters is required.");

      return;
    }

    const registered = Number(draft.registeredVoters);

    const ballots =
      draft.ballotsIssued === "" ? undefined : Number(draft.ballotsIssued);

    if (Number.isNaN(registered) || registered < 0) {
      alert("Registered voters must be 0 or greater.");

      return;
    }

    if (ballots != null && (Number.isNaN(ballots) || ballots < 0)) {
      alert("Ballots issued must be 0 or greater.");

      return;
    }

    createMutation.mutate({
      placeId: place.placeId,

      request: {
        electionId,

        placeId: place.placeId,

        registeredVoters: registered,

        ballotsIssued: ballots,
      },
    });
  };

  // ==========================================================================
  // REFRESH
  // ==========================================================================

  const refreshNow = async () => {
    if (!centerId) {
      return;
    }

    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: ["polling-places", "polling-place-allocation-create"],
      }),

      queryClient.invalidateQueries({
        queryKey: ["polling-place-allocations"],
      }),

      queryClient.invalidateQueries({
        queryKey: ["polling-center-allocation"],
      }),
    ]);

    await Promise.all([
      placesQuery.refetch(),

      allocationsQuery.refetch(),

      centerAllocationQuery.refetch(),
    ]);
  };

  // ==========================================================================
  // GUARD
  // ==========================================================================

  if (!electionId) {
    return (
      <div className="app-content">
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700 lg:text-base">
          Missing election ID.
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
            PAGE HEADER
        ================================================================ */}

        <div className="flex min-w-0 flex-wrap items-start justify-between gap-2">
          <div className="flex min-w-0 items-start gap-2">
            <button
              type="button"
              onClick={() =>
                navigate(`/elections/${electionId}/allocation/places`)
              }
              className="
                inline-flex
                min-h-10
                shrink-0
                items-center
                justify-center
                rounded-lg
                border
                border-slate-300
                bg-white
                px-2.5
                py-2
                text-slate-700
                transition
                hover:bg-slate-50
              "
              aria-label="Back to polling place allocations"
            >
              <ArrowLeft size={18} />
            </button>

            <div className="min-w-0">
              <h2 className="text-lg font-bold text-slate-900 sm:text-xl lg:text-2xl">
                Allocate Polling Places
              </h2>

              <p className="mt-0.5 text-xs text-slate-500 sm:text-sm lg:text-base">
                Select a center, then distribute its allocation among polling
                places.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={refreshNow}
            disabled={
              !centerId ||
              placesQuery.isFetching ||
              allocationsQuery.isFetching ||
              centerAllocationQuery.isFetching
            }
            className="
              inline-flex
              min-h-10
              shrink-0
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
              lg:text-base
            "
          >
            <RefreshCw
              size={16}
              className={
                placesQuery.isFetching ||
                allocationsQuery.isFetching ||
                centerAllocationQuery.isFetching
                  ? "animate-spin"
                  : ""
              }
            />

            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>

        {/* ================================================================
            LOCATION SELECTOR
        ================================================================ */}

        <section className="rounded-xl border border-slate-200 bg-white p-3 sm:p-4">
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {/* COUNTY */}

            <div className="min-w-0">
              <label className="mb-1 block text-sm font-bold text-slate-700">
                County
              </label>

              <select
                value={countyId}
                onChange={(event) => changeCounty(event.target.value)}
                className="
                  w-full
                  rounded-lg
                  border
                  border-slate-300
                  bg-white
                  px-3
                  py-2
                  text-sm
                  text-slate-900
                  outline-none
                  focus:border-blue-500
                  focus:ring-2
                  focus:ring-blue-100
                  lg:text-base
                "
              >
                <option value="">Select county</option>

                {(countiesQuery.data ?? []).map((county) => (
                  <option key={county.countyId} value={county.countyId}>
                    {county.countyName}
                  </option>
                ))}
              </select>
            </div>

            {/* DISTRICT */}

            <div className="min-w-0">
              <label className="mb-1 block text-sm font-bold text-slate-700">
                District
              </label>

              <select
                value={districtId}
                onChange={(event) => changeDistrict(event.target.value)}
                disabled={!countyId}
                className="
                  w-full
                  rounded-lg
                  border
                  border-slate-300
                  bg-white
                  px-3
                  py-2
                  text-sm
                  text-slate-900
                  outline-none
                  focus:border-blue-500
                  focus:ring-2
                  focus:ring-blue-100
                  disabled:cursor-not-allowed
                  disabled:bg-slate-100
                  disabled:text-slate-400
                  lg:text-base
                "
              >
                <option value="">
                  {countyId ? "Select district" : "Select county first"}
                </option>

                {(districtsQuery.data ?? []).map((district) => (
                  <option key={district.districtId} value={district.districtId}>
                    {district.districtName}
                  </option>
                ))}
              </select>
            </div>

            {/* CENTER */}

            <div className="min-w-0 sm:col-span-2 lg:col-span-1">
              <label className="mb-1 block text-sm font-bold text-slate-700">
                Polling Center
              </label>

              <select
                value={centerId}
                onChange={(event) => changeCenter(event.target.value)}
                disabled={!countyId || !districtId}
                className="
                  w-full
                  rounded-lg
                  border
                  border-slate-300
                  bg-white
                  px-3
                  py-2
                  text-sm
                  text-slate-900
                  outline-none
                  focus:border-blue-500
                  focus:ring-2
                  focus:ring-blue-100
                  disabled:cursor-not-allowed
                  disabled:bg-slate-100
                  disabled:text-slate-400
                  lg:text-base
                "
              >
                <option value="">
                  {countyId && districtId
                    ? "Select polling center"
                    : "Select district first"}
                </option>

                {(centersQuery.data ?? []).map((center) => (
                  <option key={center.centerId} value={center.centerId}>
                    {center.centerName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* ==============================================================
              CENTER REFERENCE
          ============================================================== */}

          {selectedCenter && (
            <div
              className="
                mt-3
                flex
                min-w-0
                flex-col
                gap-2
                rounded-lg
                border
                border-slate-200
                bg-slate-50
                px-3
                py-2.5
                lg:flex-row
                lg:items-center
                lg:justify-between
                lg:gap-4
              "
            >
              {/* LOCATION */}

              <div
                className="
                  flex
                  min-w-0
                  flex-wrap
                  items-center
                  gap-x-1.5
                  gap-y-1
                  text-sm
                  text-slate-600
                  lg:text-base
                "
              >
                <span className="font-semibold">
                  {selectedCounty?.countyName ?? "County"}
                </span>

                <span className="text-slate-400">/</span>

                <span className="font-semibold">
                  {selectedDistrict?.districtName ?? "District"}
                </span>

                <span className="text-slate-400">/</span>

                <span className="min-w-0 font-bold text-slate-900">
                  {selectedCenter.centerName}
                </span>
              </div>

              {/* CENTER TOTALS */}

              <div className="flex min-w-0 flex-wrap items-center gap-1.5 lg:shrink-0 lg:justify-end">
                {centerAllocationQuery.isLoading ? (
                  <span className="text-sm font-semibold text-slate-500">
                    Loading center allocation…
                  </span>
                ) : centerAllocationQuery.isError ? (
                  <span className="inline-flex items-center rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-bold text-red-700 lg:text-sm">
                    Center allocation unavailable
                  </span>
                ) : centerAllocation ? (
                  <>
                    <span
                      className="
                        inline-flex
                        items-center
                        rounded-full
                        border
                        border-blue-200
                        bg-blue-50
                        px-2.5
                        py-1
                        text-xs
                        font-bold
                        text-blue-700
                        lg:text-sm
                      "
                    >
                      Center Registered:&nbsp;
                      {formatNumber(centerAllocation.registeredVoters)}
                    </span>

                    <span
                      className="
                        inline-flex
                        items-center
                        rounded-full
                        border
                        border-amber-200
                        bg-amber-50
                        px-2.5
                        py-1
                        text-xs
                        font-bold
                        text-amber-700
                        lg:text-sm
                      "
                    >
                      Center Ballots:&nbsp;
                      {formatNumber(centerAllocation.ballotsIssued)}
                    </span>
                  </>
                ) : (
                  <span className="inline-flex items-center rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-bold text-red-700 lg:text-sm">
                    Center not allocated
                  </span>
                )}
              </div>
            </div>
          )}
        </section>

        {/* ================================================================
            NO CENTER
        ================================================================ */}

        {!centerId && (
          <div
            className="
              rounded-xl
              border
              border-dashed
              border-slate-300
              bg-slate-50
              px-4
              py-8
              text-center
              sm:py-10
            "
          >
            <div className="text-sm font-bold text-slate-700 lg:text-base">
              Select a polling center
            </div>

            <div className="mx-auto mt-1 max-w-lg text-xs leading-5 text-slate-500 sm:text-sm lg:text-base">
              Only polling places belonging to the selected center will be
              loaded.
            </div>
          </div>
        )}

        {/* ================================================================
            WORKSPACE
        ================================================================ */}

        {centerId && (
          <>
            {/* ============================================================
                SEARCH
            ============================================================ */}

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
                p-3
                sm:flex-row
                sm:items-center
                sm:justify-between
              "
            >
              <div className="min-w-0 flex-1">
                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search place name, number, or code"
                  className="
                    w-full
                    rounded-lg
                    border
                    border-slate-300
                    bg-white
                    px-3
                    py-2
                    text-sm
                    text-slate-900
                    outline-none
                    focus:border-blue-500
                    focus:ring-2
                    focus:ring-blue-100
                    lg:text-base
                  "
                />
              </div>

              <label className="inline-flex shrink-0 items-center gap-2 text-sm font-semibold text-slate-700 lg:text-base">
                <input
                  type="checkbox"
                  checked={showUnallocatedOnly}
                  onChange={(event) =>
                    setShowUnallocatedOnly(event.target.checked)
                  }
                  className="h-4 w-4 rounded border-slate-300"
                />
                Unallocated only
              </label>
            </section>

            {/* ============================================================
                LOADING
            ============================================================ */}

            {(placesQuery.isLoading || allocationsQuery.isLoading) && (
              <div className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-600 lg:text-base">
                Loading polling places…
              </div>
            )}

            {/* ============================================================
                ERROR
            ============================================================ */}

            {(placesQuery.isError || allocationsQuery.isError) && (
              <div
                className="
                  flex
                  gap-2
                  rounded-xl
                  border
                  border-red-200
                  bg-red-50
                  p-4
                  text-sm
                  font-semibold
                  text-red-700
                  lg:text-base
                "
              >
                <AlertCircle size={18} className="mt-0.5 shrink-0" />

                <div>
                  {(placesQuery.error as any)?.message ??
                    (allocationsQuery.error as any)?.message ??
                    "Failed to load polling places."}
                </div>
              </div>
            )}

            {/* ============================================================
                EMPTY
            ============================================================ */}

            {!placesQuery.isLoading &&
              !allocationsQuery.isLoading &&
              !placesQuery.isError &&
              !allocationsQuery.isError &&
              visiblePlaces.length === 0 && (
                <div className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-8 text-center">
                  <div className="text-sm font-bold text-slate-700 lg:text-base">
                    No polling places found
                  </div>

                  <div className="mt-1 text-xs text-slate-500 sm:text-sm lg:text-base">
                    Try changing the search or allocation filter.
                  </div>
                </div>
              )}

            {/* ============================================================
                PLACE LIST
            ============================================================ */}

            {!placesQuery.isLoading &&
              !allocationsQuery.isLoading &&
              !placesQuery.isError &&
              !allocationsQuery.isError &&
              visiblePlaces.length > 0 && (
                <section className="entity-list">
                  {/* DESKTOP HEADER */}

                  <div
                    className="
                      hidden
                      border-b
                      border-slate-200
                      bg-slate-50
                      px-4
                      py-2.5
                      text-xs
                      font-bold
                      uppercase
                      tracking-wide
                      text-slate-500
                      md:grid
                      md:grid-cols-[minmax(0,1fr)_160px_160px_130px]
                      md:items-center
                      md:gap-3
                      lg:text-sm
                    "
                  >
                    <div>Polling Place</div>

                    <div>Registered</div>

                    <div>Ballots</div>

                    <div className="text-right">Action</div>
                  </div>

                  {visiblePlaces.map((place) => {
                    const existing = allocationMap.get(place.placeId);

                    const draft = getDraft(place.placeId);

                    const isSavingThis =
                      createMutation.isPending &&
                      createMutation.variables?.placeId === place.placeId;

                    return (
                      <div
                        key={place.placeId}
                        className="
                            entity-list-item
                            md:grid
                            md:grid-cols-[minmax(0,1fr)_160px_160px_130px]
                            md:items-center
                            md:gap-3
                          "
                      >
                        {/* PLACE */}

                        <div className="min-w-0">
                          <div
                            className="
                                truncate
                                text-base
                                font-bold
                                text-slate-900
                                lg:text-lg
                              "
                            title={placeDisplay(place)}
                          >
                            {placeDisplay(place)}
                          </div>

                          <div
                            className="
                                mt-0.5
                                flex
                                flex-wrap
                                gap-x-2
                                gap-y-0.5
                                text-xs
                                text-slate-500
                                lg:text-sm
                              "
                          >
                            {place.code && (
                              <span className="font-semibold">
                                {place.code}
                              </span>
                            )}

                            {place.placeNumber != null && (
                              <span>Place #{place.placeNumber}</span>
                            )}
                          </div>

                          {existing && (
                            <div className="mt-2 md:hidden">
                              <span
                                className="
                                    inline-flex
                                    items-center
                                    gap-1
                                    rounded-full
                                    bg-emerald-50
                                    px-2
                                    py-1
                                    text-xs
                                    font-bold
                                    text-emerald-700
                                  "
                              >
                                <CheckCircle2 size={13} />
                                Allocated
                              </span>
                            </div>
                          )}
                        </div>

                        {/* EXISTING */}

                        {existing ? (
                          <>
                            <div className="mt-3 flex items-center justify-between gap-2 text-sm md:mt-0 md:block lg:text-base">
                              <span className="text-slate-500 md:hidden">
                                Registered
                              </span>

                              <span className="font-bold text-slate-900">
                                {formatNumber(existing.registeredVoters)}
                              </span>
                            </div>

                            <div className="mt-1 flex items-center justify-between gap-2 text-sm md:mt-0 md:block lg:text-base">
                              <span className="text-slate-500 md:hidden">
                                Ballots
                              </span>

                              <span className="font-bold text-slate-900">
                                {formatNumber(existing.ballotsIssued)}
                              </span>
                            </div>

                            <div className="mt-2 text-right md:mt-0">
                              <span
                                className="
                                    hidden
                                    items-center
                                    justify-center
                                    gap-1
                                    rounded-full
                                    bg-emerald-50
                                    px-2.5
                                    py-1
                                    text-xs
                                    font-bold
                                    text-emerald-700
                                    md:inline-flex
                                    lg:text-sm
                                  "
                              >
                                <CheckCircle2 size={13} />
                                Allocated
                              </span>
                            </div>
                          </>
                        ) : (
                          <>
                            {/* REGISTERED */}

                            <div className="mt-3 md:mt-0">
                              <label className="mb-1 block text-sm font-bold text-slate-600 md:hidden">
                                Registered Voters
                              </label>

                              <input
                                type="number"
                                min={0}
                                value={draft.registeredVoters}
                                onChange={(event) => {
                                  const value = event.target.value;

                                  updateDraft(place.placeId, {
                                    registeredVoters:
                                      value === "" ? "" : Number(value),
                                  });
                                }}
                                placeholder="0"
                                className="
                                    w-full
                                    rounded-lg
                                    border
                                    border-slate-300
                                    bg-white
                                    px-3
                                    py-2
                                    text-sm
                                    text-slate-900
                                    outline-none
                                    focus:border-blue-500
                                    focus:ring-2
                                    focus:ring-blue-100
                                    lg:text-base
                                  "
                              />
                            </div>

                            {/* BALLOTS */}

                            <div className="mt-2 md:mt-0">
                              <label className="mb-1 block text-sm font-bold text-slate-600 md:hidden">
                                Ballots Issued
                              </label>

                              <input
                                type="number"
                                min={0}
                                value={draft.ballotsIssued}
                                onChange={(event) => {
                                  const value = event.target.value;

                                  updateDraft(place.placeId, {
                                    ballotsIssued:
                                      value === "" ? "" : Number(value),
                                  });
                                }}
                                placeholder="0"
                                className="
                                    w-full
                                    rounded-lg
                                    border
                                    border-slate-300
                                    bg-white
                                    px-3
                                    py-2
                                    text-sm
                                    text-slate-900
                                    outline-none
                                    focus:border-blue-500
                                    focus:ring-2
                                    focus:ring-blue-100
                                    lg:text-base
                                  "
                              />
                            </div>

                            {/* SAVE */}

                            <div className="mt-2 md:mt-0 md:flex md:justify-end">
                              <button
                                type="button"
                                onClick={() => savePlace(place)}
                                disabled={
                                  !canEdit ||
                                  isSavingThis ||
                                  draft.registeredVoters === ""
                                }
                                className="
                                    inline-flex
                                    min-h-10
                                    w-full
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
                                    transition
                                    hover:bg-blue-700
                                    disabled:cursor-not-allowed
                                    disabled:bg-slate-300
                                    disabled:text-slate-500
                                    md:w-auto
                                    lg:text-base
                                  "
                              >
                                {isSavingThis ? (
                                  <>
                                    <RefreshCw
                                      size={15}
                                      className="animate-spin"
                                    />
                                    Saving
                                  </>
                                ) : (
                                  <>
                                    <Save size={15} />
                                    Save
                                  </>
                                )}
                              </button>
                            </div>
                          </>
                        )}

                        {/* ERROR */}

                        {!existing &&
                          createMutation.isError &&
                          createMutation.variables?.placeId ===
                            place.placeId && (
                            <div
                              className="
                                  mt-2
                                  rounded-lg
                                  border
                                  border-red-200
                                  bg-red-50
                                  p-2.5
                                  text-sm
                                  font-semibold
                                  text-red-700
                                  md:col-span-4
                                "
                            >
                              {friendlySaveError(createMutation.error)}
                            </div>
                          )}
                      </div>
                    );
                  })}
                </section>
              )}

            {/* ============================================================
                PAGINATION
            ============================================================ */}

            {placesQuery.data && currentPlaces.length > 0 && (
              <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setPage((current) => Math.max(0, current - 1))
                    }
                    disabled={page <= 0 || placesQuery.isFetching}
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
                        disabled:opacity-50
                        lg:text-base
                      "
                  >
                    Previous
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setPage((current) =>
                        current + 1 < placesQuery.data.totalPages
                          ? current + 1
                          : current,
                      )
                    }
                    disabled={
                      page + 1 >= placesQuery.data.totalPages ||
                      placesQuery.isFetching
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
                        disabled:opacity-50
                        lg:text-base
                      "
                  >
                    Next
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-600 sm:justify-end lg:text-base">
                  <span>
                    Page {page + 1} of {placesQuery.data.totalPages}
                  </span>

                  <span className="hidden text-slate-300 sm:inline">•</span>

                  <span>
                    {placesQuery.data.totalElements} place
                    {placesQuery.data.totalElements === 1 ? "" : "s"}
                  </span>

                  <select
                    value={size}
                    onChange={(event) => {
                      setSize(Number(event.target.value));

                      setPage(0);
                    }}
                    className="
                        rounded-lg
                        border
                        border-slate-300
                        bg-white
                        px-2
                        py-1.5
                        text-sm
                        font-semibold
                        text-slate-700
                        lg:text-base
                      "
                    aria-label="Page size"
                  >
                    <option value={10}>10</option>

                    <option value={25}>25</option>

                    <option value={50}>50</option>

                    <option value={100}>100</option>
                  </select>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

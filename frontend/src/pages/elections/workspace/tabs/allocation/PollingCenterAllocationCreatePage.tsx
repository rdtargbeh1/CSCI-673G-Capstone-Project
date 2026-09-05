// src/pages/elections/workspace/tabs/allocation/PollingCenterAllocationCreatePage.tsx

import { useEffect, useMemo, useState } from "react";

import { useNavigate, useParams } from "react-router-dom";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  AlertCircle,
  ArrowLeft,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  FilterX,
  Loader2,
  MapPin,
  RefreshCw,
  Search,
  Save,
  Users,
  Vote,
} from "lucide-react";

import {
  createAllocation,
  fetchAllocations,
  type PollingCenterAllocationCreateRequest,
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

import { useAuthStore } from "../../../../../shared/store/authStore";

// ============================================================================
// TYPES
// ============================================================================

type CenterFormState = {
  registeredVoters: string;
  ballotsIssued: string;
};

type CenterFormMap = Record<string, CenterFormState>;

// ============================================================================
// HELPERS
// ============================================================================

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

function friendlyError(error: any): string {
  return (
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message ||
    "Unable to save polling center allocation."
  );
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function PollingCenterAllocationCreatePage() {
  const { electionId } = useParams<{
    electionId: string;
  }>();

  const navigate = useNavigate();

  const queryClient = useQueryClient();

  // ==========================================================================
  // AUTHORIZATION
  // ==========================================================================

  const dashboardMode = useAuthStore((state) => state.dashboardMode);

  const isSystemAdmin = useAuthStore((state) => state.isSystemAdmin());

  const canEdit =
    dashboardMode === "SYSTEM" || dashboardMode === "NEC" || isSystemAdmin;

  // ==========================================================================
  // PAGE STATE
  // ==========================================================================

  const [countyId, setCountyId] = useState("");

  const [districtId, setDistrictId] = useState("");

  const [search, setSearch] = useState("");

  const [showUnallocatedOnly, setShowUnallocatedOnly] = useState(true);

  const [forms, setForms] = useState<CenterFormMap>({});

  const [savingCenterId, setSavingCenterId] = useState<string | null>(null);

  const [savedCenterIds, setSavedCenterIds] = useState<Set<string>>(new Set());

  const [centerErrors, setCenterErrors] = useState<Record<string, string>>({});

  // ==========================================================================
  // PAGINATION
  // ==========================================================================

  const [page, setPage] = useState(0);

  const [pageSize, setPageSize] = useState(25);

  // ==========================================================================
  // COUNTY QUERY
  // ==========================================================================

  const countiesQ = useQuery({
    queryKey: ["counties", "polling-center-allocation-create"],

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

  // ==========================================================================
  // DISTRICT QUERY
  // ==========================================================================

  const districtsQ = useQuery({
    enabled: Boolean(countyId),

    queryKey: ["districts", "polling-center-allocation-create", countyId],

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

  // ==========================================================================
  // CENTER QUERY
  // ==========================================================================

  const centersQ = useQuery({
    enabled: Boolean(countyId) && Boolean(districtId),

    queryKey: [
      "polling-centers",
      "polling-center-allocation-create",
      countyId,
      districtId,
    ],

    queryFn: async () => {
      const response = await fetchPollingCenters({
        page: 0,
        size: 5000,
        countyId,
        districtId,
      });

      return response.items as PollingCenterDto[];
    },

    staleTime: 30_000,

    retry: 1,
  });

  // ==========================================================================
  // EXISTING ALLOCATIONS
  // ==========================================================================

  const existingAllocationsQ = useQuery({
    enabled: Boolean(electionId) && Boolean(countyId) && Boolean(districtId),

    queryKey: [
      "polling-center-allocations",
      electionId,
      "create-workspace",
      countyId,
      districtId,
    ],

    queryFn: () =>
      fetchAllocations({
        electionId: electionId!,

        countyId,

        districtId,

        page: 0,

        size: 5000,
      }),

    staleTime: 5_000,

    retry: 1,
  });

  // ==========================================================================
  // ALLOCATION LOOKUP
  // ==========================================================================

  const allocationByCenterId = useMemo(() => {
    const map = new Map<string, PollingCenterAllocationDto>();

    const allocations = existingAllocationsQ.data?.items ?? [];

    for (const allocation of allocations) {
      if (allocation.pollingCenterId) {
        map.set(allocation.pollingCenterId, allocation);
      }
    }

    return map;
  }, [existingAllocationsQ.data]);

  // ==========================================================================
  // FORM HELPERS
  // ==========================================================================

  const getCenterForm = (centerId: string): CenterFormState => {
    return (
      forms[centerId] ?? {
        registeredVoters: "",
        ballotsIssued: "",
      }
    );
  };

  const updateCenterForm = (
    centerId: string,
    field: keyof CenterFormState,
    value: string,
  ) => {
    if (value !== "") {
      const numericValue = Number(value);

      if (Number.isNaN(numericValue) || numericValue < 0) {
        return;
      }
    }

    setForms((current) => ({
      ...current,

      [centerId]: {
        ...(current[centerId] ?? {
          registeredVoters: "",

          ballotsIssued: "",
        }),

        [field]: value,
      },
    }));

    setCenterErrors((current) => {
      if (!current[centerId]) {
        return current;
      }

      const next = {
        ...current,
      };

      delete next[centerId];

      return next;
    });
  };

  // ==========================================================================
  // CREATE MUTATION
  // ==========================================================================

  const createM = useMutation({
    mutationFn: async (payload: {
      centerId: string;
      request: PollingCenterAllocationCreateRequest;
    }) => {
      const allocation = await createAllocation(payload.request);

      return {
        centerId: payload.centerId,

        allocation,
      };
    },

    onSuccess: async ({ centerId }) => {
      setSavedCenterIds((current) => {
        const next = new Set(current);

        next.add(centerId);

        return next;
      });

      setCenterErrors((current) => {
        const next = {
          ...current,
        };

        delete next[centerId];

        return next;
      });

      setForms((current) => {
        const next = {
          ...current,
        };

        delete next[centerId];

        return next;
      });

      await queryClient.invalidateQueries({
        queryKey: ["polling-center-allocations", electionId],
      });

      await existingAllocationsQ.refetch();

      setSavingCenterId(null);
    },

    onError: (error, variables) => {
      setCenterErrors((current) => ({
        ...current,

        [variables.centerId]: friendlyError(error),
      }));

      setSavingCenterId(null);
    },
  });

  // ==========================================================================
  // SAVE CENTER
  // ==========================================================================

  const saveCenter = (center: PollingCenterDto) => {
    if (!electionId || !canEdit) {
      return;
    }

    const existing = allocationByCenterId.get(center.centerId);

    if (existing) {
      setCenterErrors((current) => ({
        ...current,

        [center.centerId]:
          "This polling center already has an allocation for this election.",
      }));

      return;
    }

    const form = getCenterForm(center.centerId);

    if (form.registeredVoters.trim() === "") {
      setCenterErrors((current) => ({
        ...current,

        [center.centerId]: "Registered voters is required.",
      }));

      return;
    }

    const registeredVoters = Number(form.registeredVoters);

    if (Number.isNaN(registeredVoters) || registeredVoters < 0) {
      setCenterErrors((current) => ({
        ...current,

        [center.centerId]: "Registered voters must be zero or greater.",
      }));

      return;
    }

    let ballotsIssued: number | undefined = undefined;

    if (form.ballotsIssued.trim() !== "") {
      ballotsIssued = Number(form.ballotsIssued);

      if (Number.isNaN(ballotsIssued) || ballotsIssued < 0) {
        setCenterErrors((current) => ({
          ...current,

          [center.centerId]: "Ballots issued must be zero or greater.",
        }));

        return;
      }
    }

    const request: PollingCenterAllocationCreateRequest = {
      electionId,

      centerId: center.centerId,

      registeredVoters,

      ballotsIssued,
    };

    setSavingCenterId(center.centerId);

    createM.mutate({
      centerId: center.centerId,

      request,
    });
  };

  // ==========================================================================
  // FILTER CENTERS
  // ==========================================================================

  const visibleCenters = useMemo(() => {
    const centers = centersQ.data ?? [];

    const normalizedSearch = search.trim().toLowerCase();

    return centers.filter((center) => {
      const allocated = allocationByCenterId.has(center.centerId);

      if (showUnallocatedOnly && allocated) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      const searchable = [
        center.centerName,

        (center as any).centerCode,

        (center as any).code,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchable.includes(normalizedSearch);
    });
  }, [centersQ.data, search, showUnallocatedOnly, allocationByCenterId]);

  // ==========================================================================
  // SUMMARY
  // ==========================================================================

  const totalCenters = centersQ.data?.length ?? 0;

  const allocatedCenters = (centersQ.data ?? []).filter((center) =>
    allocationByCenterId.has(center.centerId),
  ).length;

  const remainingCenters = Math.max(0, totalCenters - allocatedCenters);

  // ==========================================================================
  // PAGINATED CENTERS
  // ==========================================================================

  const totalPages = Math.max(1, Math.ceil(visibleCenters.length / pageSize));

  const paginatedCenters = useMemo(() => {
    const start = page * pageSize;

    return visibleCenters.slice(start, start + pageSize);
  }, [visibleCenters, page, pageSize]);

  const firstVisible = visibleCenters.length === 0 ? 0 : page * pageSize + 1;

  const lastVisible = Math.min((page + 1) * pageSize, visibleCenters.length);

  // ==========================================================================
  // RESET PAGE WHEN FILTERS CHANGE
  // ==========================================================================

  useEffect(() => {
    setPage(0);
  }, [countyId, districtId, search, showUnallocatedOnly, pageSize]);

  useEffect(() => {
    if (page >= totalPages) {
      setPage(Math.max(0, totalPages - 1));
    }
  }, [page, totalPages]);

  // ==========================================================================
  // RESET LOCATION
  // ==========================================================================

  const clearLocation = () => {
    setCountyId("");

    setDistrictId("");

    setSearch("");

    setForms({});

    setCenterErrors({});

    setSavedCenterIds(new Set());

    setPage(0);
  };

  // ==========================================================================
  // REFRESH
  // ==========================================================================

  const refresh = async () => {
    await Promise.all([centersQ.refetch(), existingAllocationsQ.refetch()]);
  };

  // ==========================================================================
  // ROUTE GUARD
  // ==========================================================================

  if (!electionId) {
    return (
      <div
        className="
          rounded-xl
          border border-red-200
          bg-red-50
          p-4
        "
      >
        <div
          className="
            flex
            items-start
            gap-3
          "
        >
          <AlertCircle
            size={20}
            className="
              mt-0.5
              shrink-0
              text-red-600
            "
          />

          <div>
            <h2
              className="
                font-bold
                text-red-800
              "
            >
              Missing Election
            </h2>

            <p
              className="
                mt-1
                text-sm
                text-red-700
              "
            >
              Election ID is missing from the route.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================================================
  // RENDER
  // ==========================================================================

  return (
    <div
      className="
        flex
        w-full
        flex-col
        gap-4
        pb-8
      "
    >
      {/* ====================================================================
          HEADER
      ==================================================================== */}

      <section
        className="
          flex
          items-start
          gap-3
        "
      >
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="
            flex
            h-11
            w-11
            shrink-0
            items-center
            justify-center
            rounded-lg
            border border-slate-300
            bg-white
            text-slate-700
            transition

            hover:bg-slate-50
            active:scale-95
          "
          aria-label="Go back"
        >
          <ArrowLeft size={20} />
        </button>

        <div
          className="
            min-w-0
            flex-1
          "
        >
          <h1
            className="
              text-xl
              font-bold
              text-slate-900

              sm:text-2xl
            "
          >
            Center Allocation
          </h1>

          <p
            className="
              mt-1
              text-sm
              leading-5
              text-slate-500

              sm:text-base
            "
          >
            Select a county and district, then allocate polling centers.
          </p>
        </div>
      </section>

      {/* ====================================================================
          LOCATION SELECTOR
      ==================================================================== */}

      <section
        className="
          rounded-xl
          border border-slate-200
          bg-white
          p-3

          sm:p-4
        "
      >
        <div
          className="
            grid
            grid-cols-1
            gap-3

            sm:grid-cols-2
          "
        >
          {/* COUNTY */}

          <div>
            <label
              htmlFor="allocation-county"
              className="
                mb-1.5
                block
                text-sm
                font-semibold
                text-slate-700
              "
            >
              County
            </label>

            <select
              id="allocation-county"
              value={countyId}
              onChange={(event) => {
                setCountyId(event.target.value);

                setDistrictId("");

                setSearch("");

                setForms({});

                setCenterErrors({});

                setSavedCenterIds(new Set());

                setPage(0);
              }}
              disabled={countiesQ.isLoading}
              className="
                min-h-11
                w-full
                rounded-lg
                border border-slate-300
                bg-white
                px-3
                text-base
                text-slate-900
                outline-none

                focus:border-blue-500
                focus:ring-2
                focus:ring-blue-100

                disabled:bg-slate-100
              "
            >
              <option value="">Select county</option>

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
              htmlFor="allocation-district"
              className="
                mb-1.5
                block
                text-sm
                font-semibold
                text-slate-700
              "
            >
              District
            </label>

            <select
              id="allocation-district"
              value={districtId}
              onChange={(event) => {
                setDistrictId(event.target.value);

                setSearch("");

                setForms({});

                setCenterErrors({});

                setSavedCenterIds(new Set());

                setPage(0);
              }}
              disabled={!countyId || districtsQ.isLoading}
              className="
                min-h-11
                w-full
                rounded-lg
                border border-slate-300
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
                {countyId ? "Select district" : "Select county first"}
              </option>

              {(districtsQ.data ?? []).map((district) => (
                <option key={district.districtId} value={district.districtId}>
                  {district.districtName}
                </option>
              ))}
            </select>
          </div>
        </div>

        {(countyId || districtId) && (
          <button
            type="button"
            onClick={clearLocation}
            className="
              mt-2
              inline-flex
              min-h-9
              items-center
              gap-2
              rounded-lg
              px-2
              text-sm
              font-semibold
              text-slate-600
              transition

              hover:bg-slate-50
              hover:text-slate-900
            "
          >
            <FilterX size={16} />
            Clear selection
          </button>
        )}
      </section>

      {/* ====================================================================
          SELECT DISTRICT PLACEHOLDER
      ==================================================================== */}

      {!districtId && (
        <section
          className="
            rounded-xl
            border
            border-dashed
            border-slate-300
            bg-slate-50
            p-8
            text-center
          "
        >
          <MapPin
            size={36}
            className="
              mx-auto
              text-slate-300
            "
          />

          <h2
            className="
              mt-3
              font-bold
              text-slate-800
            "
          >
            Select a district
          </h2>

          <p
            className="
              mx-auto
              mt-1
              max-w-sm
              text-sm
              text-slate-500
            "
          >
            Polling centers in the selected district will appear here for
            allocation.
          </p>
        </section>
      )}

      {/* ====================================================================
          DISTRICT WORKSPACE
      ==================================================================== */}

      {districtId && (
        <>
          {/* ================================================================
              COMPACT SUMMARY
          ================================================================ */}

          <section
            className="
              grid
              grid-cols-3
              overflow-hidden
              rounded-xl
              border border-slate-200
              bg-white
            "
          >
            <div
              className="
                border-r
                border-slate-200
                px-3
                py-2.5
                text-center
              "
            >
              <div
                className="
                  text-lg
                  font-bold
                  text-slate-900

                  sm:text-xl
                "
              >
                {totalCenters}
              </div>

              <div
                className="
                  text-[10px]
                  font-semibold
                  uppercase
                  tracking-wide
                  text-slate-500

                  sm:text-xs
                "
              >
                Centers
              </div>
            </div>

            <div
              className="
                border-r
                border-slate-200
                px-3
                py-2.5
                text-center
              "
            >
              <div
                className="
                  text-lg
                  font-bold
                  text-green-700

                  sm:text-xl
                "
              >
                {allocatedCenters}
              </div>

              <div
                className="
                  text-[10px]
                  font-semibold
                  uppercase
                  tracking-wide
                  text-green-700

                  sm:text-xs
                "
              >
                Allocated
              </div>
            </div>

            <div
              className="
                px-3
                py-2.5
                text-center
              "
            >
              <div
                className="
                  text-lg
                  font-bold
                  text-blue-700

                  sm:text-xl
                "
              >
                {remainingCenters}
              </div>

              <div
                className="
                  text-[10px]
                  font-semibold
                  uppercase
                  tracking-wide
                  text-blue-700

                  sm:text-xs
                "
              >
                Remaining
              </div>
            </div>
          </section>

          {/* ================================================================
              SEARCH + FILTER + PAGE SIZE
          ================================================================ */}

          <section
            className="
              rounded-xl
              border border-slate-200
              bg-white
              p-3
            "
          >
            <div
              className="
                flex
                flex-col
                gap-3

                lg:flex-row
                lg:items-center
              "
            >
              {/* SEARCH */}

              <div
                className="
                  relative
                  min-w-0
                  flex-1
                "
              >
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
                  placeholder="Search center name or code..."
                  className="
                    min-h-11
                    w-full
                    rounded-lg
                    border border-slate-300
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

              <div
                className="
                  flex
                  flex-wrap
                  items-center
                  justify-between
                  gap-3

                  lg:justify-end
                "
              >
                {/* UNALLOCATED */}

                <label
                  className="
                    flex
                    min-h-10
                    cursor-pointer
                    items-center
                    gap-2
                    text-sm
                    font-medium
                    text-slate-700
                  "
                >
                  <input
                    type="checkbox"
                    checked={showUnallocatedOnly}
                    onChange={(event) =>
                      setShowUnallocatedOnly(event.target.checked)
                    }
                    className="
                      h-5
                      w-5
                      rounded
                      border-slate-300
                    "
                  />
                  Unallocated only
                </label>

                {/* PAGE SIZE */}

                <div
                  className="
                    flex
                    items-center
                    gap-2
                  "
                >
                  <span
                    className="
                      hidden
                      text-sm
                      font-medium
                      text-slate-500

                      sm:inline
                    "
                  >
                    Show
                  </span>

                  <select
                    value={pageSize}
                    onChange={(event) =>
                      setPageSize(Number(event.target.value))
                    }
                    className="
                      min-h-10
                      rounded-lg
                      border border-slate-300
                      bg-white
                      px-2
                      text-sm
                      font-semibold
                      text-slate-700
                    "
                    aria-label="Centers per page"
                  >
                    <option value={10}>10</option>

                    <option value={25}>25</option>

                    <option value={50}>50</option>

                    <option value={100}>100</option>
                  </select>
                </div>

                {/* REFRESH */}

                <button
                  type="button"
                  onClick={refresh}
                  disabled={
                    centersQ.isFetching || existingAllocationsQ.isFetching
                  }
                  className="
                    inline-flex
                    min-h-10
                    items-center
                    gap-2
                    rounded-lg
                    px-3
                    text-sm
                    font-semibold
                    text-blue-600
                    transition

                    hover:bg-blue-50

                    disabled:opacity-50
                  "
                >
                  <RefreshCw
                    size={17}
                    className={
                      centersQ.isFetching || existingAllocationsQ.isFetching
                        ? "animate-spin"
                        : ""
                    }
                  />
                  Refresh
                </button>
              </div>
            </div>
          </section>

          {/* ================================================================
              RESULT INFORMATION
          ================================================================ */}

          {!centersQ.isLoading &&
            !existingAllocationsQ.isLoading &&
            !centersQ.isError &&
            !existingAllocationsQ.isError && (
              <div
                className="
                  flex
                  flex-wrap
                  items-center
                  justify-between
                  gap-2
                  px-1
                "
              >
                <span
                  className="
                    text-xs
                    font-medium
                    text-slate-500

                    sm:text-sm
                  "
                >
                  {visibleCenters.length === 0
                    ? "0 centers"
                    : `${firstVisible}-${lastVisible} of ${visibleCenters.length} centers`}
                </span>

                {totalPages > 1 && (
                  <span
                    className="
                      text-xs
                      font-medium
                      text-slate-500

                      sm:text-sm
                    "
                  >
                    Page {page + 1} of {totalPages}
                  </span>
                )}
              </div>
            )}

          {/* ================================================================
              LOADING
          ================================================================ */}

          {(centersQ.isLoading || existingAllocationsQ.isLoading) && (
            <section
              className="
                rounded-xl
                border border-slate-200
                bg-white
                p-8
                text-center
              "
            >
              <Loader2
                size={28}
                className="
                  mx-auto
                  animate-spin
                  text-blue-600
                "
              />

              <p
                className="
                  mt-3
                  text-sm
                  font-medium
                  text-slate-500
                "
              >
                Loading polling centers...
              </p>
            </section>
          )}

          {/* ================================================================
              QUERY ERROR
          ================================================================ */}

          {(centersQ.isError || existingAllocationsQ.isError) && (
            <section
              className="
                rounded-xl
                border border-red-200
                bg-red-50
                p-4
              "
            >
              <div
                className="
                  flex
                  items-start
                  gap-3
                "
              >
                <AlertCircle
                  size={20}
                  className="
                    mt-0.5
                    shrink-0
                    text-red-600
                  "
                />

                <div>
                  <h3
                    className="
                      font-semibold
                      text-red-800
                    "
                  >
                    Unable to load district
                  </h3>

                  <p
                    className="
                      mt-1
                      text-sm
                      text-red-700
                    "
                  >
                    {friendlyError(
                      centersQ.error ?? existingAllocationsQ.error,
                    )}
                  </p>
                </div>
              </div>
            </section>
          )}

          {/* ================================================================
              COMPACT CENTER LIST
          ================================================================ */}

          {!centersQ.isLoading &&
            !existingAllocationsQ.isLoading &&
            !centersQ.isError &&
            !existingAllocationsQ.isError && (
              <section
                className="
                  overflow-hidden
                  rounded-xl
                  border border-slate-200
                  bg-white
                "
              >
                {paginatedCenters.length === 0 ? (
                  <div
                    className="
                      p-8
                      text-center
                    "
                  >
                    <CheckCircle2
                      size={36}
                      className="
                        mx-auto
                        text-green-500
                      "
                    />

                    <h3
                      className="
                        mt-3
                        font-bold
                        text-slate-800
                      "
                    >
                      No centers to display
                    </h3>

                    <p
                      className="
                        mt-1
                        text-sm
                        text-slate-500
                      "
                    >
                      All centers may already be allocated, or no centers match
                      your search.
                    </p>
                  </div>
                ) : (
                  <div
                    className="
                      divide-y
                      divide-slate-200
                    "
                  >
                    {paginatedCenters.map((center) => {
                      const existingAllocation = allocationByCenterId.get(
                        center.centerId,
                      );

                      const form = getCenterForm(center.centerId);

                      const isSaving = savingCenterId === center.centerId;

                      const recentlySaved = savedCenterIds.has(center.centerId);

                      const error = centerErrors[center.centerId];

                      const centerCode = safeText(
                        (center as any).centerCode ?? (center as any).code,
                        "",
                      );

                      // ====================================================
                      // ALLOCATED ROW
                      // ====================================================

                      if (existingAllocation) {
                        return (
                          <article
                            key={center.centerId}
                            className="
                                bg-green-50/20
                                px-3
                                py-3

                                sm:px-4

                                lg:px-5
                              "
                          >
                            {/* DESKTOP / TABLET */}

                            <div
                              className="
                                  hidden
                                  min-w-0
                                  items-center
                                  gap-4

                                  md:grid
                                  md:grid-cols-[minmax(0,1fr)_150px_150px_110px]
                                "
                            >
                              <CenterIdentity
                                centerName={center.centerName}
                                centerCode={centerCode}
                                allocated
                              />

                              <CompactValue
                                label="Registered"
                                value={formatNumber(
                                  existingAllocation.registeredVoters,
                                )}
                              />

                              <CompactValue
                                label="Ballots"
                                value={formatNumber(
                                  existingAllocation.ballotsIssued,
                                )}
                              />

                              <div
                                className="
                                    flex
                                    justify-end
                                  "
                              >
                                <span
                                  className="
                                      inline-flex
                                      items-center
                                      gap-1
                                      rounded-full
                                      bg-green-50
                                      px-2.5
                                      py-1
                                      text-xs
                                      font-bold
                                      text-green-700
                                    "
                                >
                                  <Check size={13} />
                                  Allocated
                                </span>
                              </div>
                            </div>

                            {/* MOBILE */}

                            <div className="md:hidden">
                              <div
                                className="
                                    flex
                                    items-start
                                    justify-between
                                    gap-3
                                  "
                              >
                                <CenterIdentity
                                  centerName={center.centerName}
                                  centerCode={centerCode}
                                  allocated
                                />

                                <span
                                  className="
                                      flex
                                      h-7
                                      w-7
                                      shrink-0
                                      items-center
                                      justify-center
                                      rounded-full
                                      bg-green-50
                                      text-green-700
                                    "
                                >
                                  <Check size={15} />
                                </span>
                              </div>

                              <div
                                className="
                                    mt-2
                                    grid
                                    grid-cols-2
                                    gap-3
                                  "
                              >
                                <CompactValue
                                  label="Registered"
                                  value={formatNumber(
                                    existingAllocation.registeredVoters,
                                  )}
                                />

                                <CompactValue
                                  label="Ballots"
                                  value={formatNumber(
                                    existingAllocation.ballotsIssued,
                                  )}
                                />
                              </div>
                            </div>
                          </article>
                        );
                      }

                      // ====================================================
                      // UNALLOCATED ROW
                      // ====================================================

                      return (
                        <article
                          key={center.centerId}
                          className={`
                              px-3
                              py-3
                              transition

                              sm:px-4

                              lg:px-5

                              ${recentlySaved ? "bg-green-50/30" : "bg-white"}
                            `}
                        >
                          {/* ==================================================
                                DESKTOP / TABLET
                            ================================================== */}

                          <div
                            className="
                                hidden
                                min-w-0
                                items-end
                                gap-3

                                md:grid
                                md:grid-cols-[minmax(220px,1fr)_180px_180px_130px]
                              "
                          >
                            {/* CENTER */}

                            <CenterIdentity
                              centerName={center.centerName}
                              centerCode={centerCode}
                            />

                            {/* REGISTERED */}

                            <div>
                              <label
                                htmlFor={`registered-${center.centerId}`}
                                className="
                                    mb-1
                                    flex
                                    items-center
                                    gap-1
                                    text-[10px]
                                    font-semibold
                                    uppercase
                                    tracking-wide
                                    text-slate-500
                                  "
                              >
                                <Users size={12} />
                                Registered
                                <span
                                  className="
                                      text-red-600
                                    "
                                >
                                  *
                                </span>
                              </label>

                              <input
                                id={`registered-${center.centerId}`}
                                type="number"
                                inputMode="numeric"
                                min={0}
                                value={form.registeredVoters}
                                onChange={(event) =>
                                  updateCenterForm(
                                    center.centerId,
                                    "registeredVoters",
                                    event.target.value,
                                  )
                                }
                                disabled={isSaving || !canEdit}
                                placeholder="0"
                                className="
                                    h-10
                                    w-full
                                    rounded-lg
                                    border border-slate-300
                                    bg-white
                                    px-3
                                    text-base
                                    font-semibold
                                    text-slate-900
                                    outline-none

                                    focus:border-blue-500
                                    focus:ring-2
                                    focus:ring-blue-100

                                    disabled:bg-slate-100
                                  "
                              />
                            </div>

                            {/* BALLOTS */}

                            <div>
                              <label
                                htmlFor={`ballots-${center.centerId}`}
                                className="
                                    mb-1
                                    flex
                                    items-center
                                    gap-1
                                    text-[10px]
                                    font-semibold
                                    uppercase
                                    tracking-wide
                                    text-slate-500
                                  "
                              >
                                <Vote size={12} />
                                Ballots
                              </label>

                              <input
                                id={`ballots-${center.centerId}`}
                                type="number"
                                inputMode="numeric"
                                min={0}
                                value={form.ballotsIssued}
                                onChange={(event) =>
                                  updateCenterForm(
                                    center.centerId,
                                    "ballotsIssued",
                                    event.target.value,
                                  )
                                }
                                disabled={isSaving || !canEdit}
                                placeholder="0"
                                className="
                                    h-10
                                    w-full
                                    rounded-lg
                                    border border-slate-300
                                    bg-white
                                    px-3
                                    text-base
                                    font-semibold
                                    text-slate-900
                                    outline-none

                                    focus:border-blue-500
                                    focus:ring-2
                                    focus:ring-blue-100

                                    disabled:bg-slate-100
                                  "
                              />
                            </div>

                            {/* SAVE */}

                            <button
                              type="button"
                              onClick={() => saveCenter(center)}
                              disabled={
                                !canEdit ||
                                isSaving ||
                                form.registeredVoters.trim() === ""
                              }
                              className="
                                  inline-flex
                                  h-10
                                  items-center
                                  justify-center
                                  gap-1.5
                                  rounded-lg
                                  bg-blue-600
                                  px-3
                                  text-sm
                                  font-bold
                                  text-white
                                  transition

                                  hover:bg-blue-700

                                  disabled:cursor-not-allowed
                                  disabled:bg-slate-300
                                "
                            >
                              {isSaving ? (
                                <>
                                  <Loader2 size={16} className="animate-spin" />
                                  Saving
                                </>
                              ) : (
                                <>
                                  <Save size={16} />
                                  Save
                                </>
                              )}
                            </button>
                          </div>

                          {/* ==================================================
                                MOBILE
                            ================================================== */}

                          <div className="md:hidden">
                            {/* ROW 1 */}

                            <div
                              className="
                                  flex
                                  items-start
                                  justify-between
                                  gap-2
                                "
                            >
                              <CenterIdentity
                                centerName={center.centerName}
                                centerCode={centerCode}
                              />

                              <span
                                className="
                                    shrink-0
                                    rounded-full
                                    bg-amber-50
                                    px-2
                                    py-1
                                    text-[10px]
                                    font-bold
                                    text-amber-700
                                  "
                              >
                                Not allocated
                              </span>
                            </div>

                            {/* ROW 2 */}

                            <div
                              className="
                                  mt-2
                                  grid
                                  grid-cols-2
                                  gap-2
                                "
                            >
                              <div>
                                <label
                                  htmlFor={`mobile-registered-${center.centerId}`}
                                  className="
                                      mb-1
                                      block
                                      text-[10px]
                                      font-semibold
                                      uppercase
                                      tracking-wide
                                      text-slate-500
                                    "
                                >
                                  Registered *
                                </label>

                                <input
                                  id={`mobile-registered-${center.centerId}`}
                                  type="number"
                                  inputMode="numeric"
                                  min={0}
                                  value={form.registeredVoters}
                                  onChange={(event) =>
                                    updateCenterForm(
                                      center.centerId,
                                      "registeredVoters",
                                      event.target.value,
                                    )
                                  }
                                  disabled={isSaving || !canEdit}
                                  placeholder="0"
                                  className="
                                      h-10
                                      w-full
                                      rounded-lg
                                      border border-slate-300
                                      bg-white
                                      px-2.5
                                      text-base
                                      font-semibold
                                      text-slate-900
                                      outline-none

                                      focus:border-blue-500
                                      focus:ring-2
                                      focus:ring-blue-100
                                    "
                                />
                              </div>

                              <div>
                                <label
                                  htmlFor={`mobile-ballots-${center.centerId}`}
                                  className="
                                      mb-1
                                      block
                                      text-[10px]
                                      font-semibold
                                      uppercase
                                      tracking-wide
                                      text-slate-500
                                    "
                                >
                                  Ballots
                                </label>

                                <input
                                  id={`mobile-ballots-${center.centerId}`}
                                  type="number"
                                  inputMode="numeric"
                                  min={0}
                                  value={form.ballotsIssued}
                                  onChange={(event) =>
                                    updateCenterForm(
                                      center.centerId,
                                      "ballotsIssued",
                                      event.target.value,
                                    )
                                  }
                                  disabled={isSaving || !canEdit}
                                  placeholder="0"
                                  className="
                                      h-10
                                      w-full
                                      rounded-lg
                                      border border-slate-300
                                      bg-white
                                      px-2.5
                                      text-base
                                      font-semibold
                                      text-slate-900
                                      outline-none

                                      focus:border-blue-500
                                      focus:ring-2
                                      focus:ring-blue-100
                                    "
                                />
                              </div>
                            </div>

                            {/* ROW 3 */}

                            <button
                              type="button"
                              onClick={() => saveCenter(center)}
                              disabled={
                                !canEdit ||
                                isSaving ||
                                form.registeredVoters.trim() === ""
                              }
                              className="
                                  mt-2
                                  inline-flex
                                  h-10
                                  w-full
                                  items-center
                                  justify-center
                                  gap-2
                                  rounded-lg
                                  bg-blue-600
                                  text-sm
                                  font-bold
                                  text-white

                                  disabled:cursor-not-allowed
                                  disabled:bg-slate-300
                                "
                            >
                              {isSaving ? (
                                <>
                                  <Loader2 size={16} className="animate-spin" />
                                  Saving...
                                </>
                              ) : (
                                <>
                                  <Save size={16} />
                                  Save Allocation
                                </>
                              )}
                            </button>
                          </div>

                          {/* ERROR */}

                          {error && (
                            <div
                              className="
                                  mt-2
                                  flex
                                  items-start
                                  gap-2
                                  rounded-lg
                                  border border-red-200
                                  bg-red-50
                                  px-3
                                  py-2
                                "
                            >
                              <AlertCircle
                                size={16}
                                className="
                                    mt-0.5
                                    shrink-0
                                    text-red-600
                                  "
                              />

                              <p
                                className="
                                    text-xs
                                    font-medium
                                    text-red-700

                                    sm:text-sm
                                  "
                              >
                                {error}
                              </p>
                            </div>
                          )}
                        </article>
                      );
                    })}
                  </div>
                )}
              </section>
            )}

          {/* ================================================================
              PAGINATION
          ================================================================ */}

          {!centersQ.isLoading &&
            !existingAllocationsQ.isLoading &&
            !centersQ.isError &&
            !existingAllocationsQ.isError &&
            visibleCenters.length > 0 &&
            totalPages > 1 && (
              <section
                className="
                  flex
                  items-center
                  justify-between
                  gap-3
                "
              >
                <button
                  type="button"
                  onClick={() => setPage((current) => Math.max(0, current - 1))}
                  disabled={page === 0}
                  className="
                    inline-flex
                    min-h-11
                    items-center
                    justify-center
                    gap-1
                    rounded-lg
                    border border-slate-300
                    bg-white
                    px-3
                    text-sm
                    font-semibold
                    text-slate-700

                    hover:bg-slate-50

                    disabled:cursor-not-allowed
                    disabled:opacity-40
                  "
                >
                  <ChevronLeft size={18} />

                  <span
                    className="
                      hidden
                      sm:inline
                    "
                  >
                    Previous
                  </span>
                </button>

                <div
                  className="
                    text-center
                  "
                >
                  <div
                    className="
                      text-sm
                      font-bold
                      text-slate-700
                    "
                  >
                    {page + 1} / {totalPages}
                  </div>

                  <div
                    className="
                      mt-0.5
                      text-[10px]
                      text-slate-500

                      sm:text-xs
                    "
                  >
                    {firstVisible}-{lastVisible} of {visibleCenters.length}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setPage((current) => Math.min(totalPages - 1, current + 1))
                  }
                  disabled={page + 1 >= totalPages}
                  className="
                    inline-flex
                    min-h-11
                    items-center
                    justify-center
                    gap-1
                    rounded-lg
                    border border-slate-300
                    bg-white
                    px-3
                    text-sm
                    font-semibold
                    text-slate-700

                    hover:bg-slate-50

                    disabled:cursor-not-allowed
                    disabled:opacity-40
                  "
                >
                  <span
                    className="
                      hidden
                      sm:inline
                    "
                  >
                    Next
                  </span>

                  <ChevronRight size={18} />
                </button>
              </section>
            )}
        </>
      )}
    </div>
  );
}

// ============================================================================
// CENTER IDENTITY
// ============================================================================

type CenterIdentityProps = {
  centerName: string | null | undefined;

  centerCode: string;

  allocated?: boolean;
};

function CenterIdentity({
  centerName,
  centerCode,
  allocated = false,
}: CenterIdentityProps) {
  return (
    <div
      className="
        flex
        min-w-0
        items-center
        gap-2.5
      "
    >
      <div
        className={`
          flex
          h-9
          w-9
          shrink-0
          items-center
          justify-center
          rounded-lg

          ${
            allocated
              ? "bg-green-50 text-green-600"
              : "bg-blue-50 text-blue-600"
          }
        `}
      >
        {allocated ? <Check size={17} /> : <MapPin size={17} />}
      </div>

      <div
        className="
          min-w-0
          flex-1
        "
      >
        <h3
          className="
            truncate
            text-sm
            font-bold
            text-slate-900

            sm:text-base
          "
        >
          {safeText(centerName, "Unnamed center")}
        </h3>

        {centerCode && (
          <p
            className="
              mt-0.5
              truncate
              text-[10px]
              font-medium
              text-slate-500

              sm:text-xs
            "
          >
            {centerCode}
          </p>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// COMPACT VALUE
// ============================================================================

type CompactValueProps = {
  label: string;
  value: string;
};

function CompactValue({ label, value }: CompactValueProps) {
  return (
    <div>
      <div
        className="
          text-[9px]
          font-semibold
          uppercase
          tracking-wide
          text-slate-500

          sm:text-[10px]
        "
      >
        {label}
      </div>

      <div
        className="
          mt-0.5
          text-sm
          font-bold
          text-slate-900

          sm:text-base
        "
      >
        {value}
      </div>
    </div>
  );
}

// src/pages/elections/ElectionsListPage.tsx

import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import {
  CalendarDays,
  ChevronRight,
  Clock3,
  FilterX,
  Plus,
  RefreshCw,
  Search,
  Vote,
} from "lucide-react";

import { useAuthStore } from "../../shared/store/authStore";

import {
  searchElections,
  type ElectionAccessStatus,
  type ElectionDto,
  type ElectionType,
} from "../../shared/services/electionService";

import { Badge, SectionTitle } from "./shared/elections-ui";

// ============================================================================
// HELPERS
// ============================================================================

function safeStr(value: any) {
  return typeof value === "string" ? value : value == null ? "" : String(value);
}

function toIntOrUndef(value: string): number | undefined {
  const trimmed = value.trim();

  if (!trimmed) {
    return undefined;
  }

  const numberValue = Number(trimmed);

  return Number.isFinite(numberValue) ? numberValue : undefined;
}

function fmtDate(value: any): string {
  if (!value) {
    return "—";
  }

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return safeStr(value);
  }

  return date.toLocaleString();
}

function fmtDateShort(value: any): string {
  if (!value) {
    return "—";
  }

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return safeStr(value);
  }

  return date.toLocaleDateString();
}

// ============================================================================
// ELECTION TYPES
// ============================================================================

const ELECTION_TYPE_OPTIONS: {
  value: ElectionType;
  label: string;
}[] = [
  {
    value: "PRESIDENTIAL",
    label: "Presidential",
  },

  {
    value: "LEGISLATIVE",
    label: "Legislative",
  },

  {
    value: "SENATORIAL",
    label: "Senatorial",
  },

  {
    value: "REPRESENTATIVE",
    label: "Representative",
  },

  {
    value: "REFERENDUM",
    label: "Referendum",
  },

  {
    value: "PRESIDENTIAL_GENERAL",
    label: "Presidential General",
  },

  {
    value: "BY_ELECTION",
    label: "By-Election",
  },

  {
    value: "LOCAL",
    label: "Local",
  },
];

function electionTypeLabel(type: ElectionType | null | undefined) {
  return (
    ELECTION_TYPE_OPTIONS.find((option) => option.value === type)?.label ??
    safeStr(type) ??
    "—"
  );
}

// ============================================================================
// LIFECYCLE
// ============================================================================

const LIFECYCLE_OPTIONS: {
  value: ElectionAccessStatus;
  label: string;
}[] = [
  {
    value: "DRAFT",
    label: "Draft",
  },

  {
    value: "AVAILABLE",
    label: "Available",
  },

  {
    value: "ARCHIVED",
    label: "Archived",
  },

  {
    value: "CANCELLED",
    label: "Cancelled",
  },
];

function lifecycleLabel(status: ElectionAccessStatus | null | undefined) {
  if (!status) {
    return "—";
  }

  return (
    LIFECYCLE_OPTIONS.find((option) => option.value === status)?.label ?? status
  );
}

function lifecycleBadgeClass(status: ElectionAccessStatus | null | undefined) {
  switch (status) {
    case "DRAFT":
      return `
        border-amber-200
        bg-amber-50
        text-amber-800
      `;

    case "AVAILABLE":
      return `
        border-emerald-200
        bg-emerald-50
        text-emerald-700
      `;

    case "ARCHIVED":
      return `
        border-slate-300
        bg-slate-100
        text-slate-700
      `;

    case "CANCELLED":
      return `
        border-red-200
        bg-red-50
        text-red-700
      `;

    default:
      return `
        border-slate-200
        bg-white
        text-slate-600
      `;
  }
}

function LifecycleBadge({ status }: { status?: ElectionAccessStatus | null }) {
  return (
    <span
      className={[
        `
          inline-flex
          shrink-0
          items-center
          rounded-full
          border
          px-2.5
          py-1
          text-xs
          font-bold
          lg:text-sm
        `,

        lifecycleBadgeClass(status),
      ].join(" ")}
    >
      {lifecycleLabel(status)}
    </span>
  );
}

// ============================================================================
// TECHNICAL STATUS
// ============================================================================

function ActiveBadge({ active }: { active: boolean }) {
  return (
    <span
      className={
        active
          ? `
              inline-flex
              shrink-0
              items-center
              rounded-full
              bg-emerald-50
              px-2.5
              py-1
              text-xs
              font-bold
              text-emerald-700
              lg:text-sm
            `
          : `
              inline-flex
              shrink-0
              items-center
              rounded-full
              bg-slate-100
              px-2.5
              py-1
              text-xs
              font-bold
              text-slate-600
              lg:text-sm
            `
      }
    >
      {active ? "Active" : "Inactive"}
    </span>
  );
}

// ============================================================================
// PAGE
// ============================================================================

export default function ElectionsListPage() {
  const navigate = useNavigate();

  const queryClient = useQueryClient();

  // ==========================================================================
  // ACCESS
  // ==========================================================================

  const dashboardMode = useAuthStore((state) => state.dashboardMode);

  /*
   * UI convenience only.
   *
   * Backend ElectionAccessPolicy remains the security authority.
   */
  const canManageElection =
    dashboardMode === "NEC" || dashboardMode === "SYSTEM";

  /*
   * NEC/System users may benefit from explicit DRAFT filtering.
   *
   * Regular tenants are still protected by backend lifecycle visibility,
   * regardless of what filter values are sent.
   */
  const canViewInternalLifecycle =
    dashboardMode === "NEC" || dashboardMode === "SYSTEM";

  // ==========================================================================
  // PAGINATION
  // ==========================================================================

  const size = 20;

  const [page, setPage] = useState(0);

  // ==========================================================================
  // FILTERS
  // ==========================================================================

  const [q, setQ] = useState("");

  const [year, setYear] = useState("");

  const [type, setType] = useState<ElectionType | "">("");

  const [lifecycleFilter, setLifecycleFilter] = useState<
    ElectionAccessStatus | ""
  >("");

  const [technicalStatusFilter, setTechnicalStatusFilter] = useState<
    "active" | "inactive" | "all"
  >("active");

  const activeBool: boolean | undefined =
    technicalStatusFilter === "all"
      ? undefined
      : technicalStatusFilter === "active";

  // ==========================================================================
  // QUERY
  // ==========================================================================

  const electionsQuery = useQuery({
    queryKey: [
      "elections",
      page,
      q,
      year,
      type,
      lifecycleFilter,
      technicalStatusFilter,
    ],

    queryFn: () =>
      searchElections({
        page,

        size,

        q: q.trim() || undefined,

        year: toIntOrUndef(year),

        type: type || undefined,

        active: activeBool,

        accessStatus: lifecycleFilter || undefined,
      }),

    staleTime: 10_000,

    retry: 1,
  });

  const elections = useMemo(
    () => electionsQuery.data?.items ?? [],

    [electionsQuery.data],
  );

  const totalPages = Math.max(1, electionsQuery.data?.totalPages ?? 1);

  const totalElements = electionsQuery.data?.totalElements ?? 0;

  // ==========================================================================
  // REFRESH
  // ==========================================================================

  const refreshNow = async () => {
    await queryClient.invalidateQueries({
      queryKey: ["elections"],
    });

    await electionsQuery.refetch();
  };

  // ==========================================================================
  // CLEAR FILTERS
  // ==========================================================================

  const clearFilters = () => {
    setQ("");

    setYear("");

    setType("");

    setLifecycleFilter("");

    setTechnicalStatusFilter("active");

    setPage(0);
  };

  // ==========================================================================
  // ROUTING
  // ==========================================================================

  const openElectionDetail = (election: ElectionDto) => {
    navigate(`/elections/${election.electionId}`);
  };

  const openCreatePage = () => {
    navigate("/elections/new");
  };

  // ==========================================================================
  // RENDER
  // ==========================================================================

  return (
    <div className="app-content">
      <div className="flex min-w-0 flex-col gap-3">
        {/* ================================================================
            TITLE
        ================================================================ */}

        <SectionTitle
          title="Elections"
          subtitle="Official elections, lifecycle access, and election workspace management."
        />

        {/* ================================================================
            MAIN CARD
        ================================================================ */}

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          {/* ==============================================================
              HEADER
          ============================================================== */}

          <div className="flex min-w-0 flex-col gap-3 border-b border-slate-200 px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4">
            <div className="min-w-0">
              <h2 className="text-base font-bold text-slate-900 sm:text-lg lg:text-xl">
                Elections List
              </h2>

              <p className="mt-0.5 text-xs text-slate-500 sm:text-sm lg:text-base">
                Select an election to view details or enter its election
                workspace.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex min-h-9 items-center rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-bold text-slate-600 sm:text-sm">
                {totalElements} {totalElements === 1 ? "Election" : "Elections"}
              </span>

              {canManageElection ? (
                <button
                  type="button"
                  onClick={openCreatePage}
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
                    lg:text-base
                  "
                >
                  <Plus size={17} />
                  New Election
                </button>
              ) : (
                <Badge text="Read-only" />
              )}

              <button
                type="button"
                onClick={refreshNow}
                disabled={electionsQuery.isFetching}
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
                  lg:text-base
                "
              >
                <RefreshCw
                  size={16}
                  className={electionsQuery.isFetching ? "animate-spin" : ""}
                />

                <span className="hidden sm:inline">Refresh</span>
              </button>
            </div>
          </div>

          {/* ==============================================================
              FILTERS
          ============================================================== */}

          <div className="border-b border-slate-200 bg-slate-50/50 p-2.5 sm:p-3">
            <div
              className="
                grid
                min-w-0
                grid-cols-2
                gap-2

                lg:grid-cols-[minmax(220px,1.4fr)_110px_minmax(155px,0.8fr)_minmax(145px,0.8fr)_minmax(230px,1fr)_auto]
                lg:items-center
              "
            >
              {/* SEARCH */}

              <div className="relative col-span-2 min-w-0 lg:col-span-1">
                <Search
                  size={17}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  value={q}
                  onChange={(event) => {
                    setQ(event.target.value);

                    setPage(0);
                  }}
                  placeholder="Search election name..."
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
                    lg:text-base
                  "
                />
              </div>

              {/* YEAR */}

              <input
                value={year}
                onChange={(event) => {
                  setYear(event.target.value);

                  setPage(0);
                }}
                placeholder="Year"
                inputMode="numeric"
                className="
                  min-h-10
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
                  placeholder:text-slate-400
                  focus:border-blue-500
                  focus:ring-2
                  focus:ring-blue-100
                  lg:text-base
                "
              />

              {/* TYPE */}

              <select
                value={type}
                onChange={(event) => {
                  setType(event.target.value as ElectionType | "");

                  setPage(0);
                }}
                className="
                  min-h-10
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
                <option value="">All Types</option>

                {ELECTION_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>

              {/* LIFECYCLE */}

              <select
                value={lifecycleFilter}
                onChange={(event) => {
                  setLifecycleFilter(
                    event.target.value as ElectionAccessStatus | "",
                  );

                  setPage(0);
                }}
                className="
                  min-h-10
                  w-full
                  rounded-lg
                  border
                  border-slate-300
                  bg-white
                  px-3
                  py-2
                  text-sm
                  font-semibold
                  text-slate-700
                  outline-none
                  focus:border-blue-500
                  focus:ring-2
                  focus:ring-blue-100
                  lg:text-base
                "
              >
                <option value="">All Lifecycle</option>

                {LIFECYCLE_OPTIONS.map((option) => {
                  /*
                   * We allow the selector for every user because
                   * the backend remains authoritative.
                   *
                   * DRAFT is most useful to NEC/SYSTEM.
                   */
                  if (option.value === "DRAFT" && !canViewInternalLifecycle) {
                    return null;
                  }

                  return (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  );
                })}
              </select>

              {/* TECHNICAL ACTIVE STATUS */}

              <div
                className="
                  col-span-2
                  flex
                  min-h-10
                  min-w-0
                  items-center
                  gap-1
                  rounded-lg
                  border
                  border-slate-300
                  bg-white
                  p-1
                  sm:col-span-1
                "
              >
                <button
                  type="button"
                  onClick={() => {
                    setTechnicalStatusFilter("active");

                    setPage(0);
                  }}
                  className={
                    technicalStatusFilter === "active"
                      ? `
                          min-h-8
                          flex-1
                          rounded-md
                          bg-emerald-50
                          px-2
                          text-xs
                          font-bold
                          text-emerald-700
                          lg:text-sm
                        `
                      : `
                          min-h-8
                          flex-1
                          rounded-md
                          px-2
                          text-xs
                          font-semibold
                          text-slate-600
                          hover:bg-slate-50
                          lg:text-sm
                        `
                  }
                >
                  Active
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setTechnicalStatusFilter("inactive");

                    setPage(0);
                  }}
                  className={
                    technicalStatusFilter === "inactive"
                      ? `
                          min-h-8
                          flex-1
                          rounded-md
                          bg-slate-200
                          px-2
                          text-xs
                          font-bold
                          text-slate-800
                          lg:text-sm
                        `
                      : `
                          min-h-8
                          flex-1
                          rounded-md
                          px-2
                          text-xs
                          font-semibold
                          text-slate-600
                          hover:bg-slate-50
                          lg:text-sm
                        `
                  }
                >
                  Inactive
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setTechnicalStatusFilter("all");

                    setPage(0);
                  }}
                  className={
                    technicalStatusFilter === "all"
                      ? `
                          min-h-8
                          flex-1
                          rounded-md
                          bg-blue-50
                          px-2
                          text-xs
                          font-bold
                          text-blue-700
                          lg:text-sm
                        `
                      : `
                          min-h-8
                          flex-1
                          rounded-md
                          px-2
                          text-xs
                          font-semibold
                          text-slate-600
                          hover:bg-slate-50
                          lg:text-sm
                        `
                  }
                >
                  All
                </button>
              </div>

              {/* CLEAR */}

              <button
                type="button"
                onClick={clearFilters}
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
                  lg:text-base
                "
              >
                <FilterX size={16} />
                Clear
              </button>
            </div>

            {/* FILTER EXPLANATION */}

            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] font-medium text-slate-500 sm:text-xs">
              <span>
                Lifecycle:{" "}
                <strong className="text-slate-700">
                  {lifecycleFilter ? lifecycleLabel(lifecycleFilter) : "All"}
                </strong>
              </span>

              <span className="text-slate-300">•</span>

              <span>
                Technical:{" "}
                <strong className="text-slate-700">
                  {technicalStatusFilter === "all"
                    ? "All"
                    : technicalStatusFilter === "active"
                      ? "Active"
                      : "Inactive"}
                </strong>
              </span>
            </div>
          </div>

          {/* ==============================================================
              LOADING
          ============================================================== */}

          {electionsQuery.isLoading && (
            <div className="p-5 text-center text-sm text-slate-500 lg:text-base">
              Loading elections…
            </div>
          )}

          {/* ==============================================================
              ERROR
          ============================================================== */}

          {electionsQuery.isError && (
            <div className="m-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700 lg:text-base">
              {(electionsQuery.error as any)?.response?.data?.message ??
                (electionsQuery.error as any)?.message ??
                "Failed to load elections."}
            </div>
          )}

          {/* ==============================================================
              EMPTY
          ============================================================== */}

          {!electionsQuery.isLoading &&
            !electionsQuery.isError &&
            elections.length === 0 && (
              <div className="px-4 py-10 text-center">
                <Vote size={28} className="mx-auto text-slate-300" />

                <div className="mt-2 text-base font-bold text-slate-700 lg:text-lg">
                  No elections found
                </div>

                <div className="mt-1 text-sm text-slate-500 lg:text-base">
                  No elections match the current filters or your available
                  election access.
                </div>
              </div>
            )}

          {/* ==============================================================
              LIST
          ============================================================== */}

          {!electionsQuery.isLoading &&
            !electionsQuery.isError &&
            elections.length > 0 && (
              <>
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
                    py-2.5
                    text-xs
                    font-bold
                    uppercase
                    tracking-wide
                    text-slate-500

                    md:grid
                    md:grid-cols-[minmax(0,1.5fr)_80px_minmax(130px,0.9fr)_115px_100px_minmax(140px,0.9fr)_145px_24px]
                    md:items-center
                    md:gap-3

                    lg:text-sm
                  "
                >
                  <div>Election</div>

                  <div>Year</div>

                  <div>Type</div>

                  <div>Lifecycle</div>

                  <div>Active</div>

                  <div>Available</div>

                  <div>Created</div>

                  <div />
                </div>

                {/* ==========================================================
                    ROWS
                ========================================================== */}

                <div className="divide-y divide-slate-200">
                  {elections.map((election) => {
                    const created = election.dateCreated;

                    const typeLabel = electionTypeLabel(election.electionType);

                    const available = election.availableAt;

                    return (
                      <button
                        key={election.electionId}
                        type="button"
                        onClick={() => openElectionDetail(election)}
                        className="
                            group
                            block
                            w-full
                            bg-white
                            text-left
                            transition
                            hover:bg-slate-50
                          "
                      >
                        {/* ==================================================
                                MOBILE
                          ================================================== */}

                        <div className="px-3.5 py-3 md:hidden">
                          {/* LINE 1 */}

                          <div className="flex min-w-0 items-start gap-2">
                            <div className="min-w-0 flex-1">
                              <div
                                className="
                                    truncate
                                    text-base
                                    font-bold
                                    text-slate-900
                                  "
                                title={election.electionName}
                              >
                                {election.electionName}
                              </div>

                              <div className="mt-1 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
                                <span className="inline-flex items-center gap-1 font-semibold text-slate-700">
                                  <CalendarDays size={13} />

                                  {election.year}
                                </span>

                                <span className="text-slate-300">•</span>

                                <span>{typeLabel}</span>
                              </div>
                            </div>

                            <ChevronRight
                              size={20}
                              className="
                                  mt-1
                                  shrink-0
                                  text-slate-400
                                  transition
                                  group-hover:text-blue-600
                                "
                            />
                          </div>

                          {/* STATUS ROW */}

                          <div className="mt-2 flex flex-wrap items-center gap-1.5">
                            <LifecycleBadge status={election.accessStatus} />

                            <ActiveBadge active={Boolean(election.isActive)} />

                            {election.archiveDue && (
                              <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-[10px] font-bold text-amber-800">
                                <Clock3 size={11} />
                                Archive Due
                              </span>
                            )}
                          </div>

                          {/* TIMING */}

                          <div className="mt-2 grid grid-cols-2 gap-2">
                            <MobileMetric
                              label="Available"
                              value={fmtDateShort(election.availableAt)}
                            />

                            <MobileMetric
                              label="Starts"
                              value={fmtDateShort(election.startAt)}
                            />
                          </div>
                        </div>

                        {/* ==================================================
                                DESKTOP
                          ================================================== */}

                        <div
                          className="
                              hidden
                              min-w-0
                              px-4
                              py-4

                              md:grid
                              md:grid-cols-[minmax(0,1.5fr)_80px_minmax(130px,0.9fr)_115px_100px_minmax(140px,0.9fr)_145px_24px]
                              md:items-center
                              md:gap-3
                            "
                        >
                          {/* ELECTION */}

                          <div className="min-w-0">
                            <div
                              className="
                                  truncate
                                  text-base
                                  font-bold
                                  text-slate-900
                                  lg:text-lg
                                "
                              title={election.electionName}
                            >
                              {election.electionName}
                            </div>

                            <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs font-medium text-slate-500 lg:text-sm">
                              <span>View details</span>

                              {election.archiveDue && (
                                <>
                                  <span className="text-slate-300">•</span>

                                  <span className="font-bold text-amber-700">
                                    Archive due
                                  </span>
                                </>
                              )}
                            </div>
                          </div>

                          {/* YEAR */}

                          <div className="text-base font-bold text-slate-900 lg:text-lg">
                            {election.year}
                          </div>

                          {/* TYPE */}

                          <div
                            className="
                                min-w-0
                                truncate
                                text-sm
                                font-semibold
                                text-slate-700
                                lg:text-base
                              "
                            title={typeLabel}
                          >
                            {typeLabel}
                          </div>

                          {/* LIFECYCLE */}

                          <div>
                            <LifecycleBadge status={election.accessStatus} />
                          </div>

                          {/* ACTIVE */}

                          <div>
                            <ActiveBadge active={Boolean(election.isActive)} />
                          </div>

                          {/* AVAILABLE */}

                          <div
                            className="
                                min-w-0
                                text-sm
                                font-medium
                                leading-5
                                text-slate-600
                                lg:text-base
                              "
                            title={available ? fmtDate(available) : undefined}
                          >
                            {available ? fmtDateShort(available) : "—"}
                          </div>

                          {/* CREATED */}

                          <div className="text-sm font-medium leading-5 text-slate-600 lg:text-base">
                            {fmtDate(created)}
                          </div>

                          {/* CHEVRON */}

                          <ChevronRight
                            size={20}
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
                </div>
              </>
            )}

          {/* ==============================================================
              PAGINATION
          ============================================================== */}

          <div
            className="
              flex
              min-w-0
              flex-col
              gap-2
              border-t
              border-slate-200
              bg-slate-50/50
              px-3
              py-2.5

              sm:flex-row
              sm:items-center
              sm:justify-between
              sm:px-4
            "
          >
            <div className="text-xs font-semibold text-slate-500 sm:text-sm lg:text-base">
              Page <span className="font-bold text-slate-700">{page + 1}</span>{" "}
              of <span className="font-bold text-slate-700">{totalPages}</span>
              <span className="ml-2 text-slate-400">
                ({totalElements} total)
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page <= 0}
                onClick={() => setPage((current) => Math.max(0, current - 1))}
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
                  lg:text-base
                "
              >
                Previous
              </button>

              <button
                type="button"
                disabled={page >= totalPages - 1}
                onClick={() => setPage((current) => current + 1)}
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
                  lg:text-base
                "
              >
                Next
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

// ============================================================================
// MOBILE METRIC
// ============================================================================

function MobileMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-lg bg-slate-50 px-2.5 py-2">
      <div className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
        {label}
      </div>

      <div
        className="mt-0.5 truncate text-sm font-bold text-slate-900"
        title={value}
      >
        {value}
      </div>
    </div>
  );
}

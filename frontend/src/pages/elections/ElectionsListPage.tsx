// src/pages/elections/ElectionsListPage.tsx

import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import {
  CalendarDays,
  ChevronRight,
  FilterX,
  Plus,
  RefreshCw,
  Search,
  Vote,
} from "lucide-react";

import { useAuthStore } from "../../shared/store/authStore";

import {
  searchElections,
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
// PAGE
// ============================================================================

export default function ElectionsListPage() {
  const navigate = useNavigate();

  const queryClient = useQueryClient();

  // ==========================================================================
  // ACCESS
  // ==========================================================================

  const dashboardMode = useAuthStore((state) => state.dashboardMode);

  const canEdit = dashboardMode === "NEC" || dashboardMode === "SYSTEM";

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

  const [statusFilter, setStatusFilter] = useState<
    "active" | "inactive" | "all"
  >("active");

  const activeBool: boolean | undefined =
    statusFilter === "all" ? undefined : statusFilter === "active";

  // ==========================================================================
  // QUERY
  // ==========================================================================

  const electionsQuery = useQuery({
    queryKey: ["elections", page, q, year, type, statusFilter],

    queryFn: () =>
      searchElections({
        page,
        size,

        q: q.trim() || undefined,

        year: toIntOrUndef(year),

        type: type || undefined,

        active: activeBool,
      }),

    staleTime: 10_000,
    retry: 1,
  });

  const elections = useMemo(
    () => electionsQuery.data?.items ?? [],

    [electionsQuery.data],
  );

  const totalPages = Math.max(1, electionsQuery.data?.totalPages ?? 1);

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

    setStatusFilter("active");

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
          subtitle="Official elections and election workspace management."
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
              {canEdit ? (
                <button
                  type="button"
                  onClick={openCreatePage}
                  className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700 lg:text-base"
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
                className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 lg:text-base"
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
            <div className="grid min-w-0 grid-cols-2 gap-2 lg:grid-cols-[minmax(220px,1.35fr)_120px_minmax(160px,0.8fr)_minmax(250px,1fr)_auto] lg:items-center">
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
                  className="min-h-10 w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 lg:text-base"
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
                className="min-h-10 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 lg:text-base"
              />

              {/* TYPE */}

              <select
                value={type}
                onChange={(event) => {
                  setType(event.target.value as ElectionType | "");

                  setPage(0);
                }}
                className="min-h-10 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 lg:text-base"
              >
                <option value="">All Types</option>

                {ELECTION_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>

              {/* STATUS */}

              <div className="col-span-2 flex min-h-10 min-w-0 items-center gap-1 rounded-lg border border-slate-300 bg-white p-1 sm:col-span-1">
                <button
                  type="button"
                  onClick={() => {
                    setStatusFilter("active");

                    setPage(0);
                  }}
                  className={
                    statusFilter === "active"
                      ? "min-h-8 flex-1 rounded-md bg-emerald-50 px-2 text-xs font-bold text-emerald-700 lg:text-sm"
                      : "min-h-8 flex-1 rounded-md px-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 lg:text-sm"
                  }
                >
                  Active
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setStatusFilter("inactive");

                    setPage(0);
                  }}
                  className={
                    statusFilter === "inactive"
                      ? "min-h-8 flex-1 rounded-md bg-slate-200 px-2 text-xs font-bold text-slate-800 lg:text-sm"
                      : "min-h-8 flex-1 rounded-md px-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 lg:text-sm"
                  }
                >
                  Inactive
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setStatusFilter("all");

                    setPage(0);
                  }}
                  className={
                    statusFilter === "all"
                      ? "min-h-8 flex-1 rounded-md bg-blue-50 px-2 text-xs font-bold text-blue-700 lg:text-sm"
                      : "min-h-8 flex-1 rounded-md px-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 lg:text-sm"
                  }
                >
                  All
                </button>
              </div>

              {/* CLEAR */}

              <button
                type="button"
                onClick={clearFilters}
                className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 lg:text-base"
              >
                <FilterX size={16} />
                Clear
              </button>
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
              {(electionsQuery.error as any)?.message ??
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
                  Try changing your filters.
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

                <div className="hidden border-b border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-slate-500 md:grid md:grid-cols-[minmax(0,1.55fr)_90px_minmax(150px,0.9fr)_100px_110px_110px_165px_24px] md:items-center md:gap-3 lg:text-sm">
                  <div>Election</div>

                  <div>Year</div>

                  <div>Type</div>

                  <div>Spare %</div>

                  <div>Rule</div>

                  <div>Status</div>

                  <div>Date Created</div>

                  <div />
                </div>

                {/* ==========================================================
                    ROWS
                ========================================================== */}

                <div className="divide-y divide-slate-200">
                  {elections.map((election) => {
                    const created =
                      (election as any).dateCreated ??
                      (election as any).createdAt ??
                      (election as any).createdOn ??
                      (election as any).date_created;

                    const spare = (election as any).ballotSparePercent;

                    const enforce = (election as any)
                      .enforceBallotsGteRegistered;

                    const typeLabel = electionTypeLabel(election.electionType);

                    return (
                      <button
                        key={election.electionId}
                        type="button"
                        onClick={() => openElectionDetail(election)}
                        className="group block w-full bg-white text-left transition hover:bg-slate-50"
                      >
                        {/* ==================================================
                              MOBILE
                          ================================================== */}

                        <div className="px-3.5 py-3 md:hidden">
                          {/* LINE 1 */}

                          <div className="flex min-w-0 items-center gap-2">
                            <div
                              className="min-w-0 flex-1 truncate text-base font-bold text-slate-900"
                              title={election.electionName}
                            >
                              {election.electionName}
                            </div>

                            <span
                              className={
                                election.isActive
                                  ? "inline-flex shrink-0 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700"
                                  : "inline-flex shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600"
                              }
                            >
                              {election.isActive ? "Active" : "Inactive"}
                            </span>

                            <ChevronRight
                              size={20}
                              className="shrink-0 text-slate-400 transition group-hover:text-blue-600"
                            />
                          </div>

                          {/* LINE 2 */}

                          <div className="mt-1.5 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-500">
                            <span className="inline-flex items-center gap-1 font-semibold text-slate-700">
                              <CalendarDays size={13} />

                              {election.year}
                            </span>

                            <span className="text-slate-300">•</span>

                            <span>{typeLabel}</span>
                          </div>

                          {/* LINE 3 */}

                          <div className="mt-2 grid grid-cols-3 gap-2">
                            <MobileMetric
                              label="Spare"
                              value={
                                spare == null || spare === ""
                                  ? "—"
                                  : `${Number(spare)}%`
                              }
                            />

                            <MobileMetric
                              label="Rule"
                              value={enforce === false ? "Off" : "Enforced"}
                            />

                            <MobileMetric
                              label="Created"
                              value={
                                created
                                  ? new Date(created).toLocaleDateString()
                                  : "—"
                              }
                            />
                          </div>
                        </div>

                        {/* ==================================================
                              DESKTOP
                          ================================================== */}

                        <div className="hidden min-w-0 px-4 py-4 md:grid md:grid-cols-[minmax(0,1.55fr)_90px_minmax(150px,0.9fr)_100px_110px_110px_165px_24px] md:items-center md:gap-3">
                          {/* ELECTION */}

                          <div className="min-w-0">
                            <div
                              className="truncate text-base font-bold text-slate-900 lg:text-lg"
                              title={election.electionName}
                            >
                              {election.electionName}
                            </div>

                            <div className="mt-1 text-xs font-medium text-slate-500 lg:text-sm">
                              View details
                            </div>
                          </div>

                          {/* YEAR */}

                          <div className="text-base font-bold text-slate-900 lg:text-lg">
                            {election.year}
                          </div>

                          {/* TYPE */}

                          <div
                            className="min-w-0 truncate text-sm font-semibold text-slate-700 lg:text-base"
                            title={typeLabel}
                          >
                            {typeLabel}
                          </div>

                          {/* SPARE */}

                          <div className="text-sm font-bold text-slate-900 lg:text-base">
                            {spare == null || spare === ""
                              ? "—"
                              : `${Number(spare)}%`}
                          </div>

                          {/* RULE */}

                          <div>
                            <span
                              className={
                                enforce === false
                                  ? "inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600 lg:text-sm"
                                  : "inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 lg:text-sm"
                              }
                            >
                              {enforce === false ? "Off" : "Enforced"}
                            </span>
                          </div>

                          {/* STATUS */}

                          <div>
                            <span
                              className={
                                election.isActive
                                  ? "inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 lg:text-sm"
                                  : "inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600 lg:text-sm"
                              }
                            >
                              {election.isActive ? "Active" : "Inactive"}
                            </span>
                          </div>

                          {/* CREATED */}

                          <div className="text-sm font-medium leading-5 text-slate-600 lg:text-base">
                            {fmtDate(created)}
                          </div>

                          {/* CHEVRON */}

                          <ChevronRight
                            size={20}
                            className="text-slate-400 transition group-hover:text-blue-600"
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

          <div className="flex min-w-0 flex-col gap-2 border-t border-slate-200 bg-slate-50/50 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:px-4">
            <div className="text-xs font-semibold text-slate-500 sm:text-sm lg:text-base">
              Page <span className="font-bold text-slate-700">{page + 1}</span>{" "}
              of <span className="font-bold text-slate-700">{totalPages}</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page <= 0}
                onClick={() => setPage((current) => Math.max(0, current - 1))}
                className="min-h-10 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 lg:text-base"
              >
                Previous
              </button>

              <button
                type="button"
                disabled={page >= totalPages - 1}
                onClick={() => setPage((current) => current + 1)}
                className="min-h-10 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 lg:text-base"
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

      <div className="mt-0.5 truncate text-sm font-bold text-slate-900">
        {value}
      </div>
    </div>
  );
}

// src/pages/elections/workspace/tabs/setup/election/ElectionCandidateAssignPage.tsx

import { useMemo, useState } from "react";

import { useNavigate, useParams } from "react-router-dom";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  FilterX,
  RefreshCw,
  Save,
  Search,
  UserRound,
} from "lucide-react";

import { useAuthStore } from "../../../../../../shared/store/authStore";

import {
  createElectionCandidate,
  fetchElectionCandidates,
  type ElectionCandidateDto,
} from "../../../../../../shared/services/electionCandidateService";

import {
  searchCandidates,
  type CandidateDto,
} from "../../../../../../shared/services/candidateService";

// ============================================================================
// HELPERS
// ============================================================================

function friendlyError(error: any) {
  return (
    error?.response?.data?.message ??
    error?.response?.data?.error ??
    error?.message ??
    "Something went wrong."
  );
}

function formatDate(value: string | null | undefined) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function ElectionCandidateAssignPage() {
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
  // FILTER / PAGINATION
  // ==========================================================================

  const [search, setSearch] = useState("");

  const [unassignedOnly, setUnassignedOnly] = useState(false);

  const [page, setPage] = useState(0);

  const [size, setSize] = useState(25);

  // ==========================================================================
  // CANDIDATE MASTER
  // ==========================================================================

  const masterQuery = useQuery({
    enabled: Boolean(electionId),

    queryKey: ["candidates", "election-assignment", page, size],

    queryFn: () =>
      searchCandidates({
        page,
        size,
      }),

    staleTime: 60_000,

    retry: 1,
  });

  const masterCandidates = masterQuery.data?.items ?? [];

  const totalPages = Math.max(1, masterQuery.data?.totalPages ?? 1);

  // ==========================================================================
  // CURRENT ELECTION CANDIDATES
  // ==========================================================================

  const assignedQuery = useQuery({
    enabled: Boolean(electionId),

    queryKey: ["election-candidates", electionId, "assign-page"],

    queryFn: () => fetchElectionCandidates(electionId!),

    staleTime: 10_000,

    retry: 1,
  });

  const assignedCandidates = assignedQuery.data ?? [];

  // ==========================================================================
  // ASSIGNED MAP
  // ==========================================================================

  const assignedByCandidateId = useMemo(() => {
    const map = new Map<string, ElectionCandidateDto>();

    for (const candidate of assignedCandidates) {
      map.set(candidate.candidateId, candidate);
    }

    return map;
  }, [assignedCandidates]);

  // ==========================================================================
  // FILTERED MASTER LIST
  // ==========================================================================

  const visibleCandidates = useMemo(() => {
    const query = search.trim().toLowerCase();

    return masterCandidates.filter((candidate) => {
      const isAssigned = assignedByCandidateId.has(candidate.candidateId);

      if (unassignedOnly && isAssigned) {
        return false;
      }

      if (!query) {
        return true;
      }

      const searchable = [candidate.fullName, candidate.abbreviation]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchable.includes(query);
    });
  }, [masterCandidates, assignedByCandidateId, search, unassignedOnly]);

  // ==========================================================================
  // ASSIGN
  //
  // centerId remains in the backend contract for now, but Election Candidate
  // no longer exposes polling-center assignment in the frontend.
  // ==========================================================================

  const assignMutation = useMutation({
    mutationFn: async (candidate: CandidateDto) => {
      if (!electionId) {
        throw new Error("Missing election ID.");
      }

      return createElectionCandidate({
        electionId,

        candidateId: candidate.candidateId,

        centerId: null,
      });
    },

    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["election-candidates", electionId],
      });

      await assignedQuery.refetch();
    },
  });

  // ==========================================================================
  // REFRESH
  // ==========================================================================

  const refreshNow = async () => {
    await queryClient.invalidateQueries({
      queryKey: ["candidates"],
    });

    await queryClient.invalidateQueries({
      queryKey: ["election-candidates", electionId],
    });

    await Promise.all([masterQuery.refetch(), assignedQuery.refetch()]);
  };

  // ==========================================================================
  // GUARD
  // ==========================================================================

  if (!electionId) {
    return (
      <div className="app-content">
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">
          Missing election ID.
        </div>
      </div>
    );
  }

  // ==========================================================================
  // RENDER
  // ==========================================================================

  return (
    <div className="w-full">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-3">
        {/* ================================================================
            HEADER
        ================================================================ */}

        <section className="rounded-xl border border-slate-200 bg-white px-3 py-3 sm:px-4">
          <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-start gap-2.5">
              <button
                type="button"
                onClick={() =>
                  navigate(`/elections/${electionId}/setup/candidates`)
                }
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-700 transition hover:bg-slate-50"
                aria-label="Back to election candidates"
              >
                <ArrowLeft size={17} />
              </button>

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-lg font-bold text-slate-900 sm:text-xl">
                    Assign Election Candidates
                  </h1>

                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 sm:text-xs">
                    <CheckCircle2 size={12} />
                    {assignedCandidates.length} Assigned
                  </span>
                </div>

                <p className="mt-0.5 text-xs text-slate-500 sm:text-sm">
                  Assign candidates from Candidate Master to this election.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={refreshNow}
              disabled={masterQuery.isFetching || assignedQuery.isFetching}
              className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 sm:text-sm"
            >
              <RefreshCw
                size={15}
                className={
                  masterQuery.isFetching || assignedQuery.isFetching
                    ? "animate-spin"
                    : ""
                }
              />
              Refresh
            </button>
          </div>
        </section>

        {/* ================================================================
            FILTER BAR
        ================================================================ */}

        <section className="rounded-xl border border-slate-200 bg-white p-3">
          <div className="grid grid-cols-1 gap-2 md:grid-cols-[minmax(260px,1fr)_auto_auto] md:items-center">
            {/* SEARCH */}

            <div className="relative">
              <Search
                size={15}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search Candidate Master..."
                className="min-h-9 w-full rounded-lg border border-slate-300 bg-white py-1.5 pl-9 pr-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            {/* UNASSIGNED ONLY */}

            <label className="flex min-h-9 cursor-pointer items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 sm:text-sm">
              <input
                type="checkbox"
                checked={unassignedOnly}
                onChange={(event) => setUnassignedOnly(event.target.checked)}
                className="h-4 w-4 accent-blue-600"
              />
              Unassigned only
            </label>

            {/* CLEAR */}

            <button
              type="button"
              onClick={() => {
                setSearch("");

                setUnassignedOnly(false);

                setPage(0);
              }}
              className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 sm:text-sm"
            >
              <FilterX size={15} />
              Clear
            </button>
          </div>
        </section>

        {/* ================================================================
            LOADING
        ================================================================ */}

        {(masterQuery.isLoading || assignedQuery.isLoading) && (
          <section className="rounded-xl border border-slate-200 bg-white p-5 text-center">
            <RefreshCw
              size={20}
              className="mx-auto animate-spin text-blue-600"
            />

            <div className="mt-2 text-sm font-medium text-slate-500">
              Loading Candidate Master…
            </div>
          </section>
        )}

        {/* ================================================================
            ERROR
        ================================================================ */}

        {(masterQuery.isError || assignedQuery.isError) && (
          <section className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">
            <AlertCircle size={17} className="mt-0.5 shrink-0" />

            {friendlyError(masterQuery.error ?? assignedQuery.error)}
          </section>
        )}

        {/* ================================================================
            ASSIGNMENT LIST
        ================================================================ */}

        {!masterQuery.isLoading &&
          !assignedQuery.isLoading &&
          !masterQuery.isError &&
          !assignedQuery.isError && (
            <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
              {/* ==========================================================
                  DESKTOP HEADER
              ========================================================== */}

              <div className="hidden grid-cols-[minmax(260px,1fr)_160px_190px_110px] items-center gap-4 border-b border-slate-200 bg-slate-50 px-4 py-2 text-[10px] font-bold uppercase tracking-wide text-slate-500 md:grid">
                <div>Candidate</div>

                <div>Party</div>

                <div>Date Assigned</div>

                <div className="text-right">Assignment</div>
              </div>

              {/* ==========================================================
                  EMPTY
              ========================================================== */}

              {visibleCandidates.length === 0 ? (
                <div className="px-4 py-10 text-center">
                  <UserRound size={28} className="mx-auto text-slate-300" />

                  <div className="mt-2 text-sm font-bold text-slate-800">
                    No candidates found
                  </div>

                  <div className="mt-1 text-xs text-slate-500">
                    Try changing the search or assignment filter.
                  </div>
                </div>
              ) : (
                /* ========================================================
                   ROWS
                ======================================================== */

                visibleCandidates.map((candidate) => {
                  const existing = assignedByCandidateId.get(
                    candidate.candidateId,
                  );

                  const saving =
                    assignMutation.isPending &&
                    assignMutation.variables?.candidateId ===
                      candidate.candidateId;

                  return (
                    <div
                      key={candidate.candidateId}
                      className={
                        existing
                          ? "border-b border-slate-100 bg-slate-50/40 px-3 py-2.5 last:border-b-0 sm:px-4"
                          : "border-b border-slate-100 bg-white px-3 py-2.5 last:border-b-0 sm:px-4"
                      }
                    >
                      {/* ==================================================
                            MOBILE
                        ================================================== */}

                      <div className="md:hidden">
                        <div className="flex min-w-0 items-center justify-between gap-3">
                          {/* CANDIDATE */}

                          <div className="min-w-0 flex-1">
                            <div
                              className="truncate text-sm font-bold text-slate-900"
                              title={candidate.fullName ?? ""}
                            >
                              {candidate.fullName ?? "Unnamed Candidate"}
                            </div>

                            {/* PARTY */}

                            {candidate.abbreviation && (
                              <div className="mt-0.5 text-[11px] font-semibold text-slate-500">
                                {candidate.abbreviation}
                              </div>
                            )}

                            {/* DATE ASSIGNED */}

                            {existing && (
                              <div className="mt-1 text-[10px] text-slate-400">
                                <span className="font-bold uppercase tracking-wide">
                                  Assigned{" "}
                                </span>

                                {formatDate(existing.dateCreated)}
                              </div>
                            )}
                          </div>

                          {/* ACTION */}

                          <div className="shrink-0">
                            {existing ? (
                              <AssignedBadge />
                            ) : (
                              <button
                                type="button"
                                disabled={!canEdit || saving}
                                onClick={() => assignMutation.mutate(candidate)}
                                className="inline-flex min-h-8 items-center justify-center gap-1 rounded-md bg-blue-600 px-2.5 text-xs font-bold text-white transition hover:bg-blue-700 disabled:bg-slate-300"
                              >
                                {saving ? (
                                  <RefreshCw
                                    size={13}
                                    className="animate-spin"
                                  />
                                ) : (
                                  <Save size={13} />
                                )}
                                Assign
                              </button>
                            )}
                          </div>
                        </div>

                        {/* ROW ERROR */}

                        {assignMutation.isError &&
                          assignMutation.variables?.candidateId ===
                            candidate.candidateId && (
                            <div className="mt-2 rounded-md border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-semibold text-red-700">
                              {friendlyError(assignMutation.error)}
                            </div>
                          )}
                      </div>

                      {/* ==================================================
                            DESKTOP
                        ================================================== */}

                      <div className="hidden grid-cols-[minmax(260px,1fr)_160px_190px_110px] items-center gap-4 md:grid">
                        {/* CANDIDATE */}

                        <div className="min-w-0">
                          <div
                            className="truncate text-sm font-bold text-slate-900 lg:text-base"
                            title={candidate.fullName ?? ""}
                          >
                            {candidate.fullName ?? "Unnamed Candidate"}
                          </div>
                        </div>

                        {/* PARTY */}

                        <div className="truncate text-sm font-semibold text-slate-600">
                          {candidate.abbreviation ?? "—"}
                        </div>

                        {/* DATE ASSIGNED */}

                        <div className="text-xs font-medium text-slate-600">
                          {existing ? formatDate(existing.dateCreated) : "—"}
                        </div>

                        {/* ASSIGNMENT */}

                        <div className="flex justify-end">
                          {existing ? (
                            <AssignedBadge />
                          ) : (
                            <button
                              type="button"
                              disabled={!canEdit || saving}
                              onClick={() => assignMutation.mutate(candidate)}
                              className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-md bg-blue-600 px-3 text-xs font-bold text-white transition hover:bg-blue-700 disabled:bg-slate-300"
                            >
                              {saving ? (
                                <RefreshCw size={14} className="animate-spin" />
                              ) : (
                                <Save size={16} />
                              )}
                              Assign
                            </button>
                          )}
                        </div>
                      </div>

                      {/* ==================================================
                            DESKTOP ERROR
                        ================================================== */}

                      {assignMutation.isError &&
                        assignMutation.variables?.candidateId ===
                          candidate.candidateId && (
                          <div className="mt-2 hidden rounded-md border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-semibold text-red-700 md:block">
                            {friendlyError(assignMutation.error)}
                          </div>
                        )}
                    </div>
                  );
                })
              )}
            </section>
          )}

        {/* ================================================================
            PAGINATION
        ================================================================ */}

        <section className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-xs font-semibold text-slate-500">
            Page <strong className="text-slate-800">{page + 1}</strong> of{" "}
            <strong className="text-slate-800">{totalPages}</strong>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={size}
              onChange={(event) => {
                setSize(Number(event.target.value));

                setPage(0);
              }}
              className="min-h-9 rounded-lg border border-slate-300 bg-white px-2 text-xs font-semibold text-slate-700"
              aria-label="Page size"
            >
              <option value={10}>10</option>

              <option value={25}>25</option>

              <option value={50}>50</option>

              <option value={100}>100</option>
            </select>

            <button
              type="button"
              disabled={page <= 0}
              onClick={() => setPage((current) => Math.max(0, current - 1))}
              className="min-h-9 rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-40"
            >
              Previous
            </button>

            <button
              type="button"
              disabled={page >= totalPages - 1}
              onClick={() => setPage((current) => current + 1)}
              className="min-h-9 rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

// ============================================================================
// ASSIGNED BADGE
// ============================================================================

function AssignedBadge() {
  return (
    <span className="inline-flex w-fit items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
      <CheckCircle2 size={11} />
      Assigned
    </span>
  );
}

// src/pages/elections/workspace/tabs/setup/election/ElectionCandidatesTab.tsx

import { useMemo, useState } from "react";

import { useNavigate, useParams } from "react-router-dom";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  AlertCircle,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  UserRound,
} from "lucide-react";

import { useAuthStore } from "../../../../../../shared/store/authStore";

import {
  deleteElectionCandidate,
  fetchElectionCandidates,
  type ElectionCandidateDto,
} from "../../../../../../shared/services/electionCandidateService";

import { Badge, ReadOnlyBanner } from "../../../../shared/elections-ui";

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

export default function ElectionCandidatesTab() {
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
  // FILTER
  // ==========================================================================

  const [search, setSearch] = useState("");

  // ==========================================================================
  // QUERY
  // ==========================================================================

  const candidatesQuery = useQuery({
    enabled: Boolean(electionId),

    queryKey: ["election-candidates", electionId],

    queryFn: () => fetchElectionCandidates(electionId!),

    staleTime: 10_000,

    retry: 1,
  });

  const candidates = useMemo(
    () => candidatesQuery.data ?? [],

    [candidatesQuery.data],
  );

  // ==========================================================================
  // FILTERED CANDIDATES
  // ==========================================================================

  const filteredCandidates = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return candidates;
    }

    return candidates.filter((candidate) => {
      const searchable = [candidate.fullName, candidate.partyAbbrev]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchable.includes(query);
    });
  }, [candidates, search]);

  // ==========================================================================
  // REFRESH
  // ==========================================================================

  const refreshNow = async () => {
    if (!electionId) {
      return;
    }

    await queryClient.invalidateQueries({
      queryKey: ["election-candidates", electionId],
    });

    await candidatesQuery.refetch();
  };

  // ==========================================================================
  // DELETE
  // ==========================================================================

  const deleteMutation = useMutation({
    mutationFn: async (candidate: ElectionCandidateDto) => {
      return deleteElectionCandidate(candidate.electId);
    },

    onSuccess: async () => {
      await refreshNow();
    },
  });

  // ==========================================================================
  // REMOVE
  // ==========================================================================

  const removeCandidate = (candidate: ElectionCandidateDto) => {
    if (!canEdit) {
      return;
    }

    const confirmed = window.confirm(
      `Remove "${candidate.fullName ?? "this candidate"}" from this election?\n\nThe Candidate Master record will not be deleted.`,
    );

    if (confirmed) {
      deleteMutation.mutate(candidate);
    }
  };

  // ==========================================================================
  // GUARD
  // ==========================================================================

  if (!electionId) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">
        Missing election ID.
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
            READ ONLY
        ================================================================ */}

        {!canEdit && (
          <ReadOnlyBanner
            reason="Election candidate assignments are managed by NEC/System Admin."
            sources={["election_candidate", "candidate"]}
          />
        )}

        {/* ================================================================
            HEADER
        ================================================================ */}

        <section className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 sm:px-4">
          <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-2">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
                <UserRound size={16} />
              </div>

              <div className="min-w-0">
                <h2 className="text-base font-bold text-slate-900 sm:text-lg">
                  Election Candidates
                </h2>

                <p className="text-xs text-slate-500">
                  Candidates assigned to this election.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {canEdit ? (
                <button
                  type="button"
                  onClick={() =>
                    navigate(`/elections/${electionId}/setup/candidates/assign`)
                  }
                  className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-3 text-xs font-bold text-white transition hover:bg-blue-700 sm:text-sm"
                >
                  <Plus size={15} />
                  Assign Candidates
                </button>
              ) : (
                <Badge text="Read-only" />
              )}

              <button
                type="button"
                onClick={refreshNow}
                disabled={candidatesQuery.isFetching}
                className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 sm:text-sm"
              >
                <RefreshCw
                  size={15}
                  className={candidatesQuery.isFetching ? "animate-spin" : ""}
                />
                Refresh
              </button>
            </div>
          </div>
        </section>

        {/* ================================================================
            SEARCH
        ================================================================ */}

        {candidates.length > 0 && (
          <div className="relative">
            <Search
              size={15}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search assigned candidates..."
              className="min-h-9 w-full rounded-lg border border-slate-300 bg-white py-1.5 pl-9 pr-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>
        )}

        {/* ================================================================
            LOADING
        ================================================================ */}

        {candidatesQuery.isLoading && (
          <div className="rounded-xl border border-slate-200 bg-white p-5 text-center text-sm text-slate-500">
            Loading election candidates…
          </div>
        )}

        {/* ================================================================
            ERROR
        ================================================================ */}

        {candidatesQuery.isError && (
          <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">
            <AlertCircle size={17} className="mt-0.5 shrink-0" />

            {friendlyError(candidatesQuery.error)}
          </div>
        )}

        {/* ================================================================
            EMPTY
        ================================================================ */}

        {!candidatesQuery.isLoading &&
          !candidatesQuery.isError &&
          candidates.length === 0 && (
            <section className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-8 text-center">
              <UserRound size={28} className="mx-auto text-slate-300" />

              <div className="mt-2 text-sm font-bold text-slate-800">
                No candidates assigned
              </div>

              <p className="mt-1 text-xs text-slate-500">
                Assign candidates from Candidate Master.
              </p>

              {canEdit && (
                <button
                  type="button"
                  onClick={() =>
                    navigate(`/elections/${electionId}/setup/candidates/assign`)
                  }
                  className="mt-3 inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-3 text-sm font-bold text-white hover:bg-blue-700"
                >
                  <Plus size={15} />
                  Assign Candidates
                </button>
              )}
            </section>
          )}

        {/* ================================================================
            LIST
        ================================================================ */}

        {!candidatesQuery.isLoading &&
          !candidatesQuery.isError &&
          filteredCandidates.length > 0 && (
            <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
              {/* ==========================================================
                  DESKTOP HEADER
              ========================================================== */}

              <div className="hidden grid-cols-[minmax(240px,1fr)_150px_200px_90px] items-center gap-4 border-b border-slate-200 bg-slate-50 px-4 py-2 text-[10px] font-bold uppercase tracking-wide text-slate-500 md:grid">
                <div>Candidate</div>

                <div>Party</div>

                <div>Date Assigned</div>

                <div className="text-right">Action</div>
              </div>

              {/* ==========================================================
                  ROWS
              ========================================================== */}

              {filteredCandidates.map((candidate) => {
                const deleting =
                  deleteMutation.isPending &&
                  deleteMutation.variables?.electId === candidate.electId;

                return (
                  <div
                    key={candidate.electId}
                    className="border-b border-slate-100 px-3 py-2.5 last:border-b-0 sm:px-4"
                  >
                    {/* ==================================================
                          MOBILE
                      ================================================== */}

                    <div className="md:hidden">
                      <div className="flex min-w-0 items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          {/* CANDIDATE */}

                          <div
                            className="truncate text-sm font-bold text-slate-900"
                            title={candidate.fullName ?? ""}
                          >
                            {candidate.fullName ?? "Unnamed Candidate"}
                          </div>

                          {/* PARTY */}

                          {candidate.partyAbbrev && (
                            <div className="mt-0.5 text-[11px] font-semibold text-slate-500">
                              {candidate.partyAbbrev}
                            </div>
                          )}

                          {/* DATE ASSIGNED */}

                          <div className="mt-1 flex items-center gap-1.5 text-[10px] text-slate-400">
                            <span className="font-bold uppercase tracking-wide">
                              Assigned
                            </span>

                            <span>{formatDate(candidate.dateCreated)}</span>
                          </div>
                        </div>

                        {/* REMOVE */}

                        {canEdit && (
                          <button
                            type="button"
                            onClick={() => removeCandidate(candidate)}
                            disabled={deleting}
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 disabled:opacity-50"
                            aria-label="Remove candidate"
                          >
                            {deleting ? (
                              <RefreshCw size={14} className="animate-spin" />
                            ) : (
                              <Trash2 size={14} />
                            )}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* ==================================================
                          DESKTOP
                      ================================================== */}

                    <div className="hidden grid-cols-[minmax(240px,1fr)_150px_200px_90px] items-center gap-4 md:grid">
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

                      <div className="truncate text-sm font-semibold text-slate-700">
                        {candidate.partyAbbrev ?? "—"}
                      </div>

                      {/* DATE ASSIGNED */}

                      <div className="text-xs font-medium text-slate-600">
                        {formatDate(candidate.dateCreated)}
                      </div>

                      {/* REMOVE */}

                      <div className="flex justify-end">
                        {canEdit && (
                          <button
                            type="button"
                            onClick={() => removeCandidate(candidate)}
                            disabled={deleting}
                            className="inline-flex min-h-8 items-center justify-center gap-1 rounded-md border border-red-200 bg-red-50 px-2.5 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50"
                          >
                            {deleting ? (
                              <RefreshCw size={13} className="animate-spin" />
                            ) : (
                              <Trash2 size={13} />
                            )}
                            Remove
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </section>
          )}

        {/* ================================================================
            SEARCH EMPTY
        ================================================================ */}

        {!candidatesQuery.isLoading &&
          !candidatesQuery.isError &&
          candidates.length > 0 &&
          filteredCandidates.length === 0 && (
            <div className="rounded-xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
              No candidates match your search.
            </div>
          )}

        {/* ================================================================
            SUMMARY
        ================================================================ */}

        {!candidatesQuery.isLoading &&
          !candidatesQuery.isError &&
          candidates.length > 0 && (
            <div className="px-1 text-xs font-medium text-slate-500">
              {candidates.length}{" "}
              {candidates.length === 1 ? "candidate" : "candidates"} assigned to
              this election.
            </div>
          )}
      </div>
    </div>
  );
}

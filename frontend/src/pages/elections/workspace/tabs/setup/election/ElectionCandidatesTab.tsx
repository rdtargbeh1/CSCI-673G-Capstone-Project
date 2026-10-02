import { useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  Filter,
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

import { listContestsByElection } from "../../../../../../shared/services/contestService";

import {
  listOptionsByContest,
  type ContestOptionDto,
} from "../../../../../../shared/services/contestOptionService";

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
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
}

// ============================================================================
// CONTEST OPTION MAP
// ============================================================================

type ContestCandidateOptionMap = Record<string, Set<string>>;

// ============================================================================
// COMPONENT
// ============================================================================

export default function ElectionCandidatesTab() {
  const params = useParams<{
    electionId?: string;
  }>();

  const { pathname } = useLocation();

  const navigate = useNavigate();

  const queryClient = useQueryClient();

  // ==========================================================================
  // OPERATIONS / ADMINISTRATIVE CONTEXT
  // ==========================================================================

  const isOperations =
    pathname === "/operations" || pathname.startsWith("/operations/");

  const selectedElectionId = useAuthStore((state) => state.currentElectionId);

  const orgId = useAuthStore((state) => state.currentOrgId);

  const userId = useAuthStore((state) => state.user?.userId);

  const dashboardMode = useAuthStore((state) => state.dashboardMode);

  const isSystemAdmin = useAuthStore((state) => state.isSystemAdmin());

  const electionId = isOperations ? selectedElectionId : params.electionId;

  const accessKey = [
    isOperations ? "operations" : "administrative",
    orgId,
    userId,
    electionId,
  ];

  const canEdit =
    !isOperations &&
    (dashboardMode === "SYSTEM" || dashboardMode === "NEC" || isSystemAdmin);

  // ==========================================================================
  // FILTER STATE
  // ==========================================================================

  const [search, setSearch] = useState("");

  const [selectedContestId, setSelectedContestId] = useState("");

  // ==========================================================================
  // ELECTION CANDIDATES
  // ==========================================================================

  const candidatesQuery = useQuery({
    enabled: Boolean(electionId),

    queryKey: ["election-candidates", electionId, ...accessKey],

    queryFn: () => fetchElectionCandidates(electionId!),

    staleTime: 10_000,

    retry: 1,
  });

  const candidates = useMemo(
    () => candidatesQuery.data ?? [],
    [candidatesQuery.data],
  );

  // ==========================================================================
  // CONTESTS
  // ==========================================================================

  const contestsQuery = useQuery({
    enabled: Boolean(electionId),

    queryKey: ["contests-by-election", electionId, ...accessKey],

    queryFn: () => listContestsByElection(electionId!),

    staleTime: 30_000,

    retry: 1,
  });

  // ==========================================================================
  // SORT CONTESTS BY NAME
  // ==========================================================================

  const contests = useMemo(() => {
    return [...(contestsQuery.data ?? [])].sort((left, right) =>
      (left.contestName ?? "").localeCompare(
        right.contestName ?? "",
        undefined,
        {
          sensitivity: "base",
        },
      ),
    );
  }, [contestsQuery.data]);

  // ==========================================================================
  // LOAD CONTEST OPTIONS
  // ==========================================================================
  //
  // We need the candidate options for each contest so Election Candidates
  // can be filtered by contest.
  //
  // Structure produced:
  //
  // {
  //   contestId1: Set(["electId1", "electId2"]),
  //   contestId2: Set(["electId3"]),
  // }
  //
  // Only active CANDIDATE options are included.
  //
  // ==========================================================================

  const contestCandidateMapQuery = useQuery<ContestCandidateOptionMap>({
    enabled: Boolean(electionId) && contests.length > 0,

    queryKey: [
      "candidate-contest-option-map",
      electionId,
      contests.map((contest) => contest.contestId).join("|"),
      ...accessKey,
    ],

    queryFn: async () => {
      const entries = await Promise.all(
        contests.map(async (contest) => {
          const options = await listOptionsByContest({
            contestId: contest.contestId,

            onlyActive: true,
          });

          const candidateIds = new Set<string>();

          for (const option of options) {
            if (option.optionType === "CANDIDATE" && option.electId) {
              candidateIds.add(option.electId);
            }
          }

          return [contest.contestId, candidateIds] as const;
        }),
      );

      return Object.fromEntries(entries);
    },

    staleTime: 30_000,

    retry: 1,
  });

  const contestCandidateMap = contestCandidateMapQuery.data ?? {};

  // ==========================================================================
  // SELECTED CONTEST
  // ==========================================================================

  const selectedContest = useMemo(() => {
    if (!selectedContestId) {
      return null;
    }

    return (
      contests.find((contest) => contest.contestId === selectedContestId) ??
      null
    );
  }, [contests, selectedContestId]);

  // ==========================================================================
  // FILTER CANDIDATES
  // ==========================================================================

  const filteredCandidates = useMemo(() => {
    const query = search.trim().toLowerCase();

    return candidates.filter((candidate) => {
      // --------------------------------------------------------------
      // CONTEST FILTER
      // --------------------------------------------------------------

      if (selectedContestId) {
        const allowedCandidateIds = contestCandidateMap[selectedContestId];

        if (!allowedCandidateIds?.has(candidate.electId)) {
          return false;
        }
      }

      // --------------------------------------------------------------
      // TEXT SEARCH
      // --------------------------------------------------------------

      if (!query) {
        return true;
      }

      const searchable = [candidate.fullName, candidate.partyAbbrev]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchable.includes(query);
    });
  }, [candidates, search, selectedContestId, contestCandidateMap]);

  // ==========================================================================
  // REFRESH
  // ==========================================================================

  const refreshNow = async () => {
    if (!electionId) {
      return;
    }

    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: ["election-candidates", electionId],
      }),

      queryClient.invalidateQueries({
        queryKey: ["contests-by-election", electionId],
      }),

      queryClient.invalidateQueries({
        queryKey: ["candidate-contest-option-map", electionId],
      }),
    ]);

    await Promise.all([
      candidatesQuery.refetch(),
      contestsQuery.refetch(),
      contestCandidateMapQuery.refetch(),
    ]);
  };

  // ==========================================================================
  // DELETE CANDIDATE
  // ==========================================================================

  const deleteMutation = useMutation({
    mutationFn: async (candidate: ElectionCandidateDto) => {
      if (!canEdit) {
        throw new Error("Election references are read-only in Operations.");
      }

      return deleteElectionCandidate(candidate.electId);
    },

    onSuccess: async () => {
      await refreshNow();
    },
  });

  // ==========================================================================
  // REMOVE CANDIDATE
  // ==========================================================================

  const removeCandidate = (candidate: ElectionCandidateDto) => {
    if (!canEdit) {
      return;
    }

    const confirmed = window.confirm(
      `Remove "${
        candidate.fullName ?? "this candidate"
      }" from this election?\n\nThe Candidate Master record will not be deleted.`,
    );

    if (confirmed) {
      deleteMutation.mutate(candidate);
    }
  };

  // ==========================================================================
  // MISSING ELECTION
  // ==========================================================================

  if (!electionId) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">
        Select an election to view these records.
      </div>
    );
  }

  // ==========================================================================
  // RENDER
  // ==========================================================================

  return (
    <div className="w-full">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-3">
        {/* ==================================================================
            READ ONLY
        ================================================================== */}

        {!canEdit && (
          <ReadOnlyBanner
            reason="Election candidate assignments are managed by NEC/System Admin."
            sources={["election_candidate", "candidate"]}
          />
        )}

        {/* ==================================================================
            HEADER
        ================================================================== */}

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
                disabled={
                  candidatesQuery.isFetching ||
                  contestsQuery.isFetching ||
                  contestCandidateMapQuery.isFetching
                }
                className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 sm:text-sm"
              >
                <RefreshCw
                  size={15}
                  className={
                    candidatesQuery.isFetching ||
                    contestsQuery.isFetching ||
                    contestCandidateMapQuery.isFetching
                      ? "animate-spin"
                      : ""
                  }
                />
                Refresh
              </button>
            </div>
          </div>
        </section>

        {/* ==================================================================
            FILTERS
        ================================================================== */}

        {candidates.length > 0 && (
          <section className="rounded-xl border border-slate-200 bg-white p-2.5 sm:p-3">
            <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_minmax(220px,320px)]">
              {/* ==========================================================
                  SEARCH
              ========================================================== */}

              <div className="relative">
                <Search
                  size={15}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search assigned candidates..."
                  className="min-h-10 w-full rounded-lg border border-slate-300 bg-white py-1.5 pl-9 pr-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              {/* ==========================================================
                  CONTEST FILTER
              ========================================================== */}

              <div className="relative">
                <Filter
                  size={15}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <select
                  value={selectedContestId}
                  onChange={(event) => setSelectedContestId(event.target.value)}
                  disabled={contestsQuery.isLoading}
                  className="min-h-10 w-full appearance-none rounded-lg border border-slate-300 bg-white py-1.5 pl-9 pr-8 text-sm font-semibold text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50 disabled:text-slate-400"
                >
                  <option value="">All contests</option>

                  {contests.map((contest) => (
                    <option key={contest.contestId} value={contest.contestId}>
                      {contest.contestName}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* ============================================================
                ACTIVE CONTEST FILTER
            ============================================================ */}

            {selectedContest && (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-semibold text-slate-500">
                  Filtering by contest:
                </span>

                <span className="inline-flex min-h-7 items-center rounded-full bg-blue-50 px-2.5 text-[11px] font-bold text-blue-700">
                  {selectedContest.contestName}
                </span>

                <button
                  type="button"
                  onClick={() => setSelectedContestId("")}
                  className="text-[11px] font-bold text-blue-600 hover:text-blue-800"
                >
                  Clear
                </button>
              </div>
            )}
          </section>
        )}

        {/* ==================================================================
            LOADING
        ================================================================== */}

        {candidatesQuery.isLoading && (
          <div className="rounded-xl border border-slate-200 bg-white p-5 text-center text-sm text-slate-500">
            Loading election candidates…
          </div>
        )}

        {/* ==================================================================
            CANDIDATE ERROR
        ================================================================== */}

        {candidatesQuery.isError && (
          <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">
            <AlertCircle size={17} className="mt-0.5 shrink-0" />

            {friendlyError(candidatesQuery.error)}
          </div>
        )}

        {/* ==================================================================
            CONTEST ERROR
        ================================================================== */}

        {!candidatesQuery.isError && contestsQuery.isError && (
          <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-800">
            <AlertCircle size={17} className="mt-0.5 shrink-0" />
            Unable to load contests for candidate filtering:{" "}
            {friendlyError(contestsQuery.error)}
          </div>
        )}

        {/* ==================================================================
            CONTEST OPTION ERROR
        ================================================================== */}

        {!candidatesQuery.isError &&
          !contestsQuery.isError &&
          contestCandidateMapQuery.isError && (
            <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-800">
              <AlertCircle size={17} className="mt-0.5 shrink-0" />
              Unable to load contest candidate assignments:{" "}
              {friendlyError(contestCandidateMapQuery.error)}
            </div>
          )}

        {/* ==================================================================
            NO CANDIDATES
        ================================================================== */}

        {!candidatesQuery.isLoading &&
          !candidatesQuery.isError &&
          candidates.length === 0 && (
            <section className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-8 text-center">
              <UserRound size={28} className="mx-auto text-slate-300" />

              <div className="mt-2 text-sm font-bold text-slate-800">
                No candidates assigned
              </div>

              <p className="mt-1 text-xs text-slate-500">
                {canEdit
                  ? "Assign candidates from Candidate Master."
                  : "No candidates are available for this election."}
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

        {/* ==================================================================
            CANDIDATE LIST
        ================================================================== */}

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
                  CANDIDATES
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
                          <div
                            className="truncate text-sm font-bold text-slate-900"
                            title={candidate.fullName ?? ""}
                          >
                            {candidate.fullName ?? "Unnamed Candidate"}
                          </div>

                          {candidate.partyAbbrev && (
                            <div className="mt-0.5 text-[11px] font-semibold text-slate-500">
                              {candidate.partyAbbrev}
                            </div>
                          )}

                          <div className="mt-1 flex items-center gap-1.5 text-[10px] text-slate-400">
                            <span className="font-bold uppercase tracking-wide">
                              Assigned
                            </span>

                            <span>{formatDate(candidate.dateCreated)}</span>
                          </div>
                        </div>

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
                      <div className="min-w-0">
                        <div
                          className="truncate text-sm font-bold text-slate-900 lg:text-base"
                          title={candidate.fullName ?? ""}
                        >
                          {candidate.fullName ?? "Unnamed Candidate"}
                        </div>
                      </div>

                      <div className="truncate text-sm font-semibold text-slate-700">
                        {candidate.partyAbbrev ?? "—"}
                      </div>

                      <div className="text-xs font-medium text-slate-600">
                        {formatDate(candidate.dateCreated)}
                      </div>

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

        {/* ==================================================================
            NO FILTER RESULTS
        ================================================================== */}

        {!candidatesQuery.isLoading &&
          !candidatesQuery.isError &&
          candidates.length > 0 &&
          filteredCandidates.length === 0 && (
            <div className="rounded-xl border border-slate-200 bg-white p-6 text-center">
              <Search size={24} className="mx-auto text-slate-300" />

              <div className="mt-2 text-sm font-bold text-slate-700">
                No candidates match the current filters.
              </div>

              {selectedContest && (
                <p className="mt-1 text-xs text-slate-500">
                  No election candidates are assigned as active options to{" "}
                  <strong>{selectedContest.contestName}</strong>.
                </p>
              )}

              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setSelectedContestId("");
                }}
                className="mt-3 text-xs font-bold text-blue-600 hover:text-blue-800"
              >
                Clear filters
              </button>
            </div>
          )}

        {/* ==================================================================
            RESULT COUNT
        ================================================================== */}

        {!candidatesQuery.isLoading &&
          !candidatesQuery.isError &&
          candidates.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-xs font-medium text-slate-500">
              <span>
                Showing{" "}
                <strong className="text-slate-700">
                  {filteredCandidates.length}
                </strong>{" "}
                of{" "}
                <strong className="text-slate-700">{candidates.length}</strong>{" "}
                {candidates.length === 1 ? "candidate" : "candidates"}
              </span>

              {selectedContest && (
                <span>
                  Contest:{" "}
                  <strong className="text-slate-700">
                    {selectedContest.contestName}
                  </strong>
                </span>
              )}
            </div>
          )}
      </div>
    </div>
  );
}

// src/pages/elections/workspace/tabs/setup/election/ContestOptionFormPage.tsx

import { useEffect, useMemo, useState } from "react";

import {
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";

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
  createOption,
  listOptionsByContest,
  updateOption,
  type ContestOptionDto,
  type ContestOptionType,
} from "../../../../../../shared/services/contestOptionService";

import {
  fetchElectionCandidates,
  type ElectionCandidateDto,
} from "../../../../../../shared/services/electionCandidateService";

import { listContestsByElection } from "../../../../../../shared/services/contestService";

// ============================================================================
// TYPES
// ============================================================================

type LocationState = {
  option?: ContestOptionDto;
};

// ============================================================================
// HELPERS
// ============================================================================

function safeStr(value: unknown) {
  return typeof value === "string" ? value : value == null ? "" : String(value);
}

function normalizeName(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function boolVal(value: unknown, fallback = false) {
  return value == null ? fallback : Boolean(value);
}

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

export default function ContestOptionFormPage() {
  const { electionId } = useParams<{
    electionId: string;
  }>();

  const location = useLocation();

  const navigate = useNavigate();

  const [searchParams] = useSearchParams();

  const queryClient = useQueryClient();

  const routeState = (location.state as LocationState | null) ?? null;

  const routeOption = routeState?.option ?? null;

  // ==========================================================================
  // ROUTE
  // ==========================================================================

  const routeInfo = useMemo(() => {
    const editMatch = location.pathname.match(
      /\/setup\/contests\/([^/]+)\/options\/([^/]+)\/edit\/?$/,
    );

    if (editMatch?.[1] && editMatch?.[2]) {
      return {
        contestId: decodeURIComponent(editMatch[1]),

        optionId: decodeURIComponent(editMatch[2]),

        isEdit: true,
      };
    }

    const createMatch = location.pathname.match(
      /\/setup\/contests\/([^/]+)\/options\/new\/?$/,
    );

    if (createMatch?.[1]) {
      return {
        contestId: decodeURIComponent(createMatch[1]),

        optionId: null,

        isEdit: false,
      };
    }

    return {
      contestId: null,

      optionId: null,

      isEdit: false,
    };
  }, [location.pathname]);

  const { contestId, optionId, isEdit } = routeInfo;

  // ==========================================================================
  // CREATE MODE
  //
  // /options/new
  //      -> Candidate Assignment
  //
  // /options/new?type=label
  //      -> Create LABEL option
  // ==========================================================================

  const createLabelMode = !isEdit && searchParams.get("type") === "label";

  const assignmentMode = !isEdit && !createLabelMode;

  // ==========================================================================
  // ACCESS
  // ==========================================================================

  const dashboardMode = useAuthStore((state) => state.dashboardMode);

  const isSystemAdmin = useAuthStore((state) => state.isSystemAdmin());

  const canEdit =
    dashboardMode === "NEC" || dashboardMode === "SYSTEM" || isSystemAdmin;

  // ==========================================================================
  // CONTEST
  // ==========================================================================

  const contestsQuery = useQuery({
    enabled: Boolean(electionId),

    queryKey: ["contests-by-election", electionId],

    queryFn: () => listContestsByElection(electionId!),

    staleTime: 30_000,

    retry: 1,
  });

  const contest = useMemo(
    () =>
      contestsQuery.data?.find((item) => item.contestId === contestId) ?? null,

    [contestsQuery.data, contestId],
  );

  // ==========================================================================
  // ALL ELECTION CANDIDATES
  // ==========================================================================

  const candidatesQuery = useQuery({
    enabled: Boolean(electionId),

    queryKey: ["election-candidates", electionId, "contest-assignment"],

    queryFn: () => fetchElectionCandidates(electionId!),

    staleTime: 30_000,

    retry: 1,
  });

  const electionCandidates = useMemo<ElectionCandidateDto[]>(
    () =>
      [...(candidatesQuery.data ?? [])].sort((a, b) =>
        safeStr(a.fullName).localeCompare(
          safeStr(b.fullName),

          undefined,

          {
            sensitivity: "base",
          },
        ),
      ),

    [candidatesQuery.data],
  );

  // ==========================================================================
  // CURRENT CONTEST OPTIONS
  // ==========================================================================

  const optionsQuery = useQuery({
    enabled: Boolean(contestId),

    queryKey: ["contest-options", contestId, false, "assignment-page"],

    queryFn: () =>
      listOptionsByContest({
        contestId: contestId!,

        onlyActive: false,
      }),

    staleTime: 5_000,

    retry: 1,
  });

  const allOptions = useMemo<ContestOptionDto[]>(
    () => optionsQuery.data ?? [],

    [optionsQuery.data],
  );

  // ==========================================================================
  // ACTIVE ASSIGNED MAP
  // ==========================================================================

  const assignedByElectId = useMemo(() => {
    const map = new Map<string, ContestOptionDto>();

    for (const option of allOptions) {
      if (
        option.optionType !== "CANDIDATE" ||
        !option.electId ||
        !boolVal(option.isActive, true)
      ) {
        continue;
      }

      map.set(option.electId, option);
    }

    return map;
  }, [allOptions]);

  const assignedCount = assignedByElectId.size;

  // ==========================================================================
  // ASSIGNMENT FILTER / PAGINATION
  // ==========================================================================

  const [search, setSearch] = useState("");

  const [unassignedOnly, setUnassignedOnly] = useState(false);

  const [page, setPage] = useState(0);

  const [size, setSize] = useState(25);

  // ==========================================================================
  // FILTER ALL ELECTION CANDIDATES
  // ==========================================================================

  const filteredCandidates = useMemo(() => {
    const query = search.trim().toLowerCase();

    return electionCandidates.filter((candidate) => {
      const assigned = assignedByElectId.has(candidate.electId);

      if (unassignedOnly && assigned) {
        return false;
      }

      if (!query) {
        return true;
      }

      const searchable = [
        candidate.fullName,
        candidate.partyAbbrev,
        candidate.centerName,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchable.includes(query);
    });
  }, [electionCandidates, assignedByElectId, search, unassignedOnly]);

  // ==========================================================================
  // PAGE COUNT
  // ==========================================================================

  const totalPages = Math.max(
    1,

    Math.ceil(filteredCandidates.length / size),
  );

  // ==========================================================================
  // KEEP PAGE VALID
  // ==========================================================================

  useEffect(() => {
    if (page > totalPages - 1) {
      setPage(Math.max(0, totalPages - 1));
    }
  }, [page, totalPages]);

  // ==========================================================================
  // CURRENT PAGE
  // ==========================================================================

  const visibleCandidates = useMemo(() => {
    const start = page * size;

    return filteredCandidates.slice(start, start + size);
  }, [filteredCandidates, page, size]);

  // ==========================================================================
  // NEXT STORED OPTION ORDER
  // ==========================================================================

  const nextOptionOrder = useMemo(() => {
    const max = allOptions.reduce(
      (current, option) =>
        Math.max(
          current,

          Number(option.optionOrder ?? 0),
        ),

      0,
    );

    return Math.max(1, max + 1);
  }, [allOptions]);

  // ==========================================================================
  // SINGLE CANDIDATE ASSIGNMENT
  //
  // No bulk endpoint.
  //
  // Each click calls createOption() once.
  // ==========================================================================

  const assignMutation = useMutation({
    mutationFn: async (candidate: ElectionCandidateDto) => {
      if (!contestId) {
        throw new Error("Missing contest ID.");
      }

      return createOption({
        contestId,

        optionType: "CANDIDATE",

        electId: candidate.electId,

        optionLabel: null,

        optionOrder: nextOptionOrder,

        isActive: true,
      });
    },

    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["contest-options", contestId],
      });

      await optionsQuery.refetch();
    },
  });

  // ==========================================================================
  // REFRESH ASSIGNMENT PAGE
  // ==========================================================================

  const refreshAssignment = async () => {
    await queryClient.invalidateQueries({
      queryKey: ["election-candidates", electionId],
    });

    await queryClient.invalidateQueries({
      queryKey: ["contest-options", contestId],
    });

    await Promise.all([candidatesQuery.refetch(), optionsQuery.refetch()]);
  };

  // ==========================================================================
  // EDIT OPTION LOOKUP
  // ==========================================================================

  const optionQuery = useQuery({
    enabled: Boolean(isEdit && contestId && optionId && !routeOption),

    queryKey: ["contest-option", contestId, optionId],

    queryFn: async () => {
      const found = allOptions.find((option) => option.optionId === optionId);

      if (found) {
        return found;
      }

      const options = await listOptionsByContest({
        contestId: contestId!,

        onlyActive: false,
      });

      const loaded = options.find((option) => option.optionId === optionId);

      if (!loaded) {
        throw new Error("Contest option not found.");
      }

      return loaded;
    },

    staleTime: 10_000,

    retry: 1,
  });

  const option = optionQuery.data ?? routeOption ?? null;

  // ==========================================================================
  // LABEL / EDIT FORM STATE
  // ==========================================================================

  const [optionType, setOptionType] = useState<ContestOptionType>("LABEL");

  const [optionLabel, setOptionLabel] = useState("");

  const [optionOrder, setOptionOrder] = useState<number>(1);

  const [electId, setElectId] = useState("");

  const [active, setActive] = useState(true);

  const [touched, setTouched] = useState(false);

  // ==========================================================================
  // DEFAULT LABEL CREATE
  // ==========================================================================

  useEffect(() => {
    if (!createLabelMode) {
      return;
    }

    setOptionType("LABEL");

    setOptionOrder(nextOptionOrder);
  }, [createLabelMode, nextOptionOrder]);

  // ==========================================================================
  // PREFILL EDIT
  // ==========================================================================

  useEffect(() => {
    if (!isEdit || !option) {
      return;
    }

    setOptionType(option.optionType ?? "CANDIDATE");

    setOptionLabel(safeStr(option.optionLabel));

    setOptionOrder(Number(option.optionOrder ?? 1));

    setElectId(safeStr(option.electId));

    setActive(boolVal(option.isActive, true));

    setTouched(false);
  }, [isEdit, option]);

  // ==========================================================================
  // FORM VALIDATION
  // ==========================================================================

  const validCandidate = optionType !== "CANDIDATE" || Boolean(electId.trim());

  const validLabel =
    optionType !== "LABEL" || Boolean(normalizeName(optionLabel));

  const validOrder = Number(optionOrder) >= 1;

  const formValid = validCandidate && validLabel && validOrder;

  // ==========================================================================
  // LABEL CREATE / OPTION UPDATE
  // ==========================================================================

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!contestId) {
        throw new Error("Missing contest ID.");
      }

      if (!formValid) {
        throw new Error("Complete the required contest option information.");
      }

      const payload = {
        optionType,

        optionOrder: Number(optionOrder),

        isActive: active,

        electId: optionType === "CANDIDATE" ? electId.trim() : null,

        optionLabel: optionType === "LABEL" ? normalizeName(optionLabel) : null,
      };

      if (isEdit) {
        if (!optionId) {
          throw new Error("Missing option ID.");
        }

        return updateOption(
          optionId,

          payload,
        );
      }

      return createOption({
        contestId,

        ...payload,
      });
    },

    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["contest-options", contestId],
      });

      goBack();
    },
  });

  const saving = saveMutation.isPending;

  // ==========================================================================
  // NAVIGATION
  // ==========================================================================

  function goBack() {
    if (!electionId || !contestId) {
      return;
    }

    navigate(`/elections/${electionId}/setup/contests/${contestId}/options`);
  }

  // ==========================================================================
  // GUARD
  // ==========================================================================

  if (!electionId || !contestId) {
    return (
      <div className="app-form">
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">
          Missing election or contest ID.
        </div>
      </div>
    );
  }

  // ==========================================================================
  // CANDIDATE ASSIGNMENT CREATE MODE
  // ==========================================================================

  if (assignmentMode) {
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
                  onClick={goBack}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-700 transition hover:bg-slate-50"
                  aria-label="Back to contest options"
                >
                  <ArrowLeft size={17} />
                </button>

                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-lg font-bold text-slate-900 sm:text-xl">
                      Assign Contest Candidates
                    </h1>

                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 sm:text-xs">
                      <CheckCircle2 size={12} />
                      {assignedCount} Assigned
                    </span>
                  </div>

                  <p className="mt-0.5 text-xs text-slate-500 sm:text-sm">
                    {contest
                      ? `Assign election candidates to ${contest.contestName}.`
                      : "Assign election candidates to this contest."}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={refreshAssignment}
                disabled={candidatesQuery.isFetching || optionsQuery.isFetching}
                className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 sm:text-sm"
              >
                <RefreshCw
                  size={15}
                  className={
                    candidatesQuery.isFetching || optionsQuery.isFetching
                      ? "animate-spin"
                      : ""
                  }
                />
                Refresh
              </button>
            </div>
          </section>

          {/* ================================================================
              FILTER
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
                  onChange={(event) => {
                    setSearch(event.target.value);

                    setPage(0);
                  }}
                  placeholder="Search election candidates..."
                  className="min-h-9 w-full rounded-lg border border-slate-300 bg-white py-1.5 pl-9 pr-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              {/* UNASSIGNED */}

              <label className="flex min-h-9 cursor-pointer items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 sm:text-sm">
                <input
                  type="checkbox"
                  checked={unassignedOnly}
                  onChange={(event) => {
                    setUnassignedOnly(event.target.checked);

                    setPage(0);
                  }}
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

          {(candidatesQuery.isLoading || optionsQuery.isLoading) && (
            <section className="rounded-xl border border-slate-200 bg-white p-5 text-center">
              <RefreshCw
                size={20}
                className="mx-auto animate-spin text-blue-600"
              />

              <div className="mt-2 text-sm font-medium text-slate-500">
                Loading election candidates...
              </div>
            </section>
          )}

          {/* ================================================================
              ERROR
          ================================================================ */}

          {(candidatesQuery.isError || optionsQuery.isError) && (
            <section className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">
              <AlertCircle size={17} className="mt-0.5 shrink-0" />

              {friendlyError(candidatesQuery.error ?? optionsQuery.error)}
            </section>
          )}

          {/* ================================================================
              ASSIGNMENT LIST
          ================================================================ */}

          {!candidatesQuery.isLoading &&
            !optionsQuery.isLoading &&
            !candidatesQuery.isError &&
            !optionsQuery.isError && (
              <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                {/* DESKTOP HEADER */}

                <div className="hidden grid-cols-[minmax(260px,1fr)_160px_190px_110px] items-center gap-4 border-b border-slate-200 bg-slate-50 px-4 py-2 text-[10px] font-bold uppercase tracking-wide text-slate-500 md:grid">
                  <div>Candidate</div>

                  <div>Party</div>

                  <div>Date Assigned</div>

                  <div className="text-right">Assignment</div>
                </div>

                {/* EMPTY */}

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
                  visibleCandidates.map((candidate) => {
                    const existing = assignedByElectId.get(candidate.electId);

                    const assigning =
                      assignMutation.isPending &&
                      assignMutation.variables?.electId === candidate.electId;

                    return (
                      <div
                        key={candidate.electId}
                        className={
                          existing
                            ? "border-b border-slate-100 bg-slate-50/40 px-3 py-2.5 last:border-b-0 sm:px-4"
                            : "border-b border-slate-100 bg-white px-3 py-2.5 last:border-b-0 sm:px-4"
                        }
                      >
                        {/* MOBILE */}

                        <div className="md:hidden">
                          <div className="flex min-w-0 items-center justify-between gap-3">
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

                              {existing && (
                                <div className="mt-1 text-[10px] text-slate-400">
                                  <span className="font-bold uppercase tracking-wide">
                                    Assigned{" "}
                                  </span>

                                  {formatDate((existing as any).dateCreated)}
                                </div>
                              )}
                            </div>

                            <div className="shrink-0">
                              {existing ? (
                                <AssignedBadge />
                              ) : (
                                <button
                                  type="button"
                                  disabled={!canEdit || assigning}
                                  onClick={() =>
                                    assignMutation.mutate(candidate)
                                  }
                                  className="inline-flex min-h-8 items-center justify-center gap-1 rounded-md bg-blue-600 px-2.5 text-xs font-bold text-white transition hover:bg-blue-700 disabled:bg-slate-300"
                                >
                                  {assigning ? (
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

                          {assignMutation.isError &&
                            assignMutation.variables?.electId ===
                              candidate.electId && (
                              <div className="mt-2 rounded-md border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-semibold text-red-700">
                                {friendlyError(assignMutation.error)}
                              </div>
                            )}
                        </div>

                        {/* DESKTOP */}

                        <div className="hidden grid-cols-[minmax(260px,1fr)_160px_190px_110px] items-center gap-4 md:grid">
                          <div className="min-w-0">
                            <div
                              className="truncate text-sm font-bold text-slate-900 lg:text-base"
                              title={candidate.fullName ?? ""}
                            >
                              {candidate.fullName ?? "Unnamed Candidate"}
                            </div>
                          </div>

                          <div className="truncate text-sm font-semibold text-slate-600">
                            {candidate.partyAbbrev ?? "—"}
                          </div>

                          <div className="text-xs font-medium text-slate-600">
                            {existing
                              ? formatDate((existing as any).dateCreated)
                              : "—"}
                          </div>

                          <div className="flex justify-end">
                            {existing ? (
                              <AssignedBadge />
                            ) : (
                              <button
                                type="button"
                                disabled={!canEdit || assigning}
                                onClick={() => assignMutation.mutate(candidate)}
                                className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-md bg-blue-600 px-3 text-xs font-bold text-white transition hover:bg-blue-700 disabled:bg-slate-300"
                              >
                                {assigning ? (
                                  <RefreshCw
                                    size={14}
                                    className="animate-spin"
                                  />
                                ) : (
                                  <Save size={14} />
                                )}
                                Assign
                              </button>
                            )}
                          </div>
                        </div>

                        {assignMutation.isError &&
                          assignMutation.variables?.electId ===
                            candidate.electId && (
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
              <span className="ml-2 text-slate-400">
                • {filteredCandidates.length} candidates
              </span>
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

  // ==========================================================================
  // EDIT LOADING
  // ==========================================================================

  if (isEdit && optionQuery.isLoading && !routeOption) {
    return (
      <div className="app-form">
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
          <RefreshCw size={20} className="mx-auto animate-spin text-blue-600" />

          <div className="mt-2">Loading contest option...</div>
        </div>
      </div>
    );
  }

  // ==========================================================================
  // LABEL CREATE / OPTION EDIT FORM
  // ==========================================================================

  return (
    <div className="w-full">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-3">
        {/* HEADER */}

        <section className="rounded-xl border border-slate-200 bg-white px-3 py-3 sm:px-4">
          <div className="flex items-start gap-2.5">
            <button
              type="button"
              disabled={saving}
              onClick={goBack}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-700"
            >
              <ArrowLeft size={17} />
            </button>

            <div className="min-w-0">
              <h1 className="text-lg font-bold text-slate-900 sm:text-xl">
                {isEdit ? "Edit Contest Option" : "Create Label Option"}
              </h1>

              <p className="mt-0.5 text-xs text-slate-500 sm:text-sm">
                {contest
                  ? `Contest: ${contest.contestName}`
                  : "Configure this contest option."}
              </p>
            </div>
          </div>
        </section>

        {/* FORM */}

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="p-3 sm:p-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {/* TYPE */}

              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700">
                  Option Type
                </label>

                <select
                  value={optionType}
                  disabled={createLabelMode}
                  onChange={(event) =>
                    setOptionType(event.target.value as ContestOptionType)
                  }
                  className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm disabled:bg-slate-50"
                >
                  <option value="CANDIDATE">CANDIDATE</option>

                  <option value="LABEL">LABEL</option>
                </select>
              </div>

              {/* ORDER */}

              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700">
                  Option Order
                </label>

                <input
                  type="number"
                  min={1}
                  value={optionOrder}
                  onChange={(event) =>
                    setOptionOrder(Math.max(1, Number(event.target.value || 1)))
                  }
                  className="min-h-11 w-full rounded-xl border border-slate-300 px-3 text-sm"
                />
              </div>

              {/* LABEL */}

              {optionType === "LABEL" && (
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs font-bold text-slate-700">
                    Option Label <span className="text-red-600">*</span>
                  </label>

                  <input
                    value={optionLabel}
                    onChange={(event) => {
                      setOptionLabel(event.target.value);

                      setTouched(true);
                    }}
                    placeholder="e.g., Yes, No, Abstain"
                    className="min-h-11 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />

                  {touched && !validLabel && (
                    <div className="mt-1 text-xs font-semibold text-red-600">
                      Option label is required.
                    </div>
                  )}
                </div>
              )}

              {/* CANDIDATE WHEN EDITING */}

              {isEdit && optionType === "CANDIDATE" && (
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs font-bold text-slate-700">
                    Election Candidate
                  </label>

                  <select
                    value={electId}
                    onChange={(event) => {
                      setElectId(event.target.value);

                      setTouched(true);
                    }}
                    className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm"
                  >
                    <option value="">Select candidate</option>

                    {electionCandidates.map((candidate) => (
                      <option key={candidate.electId} value={candidate.electId}>
                        {candidate.fullName}

                        {candidate.partyAbbrev
                          ? ` (${candidate.partyAbbrev})`
                          : ""}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* ACTIVE */}

              <div className="sm:col-span-2">
                <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border border-slate-300 bg-slate-50 px-3">
                  <input
                    type="checkbox"
                    checked={active}
                    onChange={(event) => setActive(event.target.checked)}
                    className="h-4 w-4 accent-blue-600"
                  />

                  <span className="text-sm font-semibold text-slate-700">
                    Active option
                  </span>
                </label>
              </div>
            </div>
          </div>

          {/* ERROR */}

          {saveMutation.isError && (
            <div className="border-t border-slate-200 p-3">
              <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700">
                <AlertCircle size={15} />

                {friendlyError(saveMutation.error)}
              </div>
            </div>
          )}

          {/* ACTIONS */}

          <div className="flex flex-col-reverse gap-2 border-t border-slate-200 bg-slate-50 p-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={goBack}
              disabled={saving}
              className="min-h-11 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700"
            >
              Cancel
            </button>

            <button
              type="button"
              disabled={!canEdit || !formValid || saving}
              onClick={() => {
                setTouched(true);

                if (canEdit && formValid && !saving) {
                  saveMutation.mutate();
                }
              }}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-bold text-white disabled:bg-slate-300"
            >
              {saving ? (
                <RefreshCw size={15} className="animate-spin" />
              ) : (
                <Save size={15} />
              )}

              {saving
                ? isEdit
                  ? "Updating..."
                  : "Creating..."
                : isEdit
                  ? "Update Option"
                  : "Create Label"}
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

// src/pages/elections/workspace/tabs/setup/election/ContestOptionsPage.tsx

import { useMemo, useState } from "react";

import { useLocation, useNavigate, useParams } from "react-router-dom";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  AlertCircle,
  ArrowLeft,
  Check,
  ChevronRight,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Users,
  X,
} from "lucide-react";

import { useAuthStore } from "../../../../../../shared/store/authStore";

import { Badge, ReadOnlyBanner } from "../../../../shared/elections-ui";

import {
  bulkAssignCandidates,
  deleteOption,
  listOptionsByContest,
  type ContestOptionDto,
} from "../../../../../../shared/services/contestOptionService";

import {
  fetchElectionCandidates,
  type ElectionCandidateDto,
} from "../../../../../../shared/services/electionCandidateService";

import { listContestsByElection } from "../../../../../../shared/services/contestService";

// ============================================================================
// HELPERS
// ============================================================================

function safeStr(value: unknown) {
  return typeof value === "string" ? value : value == null ? "" : String(value);
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

// ============================================================================
// COMPONENT
// ============================================================================

export default function ContestOptionsPage() {
  const { electionId } = useParams<{
    electionId: string;
  }>();

  const location = useLocation();

  const navigate = useNavigate();

  const queryClient = useQueryClient();

  // ==========================================================================
  // CONTEST ID
  //
  // SetupTab owns /setup/* manually, so contestId is read from pathname.
  //
  // /setup/contests/{contestId}/options
  // ==========================================================================

  const contestId = useMemo(() => {
    const match = location.pathname.match(
      /\/setup\/contests\/([^/]+)\/options\/?$/,
    );

    if (!match?.[1]) {
      return null;
    }

    try {
      return decodeURIComponent(match[1]);
    } catch {
      return match[1];
    }
  }, [location.pathname]);

  // ==========================================================================
  // ACCESS
  // ==========================================================================

  const dashboardMode = useAuthStore((state) => state.dashboardMode);

  const isSystemAdmin = useAuthStore((state) => state.isSystemAdmin());

  const canEdit =
    dashboardMode === "NEC" || dashboardMode === "SYSTEM" || isSystemAdmin;

  // ==========================================================================
  // STATE
  // ==========================================================================

  const [search, setSearch] = useState("");

  const [onlyActive, setOnlyActive] = useState(true);

  const [bulkOpen, setBulkOpen] = useState(false);

  const [bulkMode, setBulkMode] = useState<"ALL" | "MANUAL">("MANUAL");

  const [bulkReplace, setBulkReplace] = useState(false);

  const [bulkSearch, setBulkSearch] = useState("");

  const [bulkSelected, setBulkSelected] = useState<string[]>([]);

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
  // ELECTION CANDIDATES
  // ==========================================================================

  const electionCandidatesQuery = useQuery({
    enabled: Boolean(electionId),

    queryKey: ["election-candidates", electionId],

    queryFn: () => fetchElectionCandidates(electionId!),

    staleTime: 30_000,

    retry: 1,
  });

  const electionCandidates = useMemo<ElectionCandidateDto[]>(
    () =>
      [...(electionCandidatesQuery.data ?? [])].sort((a, b) =>
        safeStr(a.fullName).localeCompare(
          safeStr(b.fullName),

          undefined,

          {
            sensitivity: "base",
          },
        ),
      ),

    [electionCandidatesQuery.data],
  );

  // ==========================================================================
  // CANDIDATE LABEL MAP
  // ==========================================================================

  const electIdToLabel = useMemo(() => {
    const map = new Map<string, string>();

    for (const candidate of electionCandidates) {
      const meta = [candidate.partyAbbrev, candidate.centerName]
        .filter(Boolean)
        .join(" · ");

      map.set(
        candidate.electId,

        meta ? `${candidate.fullName} (${meta})` : candidate.fullName,
      );
    }

    return map;
  }, [electionCandidates]);

  // ==========================================================================
  // OPTIONS
  //
  // IMPORTANT:
  // Do NOT sort by optionOrder here.
  //
  // Backend now returns candidate options alphabetically.
  // ==========================================================================

  const optionsQuery = useQuery({
    enabled: Boolean(contestId),

    queryKey: ["contest-options", contestId, onlyActive],

    queryFn: () =>
      listOptionsByContest({
        contestId: contestId!,

        onlyActive,
      }),

    staleTime: 5_000,

    retry: 1,
  });

  const options = useMemo<ContestOptionDto[]>(
    () => optionsQuery.data ?? [],

    [optionsQuery.data],
  );

  // ==========================================================================
  // SEARCH OPTIONS
  // ==========================================================================

  const visibleOptions = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) {
      return options;
    }

    return options.filter((option) => {
      const value =
        option.optionType === "CANDIDATE"
          ? option.electId
            ? (electIdToLabel.get(option.electId) ?? option.electId)
            : ""
          : safeStr(option.optionLabel);

      const searchable = [
        option.optionType,
        value,
        option.optionOrder,
        boolVal(option.isActive, true) ? "active" : "inactive",
      ]
        .join(" ")
        .toLowerCase();

      return searchable.includes(term);
    });
  }, [options, search, electIdToLabel]);

  // ==========================================================================
  // BULK CANDIDATES
  // ==========================================================================

  const bulkCandidates = useMemo(() => {
    const term = bulkSearch.trim().toLowerCase();

    if (!term) {
      return electionCandidates;
    }

    return electionCandidates.filter((candidate) => {
      const searchable = [
        candidate.fullName,
        candidate.partyAbbrev,
        candidate.centerName,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchable.includes(term);
    });
  }, [electionCandidates, bulkSearch]);

  // ==========================================================================
  // REFRESH
  // ==========================================================================

  const refreshNow = async () => {
    if (!contestId) {
      return;
    }

    await queryClient.invalidateQueries({
      queryKey: ["contest-options", contestId],
    });

    await optionsQuery.refetch();
  };

  // ==========================================================================
  // DELETE
  // ==========================================================================

  const deleteMutation = useMutation({
    mutationFn: (option: ContestOptionDto) => deleteOption(option.optionId),

    onSuccess: refreshNow,
  });

  // ==========================================================================
  // BULK ASSIGN
  // ==========================================================================

  const bulkAssignMutation = useMutation({
    mutationFn: async () => {
      if (!contestId) {
        throw new Error("Missing contest ID.");
      }

      let electIds: string[];

      if (bulkMode === "ALL") {
        electIds = bulkCandidates.map((candidate) => candidate.electId);
      } else {
        electIds = bulkSelected;
      }

      electIds = Array.from(new Set(electIds.filter(Boolean)));

      if (electIds.length === 0) {
        throw new Error("No election candidates selected.");
      }

      return bulkAssignCandidates({
        contestId,

        electIds,

        replace: bulkReplace,
      });
    },

    onSuccess: async () => {
      setBulkOpen(false);

      setBulkSelected([]);

      await refreshNow();
    },
  });

  // ==========================================================================
  // NAVIGATION
  // ==========================================================================

  const goBack = () => {
    if (!electionId) {
      return;
    }

    navigate(`/elections/${electionId}/setup/contests`);
  };

  const openCreate = () => {
    if (!electionId || !contestId) {
      return;
    }

    navigate(
      `/elections/${electionId}/setup/contests/${contestId}/options/new`,
    );
  };

  const openEdit = (option: ContestOptionDto) => {
    if (!electionId || !contestId) {
      return;
    }

    navigate(
      `/elections/${electionId}/setup/contests/${contestId}/options/${option.optionId}/edit`,

      {
        state: {
          option,
        },
      },
    );
  };

  const openBulk = () => {
    setBulkMode("MANUAL");

    setBulkReplace(false);

    setBulkSearch("");

    setBulkSelected([]);

    setBulkOpen(true);
  };

  // ==========================================================================
  // GUARD
  // ==========================================================================

  if (!electionId || !contestId) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">
        Missing election or contest ID.
      </div>
    );
  }

  // ==========================================================================
  // RENDER
  // ==========================================================================

  return (
    <div className="flex min-w-0 flex-col gap-3">
      {!canEdit && (
        <ReadOnlyBanner
          reason="Contest options are managed by NEC/System Admin. You can view options read-only."
          sources={["contest_option"]}
        />
      )}

      {/* ====================================================================
          HEADER
      ==================================================================== */}

      <section className="rounded-2xl border border-slate-200 bg-white p-3 sm:p-4">
        <div className="flex items-start gap-3">
          <button
            type="button"
            onClick={goBack}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
          >
            <ArrowLeft size={17} />
          </button>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg font-bold text-slate-900 sm:text-xl">
                Contest Options
              </h1>

              {contest && <Badge text={contest.contestName} />}
            </div>

            <p className="mt-1 text-xs text-slate-500">
              Manage candidates and label options assigned to this contest.
            </p>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2 sm:justify-end">
          <button
            type="button"
            onClick={refreshNow}
            disabled={optionsQuery.isFetching}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 disabled:opacity-50"
          >
            <RefreshCw
              size={14}
              className={optionsQuery.isFetching ? "animate-spin" : ""}
            />
            Refresh
          </button>

          {canEdit && (
            <>
              <button
                type="button"
                onClick={openCreate}
                className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-blue-600 px-3 text-xs font-bold text-white hover:bg-blue-700"
              >
                <Plus size={14} />
                Add Option
              </button>

              <button
                type="button"
                onClick={openBulk}
                className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-violet-600 px-3 text-xs font-bold text-white hover:bg-violet-700"
              >
                <Users size={14} />
                Bulk Assign
              </button>
            </>
          )}
        </div>
      </section>

      {/* ====================================================================
          SEARCH + ACTIVE FILTER
      ==================================================================== */}

      <section className="rounded-2xl border border-slate-200 bg-white p-2.5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative min-w-0 flex-1">
            <Search
              size={15}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search options..."
              className="min-h-9 w-full rounded-lg border border-slate-300 py-1.5 pl-9 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <label className="inline-flex min-h-9 shrink-0 cursor-pointer items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700">
            <input
              type="checkbox"
              checked={onlyActive}
              onChange={(event) => setOnlyActive(event.target.checked)}
              className="h-4 w-4 accent-emerald-600"
            />
            Only active
          </label>
        </div>
      </section>

      {/* ====================================================================
          ERROR
      ==================================================================== */}

      {optionsQuery.isError && (
        <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">
          <AlertCircle size={16} />

          {friendlyError(optionsQuery.error)}
        </div>
      )}

      {/* ====================================================================
          OPTIONS LIST
      ==================================================================== */}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        {/* DESKTOP HEADER */}

        <div className="hidden grid-cols-[70px_110px_minmax(260px,1fr)_110px_130px] gap-3 border-b border-slate-200 bg-slate-50 px-4 py-2 text-[11px] font-bold uppercase tracking-wide text-slate-500 md:grid">
          <div>Order</div>

          <div>Type</div>

          <div>Value</div>

          <div>Status</div>

          <div className="text-right">Actions</div>
        </div>

        {optionsQuery.isLoading ? (
          <div className="px-4 py-10 text-center text-sm text-slate-500">
            <RefreshCw
              size={20}
              className="mx-auto animate-spin text-blue-600"
            />

            <div className="mt-2">Loading options...</div>
          </div>
        ) : visibleOptions.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-slate-500">
            No contest options found.
          </div>
        ) : (
          visibleOptions.map((option) => {
            const active = boolVal(option.isActive, true);

            const value =
              option.optionType === "CANDIDATE"
                ? option.electId
                  ? (electIdToLabel.get(option.electId) ?? option.electId)
                  : "—"
                : (option.optionLabel ?? "—");

            const deleting =
              deleteMutation.isPending &&
              deleteMutation.variables?.optionId === option.optionId;

            return (
              <div
                key={option.optionId}
                className="border-b border-slate-100 px-3 py-2.5 last:border-b-0 hover:bg-slate-50 sm:px-4"
              >
                {/* MOBILE */}

                <div className="flex items-center gap-2 md:hidden">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-bold text-slate-900">
                      {value}
                    </div>

                    <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[10px] text-slate-500">
                      <span className="font-bold text-slate-600">
                        {option.optionType}
                      </span>

                      <span>•</span>

                      <span>Order {option.optionOrder ?? "—"}</span>

                      <span
                        className={
                          active
                            ? "font-bold text-emerald-600"
                            : "font-bold text-slate-400"
                        }
                      >
                        {active ? "Active" : "Inactive"}
                      </span>
                    </div>
                  </div>

                  {canEdit && (
                    <div className="flex shrink-0 gap-1">
                      <button
                        type="button"
                        onClick={() => openEdit(option)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-blue-200 bg-blue-50 text-blue-700"
                      >
                        <Pencil size={14} />
                      </button>

                      <button
                        type="button"
                        disabled={deleting}
                        onClick={() => {
                          const confirmed = window.confirm(
                            `Delete option "${value}"?\n\nThis action is permanent.`,
                          );

                          if (confirmed) {
                            deleteMutation.mutate(option);
                          }
                        }}
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-red-200 bg-red-50 text-red-600 disabled:opacity-50"
                      >
                        {deleting ? (
                          <RefreshCw size={13} className="animate-spin" />
                        ) : (
                          <Trash2 size={14} />
                        )}
                      </button>
                    </div>
                  )}

                  <ChevronRight size={15} className="shrink-0 text-slate-400" />
                </div>

                {/* DESKTOP */}

                <div className="hidden grid-cols-[70px_110px_minmax(260px,1fr)_110px_130px] items-center gap-3 md:grid">
                  <div className="text-xs font-semibold text-slate-600">
                    {option.optionOrder ?? "—"}
                  </div>

                  <div>
                    <span
                      className={[
                        "rounded-full px-2 py-1 text-[10px] font-bold",

                        option.optionType === "CANDIDATE"
                          ? "bg-blue-50 text-blue-700"
                          : "bg-violet-50 text-violet-700",
                      ].join(" ")}
                    >
                      {option.optionType}
                    </span>
                  </div>

                  <div className="truncate text-sm font-semibold text-slate-800">
                    {value}
                  </div>

                  <div>
                    <span
                      className={[
                        "inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-bold",

                        active
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-slate-100 text-slate-500",
                      ].join(" ")}
                    >
                      <span
                        className={[
                          "h-1.5 w-1.5 rounded-full",

                          active ? "bg-emerald-500" : "bg-slate-300",
                        ].join(" ")}
                      />

                      {active ? "ACTIVE" : "INACTIVE"}
                    </span>
                  </div>

                  <div className="flex justify-end gap-1">
                    {canEdit && (
                      <>
                        <button
                          type="button"
                          onClick={() => openEdit(option)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100"
                          title="Edit"
                        >
                          <Pencil size={13} />
                        </button>

                        <button
                          type="button"
                          disabled={deleting}
                          onClick={() => {
                            const confirmed = window.confirm(
                              `Delete option "${value}"?\n\nThis action is permanent.`,
                            );

                            if (confirmed) {
                              deleteMutation.mutate(option);
                            }
                          }}
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 disabled:opacity-50"
                          title="Delete"
                        >
                          {deleting ? (
                            <RefreshCw size={12} className="animate-spin" />
                          ) : (
                            <Trash2 size={13} />
                          )}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </section>

      {/* ====================================================================
          BULK ASSIGN MODAL
      ==================================================================== */}

      {bulkOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 p-3 backdrop-blur-sm"
          onClick={() => {
            if (!bulkAssignMutation.isPending) {
              setBulkOpen(false);
            }
          }}
        >
          <div
            className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            {/* HEADER */}

            <div className="flex items-start gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
                <Users size={17} />
              </div>

              <div className="min-w-0 flex-1">
                <div className="text-base font-bold text-slate-900">
                  Bulk Assign Candidates
                </div>

                <p className="mt-0.5 text-xs text-slate-500">
                  Assign election candidates to this contest.
                </p>
              </div>

              <button
                type="button"
                disabled={bulkAssignMutation.isPending}
                onClick={() => setBulkOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-600"
              >
                <X size={15} />
              </button>
            </div>

            {/* CONTENT */}

            <div className="flex-1 overflow-y-auto p-3 sm:p-4">
              <div className="grid gap-2 sm:grid-cols-2">
                <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 p-3">
                  <input
                    type="radio"
                    checked={bulkMode === "MANUAL"}
                    onChange={() => setBulkMode("MANUAL")}
                    className="h-4 w-4 accent-violet-600"
                  />

                  <span className="text-sm font-semibold text-slate-700">
                    Select manually
                  </span>
                </label>

                <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 p-3">
                  <input
                    type="radio"
                    checked={bulkMode === "ALL"}
                    onChange={() => setBulkMode("ALL")}
                    className="h-4 w-4 accent-violet-600"
                  />

                  <span className="text-sm font-semibold text-slate-700">
                    Assign all filtered
                  </span>
                </label>
              </div>

              <label className="mt-3 flex cursor-pointer items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3">
                <input
                  type="checkbox"
                  checked={bulkReplace}
                  onChange={(event) => setBulkReplace(event.target.checked)}
                  className="mt-0.5 h-4 w-4 accent-amber-600"
                />

                <div>
                  <div className="text-sm font-bold text-amber-900">
                    Replace mode
                  </div>

                  <div className="mt-0.5 text-xs text-amber-700">
                    Candidates not selected will be deactivated from this
                    contest.
                  </div>
                </div>
              </label>

              {/* SEARCH */}

              <div className="relative mt-3">
                <Search
                  size={15}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  value={bulkSearch}
                  onChange={(event) => setBulkSearch(event.target.value)}
                  placeholder="Search candidate / party / center..."
                  className="min-h-10 w-full rounded-xl border border-slate-300 pl-9 pr-3 text-sm outline-none focus:border-violet-500"
                />
              </div>

              {/* CANDIDATES */}

              <div className="mt-3 overflow-hidden rounded-xl border border-slate-200">
                <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-3 py-2">
                  <span className="text-xs font-bold text-slate-600">
                    Candidates:{" "}
                    <strong className="text-slate-900">
                      {bulkCandidates.length}
                    </strong>
                  </span>

                  {bulkMode === "MANUAL" && bulkCandidates.length > 0 && (
                    <button
                      type="button"
                      onClick={() =>
                        setBulkSelected(
                          bulkCandidates.map((candidate) => candidate.electId),
                        )
                      }
                      className="text-xs font-bold text-blue-600"
                    >
                      Select all
                    </button>
                  )}
                </div>

                <div className="max-h-[330px] overflow-y-auto">
                  {bulkCandidates.map((candidate) => {
                    const checked = bulkSelected.includes(candidate.electId);

                    const meta = [candidate.partyAbbrev, candidate.centerName]
                      .filter(Boolean)
                      .join(" · ");

                    return (
                      <label
                        key={candidate.electId}
                        className="flex cursor-pointer items-start gap-3 border-b border-slate-100 px-3 py-2.5 last:border-b-0 hover:bg-slate-50"
                      >
                        <input
                          type="checkbox"
                          disabled={bulkMode === "ALL"}
                          checked={bulkMode === "ALL" ? true : checked}
                          onChange={(event) => {
                            if (bulkMode === "ALL") {
                              return;
                            }

                            if (event.target.checked) {
                              setBulkSelected((current) =>
                                Array.from(
                                  new Set([...current, candidate.electId]),
                                ),
                              );
                            } else {
                              setBulkSelected((current) =>
                                current.filter(
                                  (id) => id !== candidate.electId,
                                ),
                              );
                            }
                          }}
                          className="mt-0.5 h-4 w-4 accent-violet-600"
                        />

                        <div className="min-w-0">
                          <div className="text-sm font-bold text-slate-900">
                            {candidate.fullName}
                          </div>

                          {meta && (
                            <div className="mt-0.5 text-xs text-slate-500">
                              {meta}
                            </div>
                          )}
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {bulkAssignMutation.isError && (
                <div className="mt-3 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700">
                  <AlertCircle size={15} />

                  {friendlyError(bulkAssignMutation.error)}
                </div>
              )}
            </div>

            {/* FOOTER */}

            <div className="flex flex-col-reverse gap-2 border-t border-slate-200 bg-slate-50 p-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                disabled={bulkAssignMutation.isPending}
                onClick={() => setBulkOpen(false)}
                className="min-h-10 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={bulkAssignMutation.isPending}
                onClick={() => bulkAssignMutation.mutate()}
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 text-sm font-bold text-white disabled:bg-slate-300"
              >
                {bulkAssignMutation.isPending ? (
                  <RefreshCw size={14} className="animate-spin" />
                ) : (
                  <Check size={14} />
                )}

                {bulkAssignMutation.isPending
                  ? "Assigning..."
                  : "Assign Candidates"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

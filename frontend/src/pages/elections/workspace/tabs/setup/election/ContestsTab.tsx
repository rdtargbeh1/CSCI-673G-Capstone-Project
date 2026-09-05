// src/pages/elections/workspace/tabs/setup/election/ContestsTab.tsx

import { useMemo } from "react";

import { useNavigate, useParams } from "react-router-dom";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  AlertCircle,
  ChevronRight,
  List,
  Pencil,
  Plus,
  Power,
  RefreshCw,
  Search,
  Trash2,
} from "lucide-react";

import { useAuthStore } from "../../../../../../shared/store/authStore";

import { Badge, ReadOnlyBanner } from "../../../../shared/elections-ui";

import {
  deleteContest,
  listContestsByElection,
  updateContest,
} from "../../../../../../shared/services/contestService";

import type { ContestDto } from "../../../../../../auth/contestTypes";

// ============================================================================
// PROPS
// ============================================================================

type Props = {
  onOpenOptions: (contestId: string) => void;
};

// ============================================================================
// HELPERS
// ============================================================================

function safeStr(value: unknown) {
  return typeof value === "string" ? value : value == null ? "" : String(value);
}

function formatDate(value: unknown) {
  if (!value) {
    return "—";
  }

  const date = new Date(String(value));

  if (Number.isNaN(date.getTime())) {
    return safeStr(value);
  }

  return date.toLocaleString();
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

export default function ContestsTab({ onOpenOptions }: Props) {
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
    dashboardMode === "NEC" || dashboardMode === "SYSTEM" || isSystemAdmin;

  // ==========================================================================
  // QUERY
  // ==========================================================================

  const contestsQuery = useQuery({
    enabled: Boolean(electionId),

    queryKey: ["contests-by-election", electionId],

    queryFn: () => listContestsByElection(electionId!),

    staleTime: 10_000,

    retry: 1,
  });

  const contests = useMemo(
    () => contestsQuery.data ?? [],

    [contestsQuery.data],
  );

  // ==========================================================================
  // SEARCH
  // ==========================================================================

  const [search, setSearch] = React.useState("");

  const filteredContests = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) {
      return contests;
    }

    return contests.filter((contest) => {
      const searchable = [
        contest.contestName,
        contest.category,
        contest.scopeType,
        contest.voteMethod,
        contest.status,
        contest.description,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchable.includes(term);
    });
  }, [contests, search]);

  // ==========================================================================
  // REFRESH
  // ==========================================================================

  const refreshNow = async () => {
    await queryClient.invalidateQueries({
      queryKey: ["contests-by-election", electionId],
    });

    await contestsQuery.refetch();
  };

  // ==========================================================================
  // TOGGLE ACTIVE
  // ==========================================================================

  const toggleActiveMutation = useMutation({
    mutationFn: async (contest: ContestDto) =>
      updateContest(
        contest.contestId,

        {
          isActive: !boolVal(contest.isActive, true),
        },
      ),

    onSuccess: refreshNow,
  });

  // ==========================================================================
  // DELETE
  // ==========================================================================

  const deleteMutation = useMutation({
    mutationFn: (contestId: string) => deleteContest(contestId),

    onSuccess: refreshNow,
  });

  // ==========================================================================
  // NAVIGATION
  // ==========================================================================

  const openCreate = () => {
    if (!electionId) {
      return;
    }

    navigate(`/elections/${electionId}/setup/contests/new`);
  };

  const openEdit = (contest: ContestDto) => {
    if (!electionId) {
      return;
    }

    navigate(
      `/elections/${electionId}/setup/contests/${contest.contestId}/edit`,
    );
  };

  const removeContest = (contest: ContestDto) => {
    if (!canEdit) {
      return;
    }

    const confirmed = window.confirm(
      `Delete contest "${contest.contestName}"?\n\nThis action is permanent.`,
    );

    if (confirmed) {
      deleteMutation.mutate(contest.contestId);
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
    <div className="flex min-w-0 flex-col gap-3">
      {!canEdit && (
        <ReadOnlyBanner
          reason="Election setup is managed by NEC/System Admin. You can view contests read-only."
          sources={["contest"]}
        />
      )}

      {/* ====================================================================
          HEADER
      ==================================================================== */}

      <section className="rounded-2xl border border-slate-200 bg-white p-3 sm:p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-base font-bold text-slate-900 sm:text-lg">
              Contests
            </div>

            <div className="mt-0.5 text-xs text-slate-500">
              Manage election contests, scope and ballot rules.
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {canEdit ? (
              <button
                type="button"
                onClick={openCreate}
                className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-3 text-xs font-bold text-white hover:bg-blue-700"
              >
                <Plus size={15} />
                Create Contest
              </button>
            ) : (
              <Badge text="Read-only" />
            )}

            <button
              type="button"
              onClick={refreshNow}
              disabled={contestsQuery.isFetching}
              className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 disabled:opacity-50"
            >
              <RefreshCw
                size={15}
                className={contestsQuery.isFetching ? "animate-spin" : ""}
              />
              Refresh
            </button>
          </div>
        </div>
      </section>

      {/* ====================================================================
          SEARCH
      ==================================================================== */}

      <section className="rounded-2xl border border-slate-200 bg-white p-2.5">
        <div className="flex gap-2">
          <div className="relative min-w-0 flex-1">
            <Search
              size={15}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search contests..."
              className="min-h-9 w-full rounded-lg border border-slate-300 py-1.5 pl-9 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="min-h-9 shrink-0 rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700"
            >
              Clear
            </button>
          )}
        </div>
      </section>

      {/* ====================================================================
          ERROR
      ==================================================================== */}

      {contestsQuery.isError && (
        <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">
          <AlertCircle size={17} />

          {friendlyError(contestsQuery.error)}
        </div>
      )}

      {/* ====================================================================
          LIST
      ==================================================================== */}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        {/* DESKTOP HEADER */}

        <div className="hidden grid-cols-[minmax(190px,1.3fr)_120px_90px_90px_110px_100px_135px] gap-3 border-b border-slate-200 bg-slate-50 px-4 py-2 text-[10px] font-bold uppercase tracking-wide text-slate-500 md:grid">
          <div>Contest</div>

          <div>Vote</div>

          <div>Seats</div>

          <div>Max</div>

          <div>Status</div>

          <div>Active</div>

          <div className="text-right">Actions</div>
        </div>

        {/* LOADING */}

        {contestsQuery.isLoading ? (
          <div className="px-4 py-10 text-center text-sm text-slate-500">
            <RefreshCw
              size={20}
              className="mx-auto animate-spin text-blue-600"
            />

            <div className="mt-2">Loading contests...</div>
          </div>
        ) : filteredContests.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-slate-500">
            No contests found.
          </div>
        ) : (
          filteredContests.map((contest) => {
            const active = boolVal(contest.isActive, true);

            const toggling =
              toggleActiveMutation.isPending &&
              toggleActiveMutation.variables?.contestId === contest.contestId;

            const deleting =
              deleteMutation.isPending &&
              deleteMutation.variables === contest.contestId;

            return (
              <div
                key={contest.contestId}
                className="border-b border-slate-100 px-3 py-2.5 last:border-b-0 hover:bg-slate-50 sm:px-4"
              >
                {/* ========================================================
                      MOBILE
                  ======================================================== */}

                <div className="flex items-center gap-2 md:hidden">
                  <button
                    type="button"
                    onClick={() => onOpenOptions(contest.contestId)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <div className="truncate text-sm font-bold text-slate-900">
                      {contest.contestName}
                    </div>

                    <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-slate-500">
                      <span className="font-semibold text-slate-600">
                        {contest.category}
                      </span>

                      <span>•</span>

                      <span>{contest.scopeType}</span>

                      <span>•</span>

                      <span>{contest.voteMethod}</span>

                      <span
                        className={
                          active
                            ? "font-semibold text-emerald-600"
                            : "font-semibold text-slate-400"
                        }
                      >
                        {active ? "Active" : "Inactive"}
                      </span>
                    </div>
                  </button>

                  {/* MOBILE ACTIONS */}

                  <div className="flex shrink-0 gap-1">
                    <button
                      type="button"
                      onClick={() => onOpenOptions(contest.contestId)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600"
                      aria-label="Contest options"
                    >
                      <List size={14} />
                    </button>

                    {canEdit && (
                      <>
                        <button
                          type="button"
                          onClick={() => openEdit(contest)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-blue-200 bg-blue-50 text-blue-700"
                          aria-label="Edit contest"
                        >
                          <Pencil size={14} />
                        </button>

                        <button
                          type="button"
                          disabled={toggling}
                          onClick={() => toggleActiveMutation.mutate(contest)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-amber-200 bg-amber-50 text-amber-700 disabled:opacity-50"
                          aria-label={
                            active ? "Deactivate contest" : "Activate contest"
                          }
                        >
                          {toggling ? (
                            <RefreshCw size={13} className="animate-spin" />
                          ) : (
                            <Power size={14} />
                          )}
                        </button>

                        <button
                          type="button"
                          disabled={deleting}
                          onClick={() => removeContest(contest)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-red-200 bg-red-50 text-red-600 disabled:opacity-50"
                          aria-label="Delete contest"
                        >
                          {deleting ? (
                            <RefreshCw size={13} className="animate-spin" />
                          ) : (
                            <Trash2 size={14} />
                          )}
                        </button>
                      </>
                    )}
                  </div>

                  <ChevronRight size={16} className="shrink-0 text-slate-400" />
                </div>

                {/* ========================================================
                      DESKTOP
                  ======================================================== */}

                <div className="hidden grid-cols-[minmax(190px,1.3fr)_120px_90px_90px_110px_100px_135px] items-center gap-3 md:grid">
                  <button
                    type="button"
                    onClick={() => onOpenOptions(contest.contestId)}
                    className="min-w-0 text-left"
                  >
                    <div className="truncate text-sm font-bold text-slate-900">
                      {contest.contestName}
                    </div>

                    <div className="mt-0.5 truncate text-[10px] text-slate-500">
                      {contest.category} • {contest.scopeType} •{" "}
                      {formatDate((contest as any).dateCreated)}
                    </div>
                  </button>

                  <div className="truncate text-xs text-slate-700">
                    {contest.voteMethod}
                  </div>

                  <div className="text-xs font-semibold text-slate-700">
                    {contest.seats}
                  </div>

                  <div className="text-xs font-semibold text-slate-700">
                    {contest.maxSelections}
                  </div>

                  <div className="text-xs font-semibold text-slate-700">
                    {contest.status}
                  </div>

                  <div>
                    <span
                      className={[
                        `
                            inline-flex
                            items-center
                            gap-1.5
                            rounded-full
                            px-2
                            py-1
                            text-[10px]
                            font-bold
                          `,

                        active
                          ? `
                                bg-emerald-50
                                text-emerald-700
                              `
                          : `
                                bg-slate-100
                                text-slate-500
                              `,
                      ].join(" ")}
                    >
                      <span
                        className={[
                          "h-2 w-2 rounded-full",

                          active ? "bg-emerald-500" : "bg-slate-300",
                        ].join(" ")}
                      />

                      {active ? "ACTIVE" : "INACTIVE"}
                    </span>
                  </div>

                  <div className="flex justify-end gap-1">
                    <button
                      type="button"
                      onClick={() => onOpenOptions(contest.contestId)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600"
                      title="Options"
                    >
                      <List size={13} />
                    </button>

                    {canEdit && (
                      <>
                        <button
                          type="button"
                          onClick={() => openEdit(contest)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-blue-200 bg-blue-50 text-blue-700"
                          title="Edit"
                        >
                          <Pencil size={13} />
                        </button>

                        <button
                          type="button"
                          disabled={toggling}
                          onClick={() => toggleActiveMutation.mutate(contest)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-amber-200 bg-amber-50 text-amber-700 disabled:opacity-50"
                          title={active ? "Deactivate" : "Activate"}
                        >
                          <Power size={13} />
                        </button>

                        <button
                          type="button"
                          disabled={deleting}
                          onClick={() => removeContest(contest)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-red-200 bg-red-50 text-red-600 disabled:opacity-50"
                          title="Delete"
                        >
                          <Trash2 size={13} />
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
    </div>
  );
}

// ============================================================================
// REACT IMPORT FOR LOCAL STATE
// ============================================================================

import React from "react";

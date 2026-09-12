// src/pages/elections/workspace/tabs/setup/election/ElectionPartyAssignPage.tsx

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
  Users,
} from "lucide-react";

import { useAuthStore } from "../../../../../../shared/store/authStore";

import {
  addPartyToElection,
  fetchElectionParties,
  type ElectionPartyDto,
} from "../../../../../../shared/services/electionPartyService";

import {
  searchParties,
  type PartyDto,
} from "../../../../../../shared/services/partyService";

// ============================================================================
// TYPES
// ============================================================================

type DraftState = {
  ballotOrder: number | "";

  qualified: boolean;
};

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

// ============================================================================
// PAGE
// ============================================================================

export default function ElectionPartyAssignPage() {
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
  // STATE
  // ==========================================================================

  const [search, setSearch] = useState("");

  const [unassignedOnly, setUnassignedOnly] = useState(false);

  const [page, setPage] = useState(0);

  const [size, setSize] = useState(25);

  const [drafts, setDrafts] = useState<Record<string, DraftState>>({});

  // ==========================================================================
  // PARTY MASTER
  // ==========================================================================

  const partyMasterQuery = useQuery({
    enabled: Boolean(electionId),

    queryKey: ["parties", "election-assignment", page, size],

    queryFn: () =>
      searchParties({
        page,
        size,
      }),

    staleTime: 60_000,

    retry: 1,
  });

  const masterParties = partyMasterQuery.data?.items ?? [];

  const totalPages = Math.max(1, partyMasterQuery.data?.totalPages ?? 1);

  // ==========================================================================
  // CURRENT ELECTION ASSIGNMENTS
  // ==========================================================================

  const assignedQuery = useQuery({
    enabled: Boolean(electionId),

    queryKey: ["election-parties", electionId, "assign-page"],

    queryFn: () => fetchElectionParties(electionId!),

    staleTime: 10_000,

    retry: 1,
  });

  const assigned = assignedQuery.data ?? [];

  // ==========================================================================
  // ASSIGNED MAP
  // ==========================================================================

  const assignedByPartyId = useMemo(() => {
    const map = new Map<string, ElectionPartyDto>();

    for (const item of assigned) {
      map.set(item.partyId, item);
    }

    return map;
  }, [assigned]);

  // ==========================================================================
  // VISIBLE PARTIES
  // ==========================================================================

  const visibleParties = useMemo(() => {
    const query = search.trim().toLowerCase();

    return masterParties.filter((party) => {
      const isAssigned = assignedByPartyId.has(party.partyId);

      if (unassignedOnly && isAssigned) {
        return false;
      }

      if (!query) {
        return true;
      }

      const searchable = [party.partyName]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchable.includes(query);
    });
  }, [masterParties, assignedByPartyId, search, unassignedOnly]);

  // ==========================================================================
  // SUMMARY COUNTS
  // ==========================================================================

  const assignedCount = assigned.length;

  const visibleUnassignedCount = visibleParties.filter(
    (party) => !assignedByPartyId.has(party.partyId),
  ).length;

  // ==========================================================================
  // DRAFT HELPERS
  // ==========================================================================

  const getDraft = (partyId: string): DraftState => {
    return (
      drafts[partyId] ?? {
        ballotOrder: "",

        qualified: true,
      }
    );
  };

  const updateDraft = (
    partyId: string,

    update: Partial<DraftState>,
  ) => {
    setDrafts((current) => ({
      ...current,

      [partyId]: {
        ballotOrder: current[partyId]?.ballotOrder ?? "",

        qualified: current[partyId]?.qualified ?? true,

        ...update,
      },
    }));
  };

  // ==========================================================================
  // ASSIGN MUTATION
  // ==========================================================================

  const assignMutation = useMutation({
    mutationFn: async (party: PartyDto) => {
      if (!electionId) {
        throw new Error("Missing election ID.");
      }

      const draft = getDraft(party.partyId);

      return addPartyToElection(electionId, {
        electionId,

        partyId: party.partyId,

        ballotOrder:
          draft.ballotOrder === "" ? undefined : Number(draft.ballotOrder),

        isQualified: draft.qualified,
      });
    },

    onSuccess: async (_, party) => {
      setDrafts((current) => {
        const next = {
          ...current,
        };

        delete next[party.partyId];

        return next;
      });

      await queryClient.invalidateQueries({
        queryKey: ["election-parties", electionId],
      });

      await assignedQuery.refetch();
    },
  });

  // ==========================================================================
  // REFRESH
  // ==========================================================================

  const refreshNow = async () => {
    await queryClient.invalidateQueries({
      queryKey: ["parties"],
    });

    await queryClient.invalidateQueries({
      queryKey: ["election-parties", electionId],
    });

    await Promise.all([partyMasterQuery.refetch(), assignedQuery.refetch()]);
  };

  // ==========================================================================
  // GUARD
  // ==========================================================================

  if (!electionId) {
    return (
      <div className="app-content">
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
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
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-3">
        {/* ================================================================
            HEADER
        ================================================================ */}

        <section className="rounded-xl border border-slate-200 bg-white px-3 py-3 sm:px-4">
          <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-start gap-2.5">
              <button
                type="button"
                onClick={() =>
                  navigate(`/elections/${electionId}/setup/parties`)
                }
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-700 transition hover:bg-slate-50"
                aria-label="Back to election parties"
              >
                <ArrowLeft size={18} />
              </button>

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">
                    Assign Election Parties
                  </h1>

                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
                    <CheckCircle2 size={13} />
                    {assignedCount} Assigned
                  </span>
                </div>

                <p className="mt-0.5 text-sm text-slate-500">
                  Assign parties from the global Party Master to this election.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={refreshNow}
              disabled={partyMasterQuery.isFetching || assignedQuery.isFetching}
              className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
            >
              <RefreshCw
                size={16}
                className={
                  partyMasterQuery.isFetching || assignedQuery.isFetching
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
                size={16}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search Party Master..."
                className="min-h-10 w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            {/* UNASSIGNED ONLY */}

            <label className="flex min-h-10 cursor-pointer items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">
              <input
                type="checkbox"
                checked={unassignedOnly}
                onChange={(event) => setUnassignedOnly(event.target.checked)}
                className="h-4 w-4 accent-blue-600"
              />
              Unassigned only
              {unassignedOnly && (
                <span className="rounded-full bg-blue-50 px-1.5 py-0.5 text-[10px] font-bold text-blue-700">
                  {visibleUnassignedCount}
                </span>
              )}
            </label>

            {/* CLEAR */}

            <button
              type="button"
              onClick={() => {
                setSearch("");

                setUnassignedOnly(false);

                setPage(0);
              }}
              className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <FilterX size={16} />
              Clear
            </button>
          </div>
        </section>

        {/* ================================================================
            LOADING
        ================================================================ */}

        {(partyMasterQuery.isLoading || assignedQuery.isLoading) && (
          <section className="rounded-xl border border-slate-200 bg-white p-6 text-center">
            <RefreshCw
              size={22}
              className="mx-auto animate-spin text-blue-600"
            />

            <div className="mt-2 text-sm font-medium text-slate-500">
              Loading Party Master…
            </div>
          </section>
        )}

        {/* ================================================================
            ERROR
        ================================================================ */}

        {(partyMasterQuery.isError || assignedQuery.isError) && (
          <section className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">
            <AlertCircle size={18} className="mt-0.5 shrink-0" />

            <div>
              {friendlyError(partyMasterQuery.error ?? assignedQuery.error)}
            </div>
          </section>
        )}

        {/* ================================================================
            PARTY ASSIGNMENT LIST
        ================================================================ */}

        {!partyMasterQuery.isLoading &&
          !assignedQuery.isLoading &&
          !partyMasterQuery.isError &&
          !assignedQuery.isError && (
            <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
              {/* ==========================================================
                  DESKTOP HEADER
              ========================================================== */}

              <div className="hidden grid-cols-[minmax(240px,1fr)_130px_210px_120px] items-center gap-3 border-b border-slate-200 bg-slate-50 px-4 py-2.5 text-[11px] font-bold uppercase tracking-wide text-slate-500 md:grid">
                <div>Party</div>

                <div>Ballot Order</div>

                <div>Qualification</div>

                <div className="text-right">Assignment</div>
              </div>

              {/* ==========================================================
                  EMPTY
              ========================================================== */}

              {visibleParties.length === 0 ? (
                <div className="px-4 py-10 text-center">
                  <Users size={30} className="mx-auto text-slate-300" />

                  <div className="mt-2 text-base font-bold text-slate-800">
                    No parties found
                  </div>

                  <div className="mt-1 text-sm text-slate-500">
                    Try changing the search or assignment filter.
                  </div>
                </div>
              ) : (
                /* ========================================================
                   ROWS
                ======================================================== */

                visibleParties.map((party) => {
                  const existing = assignedByPartyId.get(party.partyId);

                  const draft = getDraft(party.partyId);

                  const saving =
                    assignMutation.isPending &&
                    assignMutation.variables?.partyId === party.partyId;

                  return (
                    <div
                      key={party.partyId}
                      className={
                        existing
                          ? "border-b border-slate-100 bg-slate-50/40 px-3 py-3 last:border-b-0 sm:px-4"
                          : "border-b border-slate-100 bg-white px-3 py-3 last:border-b-0 sm:px-4"
                      }
                    >
                      {/* ==================================================
                            MOBILE
                        ================================================== */}

                      <div className="md:hidden">
                        {/* PARTY HEADER */}

                        <div className="flex min-w-0 items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-base font-bold text-slate-900">
                              {party.partyName ?? "Unnamed Party"}
                            </div>
                          </div>

                          {existing && <AssignedBadge />}
                        </div>

                        {/* ASSIGNED MOBILE */}

                        {existing ? (
                          <div className="mt-2 grid grid-cols-2 gap-2 rounded-lg border border-slate-200 bg-white p-2.5">
                            <ReadOnlyValue
                              label="Ballot Order"
                              value={existing.ballotOrder ?? "—"}
                            />

                            <ReadOnlyValue
                              label="Qualification"
                              value={
                                existing.isQualified
                                  ? "Qualified"
                                  : "Not Qualified"
                              }
                              positive={Boolean(existing.isQualified)}
                            />
                          </div>
                        ) : (
                          /* ==============================================
                               AVAILABLE MOBILE
                            ============================================== */

                          <div className="mt-3">
                            <div className="grid grid-cols-2 gap-2">
                              {/* BALLOT ORDER */}

                              <div>
                                <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-400">
                                  Ballot Order
                                </label>

                                <input
                                  type="number"
                                  min={1}
                                  placeholder="Order"
                                  value={draft.ballotOrder}
                                  onChange={(event) =>
                                    updateDraft(party.partyId, {
                                      ballotOrder:
                                        event.target.value === ""
                                          ? ""
                                          : Number(event.target.value),
                                    })
                                  }
                                  className="min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                                />
                              </div>

                              {/* QUALIFICATION */}

                              <div>
                                <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-400">
                                  Qualification
                                </label>

                                <select
                                  value={
                                    draft.qualified
                                      ? "qualified"
                                      : "not-qualified"
                                  }
                                  onChange={(event) =>
                                    updateDraft(party.partyId, {
                                      qualified:
                                        event.target.value === "qualified",
                                    })
                                  }
                                  className="min-h-11 w-full rounded-lg border border-slate-300 bg-white px-2 text-sm font-semibold text-slate-900 outline-none focus:border-blue-500"
                                >
                                  <option value="qualified">Qualified</option>

                                  <option value="not-qualified">
                                    Not Qualified
                                  </option>
                                </select>
                              </div>
                            </div>

                            {/* SAVE */}

                            <button
                              type="button"
                              disabled={!canEdit || saving}
                              onClick={() => assignMutation.mutate(party)}
                              className="mt-2 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 text-sm font-bold text-white transition hover:bg-blue-700 disabled:bg-slate-300"
                            >
                              {saving ? (
                                <>
                                  <RefreshCw
                                    size={15}
                                    className="animate-spin"
                                  />
                                  Assigning…
                                </>
                              ) : (
                                <>
                                  <Save size={15} />
                                  Assign Party
                                </>
                              )}
                            </button>
                          </div>
                        )}
                      </div>

                      {/* ==================================================
                            DESKTOP
                        ================================================== */}

                      <div className="hidden grid-cols-[minmax(240px,1fr)_130px_210px_120px] items-center gap-3 md:grid">
                        {/* PARTY */}

                        <div className="min-w-0">
                          <div
                            className="truncate text-base font-bold text-slate-900"
                            title={party.partyName ?? ""}
                          >
                            {party.partyName ?? "Unnamed Party"}
                          </div>

                          {!existing && (
                            <div className="mt-0.5 text-[11px] font-medium text-blue-600">
                              Available to assign
                            </div>
                          )}
                        </div>

                        {/* ==================================================
                              ASSIGNED
                          ================================================== */}

                        {existing ? (
                          <>
                            {/* BALLOT ORDER */}

                            <div className="text-sm font-bold text-slate-900">
                              {existing.ballotOrder ?? "—"}
                            </div>

                            {/* QUALIFICATION */}

                            <QualificationBadge
                              qualified={Boolean(existing.isQualified)}
                            />

                            {/* ASSIGNED */}

                            <div className="flex justify-end">
                              <AssignedBadge />
                            </div>
                          </>
                        ) : (
                          /* ==============================================
                               AVAILABLE
                            ============================================== */

                          <>
                            {/* BALLOT ORDER */}

                            <input
                              type="number"
                              min={1}
                              placeholder="Order"
                              value={draft.ballotOrder}
                              onChange={(event) =>
                                updateDraft(party.partyId, {
                                  ballotOrder:
                                    event.target.value === ""
                                      ? ""
                                      : Number(event.target.value),
                                })
                              }
                              className="min-h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                            />

                            {/* QUALIFICATION */}

                            <div className="grid grid-cols-2 gap-1.5">
                              <button
                                type="button"
                                onClick={() =>
                                  updateDraft(party.partyId, {
                                    qualified: true,
                                  })
                                }
                                className={
                                  draft.qualified
                                    ? "min-h-10 rounded-lg border border-emerald-300 bg-emerald-50 px-2 text-xs font-bold text-emerald-700"
                                    : "min-h-10 rounded-lg border border-slate-300 bg-white px-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                                }
                              >
                                Qualified
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  updateDraft(party.partyId, {
                                    qualified: false,
                                  })
                                }
                                className={
                                  !draft.qualified
                                    ? "min-h-10 rounded-lg border border-slate-400 bg-slate-100 px-2 text-xs font-bold text-slate-700"
                                    : "min-h-10 rounded-lg border border-slate-300 bg-white px-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                                }
                              >
                                Not
                              </button>
                            </div>

                            {/* SAVE */}

                            <button
                              type="button"
                              disabled={!canEdit || saving}
                              onClick={() => assignMutation.mutate(party)}
                              className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-3 text-sm font-bold text-white transition hover:bg-blue-700 disabled:bg-slate-300"
                            >
                              {saving ? (
                                <RefreshCw size={15} className="animate-spin" />
                              ) : (
                                <Save size={15} />
                              )}
                              Save
                            </button>
                          </>
                        )}
                      </div>

                      {/* ==================================================
                            ROW ERROR
                        ================================================== */}

                      {assignMutation.isError &&
                        assignMutation.variables?.partyId === party.partyId && (
                          <div className="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
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
          <div className="text-xs font-semibold text-slate-500 sm:text-sm">
            Page <strong className="text-slate-800">{page + 1}</strong> of{" "}
            <strong className="text-slate-800">{totalPages}</strong>
          </div>

          <div className="flex items-center gap-2">
            {/* PAGE SIZE */}

            <select
              value={size}
              onChange={(event) => {
                setSize(Number(event.target.value));

                setPage(0);
              }}
              className="min-h-10 rounded-lg border border-slate-300 bg-white px-2 text-sm font-semibold text-slate-700"
              aria-label="Page size"
            >
              <option value={10}>10</option>

              <option value={25}>25</option>

              <option value={50}>50</option>

              <option value={100}>100</option>
            </select>

            {/* PREVIOUS */}

            <button
              type="button"
              disabled={page <= 0}
              onClick={() => setPage((current) => Math.max(0, current - 1))}
              className="min-h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-40"
            >
              Previous
            </button>

            {/* NEXT */}

            <button
              type="button"
              disabled={page >= totalPages - 1}
              onClick={() => setPage((current) => current + 1)}
              className="min-h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-40"
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
    <span className="inline-flex w-fit items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
      <CheckCircle2 size={13} />
      Assigned
    </span>
  );
}

// ============================================================================
// QUALIFICATION BADGE
// ============================================================================

function QualificationBadge({ qualified }: { qualified: boolean }) {
  return (
    <span
      className={
        qualified
          ? "inline-flex w-fit items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700"
          : "inline-flex w-fit items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600"
      }
    >
      <CheckCircle2 size={13} />

      {qualified ? "Qualified" : "Not Qualified"}
    </span>
  );
}

// ============================================================================
// READ ONLY VALUE
// ============================================================================

function ReadOnlyValue({
  label,
  value,
  positive = false,
}: {
  label: string;

  value: React.ReactNode;

  positive?: boolean;
}) {
  return (
    <div className="min-w-0">
      <div className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
        {label}
      </div>

      <div
        className={
          positive
            ? "mt-0.5 text-sm font-bold text-emerald-700"
            : "mt-0.5 text-sm font-bold text-slate-800"
        }
      >
        {value}
      </div>
    </div>
  );
}

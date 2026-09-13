// src/pages/elections/workspace/tabs/setup/election/ElectionPartiesTab.tsx

import { useMemo, useState } from "react";

import { useNavigate, useParams } from "react-router-dom";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  AlertCircle,
  CheckCircle2,
  Plus,
  RefreshCw,
  Trash2,
  Users,
  XCircle,
} from "lucide-react";

import { useAuthStore } from "../../../../../../shared/store/authStore";

import {
  deleteElectionParty,
  fetchElectionParties,
  updateElectionParty,
  type ElectionPartyDto,
} from "../../../../../../shared/services/electionPartyService";

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

// ============================================================================
// COMPONENT
// ============================================================================

export default function ElectionPartiesTab() {
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
  // LOCAL BALLOT ORDER STATE
  // ==========================================================================

  const [ballotDrafts, setBallotDrafts] = useState<Record<string, string>>({});

  // ==========================================================================
  // QUERY
  // ==========================================================================

  const partiesQuery = useQuery({
    enabled: Boolean(electionId),

    queryKey: ["election-parties", electionId],

    queryFn: () => fetchElectionParties(electionId!),

    staleTime: 10_000,

    retry: 1,
  });

  const parties = useMemo(
    () => partiesQuery.data ?? [],

    [partiesQuery.data],
  );

  // ==========================================================================
  // REFRESH
  // ==========================================================================

  const refreshNow = async () => {
    if (!electionId) {
      return;
    }

    await queryClient.invalidateQueries({
      queryKey: ["election-parties", electionId],
    });

    await partiesQuery.refetch();
  };

  // ==========================================================================
  // UPDATE QUALIFICATION
  // ==========================================================================

  const qualificationMutation = useMutation({
    mutationFn: async ({
      partyId,
      qualified,
    }: {
      partyId: string;

      qualified: boolean;
    }) => {
      if (!electionId) {
        throw new Error("Missing election ID.");
      }

      return updateElectionParty(electionId, partyId, {
        isQualified: qualified,
      });
    },

    onSuccess: async () => {
      await refreshNow();
    },
  });

  // ==========================================================================
  // UPDATE BALLOT ORDER
  // ==========================================================================

  const ballotOrderMutation = useMutation({
    mutationFn: async ({
      partyId,
      ballotOrder,
    }: {
      partyId: string;

      ballotOrder: number | null;
    }) => {
      if (!electionId) {
        throw new Error("Missing election ID.");
      }

      return updateElectionParty(electionId, partyId, {
        ballotOrder,
      });
    },

    onSuccess: async (_, variables) => {
      setBallotDrafts((current) => {
        const next = {
          ...current,
        };

        delete next[variables.partyId];

        return next;
      });

      await refreshNow();
    },
  });

  // ==========================================================================
  // DELETE
  // ==========================================================================

  const deleteMutation = useMutation({
    mutationFn: async (party: ElectionPartyDto) => {
      if (!electionId) {
        throw new Error("Missing election ID.");
      }

      return deleteElectionParty(electionId, party.partyId);
    },

    onSuccess: async () => {
      await refreshNow();
    },
  });

  // ==========================================================================
  // BALLOT ORDER HELPERS
  // ==========================================================================

  const getBallotValue = (party: ElectionPartyDto) => {
    const draft = ballotDrafts[party.partyId];

    if (draft !== undefined) {
      return draft;
    }

    return party.ballotOrder == null ? "" : String(party.ballotOrder);
  };

  const commitBallotOrder = (party: ElectionPartyDto) => {
    if (!canEdit) {
      return;
    }

    const value = getBallotValue(party).trim();

    const nextValue = value === "" ? null : Number(value);

    if (nextValue !== null && (Number.isNaN(nextValue) || nextValue < 1)) {
      return;
    }

    const currentValue = party.ballotOrder ?? null;

    if (currentValue === nextValue) {
      setBallotDrafts((current) => {
        const next = {
          ...current,
        };

        delete next[party.partyId];

        return next;
      });

      return;
    }

    ballotOrderMutation.mutate({
      partyId: party.partyId,

      ballotOrder: nextValue,
    });
  };

  // ==========================================================================
  // REMOVE
  // ==========================================================================

  const removeParty = (party: ElectionPartyDto) => {
    if (!canEdit) {
      return;
    }

    const confirmed = window.confirm(
      `Remove "${party.partyName ?? "this party"}" from this election?\n\nThe Party Master record will not be deleted.`,
    );

    if (confirmed) {
      deleteMutation.mutate(party);
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
            reason="Election party assignments are managed by NEC/System Admin."
            sources={["election_party", "party"]}
          />
        )}

        {/* ================================================================
            HEADER
        ================================================================ */}

        <section className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 sm:px-4">
          <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-2">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
                <Users size={16} />
              </div>

              <div className="min-w-0">
                <h2 className="text-base font-bold text-slate-900 sm:text-lg">
                  Election Parties
                </h2>

                <p className="text-xs text-slate-500">
                  Parties assigned to this election.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {canEdit ? (
                <button
                  type="button"
                  onClick={() =>
                    navigate(`/elections/${electionId}/setup/parties/assign`)
                  }
                  className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-3 text-xs font-bold text-white hover:bg-blue-700 sm:text-sm"
                >
                  <Plus size={15} />
                  Assign Parties
                </button>
              ) : (
                <Badge text="Read-only" />
              )}

              <button
                type="button"
                onClick={refreshNow}
                disabled={partiesQuery.isFetching}
                className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 sm:text-sm"
              >
                <RefreshCw
                  size={15}
                  className={partiesQuery.isFetching ? "animate-spin" : ""}
                />
                Refresh
              </button>
            </div>
          </div>
        </section>

        {/* ================================================================
            LOADING
        ================================================================ */}

        {partiesQuery.isLoading && (
          <div className="rounded-xl border border-slate-200 bg-white p-5 text-center text-sm text-slate-500">
            Loading election parties…
          </div>
        )}

        {/* ================================================================
            ERROR
        ================================================================ */}

        {partiesQuery.isError && (
          <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">
            <AlertCircle size={17} className="mt-0.5 shrink-0" />

            <div>{friendlyError(partiesQuery.error)}</div>
          </div>
        )}

        {/* ================================================================
            EMPTY
        ================================================================ */}

        {!partiesQuery.isLoading &&
          !partiesQuery.isError &&
          parties.length === 0 && (
            <section className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-8 text-center">
              <Users size={28} className="mx-auto text-slate-300" />

              <div className="mt-2 text-sm font-bold text-slate-800">
                No parties assigned
              </div>

              <p className="mt-1 text-xs text-slate-500">
                Assign parties from Party Master.
              </p>

              {canEdit && (
                <button
                  type="button"
                  onClick={() =>
                    navigate(`/elections/${electionId}/setup/parties/assign`)
                  }
                  className="mt-3 inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-3 text-sm font-bold text-white hover:bg-blue-700"
                >
                  <Plus size={15} />
                  Assign Parties
                </button>
              )}
            </section>
          )}

        {/* ================================================================
            LIST
        ================================================================ */}

        {!partiesQuery.isLoading &&
          !partiesQuery.isError &&
          parties.length > 0 && (
            <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
              {/* ==========================================================
                  DESKTOP HEADER
              ========================================================== */}

              <div className="hidden grid-cols-[minmax(220px,1fr)_120px_260px_90px] items-center gap-3 border-b border-slate-200 bg-slate-50 px-4 py-2 text-[10px] font-bold uppercase tracking-wide text-slate-500 md:grid">
                <div>Party</div>

                <div>Ballot Order</div>

                <div>Qualification</div>

                <div className="text-right">Action</div>
              </div>

              {/* ==========================================================
                  ROWS
              ========================================================== */}

              {parties.map((party) => {
                const qualificationSaving =
                  qualificationMutation.isPending &&
                  qualificationMutation.variables?.partyId === party.partyId;

                const ballotSaving =
                  ballotOrderMutation.isPending &&
                  ballotOrderMutation.variables?.partyId === party.partyId;

                const deleting =
                  deleteMutation.isPending &&
                  deleteMutation.variables?.partyId === party.partyId;

                return (
                  <div
                    key={party.partyId}
                    className="border-b border-slate-100 px-3 py-2.5 last:border-b-0 sm:px-4"
                  >
                    {/* ==================================================
                          MOBILE
                      ================================================== */}

                    <div className="md:hidden">
                      <div className="flex min-w-0 items-start justify-between gap-2">
                        {/* PARTY */}

                        <div className="min-w-0 flex-1">
                          <div
                            className="truncate text-sm font-bold text-slate-900"
                            title={party.partyName ?? ""}
                          >
                            {party.partyName ?? "Unnamed Party"}
                          </div>

                          <div className="mt-1 flex flex-wrap items-center gap-2">
                            {/* BALLOT ORDER */}

                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                                Order
                              </span>

                              {canEdit ? (
                                <input
                                  type="number"
                                  min={1}
                                  value={getBallotValue(party)}
                                  onChange={(event) =>
                                    setBallotDrafts((current) => ({
                                      ...current,

                                      [party.partyId]: event.target.value,
                                    }))
                                  }
                                  onBlur={() => commitBallotOrder(party)}
                                  onKeyDown={(event) => {
                                    if (event.key === "Enter") {
                                      event.currentTarget.blur();
                                    }
                                  }}
                                  disabled={ballotSaving}
                                  className="h-8 w-14 rounded-md border border-slate-300 bg-white px-2 text-center text-xs font-bold text-slate-800 outline-none focus:border-blue-500"
                                />
                              ) : (
                                <span className="text-xs font-bold text-slate-700">
                                  {party.ballotOrder ?? "—"}
                                </span>
                              )}
                            </div>

                            {/* QUALIFICATION */}

                            <QualificationChoice
                              partyId={party.partyId}
                              qualified={Boolean(party.isQualified)}
                              canEdit={canEdit}
                              saving={qualificationSaving}
                              onChange={(value) =>
                                qualificationMutation.mutate({
                                  partyId: party.partyId,

                                  qualified: value,
                                })
                              }
                              compact
                            />
                          </div>
                        </div>

                        {/* REMOVE */}

                        {canEdit && (
                          <button
                            type="button"
                            onClick={() => removeParty(party)}
                            disabled={deleting}
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 disabled:opacity-50"
                            aria-label="Remove party"
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

                    <div className="hidden grid-cols-[minmax(220px,1fr)_120px_260px_90px] items-center gap-3 md:grid">
                      {/* PARTY */}

                      <div className="min-w-0">
                        <div
                          className="truncate text-sm font-bold text-slate-900 lg:text-base"
                          title={party.partyName ?? ""}
                        >
                          {party.partyName ?? "Unnamed Party"}
                        </div>
                      </div>

                      {/* BALLOT ORDER */}

                      <div>
                        {canEdit ? (
                          <input
                            type="number"
                            min={1}
                            value={getBallotValue(party)}
                            onChange={(event) =>
                              setBallotDrafts((current) => ({
                                ...current,

                                [party.partyId]: event.target.value,
                              }))
                            }
                            onBlur={() => commitBallotOrder(party)}
                            onKeyDown={(event) => {
                              if (event.key === "Enter") {
                                event.currentTarget.blur();
                              }
                            }}
                            disabled={ballotSaving}
                            className="h-9 w-16 rounded-md border border-slate-300 bg-white px-2 text-center text-sm font-bold text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
                          />
                        ) : (
                          <span className="text-sm font-bold text-slate-800">
                            {party.ballotOrder ?? "—"}
                          </span>
                        )}
                      </div>

                      {/* QUALIFICATION */}

                      <QualificationChoice
                        partyId={party.partyId}
                        qualified={Boolean(party.isQualified)}
                        canEdit={canEdit}
                        saving={qualificationSaving}
                        onChange={(value) =>
                          qualificationMutation.mutate({
                            partyId: party.partyId,

                            qualified: value,
                          })
                        }
                      />

                      {/* REMOVE */}

                      <div className="flex justify-end">
                        {canEdit && (
                          <button
                            type="button"
                            onClick={() => removeParty(party)}
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

                    {/* ==================================================
                          ROW ERRORS
                      ================================================== */}

                    {qualificationMutation.isError &&
                      qualificationMutation.variables?.partyId ===
                        party.partyId && (
                        <div className="mt-2 rounded-md border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-semibold text-red-700">
                          {friendlyError(qualificationMutation.error)}
                        </div>
                      )}

                    {ballotOrderMutation.isError &&
                      ballotOrderMutation.variables?.partyId ===
                        party.partyId && (
                        <div className="mt-2 rounded-md border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-semibold text-red-700">
                          {friendlyError(ballotOrderMutation.error)}
                        </div>
                      )}
                  </div>
                );
              })}
            </section>
          )}

        {/* ================================================================
            SUMMARY
        ================================================================ */}

        {!partiesQuery.isLoading &&
          !partiesQuery.isError &&
          parties.length > 0 && (
            <div className="px-1 text-xs font-medium text-slate-500">
              {parties.length} {parties.length === 1 ? "party" : "parties"}{" "}
              assigned to this election.
            </div>
          )}
      </div>
    </div>
  );
}

// ============================================================================
// QUALIFICATION CHOICE
// ============================================================================

function QualificationChoice({
  partyId,
  qualified,
  canEdit,
  saving,
  onChange,
  compact = false,
}: {
  partyId: string;

  qualified: boolean;

  canEdit: boolean;

  saving: boolean;

  onChange: (value: boolean) => void;

  compact?: boolean;
}) {
  if (!canEdit) {
    return (
      <span
        className={
          qualified
            ? "inline-flex w-fit items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700"
            : "inline-flex w-fit items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600"
        }
      >
        {qualified ? <CheckCircle2 size={11} /> : <XCircle size={11} />}

        {qualified ? "Qualified" : "Not Qualified"}
      </span>
    );
  }

  return (
    <div
      className={
        compact ? "flex items-center gap-1" : "flex items-center gap-1.5"
      }
    >
      <label
        className={
          qualified
            ? "inline-flex cursor-pointer items-center gap-1 rounded-md border border-emerald-300 bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700"
            : "inline-flex cursor-pointer items-center gap-1 rounded-md border border-slate-300 bg-white px-2 py-1 text-[10px] font-semibold text-slate-600 hover:bg-slate-50"
        }
      >
        <input
          type="radio"
          name={`qualification-${partyId}`}
          checked={qualified}
          onChange={() => onChange(true)}
          disabled={saving}
          className="h-3 w-3 accent-emerald-600"
        />
        Qualified
      </label>

      <label
        className={
          !qualified
            ? "inline-flex cursor-pointer items-center gap-1 rounded-md border border-slate-400 bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-700"
            : "inline-flex cursor-pointer items-center gap-1 rounded-md border border-slate-300 bg-white px-2 py-1 text-[10px] font-semibold text-slate-600 hover:bg-slate-50"
        }
      >
        <input
          type="radio"
          name={`qualification-${partyId}`}
          checked={!qualified}
          onChange={() => onChange(false)}
          disabled={saving}
          className="h-3 w-3 accent-slate-600"
        />
        Not Qualified
      </label>

      {saving && (
        <RefreshCw size={12} className="animate-spin text-slate-400" />
      )}
    </div>
  );
}

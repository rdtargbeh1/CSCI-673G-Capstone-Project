// src/pages/elections/workspace/tabs/results/VoteTallyPage.tsx

import { useEffect, useMemo, useState } from "react";

import { useOutletContext, useParams } from "react-router-dom";

import { useQuery } from "@tanstack/react-query";

import { ChevronLeft, ChevronRight, Vote } from "lucide-react";

import { useAuth } from "../../../../../auth/useAuth";

import { useAuthStore } from "../../../../../shared/store/authStore";

import { Panel, PlaceholderNote } from "../../../shared/elections-ui";

import {
  searchVoteTallies,
  type VoteTallyDto,
} from "../../../../../shared/services/voteTallyService";

import { listContestsByElection } from "../../../../../shared/services/contestService";

import type { ContestDto } from "../../../../../auth/contestTypes";

// ============================================================================
// TYPES
// ============================================================================

type ResultsOutletCtx = {
  orgId?: string;
};

// ============================================================================
// HELPERS
// ============================================================================

function fmtTime(value?: string | null) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value).replace("T", " ");
  }

  return date.toLocaleString();
}

function partyLabel(row: VoteTallyDto) {
  if (!row.partyName) {
    return "INDEPENDENT";
  }

  return row.abbreviation
    ? `${row.partyName} (${row.abbreviation})`
    : row.partyName;
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function VoteTallyPage() {
  const { electionId } = useParams();

  // ==========================================================================
  // OUTLET CONTEXT
  // ==========================================================================

  const outlet = useOutletContext<ResultsOutletCtx>();

  const outletOrgId = String(outlet?.orgId ?? "").trim();

  // ==========================================================================
  // AUTH CONTEXT
  // ==========================================================================

  const auth: any = useAuth();

  const storeOrgId = String(
    useAuthStore((state: any) => state.currentOrgId ?? "") ?? "",
  ).trim();

  const fallbackOrgId = String(
    useAuthStore.getState().tenantMeta?.orgId ?? auth?.tenant?.orgId ?? "",
  ).trim();

  const orgId = outletOrgId || storeOrgId || fallbackOrgId || "";

  // ==========================================================================
  // FILTER STATE
  // ==========================================================================

  const [contestId, setContestId] = useState<string>("");

  // ==========================================================================
  // PAGINATION
  // ==========================================================================

  const [page, setPage] = useState(0);

  const [size, setSize] = useState(25);

  // ==========================================================================
  // CONTESTS
  // ==========================================================================

  const contestsQuery = useQuery<ContestDto[]>({
    enabled: Boolean(electionId),

    queryKey: ["election-contests", electionId, "vote-tally"],

    queryFn: () => listContestsByElection(electionId as string),

    staleTime: 60_000,

    retry: 1,
  });

  const contests = contestsQuery.data ?? [];

  // ==========================================================================
  // RESET PAGING
  // ==========================================================================

  useEffect(() => {
    setPage(0);
  }, [orgId, electionId, contestId, size]);

  // ==========================================================================
  // VOTE TALLY QUERY
  // ==========================================================================

  const tallyQuery = useQuery({
    queryKey: [
      "vote-tally",
      "search",
      orgId,
      electionId,
      contestId,
      page,
      size,
    ],

    enabled: Boolean(orgId && electionId),

    queryFn: () =>
      searchVoteTallies({
        orgId,

        electionId: electionId as string,

        contestId: contestId || undefined,

        page,

        size,
      } as any),

    staleTime: 10_000,

    retry: 1,
  });

  // ==========================================================================
  // ROWS
  // ==========================================================================

  const rows = useMemo<VoteTallyDto[]>(
    () => (tallyQuery.data?.items ?? []) as VoteTallyDto[],

    [tallyQuery.data],
  );

  const totalPages = Math.max(1, tallyQuery.data?.totalPages ?? 1);

  /*
   * PageDto<VoteTallyDto> does not currently expose totalElements.
   *
   * This is therefore the number of rows on the CURRENT page only.
   */
  const rowsOnPage = rows.length;

  // ==========================================================================
  // MISSING ORG
  // ==========================================================================

  if (!orgId) {
    return (
      <Panel title="Vote Tally">
        <PlaceholderNote
          title="Missing tenant scope (orgId)"
          bullets={[
            "Vote tally results require an organization scope.",
            "TENANT/NEC should have an organization assigned in the current session.",
            "SYSTEM users must select an organization from the Results workspace.",
          ]}
        />
      </Panel>
    );
  }

  // ==========================================================================
  // RENDER
  // ==========================================================================

  return (
    <div className="flex min-w-0 flex-col gap-2">
      <Panel title="Vote Tally">
        <div className="flex min-w-0 flex-col gap-2">
          {/* ==================================================================
              FILTER
          ================================================================== */}

          <section className="rounded-xl border border-slate-200 bg-white p-2">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(220px,320px)_auto] sm:items-center">
              <select
                value={contestId}
                onChange={(event) => {
                  setContestId(event.target.value);

                  setPage(0);
                }}
                disabled={!electionId || contestsQuery.isLoading}
                className="min-h-10 w-full rounded-lg border border-slate-300 bg-white px-2.5 text-sm font-semibold text-slate-700 disabled:bg-slate-50"
                title="Filter by contest"
              >
                <option value="">
                  {contestsQuery.isLoading
                    ? "Loading contests…"
                    : "All contests"}
                </option>

                {contests.map((contest: any) => (
                  <option key={contest.contestId} value={contest.contestId}>
                    {contest.contestName ?? "—"}
                  </option>
                ))}
              </select>

              <div className="text-xs font-semibold text-slate-500 sm:text-right">
                {rowsOnPage} records on this page
              </div>
            </div>
          </section>

          {/* ==================================================================
              ERROR
          ================================================================== */}

          {tallyQuery.isError && (
            <section className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
              {(tallyQuery.error as any)?.message ??
                "Failed to load vote tallies."}
            </section>
          )}

          {/* ==================================================================
              RESULTS
          ================================================================== */}

          <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            {/* RESULT HEADER */}

            <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-3 py-2">
              <div className="flex items-center gap-1.5">
                <Vote size={14} className="text-blue-600" />

                <span className="text-xs font-bold text-slate-800 sm:text-sm">
                  Verified Vote Tally
                </span>
              </div>

              <span className="text-[10px] font-semibold text-slate-500 sm:text-xs">
                {rowsOnPage} on this page
              </span>
            </div>

            {/* ================================================================
                DESKTOP HEADER
            ================================================================ */}

            <div className="hidden grid-cols-[minmax(150px,0.9fr)_minmax(220px,1.25fr)_minmax(170px,1fr)_90px_minmax(160px,0.9fr)_170px_170px] items-center gap-4 border-b border-slate-200 bg-white px-4 py-2 text-[10px] font-bold uppercase tracking-wide text-slate-500 lg:grid">
              <div>Contest</div>

              <div>Candidate</div>

              <div>Party</div>

              <div>Votes</div>

              <div>Recomputed By</div>

              <div>Last Recomputed</div>

              <div>Updated</div>
            </div>

            {/* ================================================================
                LOADING
            ================================================================ */}

            {tallyQuery.isLoading && (
              <div className="p-6 text-center">
                <div className="mx-auto h-5 w-5 animate-spin rounded-full border-2 border-slate-200 border-t-blue-600" />

                <div className="mt-2 text-xs font-medium text-slate-500">
                  Loading vote tallies...
                </div>
              </div>
            )}

            {/* ================================================================
                EMPTY
            ================================================================ */}

            {!tallyQuery.isLoading && rows.length === 0 && (
              <div className="px-4 py-10 text-center">
                <Vote size={26} className="mx-auto text-slate-300" />

                <div className="mt-2 text-sm font-bold text-slate-800">
                  No vote tallies found
                </div>

                <div className="mt-1 text-xs text-slate-500">
                  No verified tally records match the selected contest.
                </div>
              </div>
            )}

            {/* ================================================================
                ROWS
            ================================================================ */}

            {!tallyQuery.isLoading &&
              rows.map((row, index) => {
                const candidateName = row.fullName ?? "—";

                const party = partyLabel(row);

                const rowKey =
                  (row as any).tallyId ??
                  (row as any).voteTallyId ??
                  `${candidateName}-${row.contestName}-${index}`;

                return (
                  <div
                    key={rowKey}
                    className="border-b border-slate-100 px-3 py-2.5 last:border-b-0 sm:px-4"
                  >
                    {/* ======================================================
                          MOBILE / TABLET
                      ====================================================== */}

                    <div className="lg:hidden">
                      <div className="flex min-w-0 items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          {/* CANDIDATE */}

                          <div className="truncate text-sm font-bold text-slate-900">
                            {candidateName}
                          </div>

                          {/* CONTEST + PARTY */}

                          <div className="mt-0.5 flex min-w-0 items-center gap-1.5">
                            <span className="truncate text-xs font-semibold text-blue-700">
                              {row.contestName ?? "—"}
                            </span>

                            <span className="text-slate-300">•</span>

                            <span className="truncate text-[11px] font-semibold text-slate-500">
                              {party}
                            </span>
                          </div>

                          {/* RECOMPUTED */}

                          <div className="mt-1 text-[10px] text-slate-500">
                            <span className="font-semibold text-slate-600">
                              Recomputed by:
                            </span>{" "}
                            {row.recomputedByUserName ?? "—"}
                          </div>
                        </div>

                        {/* VOTES */}

                        <div className="shrink-0 rounded-lg border border-blue-100 bg-blue-50 px-2.5 py-1.5 text-center">
                          <div className="text-[8px] font-bold uppercase tracking-wide text-blue-500">
                            Votes
                          </div>

                          <div className="text-base font-bold text-blue-700">
                            {row.voteCount ?? 0}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* ======================================================
                          DESKTOP
                      ====================================================== */}

                    <div className="hidden grid-cols-[minmax(150px,0.9fr)_minmax(220px,1.25fr)_minmax(170px,1fr)_90px_minmax(160px,0.9fr)_170px_170px] items-center gap-4 lg:grid">
                      {/* CONTEST */}

                      <div
                        className="truncate text-sm font-semibold text-slate-700"
                        title={row.contestName ?? ""}
                      >
                        {row.contestName ?? "—"}
                      </div>

                      {/* CANDIDATE */}

                      <div
                        className="truncate text-sm font-bold text-slate-900"
                        title={candidateName}
                      >
                        {candidateName}
                      </div>

                      {/* PARTY */}

                      <div
                        className="truncate text-sm font-semibold text-slate-600"
                        title={party}
                      >
                        {party}
                      </div>

                      {/* VOTES */}

                      <div>
                        <span className="inline-flex min-w-10 items-center justify-center rounded-lg bg-blue-50 px-2 py-1 text-sm font-bold text-blue-700">
                          {row.voteCount ?? 0}
                        </span>
                      </div>

                      {/* RECOMPUTED BY */}

                      <div
                        className="truncate text-xs font-semibold text-slate-600"
                        title={row.recomputedByUserName ?? ""}
                      >
                        {row.recomputedByUserName ?? "—"}
                      </div>

                      {/* LAST RECOMPUTED */}

                      <div className="text-xs font-medium text-slate-500">
                        {fmtTime(row.lastRecomputedAt)}
                      </div>

                      {/* UPDATED */}

                      <div className="text-xs font-medium text-slate-500">
                        {fmtTime(row.lastUpdated)}
                      </div>
                    </div>
                  </div>
                );
              })}
          </section>

          {/* ==================================================================
              PAGINATION
          ================================================================== */}

          <section className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-[10px] font-semibold text-slate-500 sm:text-xs">
              Page <strong className="text-slate-800">{page + 1}</strong> of{" "}
              <strong className="text-slate-800">{totalPages}</strong>
              <span className="ml-2 text-slate-400">
                • {rowsOnPage} on this page
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              {/* PAGE SIZE */}

              <select
                value={size}
                onChange={(event) => {
                  setSize(Number(event.target.value));

                  setPage(0);
                }}
                className="min-h-8 rounded-lg border border-slate-300 bg-white px-2 text-xs font-semibold text-slate-700"
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
                disabled={page <= 0 || tallyQuery.isFetching}
                onClick={() => setPage((current) => Math.max(0, current - 1))}
                className="inline-flex min-h-8 items-center gap-1 rounded-lg border border-slate-300 bg-white px-2 text-[10px] font-semibold text-slate-700 disabled:opacity-40 sm:text-xs"
              >
                <ChevronLeft size={13} />
                Prev
              </button>

              {/* NEXT */}

              <button
                type="button"
                disabled={tallyQuery.isFetching || page >= totalPages - 1}
                onClick={() =>
                  setPage((current) => Math.min(totalPages - 1, current + 1))
                }
                className="inline-flex min-h-8 items-center gap-1 rounded-lg border border-slate-300 bg-white px-2 text-[10px] font-semibold text-slate-700 disabled:opacity-40 sm:text-xs"
              >
                Next
                <ChevronRight size={13} />
              </button>
            </div>
          </section>
        </div>
      </Panel>
    </div>
  );
}

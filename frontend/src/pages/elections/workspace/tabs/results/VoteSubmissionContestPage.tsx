// src/pages/elections/workspace/tabs/results/VoteSubmissionContestPage.tsx

import { useMemo, useState } from "react";

import { useOutletContext, useParams } from "react-router-dom";

import { useQuery } from "@tanstack/react-query";

import { ChevronLeft, ChevronRight, FilterX, Vote } from "lucide-react";

import { Panel } from "../../../shared/elections-ui";

import {
  searchNormalizedSubmissionContestVotes,
  type VoteSubmissionContestSearchRow,
} from "../../../../../shared/services/voteSubmissionContestService";

import { listContestsByElection } from "../../../../../shared/services/contestService";

import { fetchElectionCandidates } from "../../../../../shared/services/electionCandidateService";

import { fetchCounties } from "../../../../../shared/services/countyService";

import { fetchDistrictsByCounty } from "../../../../../shared/services/districtService";

import { fetchPollingCenters } from "../../../../../shared/services/pollingCenterService";

import { fetchOrganizationById } from "../../../../../shared/services/organizationService";

import { fetchElectionById } from "../../../../../shared/services/electionService";

// ============================================================================
// TYPES
// ============================================================================

type OutletCtx = {
  orgId?: string;
};

// ============================================================================
// HELPERS
// ============================================================================

function formatCandidateWithParty(row: VoteSubmissionContestSearchRow): string {
  const name = row.candidateFullName ?? row.optionLabel ?? "—";

  const abbreviation = row.partyAbbreviation ?? "";

  return abbreviation ? `${name} (${abbreviation})` : name;
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

export default function VoteSubmissionContestPage() {
  const { orgId } = useOutletContext<OutletCtx>();

  const { electionId } = useParams();

  // ==========================================================================
  // FILTER STATE
  // ==========================================================================

  const [countyId, setCountyId] = useState("");

  const [districtId, setDistrictId] = useState("");

  const [centerId, setCenterId] = useState("");

  const [contestId, setContestId] = useState("");

  const [candidateId, setCandidateId] = useState("");

  // ==========================================================================
  // PAGINATION
  // ==========================================================================

  const [page, setPage] = useState(0);

  const [size, setSize] = useState(25);

  // ==========================================================================
  // ORGANIZATION + ELECTION
  // ==========================================================================

  const orgQuery = useQuery({
    queryKey: ["org", orgId],

    queryFn: () => fetchOrganizationById(String(orgId)),

    enabled: Boolean(orgId),

    staleTime: 60_000,

    retry: 1,
  });

  const electionQuery = useQuery({
    queryKey: ["election", electionId],

    queryFn: () => fetchElectionById(String(electionId)),

    enabled: Boolean(electionId),

    staleTime: 60_000,

    retry: 1,
  });

  const orgName = orgQuery.data?.orgName ?? "—";

  const electionName = electionQuery.data?.electionName ?? "—";

  // ==========================================================================
  // FILTER LOOKUPS
  // ==========================================================================

  const countiesQuery = useQuery({
    queryKey: ["counties", "normalized-results"],

    queryFn: () =>
      fetchCounties({
        page: 0,
        size: 200,
      }),

    staleTime: 60_000,

    retry: 1,
  });

  const districtsQuery = useQuery({
    queryKey: ["districts", countyId, "normalized-results"],

    queryFn: () => fetchDistrictsByCounty(countyId),

    enabled: Boolean(countyId),

    staleTime: 60_000,

    retry: 1,
  });

  const centersQuery = useQuery({
    queryKey: ["centers", countyId, districtId, "normalized-results"],

    queryFn: () =>
      fetchPollingCenters({
        page: 0,
        size: 300,
        countyId,
        districtId,
      }),

    enabled: Boolean(districtId),

    staleTime: 60_000,

    retry: 1,
  });

  const contestsQuery = useQuery({
    queryKey: ["contests", electionId, "normalized-results"],

    queryFn: () => listContestsByElection(String(electionId)),

    enabled: Boolean(electionId),

    staleTime: 60_000,

    retry: 1,
  });

  const candidatesQuery = useQuery({
    queryKey: ["election-candidates", electionId, "normalized-results"],

    queryFn: () => fetchElectionCandidates(String(electionId)),

    enabled: Boolean(electionId),

    staleTime: 60_000,

    retry: 1,
  });

  // ==========================================================================
  // CANDIDATES
  // ==========================================================================

  const candidates = useMemo(
    () =>
      [...(candidatesQuery.data ?? [])].sort((first: any, second: any) =>
        String(first.fullName ?? "").localeCompare(
          String(second.fullName ?? ""),

          undefined,

          {
            sensitivity: "base",
          },
        ),
      ),

    [candidatesQuery.data],
  );

  // ==========================================================================
  // RESULTS
  // ==========================================================================

  const rowsQuery = useQuery({
    queryKey: [
      "normalize-search",
      orgId,
      electionId,
      countyId,
      districtId,
      centerId,
      contestId,
      candidateId,
      page,
      size,
    ],

    queryFn: () =>
      searchNormalizedSubmissionContestVotes({
        orgId: String(orgId),

        electionId: String(electionId),

        countyId: countyId || undefined,

        districtId: districtId || undefined,

        centerId: centerId || undefined,

        contestId: contestId || undefined,

        candidateId: candidateId || undefined,

        page,

        size,
      }),

    enabled: Boolean(orgId && electionId),

    staleTime: 10_000,

    retry: 1,
  });

  const rows = rowsQuery.data?.content ?? [];

  const totalPages = Math.max(1, rowsQuery.data?.totalPages ?? 1);

  const totalElements = rowsQuery.data?.totalElements ?? rows.length;

  // ==========================================================================
  // ACTIONS
  // ==========================================================================

  const clearFilters = () => {
    setCountyId("");

    setDistrictId("");

    setCenterId("");

    setContestId("");

    setCandidateId("");

    setPage(0);
  };

  // ==========================================================================
  // RENDER
  // ==========================================================================

  return (
    <div className="flex min-w-0 flex-col gap-2">
      <Panel title="Normalized Contest Votes">
        <div className="flex min-w-0 flex-col gap-2">
          {/* ==================================================================
              ORGANIZATION + ELECTION
          ================================================================== */}

          <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
            <div className="min-w-0 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
              <div className="text-[9px] font-bold uppercase tracking-wide text-slate-400">
                Organization
              </div>

              <div
                className="mt-0.5 truncate text-xs font-bold text-slate-800 sm:text-sm"
                title={orgName}
              >
                {orgName}
              </div>
            </div>

            <div className="min-w-0 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
              <div className="text-[9px] font-bold uppercase tracking-wide text-slate-400">
                Election
              </div>

              <div
                className="mt-0.5 truncate text-xs font-bold text-slate-800 sm:text-sm"
                title={electionName}
              >
                {electionName}
              </div>
            </div>
          </div>

          {/* ==================================================================
              FILTERS
          ================================================================== */}

          <section className="rounded-xl border border-slate-200 bg-white p-2">
            <div className="grid grid-cols-2 gap-2 lg:grid-cols-[140px_140px_180px_160px_200px_auto]">
              {/* COUNTY */}

              <select
                value={countyId}
                onChange={(event) => {
                  setCountyId(event.target.value);

                  setDistrictId("");

                  setCenterId("");

                  setPage(0);
                }}
                className="min-h-10 min-w-0 w-full rounded-lg border border-slate-300 bg-white px-2 text-xs font-semibold text-slate-700 sm:text-sm"
              >
                <option value="">Counties</option>

                {countiesQuery.data?.items.map((county) => (
                  <option key={county.countyId} value={county.countyId}>
                    {county.countyName}
                  </option>
                ))}
              </select>

              {/* DISTRICT */}

              <select
                value={districtId}
                onChange={(event) => {
                  setDistrictId(event.target.value);

                  setCenterId("");

                  setPage(0);
                }}
                disabled={!countyId}
                className="min-h-10 min-w-0 w-full rounded-lg border border-slate-300 bg-white px-2 text-xs font-semibold text-slate-700 disabled:bg-slate-50 disabled:text-slate-400 sm:text-sm"
              >
                <option value="">Districts</option>

                {districtsQuery.data?.map((district) => (
                  <option key={district.districtId} value={district.districtId}>
                    {district.districtName}
                  </option>
                ))}
              </select>

              {/* CENTER */}

              <select
                value={centerId}
                onChange={(event) => {
                  setCenterId(event.target.value);

                  setPage(0);
                }}
                disabled={!districtId}
                className="min-h-10 min-w-0 w-full rounded-lg border border-slate-300 bg-white px-2 text-xs font-semibold text-slate-700 disabled:bg-slate-50 disabled:text-slate-400 sm:text-sm"
              >
                <option value="">Centers</option>

                {centersQuery.data?.items.map((center) => (
                  <option key={center.centerId} value={center.centerId}>
                    {center.centerName}
                  </option>
                ))}
              </select>

              {/* CONTEST */}

              <select
                value={contestId}
                onChange={(event) => {
                  setContestId(event.target.value);

                  setCandidateId("");

                  setPage(0);
                }}
                className="min-h-10 min-w-0 w-full rounded-lg border border-slate-300 bg-white px-2 text-xs font-semibold text-slate-700 sm:text-sm"
              >
                <option value="">Contests</option>

                {contestsQuery.data?.map((contest) => (
                  <option key={contest.contestId} value={contest.contestId}>
                    {contest.contestName}
                  </option>
                ))}
              </select>

              {/* CANDIDATE */}

              <select
                value={candidateId}
                onChange={(event) => {
                  setCandidateId(event.target.value);

                  setPage(0);
                }}
                className="min-h-10 min-w-0 w-full rounded-lg border border-slate-300 bg-white px-2 text-xs font-semibold text-slate-700 sm:text-sm"
              >
                <option value="">Candidates</option>

                {candidates.map((candidate: any) => (
                  <option
                    key={candidate.candidateId ?? candidate.electId}
                    value={candidate.candidateId}
                  >
                    {candidate.fullName}
                  </option>
                ))}
              </select>

              {/* CLEAR */}

              <button
                type="button"
                onClick={clearFilters}
                className="inline-flex min-h-10 min-w-0 items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 sm:text-sm"
              >
                <FilterX size={14} />
                Clear
              </button>
            </div>
          </section>

          {/* ==================================================================
              RESULTS
          ================================================================== */}

          <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            {/* RESULT HEADER */}

            <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-3 py-2">
              <div className="flex items-center gap-1.5">
                <Vote size={14} className="text-blue-600" />

                <span className="text-xs font-bold text-slate-800 sm:text-sm">
                  Normalized Votes
                </span>
              </div>

              <span className="text-[10px] font-semibold text-slate-500 sm:text-xs">
                {totalElements} records
              </span>
            </div>

            {/* ================================================================
                DESKTOP HEADER
            ================================================================ */}

            <div className="hidden grid-cols-[minmax(210px,1.25fr)_minmax(150px,0.85fr)_minmax(260px,1.35fr)_90px_175px] items-center gap-4 border-b border-slate-200 bg-white px-4 py-2 text-[10px] font-bold uppercase tracking-wide text-slate-500 md:grid">
              <div>Center</div>

              <div>Contest</div>

              <div>Candidate</div>

              <div>Votes</div>

              <div>Date</div>
            </div>

            {/* ================================================================
                LOADING
            ================================================================ */}

            {rowsQuery.isLoading && (
              <div className="p-6 text-center">
                <div className="mx-auto h-5 w-5 animate-spin rounded-full border-2 border-slate-200 border-t-blue-600" />

                <div className="mt-2 text-xs font-medium text-slate-500">
                  Loading normalized votes...
                </div>
              </div>
            )}

            {/* ================================================================
                EMPTY
            ================================================================ */}

            {!rowsQuery.isLoading && rows.length === 0 && (
              <div className="px-4 py-10 text-center">
                <Vote size={26} className="mx-auto text-slate-300" />

                <div className="mt-2 text-sm font-bold text-slate-800">
                  No normalized votes found
                </div>

                <div className="mt-1 text-xs text-slate-500">
                  No records match the selected filters.
                </div>
              </div>
            )}

            {/* ================================================================
                ROWS
            ================================================================ */}

            {!rowsQuery.isLoading &&
              rows.map((row: VoteSubmissionContestSearchRow) => {
                const candidateName = formatCandidateWithParty(row);

                return (
                  <div
                    key={row.scvId}
                    className="border-b border-slate-100 px-3 py-2.5 last:border-b-0 sm:px-4"
                  >
                    {/* ======================================================
                          MOBILE
                      ====================================================== */}

                    <div className="md:hidden">
                      <div className="flex min-w-0 items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-bold text-slate-900">
                            {candidateName}
                          </div>

                          <div className="mt-0.5 flex min-w-0 items-center gap-1.5">
                            <span className="truncate text-xs font-semibold text-blue-700">
                              {row.contestName ?? "—"}
                            </span>

                            <span className="text-slate-300">•</span>

                            <span className="truncate text-[11px] text-slate-500">
                              {row.centerName ?? "—"}
                            </span>
                          </div>
                        </div>

                        <div className="shrink-0 rounded-lg border border-blue-100 bg-blue-50 px-2.5 py-1.5 text-center">
                          <div className="text-[8px] font-bold uppercase tracking-wide text-blue-500">
                            Votes
                          </div>

                          <div className="text-base font-bold text-blue-700">
                            {row.voteValue ?? 0}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* ======================================================
                          DESKTOP
                      ====================================================== */}

                    <div className="hidden grid-cols-[minmax(210px,1.25fr)_minmax(150px,0.85fr)_minmax(260px,1.35fr)_90px_175px] items-center gap-4 md:grid">
                      <div
                        className="truncate text-sm font-semibold text-slate-700"
                        title={row.centerName ?? ""}
                      >
                        {row.centerName ?? "—"}
                      </div>

                      <div
                        className="truncate text-sm font-semibold text-slate-700"
                        title={row.contestName ?? ""}
                      >
                        {row.contestName ?? "—"}
                      </div>

                      <div
                        className="truncate text-sm font-bold text-slate-900"
                        title={candidateName}
                      >
                        {candidateName}
                      </div>

                      <div>
                        <span className="inline-flex min-w-10 items-center justify-center rounded-lg bg-blue-50 px-2 py-1 text-sm font-bold text-blue-700">
                          {row.voteValue ?? 0}
                        </span>
                      </div>

                      <div className="text-xs font-medium text-slate-500">
                        {formatDate(row.dateCreated)}
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
                • {totalElements} rows
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <select
                value={size}
                onChange={(event) => {
                  setSize(Number(event.target.value));

                  setPage(0);
                }}
                className="min-h-8 rounded-lg border border-slate-300 bg-white px-2 text-xs font-semibold text-slate-700"
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
                className="inline-flex min-h-8 items-center gap-1 rounded-lg border border-slate-300 bg-white px-2 text-[10px] font-semibold text-slate-700 disabled:opacity-40 sm:text-xs"
              >
                <ChevronLeft size={13} />
                Prev
              </button>

              <button
                type="button"
                disabled={page >= totalPages - 1}
                onClick={() => setPage((current) => current + 1)}
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

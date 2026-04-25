
// ✅ FILE: src/pages/elections/workspace/tabs/results/official/totals/OfficialCandidateCountiesPage.tsx

import React, { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2 } from "lucide-react";

import { Panel, PlaceholderNote } from "../../../../shared/elections-ui";
import { listContestsByElection } from "../../../../../../shared/services/contestService";
import type { ContestDto } from "../../../../../../auth/contestTypes";

import { fetchCounties, type CountyDto } from "../../../../../../shared/services/countyService";

import {
  searchCandidateCountyStatsOfficial,
  type CandidateCountyStatsOfficialRow,
} from "../../../../../../shared/services/stats/candidateCountyStatsOfficialService";

function fmtPct(n: any) {
  const v = Number(n);
  if (!isFinite(v)) return "—";
  return `${v.toFixed(2)}%`;
}
function fmtNum(n: any) {
  const v = Number(n);
  if (!isFinite(v)) return "—";
  return v.toLocaleString();
}
function ratioLabel(votes: any, valid: any) {
  const v = Number(votes);
  const t = Number(valid);
  if (!isFinite(v) || !isFinite(t) || t <= 0) return "—";
  return `${v.toLocaleString()}/${t.toLocaleString()}`;
}

function setSP(
  searchParams: URLSearchParams,
  setSearchParams: ReturnType<typeof useSearchParams>[1],
  updates: Record<string, string | undefined | null>,
  opts?: { resetPage?: boolean }
) {
  const sp = new URLSearchParams(searchParams);

  Object.entries(updates).forEach(([k, v]) => {
    const clean = v == null ? "" : String(v);
    if (!clean) sp.delete(k);
    else sp.set(k, clean);
  });

  if (opts?.resetPage) sp.set("page", "0");
  setSearchParams(sp, { replace: true });
}

type CandidateOpt = { candidateId: string; candidateName: string };

export default function OfficialCandidateCountiesPage() {
  const { electionId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();

  // query params
  const contestId = searchParams.get("contestId") ?? ""; // optional
  const countyId = searchParams.get("countyId") ?? "";
  const candidateId = searchParams.get("candidateId") ?? "";
  const partyId = searchParams.get("partyId") ?? "";

  // paging
  const page = Number(searchParams.get("page") ?? "0");
  const size = Number(searchParams.get("size") ?? "25");

  // sorting
  const [sort, setSort] = useState<string[]>([
    "candidateVotes,desc",
    "voteSharePct,desc",
    "countyName,asc",
    "candidateName,asc",
  ]);

  // ✅ keep hook count stable; only mutate sort state
  useEffect(() => {
    if (!candidateId) return;
    setSort(["countyName,asc", "candidateVotes,desc", "voteSharePct,desc", "candidateName,asc"]);
    setSP(searchParams, setSearchParams, {}, { resetPage: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [candidateId]);

  function toggleSort(field: string) {
    const primary = sort?.[0] ?? "";
    const [curField, curDir] = primary.split(",");
    if (curField === field) {
      const nextDir = (curDir ?? "asc").toLowerCase() === "asc" ? "desc" : "asc";
      setSort([`${field},${nextDir}`, ...sort.slice(1)]);
    } else {
      const numeric = new Set([
        "candidateVotes",
        "voteSharePct",
        "ballotsCast",
        "totalValidVotes",
        "totalInvalidVotes",
        "rankInCounty",
        "marginVotes",
      ]);
      setSort([`${field},${numeric.has(field) ? "desc" : "asc"}`, ...sort]);
    }
    setSP(searchParams, setSearchParams, {}, { resetPage: true });
  }

  // 1) contests
  const contestsQ = useQuery({
    queryKey: ["contests", "by-election", electionId],
    enabled: Boolean(electionId),
    queryFn: async () => listContestsByElection(String(electionId)),
    staleTime: 60_000,
    retry: 1,
  });

  const contests: ContestDto[] = contestsQ.data ?? [];
  const contestNameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of contests as any[]) {
      m.set(String(c.contestId), String(c.contestName ?? c.name ?? c.contestId));
    }
    return m;
  }, [contests]);

  // 2) counties dropdown
  const countiesQ = useQuery<CountyDto[]>({
    queryKey: ["counties", "official"],
    enabled: true,
    queryFn: async () => (await fetchCounties({ page: 0, size: 500 } as any)).items as CountyDto[],
    staleTime: 60_000,
    retry: 1,
  });
  const counties = countiesQ.data ?? [];

  // 3) stats query (✅ ALWAYS called; contest optional)
  const enabled = Boolean(electionId);

  const q = useQuery({
    queryKey: [
      "stats",
      "official",
      "candidate-counties",
      electionId,
      contestId || "ALL",
      countyId,
      candidateId,
      partyId,
      page,
      size,
      sort,
    ],
    enabled,
    queryFn: async () =>
      searchCandidateCountyStatsOfficial({
        electionId: String(electionId),
        contestId: contestId ? String(contestId) : undefined,
        countyId: countyId || undefined,
        candidateId: candidateId || undefined,
        partyId: partyId || undefined,
        page,
        size,
        sort,
      }),
    staleTime: 10_000,
    retry: 1,
  });

  const rows: CandidateCountyStatsOfficialRow[] = q.data?.content ?? [];

  // ✅ Candidate dropdown options (only after contest selected)
  const candidateOptions: CandidateOpt[] = useMemo(() => {
    if (!contestId) return [];
    const m = new Map<string, string>();
    for (const r of rows as any[]) {
      const id = String(r.candidateId ?? "");
      const name = String(r.candidateName ?? "");
      if (id && name && !m.has(id)) m.set(id, name);
    }
    return Array.from(m.entries())
      .map(([candidateId, candidateName]) => ({ candidateId, candidateName }))
      .sort((a, b) => a.candidateName.localeCompare(b.candidateName));
  }, [rows, contestId]);

  // handlers
  const onContestChange = (nextContestId: string) =>
    setSP(searchParams, setSearchParams, { contestId: nextContestId || undefined, candidateId: undefined }, { resetPage: true });

  const onCountyChange = (nextCountyId: string) =>
    setSP(searchParams, setSearchParams, { countyId: nextCountyId || undefined }, { resetPage: true });

  const onCandidateChange = (nextCandidateId: string) =>
    setSP(searchParams, setSearchParams, { candidateId: nextCandidateId || undefined }, { resetPage: true });

  const clearCandidate = () => setSP(searchParams, setSearchParams, { candidateId: undefined }, { resetPage: true });

  const setPage = (next: number) => setSP(searchParams, setSearchParams, { page: String(Math.max(0, next)) });

  if (!electionId) {
    return (
      <Panel title="Official Results • Candidates by County">
        <PlaceholderNote title="Election not selected" bullets={["Open this page from an election workspace route."]} />
      </Panel>
    );
  }

  return (
    <Panel
      title="Official Results • Candidates by County"
      right={
        <div className="flex flex-wrap items-center gap-2 justify-end">
          <select
            value={contestId}
            onChange={(e) => onContestChange(e.target.value)}
            className="h-9 min-w-[240px] rounded-xl border border-slate-300 bg-white px-3 text-base font-bold text-slate-900"
            disabled={contestsQ.isLoading || contestsQ.isError}
            title="Filter by contest (optional)"
          >
            <option value="">{contestsQ.isLoading ? "Loading contests…" : "All contests"}</option>
            {contests.map((c: any) => (
              <option key={c.contestId} value={c.contestId}>
                {c.contestName}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => q.refetch()}
            className="h-9 rounded-xl border bg-white px-3 text-base font-extrabold hover:bg-slate-50"
            disabled={q.isFetching}
          >
            Refresh
          </button>
        </div>
      }
    >
      {/* Filters */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <select
          value={countyId}
          onChange={(e) => onCountyChange(e.target.value)}
          className="h-9 rounded-xl border bg-white px-3 text-base font-bold"
          title="County"
        >
          <option value="">All counties</option>
          {counties.map((c: any) => (
            <option key={c.countyId} value={c.countyId}>
              {c.countyName}
            </option>
          ))}
        </select>

        <select
          value={candidateId}
          onChange={(e) => onCandidateChange(e.target.value)}
          className="h-9 min-w-[260px] rounded-xl border bg-white px-3 text-base font-bold disabled:bg-slate-50"
          disabled={!contestId || q.isFetching}
          title={!contestId ? "Select a contest first to filter by candidate" : "Filter by a single candidate"}
        >
          <option value="">{!contestId ? "Select contest first…" : "All candidates"}</option>
          {candidateOptions.map((c) => (
            <option key={c.candidateId} value={c.candidateId}>
              {c.candidateName}
            </option>
          ))}
        </select>

        {candidateId ? (
          <button
            type="button"
            onClick={clearCandidate}
            className="h-9 rounded-xl border bg-white px-3 text-sm font-extrabold hover:bg-slate-50"
          >
            Clear Candidate
          </button>
        ) : null}

        <div className="ml-auto text-xs font-bold text-slate-600">
          {q.isFetching ? "Loading…" : `Rows: ${rows.length} • Page: ${(q.data?.number ?? page) + 1} / ${q.data?.totalPages ?? "?"}`}
        </div>
      </div>

      {q.isLoading ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
          Loading official candidate county results…
        </div>
      ) : q.isError ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          {(q.error as any)?.response?.data?.message ?? (q.error as Error)?.message ?? "Failed to load."}
        </div>
      ) : rows.length === 0 ? (
        <PlaceholderNote
          title="No official county results found"
          bullets={[
            "Confirm NEC has published results for this election/contest.",
            "Try switching to All contests, or remove the candidate filter.",
          ]}
        />
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="min-w-full table-fixed text-base">
              <thead className="bg-slate-50 text-slate-700">
                <tr>
                  <Th className="w-[160px]"><SortBtn onClick={() => toggleSort("countyName")}>County</SortBtn></Th>
                  <Th className="w-[190px]"><SortBtn onClick={() => toggleSort("candidateName")}>Candidate</SortBtn></Th>
                  <Th className="w-[170px]"><SortBtn onClick={() => toggleSort("partyName")}>Party</SortBtn></Th>

                  <Th className="w-[110px] text-right"><SortBtn onClick={() => toggleSort("candidateVotes")}>Votes/Valid</SortBtn></Th>
                  <Th className="w-[70px] text-right"><SortBtn onClick={() => toggleSort("voteSharePct")}>Vote %</SortBtn></Th>

                  <Th className="w-[80px] text-right"><SortBtn onClick={() => toggleSort("ballotsCast")}>Cast</SortBtn></Th>
                  <Th className="w-[85px] text-right"><SortBtn onClick={() => toggleSort("totalInvalidVotes")}>Invalid</SortBtn></Th>

                  <Th className="w-[55px] text-center"><SortBtn onClick={() => toggleSort("rankInCounty")}>Rank</SortBtn></Th>
                  <Th className="w-[65px] text-center"><SortBtn onClick={() => toggleSort("isCountyWinner")}>Winner</SortBtn></Th>
                  <Th className="w-[75px] text-right"><SortBtn onClick={() => toggleSort("marginVotes")}>Margin</SortBtn></Th>

                  {!contestId ? <Th className="w-[140px]">Contest</Th> : null}
                </tr>
              </thead>

              <tbody>
                {rows.map((r: any) => {
                  const isWin = Boolean(r.isCountyWinner) || Number(r.rankInCounty) === 1;
                  const contestName = contestNameById.get(String(r.contestId)) ?? String(r.contestId ?? "—");

                  return (
                    <tr key={`${r.contestId}-${r.countyId}-${r.candidateId}`} className="hover:bg-slate-50">
                      <Td className="truncate" title={r.countyName}>{r.countyName}</Td>
                      <Td className="truncate" title={r.candidateName}>{r.candidateName}</Td>

                      <Td className="truncate" title={r.partyName ?? "INDEPENDENT"}>
                        {r.partyName ?? "INDEPENDENT"} {r.partyCode ? `(${r.partyCode})` : ""}
                      </Td>

                      <Td className="text-right font-extrabold tabular-nums whitespace-nowrap">
                        {ratioLabel(r.candidateVotes, r.totalValidVotes)}
                      </Td>

                      <Td className="text-right tabular-nums whitespace-nowrap">{fmtPct(r.voteSharePct)}</Td>

                      <Td className="text-right tabular-nums whitespace-nowrap">{fmtNum(r.ballotsCast)}</Td>
                      <Td className="text-right tabular-nums whitespace-nowrap">{fmtNum(r.totalInvalidVotes)}</Td>

                      <Td className="text-center font-extrabold tabular-nums whitespace-nowrap">
                        {r.rankInCounty ?? "—"}
                      </Td>

                      <Td className="text-center">
                        {isWin ? (
                          <span className="inline-flex items-center justify-center" title="Top candidate in this county">
                            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                          </span>
                        ) : (
                          <span className="text-slate-300" title="Not the top candidate">—</span>
                        )}
                      </Td>

                      <Td className="text-right font-bold tabular-nums whitespace-nowrap" title="Votes behind winner">
                        {r.marginVotes == null ? "—" : fmtNum(r.marginVotes)}
                      </Td>

                      {!contestId ? <Td className="truncate" title={contestName}>{contestName}</Td> : null}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <div className="text-sm text-slate-600">
              Page <span className="font-bold">{(q.data?.number ?? 0) + 1}</span> of{" "}
              <span className="font-bold">{q.data?.totalPages ?? 1}</span> •{" "}
              <span className="font-bold">{q.data?.totalElements ?? 0}</span> total rows
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage(page - 1)}
                disabled={Boolean(q.data?.first) || q.isFetching}
                className={`h-9 rounded-xl border bg-white px-3 text-sm font-extrabold ${
                  q.data?.first || q.isFetching ? "opacity-50" : "hover:bg-slate-50"
                }`}
              >
                Prev
              </button>
              <button
                type="button"
                onClick={() => setPage(page + 1)}
                disabled={Boolean(q.data?.last) || q.isFetching}
                className={`h-9 rounded-xl border bg-white px-3 text-sm font-extrabold ${
                  q.data?.last || q.isFetching ? "opacity-50" : "hover:bg-slate-50"
                }`}
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}

      <div className="mt-3 text-lg text-slate-500">
        Data source: <code>v_candidate_county_stats_official</code>
      </div>
    </Panel>
  );
}

function Th(props: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return <th {...props} className={`border-b px-2 py-1 text-left text-xl font-extrabold ${props.className ?? ""}`} />;
}
function Td(props: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return <td {...props} className={`border-b px-2 py-1 align-top ${props.className ?? ""}`} />;
}
function SortBtn(props: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={props.onClick} className="font-extrabold hover:underline">
      {props.children}
    </button>
  );
}

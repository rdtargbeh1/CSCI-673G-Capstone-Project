

import React, { useEffect, useMemo, useState } from "react";
import { useOutletContext, useParams, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import { useAuth } from "../../../../../../auth/useAuth";
import { useAuthStore } from "../../../../../../shared/store/authStore";
import { Panel, PlaceholderNote } from "../../../../shared/elections-ui";

import { listContestsByElection } from "../../../../../../shared/services/contestService";
import type { ContestDto } from "../../../../../../auth/contestTypes";

import { fetchCounties, type CountyDto } from "../../../../../../shared/services/countyService";

import {
  searchCandidateCountyCompare,
  type CandidateCountyCompareRow,
} from "../../../../../../shared/services/stats/candidateCountyCompareService";

/** ✅ ResultsTab passes orgId via Outlet context for SYSTEM */
type ResultsOutletCtx = { orgId?: string };

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

function badgeClass(diff: number) {
  if (!isFinite(diff)) return "bg-slate-100 text-slate-700 border-slate-200";
  if (diff === 0) return "bg-slate-100 text-slate-700 border-slate-200";
  if (diff > 0) return "bg-emerald-50 text-emerald-800 border-emerald-200";
  return "bg-rose-50 text-rose-800 border-rose-200";
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

export default function CompareCountyCandidatesPage() {
  const { electionId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const auth: any = useAuth();

  // ✅ SYSTEM org scope (match VoteTally / Party pages)
  const outlet = useOutletContext<ResultsOutletCtx>();
  const outletOrgId = String(outlet?.orgId ?? "").trim();

  const dashboardModeStore = useAuthStore((s: any) => s.dashboardMode);
  const mode = String((dashboardModeStore ?? auth?.dashboardMode ?? "") as any).toUpperCase(); // NEC | TENANT | SYSTEM

  const storeOrgId = String(useAuthStore((s: any) => s.currentOrgId ?? "") ?? "").trim();
  const fallbackOrgId = String(useAuthStore.getState().tenantMeta?.orgId ?? auth?.tenant?.orgId ?? "").trim();

  const orgId = outletOrgId || storeOrgId || fallbackOrgId || "";

  // ✅ query params
  const contestId = searchParams.get("contestId") ?? ""; // optional
  const countyId = searchParams.get("countyId") ?? "";
  const candidateId = searchParams.get("candidateId") ?? "";
  const partyId = searchParams.get("partyId") ?? "";

  // paging
  const page = Number(searchParams.get("page") ?? "0");
  const size = Number(searchParams.get("size") ?? "25");

  // sorting
  const [sort, setSort] = useState<string[]>([
    "diffVotes,desc",
    "countyName,asc",
    "candidateName,asc",
  ]);

  // ✅ when candidate selected: keep stable sort
  useEffect(() => {
    if (!candidateId) return;
    setSort(["diffVotes,desc", "countyName,asc", "candidateName,asc"]);
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
        "partyCandidateVotes",
        "officialCandidateVotes",
        "diffVotes",
        "partyVoteSharePct",
        "officialVoteSharePct",
        "diffVoteSharePct",
      ]);
      setSort([`${field},${numeric.has(field) ? "desc" : "asc"}`, ...sort]);
    }
    setSP(searchParams, setSearchParams, {}, { resetPage: true });
  }

  // ----------------------------
  // 1) Contests
  // ----------------------------
  const contestsQ = useQuery({
    queryKey: ["contests", "by-election", electionId],
    enabled: Boolean(electionId),
    queryFn: async () => listContestsByElection(String(electionId)),
    staleTime: 60_000,
    retry: 1,
  });

  const contests: ContestDto[] = contestsQ.data ?? [];

  // ----------------------------
  // 2) Counties (for filter)
  // ✅ include orgId for SYSTEM
  // ----------------------------
  const countiesQ = useQuery<CountyDto[]>({
    queryKey: ["counties", mode, orgId],
    enabled: Boolean(orgId) || mode !== "SYSTEM",
    queryFn: async () =>
      (await fetchCounties({ page: 0, size: 500, orgId: mode === "SYSTEM" ? orgId : undefined } as any))
        .items as CountyDto[],
    staleTime: 60_000,
    retry: 1,
  });

  const counties = countiesQ.data ?? [];

  // ----------------------------
  // 3) Compare query
  // ----------------------------
  const enabled = Boolean(electionId) && Boolean(orgId);

  const q = useQuery({
    queryKey: [
      "stats",
      "compare",
      "candidate-county",
      orgId,
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
      searchCandidateCountyCompare({
        // server derives org from security if available; but SYSTEM often needs this
        orgId,
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

  const rows: CandidateCountyCompareRow[] = q.data?.content ?? [];

  // ✅ Candidate dropdown options (only after contest is selected, like your other pages)
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

  if (!orgId) {
    return (
      <Panel title="Compare • County Candidates (Party vs Official)">
        <PlaceholderNote
          title="Select an Organization first"
          bullets={[
            "Compare views are tenant-scoped and require orgId.",
            "If you are on SYSTEM dashboard, choose an organization from the Results header dropdown.",
          ]}
        />
      </Panel>
    );
  }

  // ----------------------------
  // 4) UI handlers
  // ----------------------------
  const onContestChange = (nextContestId: string) =>
    setSP(searchParams, setSearchParams, { contestId: nextContestId || undefined, candidateId: undefined }, { resetPage: true });

  const onCountyChange = (nextCountyId: string) =>
    setSP(searchParams, setSearchParams, { countyId: nextCountyId || undefined }, { resetPage: true });

  const onCandidateChange = (nextCandidateId: string) =>
    setSP(searchParams, setSearchParams, { candidateId: nextCandidateId || undefined }, { resetPage: true });

  const clearCounty = () => setSP(searchParams, setSearchParams, { countyId: undefined }, { resetPage: true });
  const clearCandidate = () => setSP(searchParams, setSearchParams, { candidateId: undefined }, { resetPage: true });

  const setPage = (next: number) => setSP(searchParams, setSearchParams, { page: String(Math.max(0, next)) });

  return (
    <Panel
      title="Compare • County Candidates (Party vs Official)"
      right={
        <div className="flex flex-wrap items-center gap-2 justify-end">
          <select
            value={contestId}
            onChange={(e) => onContestChange(e.target.value)}
            className="h-9 min-w-[260px] rounded-xl border border-slate-300 bg-white px-3 text-lg font-bold text-slate-900"
            disabled={contestsQ.isLoading || contestsQ.isError || !electionId}
            title="Filter by contest (optional)"
          >
            <option value="">
              {contestsQ.isLoading ? "Loading contests…" : !electionId ? "Election not selected" : "All contests"}
            </option>
            {contests.map((c: any) => (
              <option key={c.contestId} value={c.contestId}>
                {c.contestName}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => q.refetch()}
            className="h-9 rounded-xl border bg-white px-3 text-lg font-extrabold hover:bg-slate-50"
            disabled={q.isFetching}
          >
            Refresh
          </button>
        </div>
      }
    >
      {/* Filters row */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <select
          value={countyId}
          onChange={(e) => onCountyChange(e.target.value)}
          className="h-9 rounded-xl border bg-white px-3 text-lg font-bold"
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
          className="h-9 min-w-[260px] rounded-xl border bg-white px-3 text-lg font-bold disabled:bg-slate-50"
          disabled={!contestId || q.isFetching}
          title={!contestId ? "Select a contest first to filter by candidate" : "Filter by candidate"}
        >
          <option value="">{!contestId ? "Select contest first…" : "All candidates"}</option>
          {candidateOptions.map((c) => (
            <option key={c.candidateId} value={c.candidateId}>
              {c.candidateName}
            </option>
          ))}
        </select>

        {countyId ? (
          <button
            type="button"
            onClick={clearCounty}
            className="h-9 rounded-xl border bg-white px-3 text-sm font-extrabold hover:bg-slate-50"
          >
            Clear County
          </button>
        ) : null}

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
          Loading compare results…
        </div>
      ) : q.isError ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-base text-rose-800">
          {(q.error as any)?.response?.data?.message ?? (q.error as Error)?.message ?? "Failed to load."}
        </div>
      ) : rows.length === 0 ? (
        <PlaceholderNote
          title="No results found"
          bullets={[
            "The election may not have both Party + Official datasets available yet.",
            "Try removing county/candidate filters or select a contest.",
          ]}
        />
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="min-w-full table-fixed text-lg">
              <thead className="bg-slate-50 text-slate-700">
                <tr>
                  <Th className="w-[140px]"><SortBtn onClick={() => toggleSort("countyName")}>County</SortBtn></Th>

                  <Th className="w-[200px]"><SortBtn onClick={() => toggleSort("candidateName")}>Candidate</SortBtn></Th>
                  <Th className="w-[160px]"><SortBtn onClick={() => toggleSort("partyName")}>Party</SortBtn></Th>

                  <Th className="w-[105px] text-right"><SortBtn onClick={() => toggleSort("partyCandidateVotes")}>Party Votes</SortBtn></Th>
                  <Th className="w-[110px] text-right"><SortBtn onClick={() => toggleSort("officialCandidateVotes")}>Official Votes</SortBtn></Th>

                  <Th className="w-[90px] text-right"><SortBtn onClick={() => toggleSort("diffVotes")}>Diff</SortBtn></Th>

                  <Th className="w-[85px] text-right"><SortBtn onClick={() => toggleSort("partyVoteSharePct")}>Party %</SortBtn></Th>
                  <Th className="w-[95px] text-right"><SortBtn onClick={() => toggleSort("officialVoteSharePct")}>Official %</SortBtn></Th>

                  <Th className="w-[85px] text-right"><SortBtn onClick={() => toggleSort("diffVoteSharePct")}>Diff %</SortBtn></Th>
                </tr>
              </thead>

              <tbody>
                {rows.map((r: any) => {
                  const diff = Number(r.diffVotes ?? 0);

                  return (
                    <tr
                      key={`${r.countyId ?? "x"}-${r.candidateId ?? "y"}`}
                      className="hover:bg-slate-50"
                    >
                      <Td className="truncate" title={r.countyName}>{r.countyName ?? "—"}</Td>

                      <Td className="truncate" title={r.candidateName}>{r.candidateName ?? "—"}</Td>

                      <Td className="truncate" title={r.partyName ?? "INDEPENDENT"}>
                        {r.partyName ?? "INDEPENDENT"} {r.partyCode ? `(${r.partyCode})` : ""}
                      </Td>

                      <Td className="text-right tabular-nums whitespace-nowrap">{fmtNum(r.partyCandidateVotes)}</Td>
                      <Td className="text-right tabular-nums whitespace-nowrap">{fmtNum(r.officialCandidateVotes)}</Td>

                      <Td className="text-right tabular-nums whitespace-nowrap">
                        <span
                          className={[
                            "inline-flex items-center rounded-full border px-2 py-1 text-[11px] font-extrabold",
                            badgeClass(diff),
                          ].join(" ")}
                          title="Party - Official"
                        >
                          {diff > 0 ? "+" : ""}
                          {isFinite(diff) ? diff.toLocaleString() : "—"}
                        </span>
                      </Td>

                      <Td className="text-right tabular-nums whitespace-nowrap">{fmtPct(r.partyVoteSharePct)}</Td>
                      <Td className="text-right tabular-nums whitespace-nowrap">{fmtPct(r.officialVoteSharePct)}</Td>

                      <Td className="text-right tabular-nums whitespace-nowrap">{fmtPct(r.diffVoteSharePct)}</Td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <div className="text-xs text-slate-600">
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

      <div className="mt-3 text-xs text-slate-500">
        Data source: <code>v_candidate_county_compare</code>
      </div>
    </Panel>
  );
}

/** ---------- tiny table helpers (tight padding) ---------- */
function Th(props: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      {...props}
      className={`border-b px-2 py-1 text-left text-lg font-extrabold ${props.className ?? ""}`}
    />
  );
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

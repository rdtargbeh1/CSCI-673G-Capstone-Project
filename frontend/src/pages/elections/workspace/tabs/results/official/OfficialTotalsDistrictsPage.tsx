
// ✅ FILE: src/pages/elections/workspace/tabs/results/official/totals/OfficialTotalsDistrictPage.tsx

import React, { useMemo, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import { Panel, PlaceholderNote } from "../../../../shared/elections-ui";

import { listContestsByElection } from "../../../../../../shared/services/contestService";
import type { ContestDto } from "../../../../../../auth/contestTypes";

import { fetchCounties, type CountyDto } from "../../../../../../shared/services/countyService";
import { fetchDistrictsByCounty, type DistrictDto } from "../../../../../../shared/services/districtService";

import {
  searchDistrictStatsOfficial,
  type DistrictStatsOfficialRow,
} from "../../../../../../shared/services/stats/districtStatsOfficialService";

function fmtPct(n: any) {
  const v = Number(n);
  if (!isFinite(v)) return "—";
  return `${Math.max(0, Math.min(100, v)).toFixed(2)}%`;
}

function fmtNum(n: any) {
  const v = Number(n);
  if (!isFinite(v)) return "—";
  return v.toLocaleString();
}

/** ✅ "reported/total" like 3/12 */
function fmtReportedOverTotal(reported: any, total: any) {
  const r = Number(reported);
  const t = Number(total);

  const rr = isFinite(r) && r >= 0 ? r : 0;
  const tt = isFinite(t) && t >= 0 ? t : 0;

  if (rr === 0 && tt === 0) return "—";
  return `${rr}/${tt}`;
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

export default function OfficialTotalsDistrictsPage() {
  const { electionId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();

  const contestId = searchParams.get("contestId") ?? "";
  const countyId = searchParams.get("countyId") ?? "";
  const districtId = searchParams.get("districtId") ?? "";

  const page = Number(searchParams.get("page") ?? "0");
  const size = Number(searchParams.get("size") ?? "25");

  const [sort, setSort] = useState<string[]>([
    "countyName,asc",
    "districtName,asc",
  ]);

  function toggleSort(field: string) {
    const primary = sort?.[0] ?? "";
    const [curField, curDir] = primary.split(",");

    if (curField === field) {
      const nextDir = (curDir ?? "asc").toLowerCase() === "asc" ? "desc" : "asc";
      setSort([`${field},${nextDir}`, ...sort.slice(1)]);
    } else {
      const numeric = new Set([
        "registeredVoters",
        "ballotsCast",
        "validVotes",
        "validPct",
        "invalidTotal",
        "turnoutPct",
        "invalidPct",
        "centersReported",
        "centersTotal",
        "reportingPct",
        "centersStarted",
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
  // 2) Geo filters
  // ----------------------------
  const countiesQ = useQuery<CountyDto[]>({
    queryKey: ["counties", "official", electionId],
    enabled: Boolean(electionId),
    queryFn: async () =>
      (await fetchCounties({ page: 0, size: 500 } as any)).items as CountyDto[],
    staleTime: 60_000,
    retry: 1,
  });
  const counties = countiesQ.data ?? [];

  const districtsQ = useQuery<DistrictDto[]>({
    enabled: Boolean(countyId),
    queryKey: ["districts", "by-county", "official", countyId],
    queryFn: async () => (await fetchDistrictsByCounty(countyId)) as any,
    staleTime: 60_000,
    retry: 1,
  });
  const districts = districtsQ.data ?? [];

  // ----------------------------
  // 3) Stats query
  // ----------------------------
  const statsEnabled = useMemo(() => Boolean(electionId), [electionId]);

  const q = useQuery({
    queryKey: [
      "stats",
      "official",
      "districts",
      electionId,
      contestId || "ALL",
      countyId,
      districtId,
      page,
      size,
      sort,
    ],
    enabled: statsEnabled,
    queryFn: async () =>
      searchDistrictStatsOfficial({
        electionId: String(electionId),
        contestId: contestId ? String(contestId) : undefined, // ✅ optional
        countyId: countyId || undefined,
        districtId: districtId || undefined,
        page,
        size,
        sort,
      }),
    staleTime: 10_000,
    retry: 1,
  });

  const rows: DistrictStatsOfficialRow[] = q.data?.content ?? [];

  if (!electionId) {
    return (
      <Panel title="Official Totals • Districts">
        <PlaceholderNote
          title="Election not selected"
          bullets={["Select an election to view official totals."]}
        />
      </Panel>
    );
  }

  // ----------------------------
  // 4) UI handlers
  // ----------------------------
  const onContestChange = (nextContestId: string) =>
    setSP(searchParams, setSearchParams, { contestId: nextContestId || undefined }, { resetPage: true });

  const onCountyChange = (nextCountyId: string) =>
    setSP(
      searchParams,
      setSearchParams,
      { countyId: nextCountyId || undefined, districtId: undefined },
      { resetPage: true }
    );

  const onDistrictChange = (nextDistrictId: string) =>
    setSP(searchParams, setSearchParams, { districtId: nextDistrictId || undefined }, { resetPage: true });

  const clearGeo = () =>
    setSP(searchParams, setSearchParams, { countyId: undefined, districtId: undefined }, { resetPage: true });

  const setPage = (next: number) =>
    setSP(searchParams, setSearchParams, { page: String(Math.max(0, next)) });

  return (
    <Panel
      title="Official Totals • Districts"
      right={
        <div className="flex flex-wrap items-center gap-2 justify-end">
          <select
            value={contestId}
            onChange={(e) => onContestChange(e.target.value)}
            className="h-9 min-w-[240px] rounded-xl border border-slate-300 bg-white px-3 text-base font-bold text-slate-900"
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
            className="h-9 rounded-xl border bg-white px-3 text-base font-extrabold hover:bg-slate-50"
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
          className="h-9 min-w-[240px] rounded-xl border bg-white px-3 text-base font-bold"
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
          value={districtId}
          onChange={(e) => onDistrictChange(e.target.value)}
          className="h-9 min-w-[240px] rounded-xl border bg-white px-3 text-base font-bold disabled:bg-slate-50"
          disabled={!countyId}
          title="District"
        >
          <option value="">All districts</option>
          {districts.map((d: any) => (
            <option key={d.districtId} value={d.districtId}>
              {d.districtName}
            </option>
          ))}
        </select>

        {(countyId || districtId) ? (
          <button
            type="button"
            onClick={clearGeo}
            className="h-9 rounded-xl border bg-white px-3 text-sm font-extrabold hover:bg-slate-50"
          >
            Clear Geo
          </button>
        ) : null}

        <div className="ml-auto text-xs font-bold text-slate-600">
          {q.isFetching
            ? "Loading…"
            : `Rows: ${rows.length} • Page: ${(q.data?.number ?? page) + 1} / ${q.data?.totalPages ?? "?"}`}
        </div>
      </div>

      {q.isLoading ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
          Loading official district totals…
        </div>
      ) : q.isError ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          {(q.error as any)?.response?.data?.message ?? (q.error as Error)?.message ?? "Failed to load."}
        </div>
      ) : rows.length === 0 ? (
        <PlaceholderNote
          title="No results found"
          bullets={[
            "This election may not have official totals yet for the selected filters.",
            "Try removing geo filters, or choose a different contest.",
          ]}
        />
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="min-w-full table-fixed text-base">
              <thead className="bg-slate-50 text-slate-700">
                <tr>
                  <Th className="w-[150px]"><SortBtn onClick={() => toggleSort("countyName")}>County</SortBtn></Th>
                  <Th className="w-[160px]"><SortBtn onClick={() => toggleSort("districtName")}>District</SortBtn></Th>

                  <Th className="w-[85px] text-right"><SortBtn onClick={() => toggleSort("registeredVoters")}>Reg</SortBtn></Th>
                  <Th className="w-[85px] text-right"><SortBtn onClick={() => toggleSort("ballotsCast")}>Cast</SortBtn></Th>
                  <Th className="w-[85px] text-right"><SortBtn onClick={() => toggleSort("validVotes")}>Valid</SortBtn></Th>
                  <Th className="w-[85px] text-right"><SortBtn onClick={() => toggleSort("validPct")}>Valid%</SortBtn></Th>
                  <Th className="w-[85px] text-right"><SortBtn onClick={() => toggleSort("invalidTotal")}>Invalid</SortBtn></Th>

                  <Th className="w-[85px] text-right"><SortBtn onClick={() => toggleSort("turnoutPct")}>Turn%</SortBtn></Th>
                  <Th className="w-[85px] text-right"><SortBtn onClick={() => toggleSort("invalidPct")}>Invalid%</SortBtn></Th>

                  {/* ✅ DTO fields: centersReported/centersTotal/reportingPct/centersStarted */}
                  <Th className="w-[90px] text-right">
                    <SortBtn onClick={() => toggleSort("centersReported")}>Reported</SortBtn>
                  </Th>
                  <Th className="w-[85px] text-right">
                    <SortBtn onClick={() => toggleSort("reportingPct")}>Reptd%</SortBtn>
                  </Th>
                  <Th className="w-[85px] text-right">
                    <SortBtn onClick={() => toggleSort("centersStarted")}>Started</SortBtn>
                  </Th>
                </tr>
              </thead>

              <tbody>
                {rows.map((r: any) => (
                  <tr key={`${r.contestId ?? "ALL"}-${r.districtId}`} className="hover:bg-slate-50">
                    <Td className="truncate" title={r.countyName}>{r.countyName ?? "—"}</Td>
                    <Td className="truncate" title={r.districtName}>{r.districtName ?? "—"}</Td>

                    <Td className="text-right tabular-nums whitespace-nowrap">{fmtNum(r.registeredVoters)}</Td>
                    <Td className="text-right tabular-nums whitespace-nowrap">{fmtNum(r.ballotsCast)}</Td>
                    <Td className="text-right tabular-nums whitespace-nowrap">{fmtNum(r.validVotes)}</Td>
                    <Td className="text-right tabular-nums whitespace-nowrap">
                      {fmtPct(r.validVotes && r.ballotsCast ? (r.validVotes / r.ballotsCast) * 100 : null)}
                    </Td>
                    <Td className="text-right tabular-nums whitespace-nowrap">{fmtNum(r.invalidTotal)}</Td>

                    <Td className="text-right tabular-nums whitespace-nowrap">{fmtPct(r.turnoutPct)}</Td>
                    <Td className="text-right tabular-nums whitespace-nowrap">{fmtPct(r.invalidPct)}</Td>

                    <Td
                      className="text-right tabular-nums whitespace-nowrap font-extrabold"
                      title={`${fmtNum(r.centersReported)} reported out of ${fmtNum(r.centersTotal)} centers`}
                    >
                      {fmtReportedOverTotal(r.centersReported, r.centersTotal)}
                    </Td>

                    <Td className="text-right tabular-nums whitespace-nowrap">{fmtPct(r.reportingPct)}</Td>

                    <Td className="text-right tabular-nums whitespace-nowrap">{fmtNum(r.centersStarted)}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
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

          <div className="mt-3 text-lg text-slate-500">
            Data source: <code>v_district_stats_official</code>
          </div>
        </>
      )}
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


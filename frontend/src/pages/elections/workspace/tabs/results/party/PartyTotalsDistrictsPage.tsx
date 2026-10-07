


// ✅ FILE: src/pages/elections/workspace/tabs/results/party/totals/PartyTotalsDistrictsPage.tsx

import React, { useState } from "react";
import { useOutletContext, useParams, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import { useAuth } from "../../../../../../auth/useAuth";
import { useAuthStore } from "../../../../../../shared/store/authStore";
import { Panel, PlaceholderNote } from "../../../../shared/elections-ui";

import { listContestsByElection } from "../../../../../../shared/services/contestService";
import type { ContestDto } from "../../../../../../auth/contestTypes";

import { fetchCounties, type CountyDto } from "../../../../../../shared/services/countyService";
import { fetchDistrictsByCounty, type DistrictDto } from "../../../../../../shared/services/districtService";

import {
  searchDistrictStatsParty,
  type DistrictStatsPartyRow,
} from "../../../../../../shared/services/stats/districtStatsPartyService";

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

/** ✅ NEW: "reported/total" like 1/3 */
function fmtRepOverTotal(reported: any, total: any) {
  const r = Number(reported);
  const t = Number(total);

  const rr = isFinite(r) && r >= 0 ? r : 0;
  const tt = isFinite(t) && t >= 0 ? t : 0;

  if (rr === 0 && tt === 0) return "—";
  return `${rr}/${tt}`;
}

/** ✅ NEW: derive Valid% on frontend = validVotes / ballotsCast * 100 */
function deriveValidPct(validVotes: any, ballotsCast: any) {
  const v = Number(validVotes);
  const c = Number(ballotsCast);
  if (!isFinite(v) || !isFinite(c) || c <= 0) return NaN;
  return (v / c) * 100;
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

export default function PartyTotalsDistrictsPage() {
  const { electionId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const auth: any = useAuth();

  // ✅ SYSTEM org scope (match VoteTallyPage / PartyCandidateCentersPage)
  const outlet = useOutletContext<ResultsOutletCtx>();
  const outletOrgId = String(outlet?.orgId ?? "").trim();

  const dashboardModeStore = useAuthStore((s: any) => s.dashboardMode);
  const mode = String((dashboardModeStore ?? auth?.dashboardMode ?? "") as any).toUpperCase(); // NEC | TENANT | SYSTEM

  const storeOrgId = String(useAuthStore((s: any) => s.currentOrgId ?? "") ?? "").trim();

  const fallbackOrgId = String(
    useAuthStore.getState().tenantMeta?.orgId ?? auth?.tenant?.orgId ?? ""
  ).trim();

  // ✅ effective orgId
  const orgId = outletOrgId || storeOrgId || fallbackOrgId || "";

  // ✅ Query params
  const contestId = searchParams.get("contestId") ?? ""; // optional
  const countyId = searchParams.get("countyId") ?? "";
  const districtId = searchParams.get("districtId") ?? "";

  // paging
  const page = Number(searchParams.get("page") ?? "0");
  const size = Number(searchParams.get("size") ?? "25");

  // sorting
  const [sort, setSort] = useState<string[]>([
    "ballotsCast,desc",
    "turnoutPct,desc",
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
        "invalidTotal",
        "turnoutPct",
        "invalidPct",
        // ✅ NEW reporting fields
        "centersTotal",
        "centersReported",
        "reportingPct",
        "centersStarted",
      ]);
      setSort([`${field},${numeric.has(field) ? "desc" : "asc"}`, ...sort]);
    }
    setSP(searchParams, setSearchParams, {}, { resetPage: true });
  }

  // ----------------------------
  // 1) Contests (optional filter)
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
  // 2) Geo filters (County -> District)
  // ✅ pass orgId for SYSTEM so geo data works when org selected
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

  const districtsQ = useQuery<DistrictDto[]>({
    enabled: Boolean(countyId) && (Boolean(orgId) || mode !== "SYSTEM"),
    queryKey: ["districts", "by-county", mode, orgId, countyId],
    queryFn: async () => (await fetchDistrictsByCounty(countyId)) as any,
    staleTime: 60_000,
    retry: 1,
  });
  const districts = districtsQ.data ?? [];

  // ----------------------------
  // 3) Stats query
  // ----------------------------
  const enabled = Boolean(electionId) && Boolean(orgId);

  const q = useQuery({
    queryKey: [
      "stats",
      "party",
      "districts",
      orgId,
      electionId,
      contestId || "ALL",
      countyId,
      districtId,
      page,
      size,
      sort,
    ],
    enabled,
    queryFn: async () =>
      searchDistrictStatsParty({
        orgId,
        electionId: String(electionId),
        contestId: contestId ? String(contestId) : undefined,
        countyId: countyId || undefined,
        districtId: districtId || undefined,
        page,
        size,
        sort,
      }),
    staleTime: 10_000,
    retry: 1,
  });

  const rows: DistrictStatsPartyRow[] = q.data?.content ?? [];

  if (!orgId) {
    return (
      <Panel title="Party Totals • Districts">
        <PlaceholderNote
          title="Select an Organization first"
          bullets={[
            "This view is tenant-scoped and requires orgId.",
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

  const setPage = (next: number) => setSP(searchParams, setSearchParams, { page: String(Math.max(0, next)) });

  return (
    <Panel
      title="Local Totals • Districts"
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
          value={districtId}
          onChange={(e) => onDistrictChange(e.target.value)}
          className="h-9 min-w-[220px] rounded-xl border bg-white px-3 text-base font-bold disabled:bg-slate-50"
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

        <div className="ml-auto text-sm font-bold text-slate-600">
          {q.isFetching
            ? "Loading…"
            : `Rows: ${rows.length} • Page: ${(q.data?.number ?? page) + 1} / ${q.data?.totalPages ?? "?"}`}
        </div>
      </div>

      {q.isLoading ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
          Loading district totals…
        </div>
      ) : q.isError ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-base text-rose-800">
          {(q.error as any)?.response?.data?.message ?? (q.error as Error)?.message ?? "Failed to load."}
        </div>
      ) : rows.length === 0 ? (
        <PlaceholderNote
          title="No results found"
          bullets={[
            "This election may not have verified tallies yet for the selected org/filters.",
            "Try removing geo filters, or choose a different contest.",
          ]}
        />
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="min-w-full table-fixed text-base">
              <thead className="bg-slate-50 text-slate-700">
                <tr>
                  <Th className="w-[140px]">
                    <SortBtn onClick={() => toggleSort("countyName")}>County</SortBtn>
                  </Th>
                  <Th className="w-[170px]">
                    <SortBtn onClick={() => toggleSort("districtName")}>District</SortBtn>
                  </Th>

                  <Th className="w-[100px] text-right">
                    <SortBtn onClick={() => toggleSort("registeredVoters")}>Registered</SortBtn>
                  </Th>
                  <Th className="w-[95px] text-right">
                    <SortBtn onClick={() => toggleSort("ballotsCast")}>Ballot Casst</SortBtn>
                  </Th>
                  <Th className="w-[85px] text-right">
                    <SortBtn onClick={() => toggleSort("validVotes")}>Valid</SortBtn>
                  </Th>

                  {/* ✅ NEW: derived Valid% */}
                  <Th className="w-[85px] text-right">Valid%</Th>

                  <Th className="w-[85px] text-right">
                    <SortBtn onClick={() => toggleSort("invalidTotal")}>Invalid</SortBtn>
                  </Th>
                  <Th className="w-[85px] text-right">
                    <SortBtn onClick={() => toggleSort("turnoutPct")}>Turnout%</SortBtn>
                  </Th>
                  <Th className="w-[85px] text-right">
                    <SortBtn onClick={() => toggleSort("invalidPct")}>Invalid%</SortBtn>
                  </Th>

                  {/* ✅ NEW: reporting for districts (centers coverage) */}
                  <Th className="w-[85px] text-right">
                    <SortBtn onClick={() => toggleSort("centersTotal")}>Centers</SortBtn>
                  </Th>
                  <Th className="w-[90px] text-right">
                    <SortBtn onClick={() => toggleSort("centersReported")}>Reported</SortBtn>
                  </Th>
                  <Th className="w-[90px] text-right">
                    <SortBtn onClick={() => toggleSort("reportingPct")}>Reported%</SortBtn>
                  </Th>
                  <Th className="w-[85px] text-right">
                    <SortBtn onClick={() => toggleSort("centersStarted")}>Start</SortBtn>
                  </Th>

                  {!contestId ? <Th className="w-[220px]">Contest</Th> : null}
                </tr>
              </thead>

              <tbody>
                {rows.map((r: any) => {
                  const vPct = deriveValidPct(r.validVotes, r.ballotsCast);
                  return (
                    <tr key={r.districtId} className="hover:bg-slate-50">
                      <Td className="truncate" title={r.countyName}>{r.countyName}</Td>
                      <Td className="truncate" title={r.districtName}>{r.districtName}</Td>

                      <Td className="text-right font-extrabold tabular-nums whitespace-nowrap">{fmtNum(r.registeredVoters)}</Td>
                      <Td className="text-right tabular-nums whitespace-nowrap">{fmtNum(r.ballotsCast)}</Td>
                      <Td className="text-right tabular-nums whitespace-nowrap">{fmtNum(r.validVotes)}</Td>

                      {/* ✅ NEW: derived Valid% */}
                      <Td
                        className="text-right tabular-nums whitespace-nowrap"
                        title={Number(r.ballotsCast) > 0 ? `${fmtNum(r.validVotes)} valid out of ${fmtNum(r.ballotsCast)} cast` : "No ballots cast"}
                      >
                        {fmtPct(vPct)}
                      </Td>

                      <Td className="text-right tabular-nums whitespace-nowrap">{fmtNum(r.invalidTotal)}</Td>
                      <Td className="text-right tabular-nums whitespace-nowrap">{fmtPct(r.turnoutPct)}</Td>
                      <Td className="text-right tabular-nums whitespace-nowrap">{fmtPct(r.invalidPct)}</Td>

                      {/* ✅ NEW: centers reporting */}
                      <Td className="text-right tabular-nums whitespace-nowrap">{fmtNum(r.centersTotal)}</Td>
                      <Td
                        className="text-right tabular-nums whitespace-nowrap font-extrabold"
                        title={
                          (Number(r.centersTotal) > 0 || Number(r.centersReported) > 0)
                            ? `${fmtNum(r.centersReported)} reported out of ${fmtNum(r.centersTotal)} centers`
                            : "No centers / no allocation"
                        }
                      >
                        {fmtRepOverTotal(r.centersReported, r.centersTotal)}
                      </Td>
                      <Td className="text-right tabular-nums whitespace-nowrap">{fmtPct(r.reportingPct)}</Td>
                      <Td className="text-right tabular-nums whitespace-nowrap">{fmtNum(r.centersStarted)}</Td>

                      {!contestId ? (
                        <Td className="truncate" title={r.contestId}>{String(r.contestId)}</Td>
                      ) : null}
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

          <div className="mt-3 text-base text-slate-500">
            Data source: <code>v_district_stats_party</code>
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
      className={`border-b px-2 py-1 text-left text-base font-extrabold ${props.className ?? ""}`}
    />
  );
}
function Td(props: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td
      {...props}
      className={`border-b px-2 py-1 align-top ${props.className ?? ""}`}
    />
  );
}
function SortBtn(props: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      className="font-extrabold hover:underline"
    >
      {props.children}
    </button>
  );
}



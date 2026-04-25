

// ✅ FILE: src/pages/elections/workspace/tabs/results/party/totals/PartyTotalsElectionPage.tsx

import  { useState } from "react";
import { useOutletContext, useParams, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import { useAuth } from "../../../../../../auth/useAuth";
import { useAuthStore } from "../../../../../../shared/store/authStore";
import { Panel, PlaceholderNote } from "../../../../shared/elections-ui";

import { listContestsByElection } from "../../../../../../shared/services/contestService";
import type { ContestDto } from "../../../../../../auth/contestTypes";

import {
  searchElectionStatsParty,
  type ElectionStatsPartyRow,
} from "../../../../../../shared/services/stats/electionStatsPartyService";

/** ✅ ResultsTab passes orgId via Outlet context for SYSTEM */
type ResultsOutletCtx = { orgId?: string };

function num(v: any): number {
  const n = Number(v);
  return isFinite(n) ? n : 0;
}
function fmtNum(v: any) {
  const n = Number(v);
  if (!isFinite(n)) return "—";
  return n.toLocaleString();
}
function fmtPct(v: any) {
  const n = Number(v);
  if (!isFinite(n)) return "—";
  return `${n.toFixed(2)}%`;
}

/** ✅ derive Valid% on frontend = validVotes / ballotsCast * 100 */
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

export default function PartyTotalsElectionPage() {
  const { electionId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const auth: any = useAuth();

  // ✅ SYSTEM org scope (same as districts/counties)
  const outlet = useOutletContext<ResultsOutletCtx>();
  const outletOrgId = String(outlet?.orgId ?? "").trim();

  const dashboardModeStore = useAuthStore((s: any) => s.dashboardMode);
  const mode = String((dashboardModeStore ?? auth?.dashboardMode ?? "") as any).toUpperCase(); // NEC | TENANT | SYSTEM

  const storeOrgId = String(useAuthStore((s: any) => s.currentOrgId ?? "") ?? "").trim();

  const fallbackOrgId = String(
    useAuthStore.getState().tenantMeta?.orgId ?? auth?.tenant?.orgId ?? ""
  ).trim();

  const orgId = outletOrgId || storeOrgId || fallbackOrgId || "";

  // ✅ optional contest
  const contestId = searchParams.get("contestId") ?? "";

  // paging
  const page = Number(searchParams.get("page") ?? "0");
  const size = Number(searchParams.get("size") ?? "25");

  // sorting (not super important for 1-row views but keep pattern consistent)
  const [sort, setSort] = useState<string[]>(["reportingPct,desc", "ballotsCast,desc"]);

  // ----------------------------
  // 1) Contests dropdown
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
  // 2) Stats query
  // ----------------------------
  const enabled = Boolean(electionId) && Boolean(orgId);

  const q = useQuery({
    queryKey: ["stats", "party", "election", orgId, electionId, contestId || "ALL", page, size, sort],
    enabled,
    queryFn: async () =>
      searchElectionStatsParty({
        orgId,
        electionId: String(electionId),
        contestId: contestId ? String(contestId) : undefined,
        page,
        size,
        sort,
      }),
    staleTime: 10_000,
    retry: 1,
  });

  const rows: ElectionStatsPartyRow[] = q.data?.content ?? [];
  const row: ElectionStatsPartyRow | undefined = rows?.[0];

  if (!orgId) {
    return (
      <Panel title="Party Totals • Election">
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

  const onContestChange = (nextContestId: string) =>
    setSP(searchParams, setSearchParams, { contestId: nextContestId || undefined }, { resetPage: true });

  // derived KPI helpers
  const centersReported = num(row?.centersReported);
  const centersTotal = num(row?.centersTotal);
  const reportingPct = num(row?.reportingPct);

  const coverageLabel =
    centersTotal > 0
      ? `${centersReported.toLocaleString()} / ${centersTotal.toLocaleString()} centers`
      : "—";

  const coverageTone =
    reportingPct >= 95 ? "text-emerald-700" : reportingPct >= 60 ? "text-amber-700" : "text-rose-700";

  const validPct = deriveValidPct(row?.validVotes, row?.ballotsCast);

  return (
    <Panel
      title="Local Totals • Election"
      right={
        <div className="flex flex-wrap items-center gap-2 justify-end">
          <select
            value={contestId}
            onChange={(e) => onContestChange(e.target.value)}
            className="h-9 min-w-[340px] rounded-xl border border-slate-300 bg-white px-3 text-base font-bold text-slate-900"
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
      {q.isLoading ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-base text-slate-700">
          Loading election totals…
        </div>
      ) : q.isError ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          {(q.error as any)?.response?.data?.message ?? (q.error as Error)?.message ?? "Failed to load."}
        </div>
      ) : !row ? (
        <PlaceholderNote
          title="No results found"
          bullets={[
            "This election may not have verified tallies yet for the selected org/contest.",
            "Try selecting a contest or removing the contest filter.",
          ]}
        />
      ) : (
        <>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <div className="text-sm font-bold text-slate-600">
              Election: <span className="text-slate-900">{String(electionId ?? "—")}</span>
              {contestId ? (
                <>
                  {" "}
                  • Contest: <span className="text-slate-900">{contestId}</span>
                </>
              ) : (
                <>
                  {" "}
                  • Contest: <span className="text-slate-900">All</span>
                </>
              )}
            </div>

            <div className="ml-auto flex items-center gap-2">
              <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-lg">
                <div className="font-extrabold text-slate-900">Reporting</div>
                <div className={`font-extrabold ${coverageTone}`}>
                  {fmtPct(row.reportingPct)} • {coverageLabel}
                </div>
              </div>
            </div>
          </div>

          {/* ✅ Reduced box size + 4 per row + left/right margin */}
          <div className="mx-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <Card label="Registered Voters" value={fmtNum(row.registeredVoters)} />
            <Card label="Ballots Cast" value={fmtNum(row.ballotsCast)} />
            <Card label="Valid Votes" value={fmtNum(row.validVotes)} />
            <Card label="Valid %" value={fmtPct(validPct)} />

            <Card label="Invalid Total" value={fmtNum(row.invalidTotal)} />
            <Card label="Turnout %" value={fmtPct(row.turnoutPct)} />
            <Card label="Invalid %" value={fmtPct(row.invalidPct)} />
            <Card label="Centers Started" value={fmtNum(row.centersStarted)} />
          </div>

          {/* Coverage cards (also 4 per row, smaller) */}
          <div className="mx-4 mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <Card label="Centers Reported" value={fmtNum(row.centersReported)} />
            <Card label="Centers Total" value={fmtNum(row.centersTotal)} />
            <Card label="Reporting %" value={fmtPct(row.reportingPct)} />
            <Card label="Coverage" value={coverageLabel} />
          </div>

          {!contestId ? (
            <div className="mx-4 mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-base text-slate-700">
              <div className="font-extrabold text-slate-900">Contest scope</div>
              <div className="mt-1">
                You are viewing <span className="font-extrabold">All contests</span>. The API may return one row per
                contest depending on the view definition; this page displays the first row only.
              </div>
            </div>
          ) : null}

          {/* Pagination */}
          <div className="mx-4 mt-3 flex flex-wrap items-center justify-between gap-2">
            <div className="text-sm text-slate-600">
              Page <span className="font-bold">{(q.data?.number ?? 0) + 1}</span> of{" "}
              <span className="font-bold">{q.data?.totalPages ?? 1}</span> •{" "}
              <span className="font-bold">{q.data?.totalElements ?? 0}</span> total rows
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSP(searchParams, setSearchParams, { page: String(Math.max(0, page - 1)) })}
                disabled={Boolean(q.data?.first) || q.isFetching}
                className={`h-9 rounded-xl border bg-white px-3 text-sm font-extrabold ${
                  q.data?.first || q.isFetching ? "opacity-50" : "hover:bg-slate-50"
                }`}
              >
                Prev
              </button>
              <button
                type="button"
                onClick={() => setSP(searchParams, setSearchParams, { page: String(Math.max(0, page + 1)) })}
                disabled={Boolean(q.data?.last) || q.isFetching}
                className={`h-9 rounded-xl border bg-white px-3 text-sm font-extrabold ${
                  q.data?.last || q.isFetching ? "opacity-50" : "hover:bg-slate-50"
                }`}
              >
                Next
              </button>
            </div>
          </div>

          <div className="mx-4 mt-3 text-xs text-slate-500">
            Data source: <code>v_election_stats_party</code>
          </div>
        </>
      )}
    </Panel>
  );
}

function Card(props: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
      <div className="text-lg font-bold text-slate-600">{props.label}</div>
      <div className="mt-0.5 text-2xl font-extrabold text-slate-900">{props.value}</div>
    </div>
  );
}

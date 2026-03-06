

// ✅ FILE: src/pages/elections/workspace/tabs/results/official/totals/OfficialTotalsElectionPage.tsx

import  { useMemo, useState } from "react";
import { useOutletContext, useParams, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import { useAuth } from "../../../../../../auth/useAuth";
import { useAuthStore } from "../../../../../../shared/store/authStore";
import { Panel, PlaceholderNote } from "../../../../shared/elections-ui";

import { listContestsByElection } from "../../../../../../shared/services/contestService";
import type { ContestDto } from "../../../../../../auth/contestTypes";

import {
  searchElectionStatsOfficial,
  type ElectionStatsOfficialRow,
} from "../../../../../../shared/services/stats/electionStatsOfficialService";

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

/** ✅ derived Valid% = validVotes / ballotsCast * 100 */
function deriveValidPct(validVotes: any, ballotsCast: any) {
  const v = Number(validVotes);
  const c = Number(ballotsCast);
  if (!isFinite(v) || !isFinite(c) || c <= 0) return NaN;
  return (v / c) * 100;
}

function setSP(
  searchParams: URLSearchParams,
  setSearchParams: ReturnType<typeof useSearchParams>[1],
  updates: Record<string, string | undefined | null>
) {
  const sp = new URLSearchParams(searchParams);

  Object.entries(updates).forEach(([k, v]) => {
    const clean = v == null ? "" : String(v);
    if (!clean) sp.delete(k);
    else sp.set(k, clean);
  });

  // election summary is single row; no paging here
  setSearchParams(sp, { replace: true });
}

export default function OfficialTotalsElectionPage() {
  const { electionId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const auth: any = useAuth();

  // ✅ SYSTEM org scope (same pattern as Party pages)
  const outlet = useOutletContext<ResultsOutletCtx>();
  const outletOrgId = String(outlet?.orgId ?? "").trim();

  const dashboardModeStore = useAuthStore((s: any) => s.dashboardMode);
  const mode = String((dashboardModeStore ?? auth?.dashboardMode ?? "") as any).toUpperCase(); // NEC | TENANT | SYSTEM

  const storeOrgId = String(useAuthStore((s: any) => s.currentOrgId ?? "") ?? "").trim();
  const fallbackOrgId = String(
    useAuthStore.getState().tenantMeta?.orgId ?? auth?.tenant?.orgId ?? ""
  ).trim();

  // ✅ effective orgId (SYSTEM uses outlet dropdown)
  const orgId = outletOrgId || storeOrgId || fallbackOrgId || "";

  // ✅ Query params
  const contestId = searchParams.get("contestId") ?? "";

  // sorting (kept for parity; not required since we fetch size=1)
  const [sort] = useState<string[]>(["centersReported,desc"]);

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
  // 2) Stats query
  // ----------------------------
  const statsEnabled = useMemo(() => {
    if (!electionId) return false;
    // ✅ match backend style: SYSTEM requires orgId; TENANT/NEC can derive (but we still allow)
    if (mode === "SYSTEM") return Boolean(orgId);
    return true;
  }, [electionId, mode, orgId]);

  // ✅ send orgId only for SYSTEM (avoid accidental tenant mismatch)
  const orgIdParam = mode === "SYSTEM" ? orgId : undefined;

  const q = useQuery({
    queryKey: [
      "stats",
      "official",
      "election",
      mode,
      orgIdParam || "DERIVED",
      electionId,
      contestId || "ALL",
      sort,
    ],
    enabled: statsEnabled,
    queryFn: async () =>
      searchElectionStatsOfficial({
        orgId: orgIdParam,
        electionId: String(electionId),
        contestId: contestId ? String(contestId) : undefined, // ✅ optional
        page: 0,
        size: 1,
        sort,
      } as any),
    staleTime: 10_000,
    retry: 1,
  });

  const summary: ElectionStatsOfficialRow | null =
    (q.data?.content?.[0] as any) ?? null;

  if (!electionId) {
    return (
      <Panel title="Official Totals • Election">
        <PlaceholderNote
          title="Election not selected"
          bullets={["Select an election to view official totals."]}
        />
      </Panel>
    );
  }

  if (mode === "SYSTEM" && !orgId) {
    return (
      <Panel title="Official Totals • Election">
        <PlaceholderNote
          title="Select an Organization first"
          bullets={[
            "SYSTEM mode requires org selection.",
            "Choose an organization from the Results header dropdown.",
          ]}
        />
      </Panel>
    );
  }

  const vPct = deriveValidPct(summary?.validVotes, summary?.ballotsCast);

  const onContestChange = (nextContestId: string) =>
    setSP(searchParams, setSearchParams, { contestId: nextContestId || undefined });

  return (
    <Panel
      title="Official Totals • Election"
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
              {contestsQ.isLoading
                ? "Loading contests…"
                : !electionId
                ? "Election not selected"
                : "All contests"}
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
      {q.isLoading ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
          Loading official election totals…
        </div>
      ) : q.isError ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          {(q.error as any)?.response?.data?.message ??
            (q.error as Error)?.message ??
            "Failed to load."}
        </div>
      ) : !summary ? (
        <PlaceholderNote
          title="No results found"
          bullets={[
            "This election may not have official totals yet for the selected filters.",
            "Try removing the contest filter.",
          ]}
        />
      ) : (
        <>
        
          {/* ✅ same “metrics grid” feel, aligned to DTO fields */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Metric label="Registered Voters" value={fmtNum(summary.registeredVoters)} />
            <Metric label="Ballots Cast" value={fmtNum(summary.ballotsCast)} />
            <Metric label="Valid Votes" value={fmtNum(summary.validVotes)} />
            <Metric label="Invalid Total" value={fmtNum(summary.invalidTotal)} />
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Metric label="Valid %" value={fmtPct(vPct)} />
            <Metric label="Turnout %" value={fmtPct(summary.turnoutPct)} />
            <Metric label="Invalid %" value={fmtPct(summary.invalidPct)} />
            <Metric
              label="Centers Reported"
              value={`${fmtNum(summary.centersReported)} / ${fmtNum(summary.centersTotal)}`}
            />
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Metric label="Reporting %" value={fmtPct(summary.reportingPct)} />
            <Metric label="Centers Started" value={fmtNum(summary.centersStarted)} />
          </div>

          <div className="mt-3 text-lg text-slate-500 p-6">
            Data source: <code>v_election_stats_official</code>
          </div>
        </>
      )}
    </Panel>
  );
}

function Metric(props: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <div className="text-lg font-bold text-slate-500">{props.label}</div>
      <div className="mt-1 text-2xl font-extrabold text-slate-900">{props.value}</div>
    </div>
  );
}



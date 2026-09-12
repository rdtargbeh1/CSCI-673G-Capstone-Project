
// src/pages/dashboard/panels/OrgDashboard.tsx

import { useMemo, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import DashboardFrame from "../panels/DashboardFrame";
import DashboardTabs from "../shared/DashboardTabs";
import { Grid, Panel, SimpleTable, StatCard, Chip } from "../shared/dashboard-ui";
import { useAuthStore } from "../../../shared/store/authStore";
import {
  fetchTenantElectionStats,
  fetchTenantCountyStats,
} from "../../../shared/services/statsService";
import { listActiveElections } from "../../../shared/services/electionService";
import { useOfficialPublished } from "../shared/hooks/useOfficialPublished"; // ✅ NEW

function pickNumber(obj: any, keys: string[], fallback = 0) {
  for (const k of keys) {
    const v = obj?.[k];
    if (typeof v === "number") return v;
  }
  return fallback;
}

export default function TenantDashboard() {
  const navigate = useNavigate();
  const location = useLocation();

  const isSystemAdmin = useAuthStore((s: any) =>
    typeof s.isSystemAdmin === "function" ? s.isSystemAdmin() : !!s.isSystemAdmin
  );

  useEffect(() => {
    if (isSystemAdmin) navigate("/dashboard/system", { replace: true });
  }, [isSystemAdmin, navigate]);

  if (isSystemAdmin) return null;

  const currentElectionId = useAuthStore((s: any) => s.currentElectionId);
  const currentOrgId = useAuthStore((s: any) => s.currentOrgId);

  // ✅ Auto-pick active election if missing (keep your working logic)
  const activeElectionsQ = useQuery({
    queryKey: ["elections", "active"],
    queryFn: listActiveElections,
    enabled: !currentElectionId,
    staleTime: 30_000,
    retry: 1,
  });

  useEffect(() => {
    if (currentElectionId) return;
    const list = activeElectionsQ.data ?? [];
    if (list.length === 0) return;

    const picked = list[0];

    const st: any = useAuthStore.getState?.() ?? {};
    const setter =
      st.setCurrentElectionId ||
      st.setElectionId ||
      st.setCurrentElection ||
      st.setElection ||
      null;

    if (typeof setter === "function") {
      setter(picked.electionId);
      return;
    }

    const storeAny: any = useAuthStore as any;
    if (typeof storeAny.setState === "function") {
      storeAny.setState({
        currentElectionId: picked.electionId,
        electionId: picked.electionId,
      });
    }
  }, [currentElectionId, activeElectionsQ.data]);

  // ✅ Single truth for published
  const { isOfficialPublished } = useOfficialPublished();

  // ✅ Redirect tenant away from official route if not published
  useEffect(() => {
    if (!currentElectionId) return;

    const onOfficial =
      location.pathname === "/dashboard/official-results" ||
      location.pathname.startsWith("/dashboard/official-results/");

    if (onOfficial && !isOfficialPublished) {
      navigate("/dashboard/local-results", { replace: true });
    }
  }, [location.pathname, isOfficialPublished, navigate, currentElectionId]);

  const partyElectionStatsQ = useQuery({
    queryKey: ["tenant", "partyElection", currentElectionId],
    queryFn: () =>
      fetchTenantElectionStats(String(currentElectionId), { page: 0, size: 1 }),
    enabled: !!currentElectionId,
  });

  const topCountiesQ = useQuery({
    queryKey: ["tenant", "partyCounties", currentElectionId],
    queryFn: () =>
      fetchTenantCountyStats(
        String(currentElectionId),
        {},
        { page: 0, size: 10, sort: ["validVotes,desc"] }
      ),
    enabled: !!currentElectionId,
  });

  const summary = useMemo(() => {
    const row = partyElectionStatsQ.data?.content?.[0] ?? null;
    return {
      ballotsCast: pickNumber(row, ["ballotsCast", "totalBallotsCast"]),
      validVotes: pickNumber(row, ["validVotes", "totalValidVotes"]),
      invalidTotal: pickNumber(row, [
        "invalidTotal",
        "invalidVotes",
        "totalInvalidVotes",
      ]),
      turnoutPct: row?.turnoutPct ?? null,
      invalidPct: row?.invalidPct ?? null,
    };
  }, [partyElectionStatsQ.data]);

  const countyRows = (topCountiesQ.data?.content ?? []).map((c: any) => [
    <div className="font-semibold text-slate-900">{c.countyName ?? "—"}</div>,
    <span className="font-semibold">
      {pickNumber(c, ["validVotes", "totalValidVotes"])}
    </span>,
    <span className="text-slate-600">
      {pickNumber(c, ["ballotsCast", "totalBallotsCast"])}
    </span>,
    <span className="text-slate-600">
      {pickNumber(c, ["invalidTotal", "invalidVotes", "totalInvalidVotes"])}
    </span>,
  ]);

  return (
    <>
      <DashboardTabs
        mode="TENANT"
        currentOrgId={currentOrgId ?? undefined}
        isOfficialPublished={isOfficialPublished}
      />

      <DashboardFrame
        title="Organization Dashboard"
        subtitle="Your submission truth + party-side aggregates. Official data remains read-only from NEC."
        right={
          <div className="flex items-center gap-2">
            {isOfficialPublished && (
              <div className="inline-flex items-center gap-2 rounded-md bg-green-50 px-2.5 py-1.5 text-xs font-extrabold text-green-700">
                <span className="h-2 w-2 rounded-full bg-green-600"></span>
                Official published by NEC
              </div>
            )}
            <Chip text="TENANT" tone="blue" />
          </div>
        }
      >
        {!currentElectionId ? (
          <Panel title="No election selected" subtitle="Loading active election...">
            <div className="text-sm text-slate-700">
              {activeElectionsQ.isFetching
                ? "Loading active elections…"
                : "No active election found (or you don’t have access)."}
            </div>
          </Panel>
        ) : (
          <>
            <Grid columns={4}>
              <StatCard
                label="Ballots Cast (Org)"
                value={`${summary.ballotsCast}`}
                helper="From your submissions"
              />
              <StatCard label="Valid Votes" value={`${summary.validVotes}`} />
              <StatCard label="Invalid Total" value={`${summary.invalidTotal}`} />
              <StatCard
                label="Turnout"
                value={
                  summary.turnoutPct != null
                    ? `${summary.turnoutPct.toFixed(1)}%`
                    : "—"
                }
                helper="Derived"
              />
            </Grid>

            <Grid columns={2}>
              <Panel
                title="Top Counties (Party Results)"
                subtitle="Your organization's aggregated submissions"
                right={
                  summary.invalidPct != null ? (
                    <Chip
                      text={`Invalid ${summary.invalidPct.toFixed(1)}%`}
                      tone="amber"
                    />
                  ) : (
                    <Chip text="Invalid —" />
                  )
                }
              >
                <SimpleTable
                  columns={["County", "Valid", "Ballots", "Invalid"]}
                  rows={countyRows}
                  emptyText="No party county stats yet"
                />
              </Panel>

              <Panel title="What you should do next" subtitle="Real-world workflow guidance">
                <div className="space-y-2 text-base text-slate-700">
                  <div>• Go to Submissions to capture/verify/flag your vote submissions.</div>
                  <div>• Use Results → Party Results to monitor your aggregates.</div>
                  <div>
                    {isOfficialPublished
                      ? "✓ NEC has published official results - use Official Results tab to view and compare"
                      : "⏳ Official Results tab will appear after NEC publishes results"}
                  </div>
                </div>
              </Panel>
            </Grid>
          </>
        )}
      </DashboardFrame>
    </>
  );
}

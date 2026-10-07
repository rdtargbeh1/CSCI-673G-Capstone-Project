
// src/pages/dashboard/panels/NecDashboard.tsx

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import DashboardFrame from "../panels/DashboardFrame";
import DashboardTabs from "../shared/DashboardTabs";
import {
  Grid,
  Panel,
  SimpleTable,
  StatCard,
  Chip,
} from "../shared/dashboard-ui";
import { useAuthStore } from "../../../shared/store/authStore";
import {
  fetchNecOfficialElectionStats,
  fetchNecOfficialCenterStats,
  fetchNecPublishStatus,
} from "../../../shared/services/statsService";

function pickNumber(obj: any, keys: string[], fallback = 0) {
  for (const k of keys) {
    const v = obj?.[k];
    if (typeof v === "number") return v;
  }
  return fallback;
}

export default function NecDashboard() {
  const currentElectionId = useAuthStore((s) => s.currentElectionId);
  const currentOrgId = useAuthStore((s) => s.currentOrgId);

  const electionStatsQ = useQuery({
    queryKey: ["nec", "officialElection", currentElectionId],
    queryFn: () =>
      fetchNecOfficialElectionStats(currentElectionId as string, {
        page: 0,
        size: 1,
      }),
    enabled: !!currentElectionId,
  });

  const topCentersQ = useQuery({
    queryKey: ["nec", "officialCenters", currentElectionId],
    queryFn: () =>
      fetchNecOfficialCenterStats(
        currentElectionId as string,
        {},
        { page: 0, size: 8, sort: ["validVotes,desc"] }
      ),
    enabled: !!currentElectionId,
  });

  const publishStatusQ = useQuery({
    queryKey: ["nec", "publishStatus", currentElectionId],
    queryFn: () => fetchNecPublishStatus(currentElectionId as string),
    enabled: !!currentElectionId,
  });

  const summary = useMemo(() => {
    const row = electionStatsQ.data?.content?.[0] ?? null;

    return {
      registeredVoters: pickNumber(row, [
        "registeredVoters",
        "totalRegisteredVoters",
      ]),
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
  }, [electionStatsQ.data]);

  const centerRows = (topCentersQ.data?.content ?? []).map((c: any) => [
    <div className="font-semibold text-slate-900">
      {c.centerName ?? c.center_code ?? "—"}
    </div>,
    <span>{c.countyName ?? "—"}</span>,
    <span className="font-semibold">
      {pickNumber(c, ["validVotes", "totalValidVotes"])}
    </span>,
    <span className="text-slate-600">
      {pickNumber(c, ["ballotsCast", "totalBallotsCast"])}
    </span>,
  ]);

  const isPublished = publishStatusQ.data?.isPublished ?? false;

  return (
    <>
      <DashboardTabs
        mode="NEC"
        currentOrgId={currentOrgId ?? undefined}
        isOfficialPublished={isPublished}
      />

      <DashboardFrame
        title="NEC Dashboard"
        subtitle="Official results monitoring (published NEC views) + integrity readiness."
        right={<Chip text="NEC" tone="blue" />}
      >
        {!currentElectionId ? (
          <Panel
            title="No election selected"
            subtitle="Pick an election to show NEC dashboards"
          >
            <div className="text-sm text-slate-700">
              Select an election (workspace context). This dashboard depends on
              electionId for official views.
            </div>
          </Panel>
        ) : (
          <>
            <Grid columns={4}>
              <StatCard
                label="Registered Voters"
                value={`${summary.registeredVoters}`}
              />
              <StatCard label="Ballots Cast" value={`${summary.ballotsCast}`} />
              <StatCard label="Valid Votes" value={`${summary.validVotes}`} />
              <StatCard
                label="Invalid Total"
                value={`${summary.invalidTotal}`}
              />
            </Grid>

            <Grid columns={2}>
              <Panel
                title="Top Centers (Official)"
                subtitle="Highest official validVotes (published results)"
                right={
                  summary.turnoutPct != null ? (
                    <Chip
                      text={`Turnout ${summary.turnoutPct.toFixed(1)}%`}
                      tone="green"
                    />
                  ) : (
                    <Chip text="Turnout —" />
                  )
                }
              >
                <SimpleTable
                  columns={["Center", "County", "Valid", "Ballots"]}
                  rows={centerRows}
                  emptyText="No official center stats yet"
                />
              </Panel>

              <Panel
                title="Integrity & Publication"
                subtitle="UX rule: NEC observes + publishes; never edits tenant submissions."
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
                <div className="space-y-2 text-sm text-slate-700">
                  <div>• Official views come from NEC published pipeline.</div>
                  <div>
                    • Use "NEC Workflow" for staging → publish (separate
                    pages).
                  </div>
                  <div>
                    • This dashboard is safe: read-only monitoring and
                    drilldowns.
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

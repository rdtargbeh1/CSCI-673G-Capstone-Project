// src/pages/dashboard/panels/OrgDashboard.tsx
import { useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import DashboardFrame from "../panels/DashboardFrame";
import {
  Grid,
  Panel,
  SimpleTable,
  StatCard,
  Chip,
} from "../shared/dashboard-ui";
import { useAuthStore } from "../../../shared/store/authStore";

import {
  fetchPartyElectionStats,
  fetchPartyCountyStats,
} from "../../../shared/services/statsService";

function pickNumber(obj: any, keys: string[], fallback = 0) {
  for (const k of keys) {
    const v = obj?.[k];
    if (typeof v === "number") return v;
  }
  return fallback;
}

export default function TenantDashboard() {
  const navigate = useNavigate();

  // ✅ Works whether your store has:
  // - isSystemAdmin: boolean
  // - isSystemAdmin(): boolean
  const isSystemAdmin = useAuthStore((s: any) =>
    typeof s.isSystemAdmin === "function"
      ? s.isSystemAdmin()
      : !!s.isSystemAdmin
  );

  // ✅ Force SYSTEM users away from tenant dashboard (/dashboard)
  useEffect(() => {
    if (isSystemAdmin) {
      navigate("/dashboard/system", { replace: true });
    }
  }, [isSystemAdmin, navigate]);

  // ✅ Prevent tenant UI from rendering while redirecting
  if (isSystemAdmin) return null;

  const currentElectionId = useAuthStore((s) => s.currentElectionId);

  const partyElectionStatsQ = useQuery({
    queryKey: ["tenant", "partyElection", currentElectionId],
    queryFn: () =>
      fetchPartyElectionStats(currentElectionId as string, {
        page: 0,
        size: 1,
      }),
    enabled: !!currentElectionId,
  });

  const topCountiesQ = useQuery({
    queryKey: ["tenant", "partyCounties", currentElectionId],
    queryFn: () =>
      fetchPartyCountyStats(
        currentElectionId as string,
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
    <DashboardFrame
      title="Organization Dashboard"
      subtitle="Your submission truth + party-side aggregates. Official data remains read-only from NEC."
      right={<Chip text="TENANT" tone="blue" />}
    >
      {!currentElectionId ? (
        <Panel
          title="No election selected"
          subtitle="Select an election to show your org stats"
        >
          <div className="text-sm text-slate-700">
            Dashboard is election scoped. Pick an election to render party views
            (org scoped by X-Org-Id).
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
              subtitle="Your organization’s aggregated submissions"
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

            <Panel
              title="What you should do next"
              subtitle="Real-world workflow guidance"
            >
              <div className="space-y-2 text-sm text-slate-700">
                <div>
                  • Go to Submissions to capture/verify/flag your vote
                  submissions.
                </div>
                <div>
                  • Use Results → Party Results to monitor your aggregates.
                </div>
                <div>
                  • Compare becomes available only after NEC publishes official
                  results (policy rule).
                </div>
              </div>
            </Panel>
          </Grid>
        </>
      )}
    </DashboardFrame>
  );
}

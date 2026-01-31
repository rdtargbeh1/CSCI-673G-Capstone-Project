

// src/pages/elections/workspace/tabs/results/party/totals/PartyTotalsElectionPage.tsx

import { useMemo } from "react";
import { useParams, useSearchParams } from "react-router-dom";

type PartyTotalsElectionRow = {
  orgId?: string;
  electionId: string;
  contestId: string;

  registeredVoters: number;
  ballotsCast: number;
  validVotes: number;
  invalidTotal: number;

  turnoutPct: number;
  invalidPct: number;
};

export default function PartyTotalsElectionPage() {
  const { electionId } = useParams();
  const [sp] = useSearchParams();
  const contestId = sp.get("contestId");

  /**
   * 🔧 PLACEHOLDER DATA
   * Replace with API:
   *   GET /api/stats/party/totals/election
   * Params: electionId, contestId
   */
  const row: PartyTotalsElectionRow = useMemo(
    () => ({
      orgId: "org-1",
      electionId: electionId ?? "—",
      contestId: contestId ?? "—",

      registeredVoters: 2_200_000,
      ballotsCast: 1_450_000,
      validVotes: 1_420_000,
      invalidTotal: 30_000,

      turnoutPct: 65.91,
      invalidPct: 2.07,
    }),
    [electionId, contestId]
  );

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="mb-4">
        <div className="text-lg font-extrabold text-slate-900">
          Party Totals • Election
        </div>
        <div className="text-xs text-slate-600">
          Election: {row.electionId} • Contest: {row.contestId}
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <Card label="Registered Voters" value={row.registeredVoters} />
        <Card label="Ballots Cast" value={row.ballotsCast} />
        <Card label="Valid Votes" value={row.validVotes} />
        <Card label="Invalid Total" value={row.invalidTotal} />
        <Card label="Turnout %" value={`${row.turnoutPct.toFixed(2)}%`} />
        <Card label="Invalid %" value={`${row.invalidPct.toFixed(2)}%`} />
      </div>

      <div className="mt-3 text-xs text-slate-500">
        Data source: <code>v_election_stats_party</code>
      </div>
    </div>
  );
}

function Card(props: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
      <div className="text-xs font-extrabold text-slate-600">{props.label}</div>
      <div className="mt-1 text-lg font-extrabold text-slate-900">
        {typeof props.value === "number"
          ? props.value.toLocaleString()
          : props.value}
      </div>
    </div>
  );
}

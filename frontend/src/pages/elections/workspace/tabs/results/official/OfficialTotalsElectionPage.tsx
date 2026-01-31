

// src/pages/elections/workspace/tabs/results/official/totals/OfficialTotalsElectionPage.tsx

import { useMemo } from "react";

export default function OfficialTotalsElectionPage() {
  /**
   * 🔧 PLACEHOLDER DATA
   * Source → v_election_stats_official
   */
  const summary = useMemo(
    () => ({
      registeredVoters: 2100000,
      ballotsCast: 1580000,
      validVotes: 1525000,
      invalidTotal: 55000,
    }),
    []
  );

  return (
    <div className="rounded-xl border bg-white p-4">
      <div className="mb-3 text-lg font-extrabold">Official Totals • Election</div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Registered Voters" value={summary.registeredVoters} />
        <Metric label="Ballots Cast" value={summary.ballotsCast} />
        <Metric label="Valid Votes" value={summary.validVotes} />
        <Metric label="Invalid Total" value={summary.invalidTotal} />
      </div>

      <div className="mt-3 text-xs text-slate-500">
        Data source: <code>v_election_stats_official</code>
      </div>
    </div>
  );
}

function Metric(props: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <div className="text-xs font-bold text-slate-500">{props.label}</div>
      <div className="mt-1 text-xl font-extrabold text-slate-900">
        {props.value.toLocaleString()}
      </div>
    </div>
  );
}



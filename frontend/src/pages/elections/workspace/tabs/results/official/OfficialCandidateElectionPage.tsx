

// src/pages/elections/workspace/tabs/results/official/candidates/OfficialCandidateElectionPage.tsx

import { useMemo } from "react";

export default function OfficialCandidateElectionPage() {
  const rows = useMemo(
    () => [
      {
        candidateName: "John Doe",
        partyName: "Unity Party",
        votes: 620_000,
        share: 51.8,
      },
      {
        candidateName: "Jane Smith",
        partyName: "CDC",
        votes: 560_000,
        share: 46.7,
      },
    ],
    []
  );

  return (
    <div className="rounded-xl border bg-white p-4">
      <div className="mb-3 text-lg font-extrabold">
        Official Candidate Results • Election
      </div>

      <table className="w-full border text-sm">
        <thead className="bg-slate-50">
          <tr>
            <th className="border px-3 py-2">Candidate</th>
            <th className="border px-3 py-2 text-right">Votes</th>
            <th className="border px-3 py-2 text-right">Share %</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              <td className="border px-3 py-2">
                {r.candidateName} ({r.partyName})
              </td>
              <td className="border px-3 py-2 text-right">
                {r.votes.toLocaleString()}
              </td>
              <td className="border px-3 py-2 text-right">{r.share}%</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-3 text-xs text-slate-500">
        Data source: <code>v_candidate_election_stats_official</code>
      </div>
    </div>
  );
}


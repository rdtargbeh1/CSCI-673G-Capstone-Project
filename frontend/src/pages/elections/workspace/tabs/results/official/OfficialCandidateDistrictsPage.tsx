

// src/pages/elections/workspace/tabs/results/official/candidates/OfficialCandidateDistrictsPage.tsx

import { useMemo } from "react";
import { useParams, useSearchParams } from "react-router-dom";

export default function OfficialCandidateDistrictsPage() {
  const { electionId } = useParams();
  const [sp] = useSearchParams();
  const contestId = sp.get("contestId");

  const rows = useMemo(
    () => [
      {
        districtName: "District 10",
        candidateName: "John Doe",
        partyName: "Unity Party",
        candidateVotes: 12_500,
        totalValidVotes: 24_000,
        voteSharePct: 52.08,
      },
    ],
    []
  );

  return (
    <SimpleTable
      title="Official Candidate Results • Districts"
      source="v_candidate_district_stats_official"
      rows={rows}
      electionId={electionId}
      contestId={contestId}
    />
  );
}

function SimpleTable(props: any) {
  return (
    <div className="rounded-xl border bg-white p-4">
      <div className="mb-3 text-lg font-extrabold">{props.title}</div>
      <table className="w-full border text-sm">
        <thead className="bg-slate-50">
          <tr>
            <th className="border px-3 py-2">District</th>
            <th className="border px-3 py-2">Candidate</th>
            <th className="border px-3 py-2 text-right">Votes</th>
            <th className="border px-3 py-2 text-right">Share %</th>
          </tr>
        </thead>
        <tbody>
          {props.rows.map((r: any, i: number) => (
            <tr key={i}>
              <td className="border px-3 py-2">{r.districtName}</td>
              <td className="border px-3 py-2">
                {r.candidateName} ({r.partyName})
              </td>
              <td className="border px-3 py-2 text-right">
                {r.candidateVotes.toLocaleString()}
              </td>
              <td className="border px-3 py-2 text-right">
                {r.voteSharePct.toFixed(2)}%
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-3 text-xs text-slate-500">
        Data source: <code>{props.source}</code>
      </div>
    </div>
  );
}

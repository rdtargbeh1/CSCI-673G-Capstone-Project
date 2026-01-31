

// src/pages/elections/workspace/tabs/results/official/candidates/OfficialCandidateCountiesPage.tsx

import { useMemo } from "react";

export default function OfficialCandidateCountiesPage() {
  const rows = useMemo(
    () => [
      {
        countyName: "Montserrado",
        candidateName: "John Doe",
        partyName: "Unity Party",
        votes: 55_000,
        share: 53.1,
      },
    ],
    []
  );

  return (
    <div className="rounded-xl border bg-white p-4">
      <div className="mb-3 text-lg font-extrabold">
        Official Candidate Results • Counties
      </div>

      {rows.map((r, i) => (
        <div key={i} className="border-b py-2 text-sm">
          <div className="font-bold">{r.countyName}</div>
          <div>
            {r.candidateName} ({r.partyName}) —{" "}
            {r.votes.toLocaleString()} votes • {r.share}%
          </div>
        </div>
      ))}

      <div className="mt-3 text-xs text-slate-500">
        Data source: <code>v_candidate_county_stats_official</code>
      </div>
    </div>
  );
}

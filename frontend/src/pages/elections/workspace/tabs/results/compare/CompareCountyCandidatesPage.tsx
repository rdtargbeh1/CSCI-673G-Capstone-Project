

// src/pages/elections/workspace/tabs/results/compare/CompareCountyCandidatesPage.tsx

import { useMemo } from "react";
import { useParams, useSearchParams } from "react-router-dom";

type CountyCandidateCompareRow = {
  electionId: string;
  contestId: string;

  countyName: string;

  candidateName: string;
  partyName?: string;

  partyCandidateVotes?: number;
  officialCandidateVotes?: number;

  diffVotes: number;

  partyVoteSharePct?: number;
  officialVoteSharePct?: number;
};

function badgeClass(diff: number) {
  if (diff === 0) return "bg-slate-100 text-slate-700 border-slate-200";
  if (diff > 0) return "bg-emerald-50 text-emerald-800 border-emerald-200";
  return "bg-rose-50 text-rose-800 border-rose-200";
}

export default function CompareCountyCandidatesPage() {
  const { electionId } = useParams();
  const [sp] = useSearchParams();
  const contestId = sp.get("contestId");

  /**
   * 🔧 PLACEHOLDER DATA
   * API → /api/stats/compare/county/candidates (example)
   * Source → v_candidate_county_compare
   */
  const rows: CountyCandidateCompareRow[] = useMemo(
    () => [
      {
        electionId: electionId ?? "—",
        contestId: contestId ?? "—",
        countyName: "Montserrado",
        candidateName: "John Doe",
        partyName: "Unity Party",
        partyCandidateVotes: 55_000,
        officialCandidateVotes: 54_200,
        diffVotes: 800,
        partyVoteSharePct: 53.1,
        officialVoteSharePct: 52.4,
      },
      {
        electionId: electionId ?? "—",
        contestId: contestId ?? "—",
        countyName: "Montserrado",
        candidateName: "Jane Smith",
        partyName: "CDC",
        partyCandidateVotes: 47_000,
        officialCandidateVotes: 48_100,
        diffVotes: -1100,
        partyVoteSharePct: 45.4,
        officialVoteSharePct: 46.1,
      },
    ],
    [electionId, contestId]
  );

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="mb-3 text-lg font-extrabold">
        Compare • County Candidate Results
      </div>

      <table className="w-full border text-sm">
        <thead className="bg-slate-50">
          <tr>
            <th className="border px-3 py-2">County</th>
            <th className="border px-3 py-2">Candidate</th>

            <th className="border px-3 py-2 text-right">Party Votes</th>
            <th className="border px-3 py-2 text-right">Official Votes</th>

            <th className="border px-3 py-2 text-right">Diff</th>

            <th className="border px-3 py-2 text-right">Party %</th>
            <th className="border px-3 py-2 text-right">Official %</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              <td className="border px-3 py-2">{r.countyName}</td>
              <td className="border px-3 py-2">
                <div className="font-bold">{r.candidateName}</div>
                <div className="text-xs text-slate-500">{r.partyName ?? "—"}</div>
              </td>

              <td className="border px-3 py-2 text-right">
                {(r.partyCandidateVotes ?? 0).toLocaleString()}
              </td>
              <td className="border px-3 py-2 text-right">
                {(r.officialCandidateVotes ?? 0).toLocaleString()}
              </td>

              <td className="border px-3 py-2 text-right">
                <span
                  className={[
                    "inline-flex items-center rounded-full border px-2 py-1 text-xs font-extrabold",
                    badgeClass(r.diffVotes),
                  ].join(" ")}
                >
                  {r.diffVotes > 0 ? "+" : ""}
                  {r.diffVotes.toLocaleString()}
                </span>
              </td>

              <td className="border px-3 py-2 text-right">
                {(r.partyVoteSharePct ?? 0).toFixed(2)}%
              </td>
              <td className="border px-3 py-2 text-right">
                {(r.officialVoteSharePct ?? 0).toFixed(2)}%
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-3 text-xs text-slate-500">
        Data source: <code>v_candidate_county_compare</code>
      </div>
    </div>
  );
}

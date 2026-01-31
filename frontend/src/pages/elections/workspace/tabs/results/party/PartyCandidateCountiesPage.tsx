
// src/pages/elections/workspace/tabs/results/party/PartyCandidateCountiesPage.tsx

import { useMemo } from "react";
import { useParams, useSearchParams } from "react-router-dom";

/**
 * PARTY • CANDIDATE • COUNTY RESULTS
 *
 * Backend view:
 *   v_candidate_county_stats_party
 *
 * Scope:
 *   - One row per candidate per county
 *   - Tenant / Party-side results (from vote submissions)
 *
 * Filters (later):
 *   - electionId (route param)
 *   - contestId (query param)
 */

type PartyCandidateCountyRow = {
  electionId: string;
  contestId: string;

  countyId: string;
  countyName: string;

  candidateId: string;
  candidateName: string;

  partyName?: string;
  abbreviation?: string;

  candidateVotes: number;
  ballotsCast: number;
  totalValidVotes: number;
  totalInvalidVotes: number;

  voteSharePct: number;
};

export default function PartyCandidateCountiesPage() {
  const { electionId } = useParams();
  const [searchParams] = useSearchParams();

  const contestId = searchParams.get("contestId");

  /**
   * 🔧 PLACEHOLDER DATA
   * Replace with API call:
   *   GET /api/stats/party/candidates/counties
   */
  const rows: PartyCandidateCountyRow[] = useMemo(
    () => [
      {
        electionId: electionId ?? "—",
        contestId: contestId ?? "—",

        countyId: "county-1",
        countyName: "Montserrado",

        candidateId: "cand-1",
        candidateName: "John Doe",

        partyName: "Unity Party",
        abbreviation: "UP",

        candidateVotes: 120340,
        ballotsCast: 150000,
        totalValidVotes: 145000,
        totalInvalidVotes: 5000,

        voteSharePct: 82.99,
      },
      {
        electionId: electionId ?? "—",
        contestId: contestId ?? "—",

        countyId: "county-1",
        countyName: "Montserrado",

        candidateId: "cand-2",
        candidateName: "Jane Smith",

        partyName: "Liberty Party",
        abbreviation: "LP",

        candidateVotes: 24660,
        ballotsCast: 150000,
        totalValidVotes: 145000,
        totalInvalidVotes: 5000,

        voteSharePct: 17.01,
      },
    ],
    [electionId, contestId]
  );

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      {/* Header */}
      <div className="mb-4">
        <div className="text-lg font-extrabold text-slate-900">
          Party Results • Candidates by County
        </div>
        <div className="text-xs text-slate-600">
          Election: {electionId ?? "—"} • Contest: {contestId ?? "—"}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full border border-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="border px-3 py-2 text-left">County</th>
              <th className="border px-3 py-2 text-left">Candidate</th>
              <th className="border px-3 py-2 text-left">Party</th>
              <th className="border px-3 py-2 text-right">Votes</th>
              <th className="border px-3 py-2 text-right">Vote %</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={`${r.countyId}-${r.candidateId}`}>
                <td className="border px-3 py-2">{r.countyName}</td>
                <td className="border px-3 py-2">{r.candidateName}</td>
                <td className="border px-3 py-2">
                  {r.partyName} ({r.abbreviation})
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
      </div>

      {/* Footer note */}
      <div className="mt-3 text-xs text-slate-500">
        Data source: <code>v_candidate_county_stats_party</code>
      </div>
    </div>
  );
}

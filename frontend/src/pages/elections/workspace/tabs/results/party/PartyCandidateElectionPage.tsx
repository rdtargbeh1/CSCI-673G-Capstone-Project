

// src/pages/elections/workspace/tabs/results/party/PartyCandidateElectionPage.tsx

import { useMemo } from "react";
import { useParams, useSearchParams } from "react-router-dom";

/**
 * PARTY • CANDIDATE • ELECTION RESULTS
 *
 * Backend view:
 *   v_candidate_election_stats_party
 *
 * Scope:
 *   - One row per candidate for the entire election (contest-aware)
 *   - Tenant / Party-side totals (from vote_tally / vote_submission pipeline)
 *
 * Filters (later):
 *   - electionId (route param)
 *   - contestId (query param)
 */

type PartyCandidateElectionRow = {
  orgId?: string;

  electionId: string;
  contestId: string;

  candidateId: string;
  candidateName: string;

  partyId?: string;
  partyName?: string;
  partyCode?: string;

  candidateVotes: number;

  registeredVoters: number;
  ballotsCast: number;
  validVotes: number;
  invalidTotal: number;

  voteSharePct: number;
};

export default function PartyCandidateElectionPage() {
  const { electionId } = useParams();
  const [searchParams] = useSearchParams();

  const contestId = searchParams.get("contestId");

  /**
   * 🔧 PLACEHOLDER DATA
   * Replace with API call:
   *   GET /api/stats/party/candidates/election
   *
   * Params (later):
   *   electionId, contestId
   */
  const rows: PartyCandidateElectionRow[] = useMemo(
    () => [
      {
        orgId: "org-1",

        electionId: electionId ?? "—",
        contestId: contestId ?? "—",

        candidateId: "cand-1",
        candidateName: "John Doe",

        partyId: "party-1",
        partyName: "Unity Party",
        partyCode: "UP",

        candidateVotes: 534_220,

        registeredVoters: 2_200_000,
        ballotsCast: 1_450_000,
        validVotes: 1_420_000,
        invalidTotal: 30_000,

        voteSharePct: 37.62,
      },
      {
        orgId: "org-1",

        electionId: electionId ?? "—",
        contestId: contestId ?? "—",

        candidateId: "cand-2",
        candidateName: "Jane Smith",

        partyId: "party-2",
        partyName: "Liberty Party",
        partyCode: "LP",

        candidateVotes: 410_500,

        registeredVoters: 2_200_000,
        ballotsCast: 1_450_000,
        validVotes: 1_420_000,
        invalidTotal: 30_000,

        voteSharePct: 28.91,
      },
      {
        orgId: "org-1",

        electionId: electionId ?? "—",
        contestId: contestId ?? "—",

        candidateId: "cand-3",
        candidateName: "Richard Roe",

        partyId: "party-3",
        partyName: "People’s Movement",
        partyCode: "PM",

        candidateVotes: 475_280,

        registeredVoters: 2_200_000,
        ballotsCast: 1_450_000,
        validVotes: 1_420_000,
        invalidTotal: 30_000,

        voteSharePct: 33.47,
      },
    ],
    [electionId, contestId]
  );

  // Basic totals preview (placeholder)
  const totals = useMemo(() => {
    const totalVotes = rows.reduce((a, b) => a + (b.candidateVotes ?? 0), 0);
    const validVotes = rows[0]?.validVotes ?? 0;
    return { totalVotes, validVotes };
  }, [rows]);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      {/* Header */}
      <div className="mb-4 flex flex-col gap-1">
        <div className="text-lg font-extrabold text-slate-900">
          Party Results • Candidates (Election Level)
        </div>
        <div className="text-xs text-slate-600">
          Election: {electionId ?? "—"} • Contest: {contestId ?? "—"}
        </div>

        <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
          <span className="font-bold">Quick totals:</span>{" "}
          Total Candidate Votes: {totals.totalVotes.toLocaleString()} • Valid
          Votes (from view): {totals.validVotes.toLocaleString()}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full border border-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="border px-3 py-2 text-left">Candidate</th>
              <th className="border px-3 py-2 text-left">Party</th>
              <th className="border px-3 py-2 text-right">Votes</th>
              <th className="border px-3 py-2 text-right">Vote %</th>
              <th className="border px-3 py-2 text-right">Ballots Cast</th>
              <th className="border px-3 py-2 text-right">Valid</th>
              <th className="border px-3 py-2 text-right">Invalid</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.candidateId}>
                <td className="border px-3 py-2">{r.candidateName}</td>
                <td className="border px-3 py-2">
                  {r.partyName} ({r.partyCode})
                </td>
                <td className="border px-3 py-2 text-right">
                  {r.candidateVotes.toLocaleString()}
                </td>
                <td className="border px-3 py-2 text-right">
                  {r.voteSharePct.toFixed(2)}%
                </td>
                <td className="border px-3 py-2 text-right">
                  {r.ballotsCast.toLocaleString()}
                </td>
                <td className="border px-3 py-2 text-right">
                  {r.validVotes.toLocaleString()}
                </td>
                <td className="border px-3 py-2 text-right">
                  {r.invalidTotal.toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer note */}
      <div className="mt-3 text-xs text-slate-500">
        Data source: <code>v_candidate_election_stats_party</code>
      </div>
    </div>
  );
}

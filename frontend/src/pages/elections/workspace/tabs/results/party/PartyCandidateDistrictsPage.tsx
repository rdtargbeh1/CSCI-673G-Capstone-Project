
// src/pages/elections/workspace/tabs/results/party/PartyCandidateDistrictsPage.tsx

import { useMemo } from "react";
import { useParams, useSearchParams } from "react-router-dom";

/**
 * PARTY • CANDIDATE • DISTRICT RESULTS
 *
 * Backend view:
 *   v_candidate_district_stats_party
 *
 * Scope:
 *   - One row per candidate per district
 *   - Tenant / Party-side results (from vote submissions)
 *
 * Filters (later):
 *   - electionId (route param)
 *   - contestId (query param)
 *   - countyId (optional query param for narrowing)
 */

type PartyCandidateDistrictRow = {
  electionId: string;
  contestId: string;

  countyId: string;
  countyName: string;

  districtId: string;
  districtName: string;

  candidateId: string;
  candidateName: string;

  partyId?: string;
  partyName?: string;
  abbreviation?: string;

  candidateVotes: number;
  ballotsCast: number;
  totalValidVotes: number;
  totalInvalidVotes: number;

  voteSharePct: number;
};

export default function PartyCandidateDistrictsPage() {
  const { electionId } = useParams();
  const [searchParams] = useSearchParams();

  const contestId = searchParams.get("contestId");
  const countyIdFilter = searchParams.get("countyId"); // optional (later)

  /**
   * 🔧 PLACEHOLDER DATA
   * Replace with API call:
   *   GET /api/stats/party/candidates/districts
   *
   * Params (later):
   *   electionId, contestId, countyId
   */
  const rows: PartyCandidateDistrictRow[] = useMemo(() => {
    const data: PartyCandidateDistrictRow[] = [
      {
        electionId: electionId ?? "—",
        contestId: contestId ?? "—",

        countyId: "county-1",
        countyName: "Montserrado",

        districtId: "district-1",
        districtName: "District 10",

        candidateId: "cand-1",
        candidateName: "John Doe",

        partyId: "party-1",
        partyName: "Unity Party",
        abbreviation: "UP",

        candidateVotes: 55000,
        ballotsCast: 70000,
        totalValidVotes: 68000,
        totalInvalidVotes: 2000,

        voteSharePct: 80.88,
      },
      {
        electionId: electionId ?? "—",
        contestId: contestId ?? "—",

        countyId: "county-1",
        countyName: "Montserrado",

        districtId: "district-1",
        districtName: "District 10",

        candidateId: "cand-2",
        candidateName: "Jane Smith",

        partyId: "party-2",
        partyName: "Liberty Party",
        abbreviation: "LP",

        candidateVotes: 13000,
        ballotsCast: 70000,
        totalValidVotes: 68000,
        totalInvalidVotes: 2000,

        voteSharePct: 19.12,
      },
      {
        electionId: electionId ?? "—",
        contestId: contestId ?? "—",

        countyId: "county-1",
        countyName: "Montserrado",

        districtId: "district-2",
        districtName: "District 11",

        candidateId: "cand-1",
        candidateName: "John Doe",

        partyId: "party-1",
        partyName: "Unity Party",
        abbreviation: "UP",

        candidateVotes: 42000,
        ballotsCast: 56000,
        totalValidVotes: 54000,
        totalInvalidVotes: 2000,

        voteSharePct: 77.78,
      },
    ];

    // simple placeholder filter behavior
    if (countyIdFilter) return data.filter((r) => r.countyId === countyIdFilter);
    return data;
  }, [electionId, contestId, countyIdFilter]);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      {/* Header */}
      <div className="mb-4">
        <div className="text-lg font-extrabold text-slate-900">
          Party Results • Candidates by District
        </div>
        <div className="text-xs text-slate-600">
          Election: {electionId ?? "—"} • Contest: {contestId ?? "—"}
          {countyIdFilter ? ` • CountyFilter: ${countyIdFilter}` : ""}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full border border-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="border px-3 py-2 text-left">County</th>
              <th className="border px-3 py-2 text-left">District</th>
              <th className="border px-3 py-2 text-left">Candidate</th>
              <th className="border px-3 py-2 text-left">Party</th>
              <th className="border px-3 py-2 text-right">Votes</th>
              <th className="border px-3 py-2 text-right">Vote %</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={`${r.districtId}-${r.candidateId}`}>
                <td className="border px-3 py-2">{r.countyName}</td>
                <td className="border px-3 py-2">{r.districtName}</td>
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
        Data source: <code>v_candidate_district_stats_party</code>
      </div>
    </div>
  );
}

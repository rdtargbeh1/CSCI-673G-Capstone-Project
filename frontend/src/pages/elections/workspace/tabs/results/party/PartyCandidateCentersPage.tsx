
// src/pages/elections/workspace/tabs/results/party/PartyCandidateCentersPage.tsx

import { useMemo } from "react";
import { useParams, useSearchParams } from "react-router-dom";

/**
 * PARTY • CANDIDATE • CENTER RESULTS
 *
 * Backend view:
 *   v_candidate_center_stats_party
 *
 * Scope:
 *   - One row per candidate per center
 *   - Tenant / Party-side results (from vote submissions)
 *
 * Filters (later):
 *   - electionId (route param)
 *   - contestId (query param)
 *   - countyId, districtId, centerId (optional query params)
 */

type PartyCandidateCenterRow = {
  orgId?: string;

  electionId: string;
  contestId: string;

  countyId: string;
  countyName: string;

  districtId: string;
  districtName: string;

  centerId: string;
  centerCode: string;
  centerName: string;

  candidateId: string;
  candidateName: string;

  partyId?: string;
  partyName?: string;
  abbreviation?: string;

  candidateVotes: number;

  registeredVoters: number;
  ballotsCast: number;

  centerValidVotes: number;
  centerInvalidTotal: number;

  voteSharePct: number;
};

export default function PartyCandidateCentersPage() {
  const { electionId } = useParams();
  const [searchParams] = useSearchParams();

  const contestId = searchParams.get("contestId");
  const countyId = searchParams.get("countyId");
  const districtId = searchParams.get("districtId");
  const centerId = searchParams.get("centerId");

  /**
   * 🔧 PLACEHOLDER DATA
   * Replace with API call:
   *   GET /api/stats/party/candidates/centers
   *
   * Params (later):
   *   electionId, contestId, countyId, districtId, centerId
   */
  const rows: PartyCandidateCenterRow[] = useMemo(() => {
    const data: PartyCandidateCenterRow[] = [
      {
        orgId: "org-1",

        electionId: electionId ?? "—",
        contestId: contestId ?? "—",

        countyId: "county-1",
        countyName: "Montserrado",

        districtId: "district-10",
        districtName: "District 10",

        centerId: "center-100",
        centerCode: "PC-100",
        centerName: "B.W. Harris School",

        candidateId: "cand-1",
        candidateName: "John Doe",

        partyId: "party-1",
        partyName: "Unity Party",
        abbreviation: "UP",

        candidateVotes: 780,

        registeredVoters: 1200,
        ballotsCast: 900,

        centerValidVotes: 880,
        centerInvalidTotal: 20,

        voteSharePct: 88.64,
      },
      {
        orgId: "org-1",

        electionId: electionId ?? "—",
        contestId: contestId ?? "—",

        countyId: "county-1",
        countyName: "Montserrado",

        districtId: "district-10",
        districtName: "District 10",

        centerId: "center-100",
        centerCode: "PC-100",
        centerName: "B.W. Harris School",

        candidateId: "cand-2",
        candidateName: "Jane Smith",

        partyId: "party-2",
        partyName: "Liberty Party",
        abbreviation: "LP",

        candidateVotes: 100,

        registeredVoters: 1200,
        ballotsCast: 900,

        centerValidVotes: 880,
        centerInvalidTotal: 20,

        voteSharePct: 11.36,
      },
      {
        orgId: "org-1",

        electionId: electionId ?? "—",
        contestId: contestId ?? "—",

        countyId: "county-1",
        countyName: "Montserrado",

        districtId: "district-11",
        districtName: "District 11",

        centerId: "center-220",
        centerCode: "PC-220",
        centerName: "Paynesville City Hall",

        candidateId: "cand-1",
        candidateName: "John Doe",

        partyId: "party-1",
        partyName: "Unity Party",
        abbreviation: "UP",

        candidateVotes: 640,

        registeredVoters: 950,
        ballotsCast: 720,

        centerValidVotes: 700,
        centerInvalidTotal: 20,

        voteSharePct: 91.43,
      },
    ];

    // simple placeholder filtering behavior
    return data.filter((r) => {
      if (countyId && r.countyId !== countyId) return false;
      if (districtId && r.districtId !== districtId) return false;
      if (centerId && r.centerId !== centerId) return false;
      return true;
    });
  }, [electionId, contestId, countyId, districtId, centerId]);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      {/* Header */}
      <div className="mb-4">
        <div className="text-lg font-extrabold text-slate-900">
          Party Results • Candidates by Center
        </div>
        <div className="text-xs text-slate-600">
          Election: {electionId ?? "—"} • Contest: {contestId ?? "—"}
          {countyId ? ` • County: ${countyId}` : ""}
          {districtId ? ` • District: ${districtId}` : ""}
          {centerId ? ` • Center: ${centerId}` : ""}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full border border-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="border px-3 py-2 text-left">County</th>
              <th className="border px-3 py-2 text-left">District</th>
              <th className="border px-3 py-2 text-left">Center</th>
              <th className="border px-3 py-2 text-left">Candidate</th>
              <th className="border px-3 py-2 text-left">Party</th>
              <th className="border px-3 py-2 text-right">Votes</th>
              <th className="border px-3 py-2 text-right">Vote %</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={`${r.centerId}-${r.candidateId}`}>
                <td className="border px-3 py-2">{r.countyName}</td>
                <td className="border px-3 py-2">{r.districtName}</td>
                <td className="border px-3 py-2">
                  <div className="font-bold">{r.centerCode}</div>
                  <div className="text-xs text-slate-600">{r.centerName}</div>
                </td>
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
        Data source: <code>v_candidate_center_stats_party</code>
      </div>
    </div>
  );
}

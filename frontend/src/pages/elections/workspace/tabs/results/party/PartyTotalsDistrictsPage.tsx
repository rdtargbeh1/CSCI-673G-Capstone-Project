
// src/pages/elections/workspace/tabs/results/party/totals/PartyTotalsDistrictsPage.tsx

import { useMemo } from "react";
import { useParams, useSearchParams } from "react-router-dom";

type PartyTotalsDistrictRow = {
  orgId?: string;
  electionId: string;
  contestId: string;

  districtId: string;
  districtName: string;

  countyId: string;
  countyName: string;

  registeredVoters: number;
  ballotsCast: number;
  validVotes: number;
  invalidTotal: number;

  turnoutPct: number;
  invalidPct: number;
};

export default function PartyTotalsDistrictsPage() {
  const { electionId } = useParams();
  const [sp] = useSearchParams();
  const contestId = sp.get("contestId");
  const countyIdFilter = sp.get("countyId"); // optional later

  /**
   * 🔧 PLACEHOLDER DATA
   * Replace with API:
   *   GET /api/stats/party/totals/districts
   * Params: electionId, contestId, countyId (optional)
   */
  const rows: PartyTotalsDistrictRow[] = useMemo(() => {
    const data: PartyTotalsDistrictRow[] = [
      {
        orgId: "org-1",
        electionId: electionId ?? "—",
        contestId: contestId ?? "—",
        countyId: "county-1",
        countyName: "Montserrado",
        districtId: "dist-10",
        districtName: "District 10",
        registeredVoters: 120_000,
        ballotsCast: 80_000,
        validVotes: 78_000,
        invalidTotal: 2_000,
        turnoutPct: 66.67,
        invalidPct: 2.50,
      },
      {
        orgId: "org-1",
        electionId: electionId ?? "—",
        contestId: contestId ?? "—",
        countyId: "county-1",
        countyName: "Montserrado",
        districtId: "dist-11",
        districtName: "District 11",
        registeredVoters: 95_000,
        ballotsCast: 60_000,
        validVotes: 58_500,
        invalidTotal: 1_500,
        turnoutPct: 63.16,
        invalidPct: 2.50,
      },
    ];

    if (countyIdFilter) return data.filter((r) => r.countyId === countyIdFilter);
    return data;
  }, [electionId, contestId, countyIdFilter]);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="mb-4">
        <div className="text-lg font-extrabold text-slate-900">
          Party Totals • Districts
        </div>
        <div className="text-xs text-slate-600">
          Election: {electionId ?? "—"} • Contest: {contestId ?? "—"}
          {countyIdFilter ? ` • CountyFilter: ${countyIdFilter}` : ""}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full border border-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="border px-3 py-2 text-left">County</th>
              <th className="border px-3 py-2 text-left">District</th>
              <th className="border px-3 py-2 text-right">Registered</th>
              <th className="border px-3 py-2 text-right">Ballots Cast</th>
              <th className="border px-3 py-2 text-right">Valid</th>
              <th className="border px-3 py-2 text-right">Invalid</th>
              <th className="border px-3 py-2 text-right">Turnout %</th>
              <th className="border px-3 py-2 text-right">Invalid %</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.districtId}>
                <td className="border px-3 py-2">{r.countyName}</td>
                <td className="border px-3 py-2">{r.districtName}</td>
                <td className="border px-3 py-2 text-right">
                  {r.registeredVoters.toLocaleString()}
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
                <td className="border px-3 py-2 text-right">
                  {r.turnoutPct.toFixed(2)}%
                </td>
                <td className="border px-3 py-2 text-right">
                  {r.invalidPct.toFixed(2)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-3 text-xs text-slate-500">
        Data source: <code>v_district_stats_party</code>
      </div>
    </div>
  );
}

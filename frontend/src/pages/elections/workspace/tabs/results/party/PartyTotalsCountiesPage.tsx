

// src/pages/elections/workspace/tabs/results/party/totals/PartyTotalsCountiesPage.tsx

import { useMemo } from "react";
import { useParams, useSearchParams } from "react-router-dom";

type PartyTotalsCountyRow = {
  orgId?: string;
  electionId: string;
  contestId: string;

  countyId: string;
  countyName: string;

  registeredVoters: number;
  ballotsCast: number;
  validVotes: number;
  invalidTotal: number;

  turnoutPct: number;
  invalidPct: number;
};

export default function PartyTotalsCountiesPage() {
  const { electionId } = useParams();
  const [sp] = useSearchParams();
  const contestId = sp.get("contestId");

  /**
   * 🔧 PLACEHOLDER DATA
   * Replace with API:
   *   GET /api/stats/party/totals/counties
   * Params: electionId, contestId
   */
  const rows: PartyTotalsCountyRow[] = useMemo(
    () => [
      {
        orgId: "org-1",
        electionId: electionId ?? "—",
        contestId: contestId ?? "—",
        countyId: "county-1",
        countyName: "Montserrado",
        registeredVoters: 900_000,
        ballotsCast: 600_000,
        validVotes: 585_000,
        invalidTotal: 15_000,
        turnoutPct: 66.67,
        invalidPct: 2.50,
      },
      {
        orgId: "org-1",
        electionId: electionId ?? "—",
        contestId: contestId ?? "—",
        countyId: "county-2",
        countyName: "Nimba",
        registeredVoters: 500_000,
        ballotsCast: 320_000,
        validVotes: 312_000,
        invalidTotal: 8_000,
        turnoutPct: 64.00,
        invalidPct: 2.50,
      },
    ],
    [electionId, contestId]
  );

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="mb-4">
        <div className="text-lg font-extrabold text-slate-900">
          Party Totals • Counties
        </div>
        <div className="text-xs text-slate-600">
          Election: {electionId ?? "—"} • Contest: {contestId ?? "—"}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full border border-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="border px-3 py-2 text-left">County</th>
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
              <tr key={r.countyId}>
                <td className="border px-3 py-2">{r.countyName}</td>
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
        Data source: <code>v_county_stats_party</code>
      </div>
    </div>
  );
}




// src/pages/elections/workspace/tabs/results/official/totals/OfficialTotalsDistrictsPage.tsx

import { useMemo } from "react";

export default function OfficialTotalsDistrictsPage() {
  /**
   * 🔧 PLACEHOLDER DATA
   * Source → v_district_stats_official
   */
  const rows = useMemo(
    () => [
      {
        countyName: "Montserrado",
        districtName: "District 10",
        registeredVoters: 25000,
        ballotsCast: 18000,
        validVotes: 17200,
        invalidTotal: 800,
        turnoutPct: 72.0,
        invalidPct: 4.44,
      },
    ],
    []
  );

  return (
    <div className="rounded-xl border bg-white p-4">
      <div className="mb-3 text-lg font-extrabold">Official Totals • Districts</div>

      <table className="w-full border text-sm">
        <thead className="bg-slate-50">
          <tr>
            <th className="border px-3 py-2">County</th>
            <th className="border px-3 py-2">District</th>
            <th className="border px-3 py-2 text-right">Reg.</th>
            <th className="border px-3 py-2 text-right">Cast</th>
            <th className="border px-3 py-2 text-right">Valid</th>
            <th className="border px-3 py-2 text-right">Invalid</th>
            <th className="border px-3 py-2 text-right">Turnout %</th>
            <th className="border px-3 py-2 text-right">Invalid %</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              <td className="border px-3 py-2">{r.countyName}</td>
              <td className="border px-3 py-2">{r.districtName}</td>
              <td className="border px-3 py-2 text-right">{r.registeredVoters.toLocaleString()}</td>
              <td className="border px-3 py-2 text-right">{r.ballotsCast.toLocaleString()}</td>
              <td className="border px-3 py-2 text-right">{r.validVotes.toLocaleString()}</td>
              <td className="border px-3 py-2 text-right">{r.invalidTotal.toLocaleString()}</td>
              <td className="border px-3 py-2 text-right">{r.turnoutPct.toFixed(2)}%</td>
              <td className="border px-3 py-2 text-right">{r.invalidPct.toFixed(2)}%</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-3 text-xs text-slate-500">
        Data source: <code>v_district_stats_official</code>
      </div>
    </div>
  );
}


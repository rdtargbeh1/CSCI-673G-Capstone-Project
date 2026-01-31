


// src/pages/elections/workspace/tabs/results/official/totals/OfficialTotalsCountiesPage.tsx

import { useMemo } from "react";

export default function OfficialTotalsCountiesPage() {
  /**
   * 🔧 PLACEHOLDER DATA
   * Source → v_county_stats_official
   */
  const rows = useMemo(
    () => [
      {
        countyName: "Montserrado",
        registeredVoters: 350000,
        ballotsCast: 270000,
        validVotes: 260500,
        invalidTotal: 9500,
      },
    ],
    []
  );

  return (
    <div className="rounded-xl border bg-white p-4">
      <div className="mb-3 text-lg font-extrabold">Official Totals • Counties</div>

      <table className="w-full border text-sm">
        <thead className="bg-slate-50">
          <tr>
            <th className="border px-3 py-2">County</th>
            <th className="border px-3 py-2 text-right">Reg.</th>
            <th className="border px-3 py-2 text-right">Cast</th>
            <th className="border px-3 py-2 text-right">Valid</th>
            <th className="border px-3 py-2 text-right">Invalid</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              <td className="border px-3 py-2">{r.countyName}</td>
              <td className="border px-3 py-2 text-right">{r.registeredVoters.toLocaleString()}</td>
              <td className="border px-3 py-2 text-right">{r.ballotsCast.toLocaleString()}</td>
              <td className="border px-3 py-2 text-right">{r.validVotes.toLocaleString()}</td>
              <td className="border px-3 py-2 text-right">{r.invalidTotal.toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-3 text-xs text-slate-500">
        Data source: <code>v_county_stats_official</code>
      </div>
    </div>
  );
}

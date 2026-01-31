

// src/pages/elections/workspace/tabs/results/official/totals/OfficialTotalsCentersPage.tsx

import { useMemo } from "react";
import { useParams, useSearchParams } from "react-router-dom";

type OfficialCenterTotalsRow = {
  electionId: string;
  contestId: string;

  countyName: string;
  districtName: string;

  centerCode: string;
  centerName: string;

  registeredVoters: number;
  ballotsCast: number;
  validVotes: number;
  invalidTotal: number;

  turnoutPct: number;
  invalidPct: number;
};

export default function OfficialTotalsCentersPage() {
  const { electionId } = useParams();
  const [sp] = useSearchParams();
  const contestId = sp.get("contestId");

  /**
   * 🔧 PLACEHOLDER DATA
   * API → /api/stats/official/centers
   * Source → v_center_stats_official
   */
  const rows: OfficialCenterTotalsRow[] = useMemo(
    () => [
      {
        electionId: electionId ?? "—",
        contestId: contestId ?? "—",
        countyName: "Montserrado",
        districtName: "District 10",
        centerCode: "PC-100",
        centerName: "B.W. Harris School",
        registeredVoters: 1500,
        ballotsCast: 1200,
        validVotes: 1150,
        invalidTotal: 50,
        turnoutPct: 80.0,
        invalidPct: 4.17,
      },
    ],
    [electionId, contestId]
  );

  return (
    <Card title="Official Totals • Centers" source="v_center_stats_official">
      <table className="w-full border text-sm">
        <thead className="bg-slate-50">
          <tr>
            <th className="border px-3 py-2">County</th>
            <th className="border px-3 py-2">District</th>
            <th className="border px-3 py-2">Center</th>
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
              <td className="border px-3 py-2">
                {r.centerCode} — {r.centerName}
              </td>
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
    </Card>
  );
}

function Card(props: { title: string; source: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="mb-3 text-lg font-extrabold">{props.title}</div>
      {props.children}
      <div className="mt-3 text-xs text-slate-500">
        Data source: <code>{props.source}</code>
      </div>
    </div>
  );
}

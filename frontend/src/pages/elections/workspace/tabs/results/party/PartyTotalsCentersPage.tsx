
// src/pages/elections/workspace/tabs/results/party/totals/PartyTotalsCentersPage.tsx

import { useMemo } from "react";
import { useParams, useSearchParams } from "react-router-dom";

type PartyTotalsCenterRow = {
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

  registeredVoters: number;
  ballotsCast: number;
  validVotes: number;
  invalidTotal: number;

  turnoutPct: number;
  invalidPct: number;
};

export default function PartyTotalsCentersPage() {
  const { electionId } = useParams();
  const [sp] = useSearchParams();

  const contestId = sp.get("contestId");
  const countyId = sp.get("countyId");
  const districtId = sp.get("districtId");
  const centerId = sp.get("centerId");

  /**
   * 🔧 PLACEHOLDER DATA
   * Replace with API:
   *   GET /api/stats/party/totals/centers
   *
   * Params: electionId, contestId, countyId?, districtId?, centerId?
   */
  const rows: PartyTotalsCenterRow[] = useMemo(() => {
    const data: PartyTotalsCenterRow[] = [
      {
        orgId: "org-1",
        electionId: electionId ?? "—",
        contestId: contestId ?? "—",

        countyId: "county-1",
        countyName: "Montserrado",

        districtId: "dist-10",
        districtName: "District 10",

        centerId: "center-100",
        centerCode: "PC-100",
        centerName: "B.W. Harris School",

        registeredVoters: 1200,
        ballotsCast: 900,
        validVotes: 880,
        invalidTotal: 20,

        turnoutPct: 75.0,
        invalidPct: 2.22,
      },
      {
        orgId: "org-1",
        electionId: electionId ?? "—",
        contestId: contestId ?? "—",

        countyId: "county-1",
        countyName: "Montserrado",

        districtId: "dist-11",
        districtName: "District 11",

        centerId: "center-220",
        centerCode: "PC-220",
        centerName: "Paynesville City Hall",

        registeredVoters: 950,
        ballotsCast: 720,
        validVotes: 700,
        invalidTotal: 20,

        turnoutPct: 75.79,
        invalidPct: 2.78,
      },
    ];

    return data.filter((r) => {
      if (countyId && r.countyId !== countyId) return false;
      if (districtId && r.districtId !== districtId) return false;
      if (centerId && r.centerId !== centerId) return false;
      return true;
    });
  }, [electionId, contestId, countyId, districtId, centerId]);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="mb-4">
        <div className="text-lg font-extrabold text-slate-900">
          Party Totals • Centers
        </div>
        <div className="text-xs text-slate-600">
          Election: {electionId ?? "—"} • Contest: {contestId ?? "—"}
          {countyId ? ` • County: ${countyId}` : ""}
          {districtId ? ` • District: ${districtId}` : ""}
          {centerId ? ` • Center: ${centerId}` : ""}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full border border-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="border px-3 py-2 text-left">County</th>
              <th className="border px-3 py-2 text-left">District</th>
              <th className="border px-3 py-2 text-left">Center</th>
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
              <tr key={r.centerId}>
                <td className="border px-3 py-2">{r.countyName}</td>
                <td className="border px-3 py-2">{r.districtName}</td>
                <td className="border px-3 py-2">
                  <div className="font-bold">{r.centerCode}</div>
                  <div className="text-xs text-slate-600">{r.centerName}</div>
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
      </div>

      <div className="mt-3 text-xs text-slate-500">
        Data source: <code>v_center_stats_party</code>
      </div>
    </div>
  );
}

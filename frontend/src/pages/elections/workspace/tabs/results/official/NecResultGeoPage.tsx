

// src/pages/elections/workspace/tabs/results/official/geo/NecResultGeoPage.tsx

import { useMemo } from "react";
import { useParams, useSearchParams } from "react-router-dom";

type NecResultGeoRow = {
  resultId: string;
  electionId: string;
  contestId: string;

  centerId: string;
  centerCode?: string;
  centerName?: string;

  districtId?: string;
  districtName?: string;

  countyId?: string;
  countyName?: string;

  totalRegisteredVoters?: number;

  ballotsCast?: number;

  invalidBallots?: number;
  unmarkedBallots?: number;
  rejectedBallots?: number;

  spoiledBallots?: number; // outside box
  unusedBallots?: number;  // outside box

  ballotsIssued?: number;

  source?: string;
  uploadTime?: string; // ISO string
};

function pillClass(text: string) {
  return [
    "inline-flex items-center rounded-full border px-2 py-1 text-xs font-extrabold",
    "border-slate-200 bg-slate-50 text-slate-700",
  ].join(" ");
}

export default function NecResultGeoPage() {
  const { electionId } = useParams();
  const [sp] = useSearchParams();
  const contestId = sp.get("contestId") ?? "";

  /**
   * ✅ EXPECTED BACKEND SOURCE
   * - View / MV: mv_nec_result_geo
   * - Endpoint (example):
   *   GET /api/stats/official/nec/geo?electionId=...&contestId=...&countyId=...&districtId=...&centerId=...
   *
   * NOTE:
   * - contestId is now included in the view (nr.contest_id)
   * - page/sort filters should match your controller.
   */

  // 🔧 PLACEHOLDER DATA (replace with real query later)
  const rows: NecResultGeoRow[] = useMemo(
    () => [
      {
        resultId: "8a7d...-demo-001",
        electionId: electionId ?? "—",
        contestId: contestId || "—",

        centerId: "c1...demo",
        centerCode: "MTS-001",
        centerName: "Monrovia Central High",

        districtId: "d1...demo",
        districtName: "District 10",

        countyId: "k1...demo",
        countyName: "Montserrado",

        totalRegisteredVoters: 1500,

        ballotsCast: 1200,

        invalidBallots: 10,
        unmarkedBallots: 5,
        rejectedBallots: 2,

        spoiledBallots: 3, // outside box
        unusedBallots: 300, // outside box

        ballotsIssued: 1503,

        source: "UPLOAD",
        uploadTime: "2026-01-30T10:23:45Z",
      },
      {
        resultId: "8a7d...-demo-002",
        electionId: electionId ?? "—",
        contestId: contestId || "—",

        centerId: "c2...demo",
        centerCode: "MTS-002",
        centerName: "Paynesville Public School",

        districtId: "d2...demo",
        districtName: "District 9",

        countyId: "k1...demo",
        countyName: "Montserrado",

        totalRegisteredVoters: 2100,

        ballotsCast: 1890,

        invalidBallots: 25,
        unmarkedBallots: 8,
        rejectedBallots: 4,

        spoiledBallots: 6, // outside box
        unusedBallots: 210, // outside box

        ballotsIssued: 2106,

        source: "DATA_ENTRY",
        uploadTime: "2026-01-30T12:15:00Z",
      },
    ],
    [electionId, contestId]
  );

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-lg font-extrabold text-slate-900">
            Official • NEC Result Geo
          </div>

          <div className="mt-1 flex flex-wrap items-center gap-2">
            <span className={pillClass("pill")}>Election: {electionId ?? "—"}</span>
            <span className={pillClass("pill")}>
              Contest: {contestId ? contestId : "—"}
            </span>
            <span className={pillClass("pill")}>Source: mv_nec_result_geo</span>
          </div>

          <div className="mt-2 text-xs text-slate-600">
            This page is the official NEC-published feed, scoped by election + contest and
            filterable by county/district/center + upload time.
          </div>
        </div>

        {/* Placeholder controls (wire to query later) */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-extrabold hover:bg-slate-50"
            onClick={() => {
              // later: queryClient.invalidateQueries([...])
              // for now: placeholder
              alert("Hook refresh to react-query later.");
            }}
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
        <table className="min-w-[1100px] w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="border-b px-3 py-2 text-left">County</th>
              <th className="border-b px-3 py-2 text-left">District</th>
              <th className="border-b px-3 py-2 text-left">Center</th>

              <th className="border-b px-3 py-2 text-right">Registered</th>
              <th className="border-b px-3 py-2 text-right">Ballots In Box</th>

              <th className="border-b px-3 py-2 text-right">Invalid</th>
              <th className="border-b px-3 py-2 text-right">Unmarked</th>
              <th className="border-b px-3 py-2 text-right">Rejected</th>

              <th className="border-b px-3 py-2 text-right">Spoiled</th>
              <th className="border-b px-3 py-2 text-right">Unused</th>

              <th className="border-b px-3 py-2 text-right">Issued</th>

              <th className="border-b px-3 py-2 text-left">Source</th>
              <th className="border-b px-3 py-2 text-left">Upload Time</th>
            </tr>
          </thead>

          <tbody>
            {rows.map((r) => (
              <tr key={r.resultId} className="hover:bg-slate-50">
                <td className="border-b px-3 py-2">{r.countyName ?? "—"}</td>
                <td className="border-b px-3 py-2">{r.districtName ?? "—"}</td>

                <td className="border-b px-3 py-2">
                  <div className="font-extrabold text-slate-900">
                    {r.centerCode ?? "—"}{" "}
                    <span className="font-normal text-slate-500">
                      • {r.centerName ?? "—"}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500">
                    CenterId: {r.centerId}
                  </div>
                </td>

                <td className="border-b px-3 py-2 text-right">
                  {(r.totalRegisteredVoters ?? 0).toLocaleString()}
                </td>

                <td className="border-b px-3 py-2 text-right font-extrabold">
                  {(r.ballotsCast ?? 0).toLocaleString()}
                </td>

                <td className="border-b px-3 py-2 text-right">
                  {(r.invalidBallots ?? 0).toLocaleString()}
                </td>

                <td className="border-b px-3 py-2 text-right">
                  {(r.unmarkedBallots ?? 0).toLocaleString()}
                </td>

                <td className="border-b px-3 py-2 text-right">
                  {(r.rejectedBallots ?? 0).toLocaleString()}
                </td>

                <td className="border-b px-3 py-2 text-right">
                  {(r.spoiledBallots ?? 0).toLocaleString()}
                </td>

                <td className="border-b px-3 py-2 text-right">
                  {(r.unusedBallots ?? 0).toLocaleString()}
                </td>

                <td className="border-b px-3 py-2 text-right">
                  {(r.ballotsIssued ?? 0).toLocaleString()}
                </td>

                <td className="border-b px-3 py-2">{r.source ?? "—"}</td>
                <td className="border-b px-3 py-2">
                  {r.uploadTime ? r.uploadTime.replace("T", " ").replace("Z", "") : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-3 text-xs text-slate-500">
        Placeholder only. Replace <code>rows</code> with react-query call to your NEC
        Geo endpoint.
      </div>
    </div>
  );
}

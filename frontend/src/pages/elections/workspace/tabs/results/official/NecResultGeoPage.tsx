

// src/pages/elections/workspace/tabs/results/official/geo/NecResultGeoPage.tsx

import { useMemo, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import {
  searchNecResultGeo,
  type NecResultGeoRow,
} from "../../../../../../shared/services/stats/necResultGeoService";

function fmtNum(n: any) {
  const v = Number(n);
  if (!isFinite(v)) return "—";
  return v.toLocaleString();
}

function fmtUpload(dt: any) {
  if (!dt) return "—";
  const d = new Date(String(dt));
  if (isNaN(d.getTime())) return String(dt);

  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function setSP(
  searchParams: URLSearchParams,
  setSearchParams: ReturnType<typeof useSearchParams>[1],
  updates: Record<string, string | undefined | null>,
  opts?: { resetPage?: boolean }
) {
  const next = new URLSearchParams(searchParams);

  Object.entries(updates).forEach(([k, v]) => {
    const clean = v == null ? "" : String(v);
    if (!clean) next.delete(k);
    else next.set(k, clean);
  });

  if (opts?.resetPage) next.set("page", "0");

  setSearchParams(next, { replace: true });
}

export default function NecResultGeoPage() {
  const { electionId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();

  const contestId = searchParams.get("contestId") ?? "";
  const countyId = searchParams.get("countyId") ?? "";
  const districtId = searchParams.get("districtId") ?? "";
  const centerId = searchParams.get("centerId") ?? "";

  const page = Number(searchParams.get("page") ?? "0");
  const size = Number(searchParams.get("size") ?? "25");

  const [sort] = useState<string[]>(["uploadTime,desc"]);

  const enabled = Boolean(electionId);

  const q = useQuery({
    queryKey: [
      "stats",
      "official",
      "nec-geo",
      electionId,
      contestId || "ALL",
      countyId,
      districtId,
      centerId,
      page,
      size,
      sort,
    ],
    enabled,
    queryFn: async () =>
      searchNecResultGeo({
        electionId: String(electionId),
        contestId: contestId || undefined,
        countyId: countyId || undefined,
        districtId: districtId || undefined,
        centerId: centerId || undefined,
        page,
        size,
        sort,
      }),
    staleTime: 10_000,
    retry: 1,
  });

  const rows: NecResultGeoRow[] = q.data?.content ?? [];

  const countyOptions = useMemo(() => {
    const m = new Map<string, string>();
    for (const r of rows as any[]) {
      if (r.countyId && r.countyName) m.set(r.countyId, r.countyName);
    }
    return Array.from(m.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [rows]);

  const districtOptions = useMemo(() => {
    const m = new Map<string, { name: string; countyId?: string }>();
    for (const r of rows as any[]) {
      if (r.districtId && r.districtName)
        m.set(r.districtId, { name: r.districtName, countyId: r.countyId });
    }

    const all = Array.from(m.entries()).map(([id, v]) => ({
      id,
      name: v.name,
      countyId: v.countyId,
    }));

    return (countyId ? all.filter((d) => d.countyId === countyId) : all).sort(
      (a, b) => a.name.localeCompare(b.name)
    );
  }, [rows, countyId]);

  const onCountyChange = (nextCountyId: string) =>
    setSP(
      searchParams,
      setSearchParams,
      { countyId: nextCountyId || undefined, districtId: undefined, centerId: undefined },
      { resetPage: true }
    );

  const onDistrictChange = (nextDistrictId: string) =>
    setSP(
      searchParams,
      setSearchParams,
      { districtId: nextDistrictId || undefined, centerId: undefined },
      { resetPage: true }
    );

  const clearFilters = () =>
    setSP(
      searchParams,
      setSearchParams,
      { countyId: undefined, districtId: undefined, centerId: undefined },
      { resetPage: true }
    );

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-lg font-extrabold text-slate-900">
          Official • NEC Result Geo
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={countyId}
            onChange={(e) => onCountyChange(e.target.value)}
            className="h-9 min-w-[240px] rounded-xl border border-slate-300 bg-white px-3 text-base font-bold"
          >
            <option value="">All counties</option>
            {countyOptions.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <select
            value={districtId}
            onChange={(e) => onDistrictChange(e.target.value)}
            className="h-9 min-w-[240px] rounded-xl border border-slate-300 bg-white px-3 text-base font-bold"
          >
            <option value="">
              {countyId ? "All districts (in county)" : "All districts"}
            </option>
            {districtOptions.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={clearFilters}
            className="h-9 rounded-xl border bg-white px-3 text-base font-extrabold hover:bg-slate-50"
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
        <table className="min-w-[1200px] w-full text-base">
          <thead className="bg-slate-50">
            <tr>
              <th className="border-b px-3 py-2 text-left">County</th>
              <th className="border-b px-3 py-2 text-left">District</th>
              <th className="border-b px-3 py-2 text-left">Center Code</th>
              <th className="border-b px-3 py-2 text-left">Center Name</th>
              <th className="border-b px-3 py-2 text-right">Registered</th>
              <th className="border-b px-3 py-2 text-right">Ballots In Box</th>
              <th className="border-b px-3 py-2 text-right">Invalid</th>
              <th className="border-b px-3 py-2 text-right">Unmarked</th>
              <th className="border-b px-3 py-2 text-right">Rejected</th>
              <th className="border-b px-3 py-2 text-right">Spoiled</th>
              <th className="border-b px-3 py-2 text-right">Unused</th>
              <th className="border-b px-3 py-2 text-right">Issued</th>
              <th className="border-b px-3 py-2 text-left">Upload Time</th>
            </tr>
          </thead>

          <tbody>
            {rows.map((r) => (
              <tr key={r.resultId} className="hover:bg-slate-50">
                <td className="border-b px-3 py-2">{r.countyName ?? "—"}</td>
                <td className="border-b px-3 py-2">{r.districtName ?? "—"}</td>
                <td className="border-b px-3 py-2 ">{r.centerCode ?? "—"}</td>
                <td className="border-b px-3 py-2">
                  {r.centerName ?? "—"}
                </td>
                <td className="border-b px-3 py-2 text-right">{fmtNum(r.totalRegisteredVoters)}</td>
                <td className="border-b px-3 py-2 text-right font-bold">{fmtNum(r.ballotsCast)}</td>
                <td className="border-b px-3 py-2 text-right">{fmtNum(r.invalidBallots)}</td>
                <td className="border-b px-3 py-2 text-right">{fmtNum(r.unmarkedBallots)}</td>
                <td className="border-b px-3 py-2 text-right">{fmtNum(r.rejectedBallots)}</td>
                <td className="border-b px-3 py-2 text-right">{fmtNum(r.spoiledBallots)}</td>
                <td className="border-b px-3 py-2 text-right">{fmtNum(r.unusedBallots)}</td>
                <td className="border-b px-3 py-2 text-right">{fmtNum(r.ballotsIssued)}</td>
                <td className="border-b px-3 py-2 whitespace-nowrap">
                  {fmtUpload(r.uploadTime)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}


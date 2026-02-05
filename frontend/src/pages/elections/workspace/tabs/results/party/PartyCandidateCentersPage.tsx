// src/pages/elections/workspace/tabs/results/party/PartyCandidateCentersPage.tsx

import { useMemo, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import { useAuth } from "../../../../../../auth/useAuth";
import { useAuthStore } from "../../../../../../shared/store/authStore";

import { Panel, PlaceholderNote } from "../../../../shared/elections-ui";

import { listContestsByElection } from "../../../../../../shared/services/contestService";
import type { ContestDto } from "../../../../../../auth/contestTypes";

import {
  searchCandidateCenterStatsParty,
  type CandidateCenterStatsPartyRow,
} from "../../../../../../shared/services/stats/candidateCenterStatsPartyService";

function fmtPct(n: number) {
  if (n === null || n === undefined) return "—";
  const v = Number(n);
  if (Number.isNaN(v)) return "—";
  return `${v.toFixed(2)}%`;
}

export default function PartyCandidateCentersPage() {
  const { electionId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();

  const auth: any = useAuth();

  // tenant org
  const orgId = useAuthStore((s) => s.currentOrgId);

  // token (kept to match your auth pattern; apiClient likely already injects it)
  const token =
    auth?.token ??
    auth?.accessToken ??
    useAuthStore((s: any) => s.accessToken ?? s.token);

  // Required query param (NOW user selects it)
  const contestId = searchParams.get("contestId") ?? "";

  // Optional filters
  const countyId = searchParams.get("countyId") ?? "";
  const districtId = searchParams.get("districtId") ?? "";
  const centerId = searchParams.get("centerId") ?? "";
  const candidateId = searchParams.get("candidateId") ?? "";
  const partyId = searchParams.get("partyId") ?? "";

  // paging
  const page = Number(searchParams.get("page") ?? "0");
  const size = Number(searchParams.get("size") ?? "25");

  // sorting
  const [sort, setSort] = useState<string[]>([
    "countyName,asc",
    "districtName,asc",
    "centerCode,asc",
    "candidateVotes,desc",
  ]);

  // ----------------------------
  // 1) Contest dropdown query
  // ----------------------------
  const contestsQ = useQuery({
    queryKey: ["contests", "by-election", electionId],
    enabled: Boolean(electionId),
    queryFn: async () => {
      return listContestsByElection(String(electionId));
    },
  });

  const contests: ContestDto[] = contestsQ.data ?? [];

  const selectedContest = useMemo(() => {
    if (!contestId) return null;
    return contests.find((c) => String((c as any).contestId) === String(contestId)) ?? null;
  }, [contestId, contests]);

  function setParam(key: string, value?: string) {
    const sp = new URLSearchParams(searchParams);
    if (!value) sp.delete(key);
    else sp.set(key, value);
    setSearchParams(sp);
  }

  function onContestChange(nextContestId: string) {
    const sp = new URLSearchParams(searchParams);

    if (!nextContestId) sp.delete("contestId");
    else sp.set("contestId", nextContestId);

    // reset paging when contest changes
    sp.set("page", "0");

    setSearchParams(sp);
  }

  // enable only if electionId AND contest selected
  const enabled = Boolean(electionId) && Boolean(contestId);

  // ----------------------------
  // 2) Stats query (contest-based)
  // ----------------------------
  const q = useQuery({
    queryKey: [
      "stats",
      "party",
      "candidate-centers",
      {
        orgId,
        electionId,
        contestId,
        countyId,
        districtId,
        centerId,
        candidateId,
        partyId,
        page,
        size,
        sort,
      },
    ],
    enabled,
    queryFn: async () => {
      return searchCandidateCenterStatsParty(
        {
          orgId: orgId ?? undefined,
          electionId: String(electionId),
          contestId: String(contestId),
          countyId: countyId || undefined,
          districtId: districtId || undefined,
          centerId: centerId || undefined,
          candidateId: candidateId || undefined,
          partyId: partyId || undefined,
          page,
          size,
          sort,
        },
      );
    },
  });

  const rows: CandidateCenterStatsPartyRow[] = q.data?.content ?? [];

  const headerLine = useMemo(() => {
    const parts = [
      `Election: ${electionId ?? "—"}`,
      `Contest: ${selectedContest ? (selectedContest as any).contestName ?? contestId : contestId || "—"}`,
      countyId ? `County: ${countyId}` : null,
      districtId ? `District: ${districtId}` : null,
      centerId ? `Center: ${centerId}` : null,
      candidateId ? `Candidate: ${candidateId}` : null,
      partyId ? `Party: ${partyId}` : null,
    ].filter(Boolean);
    return parts.join(" • ");
  }, [
    electionId,
    contestId,
    selectedContest,
    countyId,
    districtId,
    centerId,
    candidateId,
    partyId,
  ]);

  function setPage(next: number) {
    const sp = new URLSearchParams(searchParams);
    sp.set("page", String(Math.max(0, next)));
    setSearchParams(sp);
  }

  function toggleSort(field: string) {
    const primary = sort?.[0] ?? "";
    const [curField, curDir] = primary.split(",");
    if (curField === field) {
      const nextDir = (curDir ?? "asc").toLowerCase() === "asc" ? "desc" : "asc";
      setSort([`${field},${nextDir}`, ...sort.slice(1)]);
    } else {
      setSort([`${field},asc`, ...sort]);
    }
    setPage(0);
  }

  return (
    <Panel title="Party Results • Candidates by Center">
      {/* Top controls: Contest selector */}
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-[280px]">
          <div className="mb-1 text-xs font-extrabold text-slate-700">Contest</div>

          <select
            value={contestId}
            onChange={(e) => onContestChange(e.target.value)}
            className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-bold text-slate-900"
            disabled={contestsQ.isLoading || contestsQ.isError || !electionId}
          >
            <option value="">
              {contestsQ.isLoading
                ? "Loading contests…"
                : !electionId
                ? "Election not selected"
                : "Select a contest…"}
            </option>

            {contests.map((c: any) => (
              <option key={c.contestId} value={c.contestId}>
                {c.contestName}
              </option>
            ))}
          </select>

          {contestsQ.isError ? (
            <div className="mt-1 text-xs text-rose-700">
              {(contestsQ.error as Error)?.message ?? "Failed to load contests."}
            </div>
          ) : null}
        </div>

        <div className="text-xs text-slate-600">
          {headerLine}
          <div className="mt-1 text-xs text-slate-500">
            Source: <code>v_candidate_center_stats_party</code>
          </div>
        </div>
      </div>

      {/* If contest not selected, show guidance */}
      {!enabled ? (
        <PlaceholderNote
          title="Select a contest to view results"
          bullets={[
            "Party results are contest-based (one contest at a time).",
            "Choose a contest above; filters like county/district/center can be added later.",
          ]}
        />
      ) : (
        <>
          {/* Header actions */}
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => q.refetch()}
              className="h-9 rounded-xl border bg-white px-3 text-sm font-bold hover:bg-slate-50"
            >
              Refresh
            </button>
          </div>

          {/* Loading/Error */}
          {q.isLoading ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
              Loading candidate center results…
            </div>
          ) : q.isError ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
              {(q.error as Error)?.message ?? "Failed to load."}
            </div>
          ) : rows.length === 0 ? (
            <div className="mt-2">
              <PlaceholderNote
                title="No results found"
                bullets={[
                  "This contest may not have submissions yet for your tenant/org.",
                  "If you expected data, confirm submissions were verified and tallied.",
                ]}
              />
            </div>
          ) : (
            <>
              {/* Table */}
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="border-b px-3 py-2 text-left">
                        <button
                          type="button"
                          onClick={() => toggleSort("countyName")}
                          className="font-extrabold hover:underline"
                        >
                          County
                        </button>
                      </th>
                      <th className="border-b px-3 py-2 text-left">
                        <button
                          type="button"
                          onClick={() => toggleSort("districtName")}
                          className="font-extrabold hover:underline"
                        >
                          District
                        </button>
                      </th>
                      <th className="border-b px-3 py-2 text-left">
                        <button
                          type="button"
                          onClick={() => toggleSort("centerCode")}
                          className="font-extrabold hover:underline"
                        >
                          Center
                        </button>
                      </th>
                      <th className="border-b px-3 py-2 text-left">
                        <button
                          type="button"
                          onClick={() => toggleSort("candidateName")}
                          className="font-extrabold hover:underline"
                        >
                          Candidate
                        </button>
                      </th>
                      <th className="border-b px-3 py-2 text-left">
                        <button
                          type="button"
                          onClick={() => toggleSort("partyName")}
                          className="font-extrabold hover:underline"
                        >
                          Party
                        </button>
                      </th>
                      <th className="border-b px-3 py-2 text-right">
                        <button
                          type="button"
                          onClick={() => toggleSort("candidateVotes")}
                          className="font-extrabold hover:underline"
                        >
                          Votes
                        </button>
                      </th>
                      <th className="border-b px-3 py-2 text-right">
                        <button
                          type="button"
                          onClick={() => toggleSort("voteSharePct")}
                          className="font-extrabold hover:underline"
                        >
                          Vote %
                        </button>
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {rows.map((r) => (
                      <tr key={`${r.centerId}-${r.candidateId}`} className="hover:bg-slate-50">
                        <td className="border-b px-3 py-2">{r.countyName}</td>
                        <td className="border-b px-3 py-2">{r.districtName}</td>
                        <td className="border-b px-3 py-2">
                          <div className="font-extrabold">{r.centerCode}</div>
                          <div className="text-xs text-slate-600">{r.centerName}</div>
                        </td>
                        <td className="border-b px-3 py-2">{r.candidateName}</td>
                        <td className="border-b px-3 py-2">
                          {r.partyName} {r.partyCode ? `(${r.partyCode})` : ""}
                        </td>
                        <td className="border-b px-3 py-2 text-right font-bold">
                          {Number(r.candidateVotes ?? 0).toLocaleString()}
                        </td>
                        <td className="border-b px-3 py-2 text-right">
                          {fmtPct(Number(r.voteSharePct ?? 0))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                <div className="text-xs text-slate-600">
                  Page <span className="font-bold">{(q.data?.number ?? 0) + 1}</span> of{" "}
                  <span className="font-bold">{q.data?.totalPages ?? 1}</span> •{" "}
                  <span className="font-bold">{q.data?.totalElements ?? 0}</span> total rows
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPage(page - 1)}
                    disabled={Boolean(q.data?.first)}
                    className={`h-9 rounded-xl border bg-white px-3 text-sm font-extrabold ${
                      q.data?.first ? "opacity-50" : "hover:bg-slate-50"
                    }`}
                  >
                    Prev
                  </button>
                  <button
                    type="button"
                    onClick={() => setPage(page + 1)}
                    disabled={Boolean(q.data?.last)}
                    className={`h-9 rounded-xl border bg-white px-3 text-sm font-extrabold ${
                      q.data?.last ? "opacity-50" : "hover:bg-slate-50"
                    }`}
                  >
                    Next
                  </button>
                </div>
              </div>
            </>
          )}
        </>
      )}
    </Panel>
  );
}

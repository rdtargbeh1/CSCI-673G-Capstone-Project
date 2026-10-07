import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import { Panel, PlaceholderNote } from "../../../shared/elections-ui";

import {
  fetchNecResultHistory,
  type NecResultHistoryRow,
} from "../../../../../shared/services/necResultHistoryService";

import { fetchElectionById } from "../../../../../shared/services/electionService";
import { listContestsByElection } from "../../../../../shared/services/contestService";
import { fetchPollingCenters } from "../../../../../shared/services/pollingCenterService";
import { fetchElectionCandidates } from "../../../../../shared/services/electionCandidateService";

import { fetchUserById } from "../../../../../shared/services/userService";
import { useAuthStore } from "../../../../../shared/store/authStore";

function fmtTimeReadable(v?: string) {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v);

  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  }).format(d);
}

function badgeClass(changeType: string) {
  const base =
    "inline-flex items-center rounded-full border px-2 py-1 text-[11px] font-extrabold";
  const t = String(changeType || "").toUpperCase();

  if (t === "PUBLISH" || t === "PUBLISHED")
    return `${base} border-emerald-200 bg-emerald-50 text-emerald-800`;
  if (t === "UNPUBLISH" || t.startsWith("UNPUBLISHED"))
    return `${base} border-rose-200 bg-rose-50 text-rose-800`;
  if (t === "RECOMPUTED")
    return `${base} border-indigo-200 bg-indigo-50 text-indigo-800`;
  if (t === "CLEARED")
    return `${base} border-amber-200 bg-amber-50 text-amber-900`;

  return `${base} border-slate-200 bg-slate-50 text-slate-700`;
}

function n(v?: number) {
  return Number(v ?? 0);
}

function displayName(u: any) {
  const full =
    String(u?.fullName ?? "").trim() || String(u?.name ?? "").trim() || "";
  if (full) return full;

  const email = String(u?.email ?? "").trim();
  if (email) return email;

  const username = String(u?.username ?? u?.userName ?? "").trim();
  if (username) return username;

  return "Unknown";
}

function shortId(id: string) {
  if (!id) return "—";
  return `${id.slice(0, 8)}…${id.slice(-4)}`;
}

export default function NecResultHistoryPage() {
  const { electionId } = useParams();
  const [sp, setSp] = useSearchParams();

  const contestId = sp.get("contestId") ?? "";
  const centerId = sp.get("centerId") ?? "";
  const changeType = sp.get("changeType") ?? "";

  const page = Number(sp.get("page") ?? "0");
  const size = Number(sp.get("size") ?? "25");

  const enabled = Boolean(electionId);

  const orgId =
    useAuthStore((s: any) => s.orgId) ??
    useAuthStore((s: any) => s.selectedOrgId) ??
    useAuthStore((s: any) => s.selectedOrg?.orgId) ??
    null;

  // 1) History
  const historyQ = useQuery({
    queryKey: [
      "nec",
      "history",
      electionId,
      contestId || "ALL",
      centerId || "ALL",
    ],
    enabled,
    queryFn: () =>
      fetchNecResultHistory({
        electionId: String(electionId),
        contestId: contestId || undefined,
        centerId: centerId || undefined,
      }),
    staleTime: 10_000,
    retry: 1,
  });

  const allRows = (historyQ.data ?? []) as NecResultHistoryRow[];

  // 2) Election name
  const electionQ = useQuery({
    queryKey: ["election", "byId", electionId],
    enabled,
    queryFn: () => fetchElectionById(String(electionId)),
    staleTime: 60_000,
    retry: 1,
  });

  const electionName = electionQ.data?.electionName ?? "Election";

  // 3) Contest names
  const contestsQ = useQuery({
    queryKey: ["contests", "byElection", electionId],
    enabled,
    queryFn: () => listContestsByElection(String(electionId)),
    staleTime: 60_000,
    retry: 1,
  });

  const contestNameById = useMemo(() => {
    const map: Record<string, string> = {};
    (contestsQ.data ?? []).forEach((c: any) => {
      if (!c?.contestId) return;
      map[String(c.contestId)] = String(c?.contestName ?? c?.name ?? "Contest");
    });
    return map;
  }, [contestsQ.data]);

  // 4) Candidates labels (electId + candidateId)
  const candidatesQ = useQuery({
    queryKey: ["electionCandidates", electionId],
    enabled,
    queryFn: () => fetchElectionCandidates(String(electionId)),
    staleTime: 60_000,
    retry: 1,
  });

  const candidateLabelByKey = useMemo(() => {
    const map: Record<string, string> = {};
    (candidatesQ.data ?? []).forEach((ec: any) => {
      const electId = String(ec?.electId ?? "").trim();
      const candidateId = String(ec?.candidateId ?? "").trim();
      if (!electId && !candidateId) return;

      const name = String(ec?.fullName ?? "Candidate");
      const party = String(ec?.partyAbbrev ?? "").trim();
      const label = party ? `${name} (${party})` : name;

      if (electId) map[electId] = label;
      if (candidateId) map[candidateId] = label;
    });
    return map;
  }, [candidatesQ.data]);

  // 5) Actor fallback cache (ONLY if backend didn’t provide changedByUserName)
  const [actorNameCache, setActorNameCache] = useState<Record<string, string>>(
    {},
  );

  const actorIdsToResolve = useMemo(() => {
    const s = new Set<string>();
    allRows.forEach((r) => {
      const hasName = String(r.changedByUserName ?? "").trim().length > 0;
      if (!hasName && r.changedBy) s.add(String(r.changedBy));
    });
    return Array.from(s);
  }, [allRows]);

  useEffect(() => {
    let cancelled = false;

    async function resolveActors() {
      const ids = actorIdsToResolve.filter((id) => !actorNameCache[id]);
      if (ids.length === 0) return;

      if (!orgId) {
        const fallback: Record<string, string> = {};
        ids.forEach((id) => (fallback[id] = `User ${shortId(id)}`));
        if (!cancelled) setActorNameCache((p) => ({ ...p, ...fallback }));
        return;
      }

      const batchSize = 6;
      for (let i = 0; i < ids.length; i += batchSize) {
        const batch = ids.slice(i, i + batchSize);

        const results = await Promise.allSettled(
          batch.map((userId) => fetchUserById(orgId, userId)),
        );

        const found: Record<string, string> = {};
        results.forEach((r, idx) => {
          const userId = batch[idx];
          if (r.status === "fulfilled") found[userId] = displayName(r.value);
          else found[userId] = `User ${shortId(userId)}`;
        });

        if (cancelled) return;
        if (Object.keys(found).length)
          setActorNameCache((p) => ({ ...p, ...found }));
      }
    }

    resolveActors().catch(() => {});
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId, actorIdsToResolve.join("|")]);

  const actorLabel = (r?: NecResultHistoryRow | null) => {
    if (!r) return "—";

    const userName = String(r.changedByUserName ?? "").trim();
    if (userName) return userName; // ✅ SYSTEM, etc.

    const id = String(r.changedBy ?? "").trim();
    if (!id) return "—";
    return actorNameCache[id] ?? `User ${shortId(id)}`;
  };

  // 6) Center names cache
  const [centerNameCache, setCenterNameCache] = useState<
    Record<string, string>
  >({});

  const centerIdsToResolve = useMemo(() => {
    const ids = new Set<string>();
    allRows.forEach((r) => r.centerId && ids.add(String(r.centerId)));
    return Array.from(ids);
  }, [allRows]);

  useEffect(() => {
    let cancelled = false;

    async function resolveCenters() {
      const missing = centerIdsToResolve.filter((id) => !centerNameCache[id]);
      if (missing.length === 0) return;

      const scanPages = 6;
      const scanSize = 200;

      const found: Record<string, string> = {};

      for (let p = 0; p < scanPages; p++) {
        const resp = await fetchPollingCenters({ page: p, size: scanSize });
        for (const c of resp.items ?? []) {
          const id = String(c.centerId);
          if (missing.includes(id))
            found[id] = String(c.centerName ?? "Center");
        }
        const stillMissing = missing.filter(
          (id) => !found[id] && !centerNameCache[id],
        );
        if (stillMissing.length === 0) break;
      }

      if (!cancelled && Object.keys(found).length) {
        setCenterNameCache((prev) => ({ ...prev, ...found }));
      }
    }

    resolveCenters().catch(() => {});
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [centerIdsToResolve.join("|")]);

  // 7) Filter + sort + paginate
  const filteredRows = useMemo(() => {
    let rows = [...allRows];
    if (changeType)
      rows = rows.filter((r) => String(r.changeType) === changeType);

    rows.sort((a, b) => {
      const at = new Date(a.dateChanged || 0).getTime();
      const bt = new Date(b.dateChanged || 0).getTime();
      return bt - at;
    });

    return rows;
  }, [allRows, changeType]);

  const totalElements = filteredRows.length;
  const totalPages = Math.max(1, Math.ceil(totalElements / size));
  const safePage = Math.min(Math.max(page, 0), totalPages - 1);
  const pagedRows = filteredRows.slice(safePage * size, safePage * size + size);

  const setParam = (k: string, v?: string) => {
    const next = new URLSearchParams(sp);
    if (!v) next.delete(k);
    else next.set(k, v);
    next.set("page", "0");
    setSp(next, { replace: true });
  };

  const setPage = (next: number) => {
    const p = new URLSearchParams(sp);
    p.set("page", String(Math.max(0, next)));
    setSp(p, { replace: true });
  };

  // 8) Candidates Modal
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<NecResultHistoryRow | null>(null);

  const candidateLines = useMemo(() => {
    const votes = selected?.candidateVotes ?? {};
    const entries = Object.entries(votes).filter(([, v]) => n(v) > 0);

    entries.sort((a, b) => n(b[1]) - n(a[1]));

    return entries.map(([key, v]) => {
      const label =
        candidateLabelByKey[key] || `Unknown (${String(key).slice(0, 8)}…)`;
      return { key, label, votes: n(v) };
    });
  }, [selected, candidateLabelByKey]);

  const openCandidates = (row: NecResultHistoryRow) => {
    setSelected(row);
    setOpen(true);
  };

  return (
    <Panel
      title={`NEC History • ${electionName}`}
      right={
        <div className="flex flex-wrap items-center gap-2 justify-end">
          <input
            className="h-9 w-[190px] rounded-xl border bg-white px-3 text-sm font-bold"
            placeholder="ContestId (optional)"
            value={contestId}
            onChange={(e) => setParam("contestId", e.target.value)}
          />
          <input
            className="h-9 w-[190px] rounded-xl border bg-white px-3 text-sm font-bold"
            placeholder="CenterId (optional)"
            value={centerId}
            onChange={(e) => setParam("centerId", e.target.value)}
          />

          <select
            className="h-9 rounded-xl border bg-white px-3 text-sm font-bold"
            value={changeType}
            onChange={(e) => setParam("changeType", e.target.value)}
          >
            <option value="">All actions</option>
            <option value="PUBLISHED">Published</option>
            <option value="UNPUBLISHED_MANUAL">Unpublished (manual)</option>
            <option value="RECOMPUTED">Recomputed</option>
            <option value="CLEARED">Cleared</option>
            <option value="DRAFT_SNAPSHOT">Draft snapshot</option>
          </select>

          <select
            className="h-9 rounded-xl border bg-white px-3 text-sm font-bold"
            value={String(size)}
            onChange={(e) => setParam("size", e.target.value)}
          >
            <option value="10">10 / page</option>
            <option value="25">25 / page</option>
            <option value="50">50 / page</option>
            <option value="100">100 / page</option>
          </select>

          <button
            type="button"
            onClick={() => historyQ.refetch()}
            disabled={historyQ.isFetching}
            className="h-9 rounded-xl border bg-white px-3 text-sm font-extrabold hover:bg-slate-50 disabled:opacity-50"
          >
            Refresh
          </button>
        </div>
      }
    >
      {!electionId ? (
        <PlaceholderNote
          title="Election not selected"
          bullets={["Select an election to view NEC history."]}
        />
      ) : historyQ.isLoading ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
          Loading history…
        </div>
      ) : historyQ.isError ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          {(historyQ.error as any)?.response?.data?.message ??
            (historyQ.error as Error)?.message ??
            "Failed to load."}
        </div>
      ) : filteredRows.length === 0 ? (
        <PlaceholderNote
          title="No history records found"
          bullets={[
            "No history entries exist for the selected filters.",
            "Try removing contest/center filters.",
          ]}
        />
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="min-w-[1200px] w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="border-b px-3 py-2 text-left">Time</th>
                  <th className="border-b px-3 py-2 text-left">Action</th>
                  <th className="border-b px-3 py-2 text-left">Contest</th>
                  <th className="border-b px-3 py-2 text-left">Center</th>
                  <th className="border-b px-3 py-2 text-left">Stats</th>
                  <th className="border-b px-3 py-2 text-left">Actor</th>
                  <th className="border-b px-3 py-2 text-left">User Note</th>
                  <th className="border-b px-3 py-2 text-left">Note</th>
                  <th className="border-b px-3 py-2 text-right">Candidates</th>
                </tr>
              </thead>

              <tbody>
                {pagedRows.map((r, i) => {
                  const contestName =
                    contestNameById[String(r.contestId)] ?? "Contest";
                  const centerName =
                    centerNameCache[String(r.centerId)] ?? "Center";

                  return (
                    <tr
                      key={`${r.historyId}-${i}`}
                      className="hover:bg-slate-50 align-top"
                    >
                      <td className="border-b px-3 py-2 whitespace-nowrap">
                        {fmtTimeReadable(r.dateChanged)}
                      </td>

                      <td className="border-b px-3 py-2">
                        <span className={badgeClass(String(r.changeType))}>
                          {String(r.changeType ?? "—")}
                        </span>
                      </td>

                      <td className="border-b px-3 py-2">
                        <div className="font-bold">{contestName}</div>
                      </td>

                      <td className="border-b px-3 py-2">
                        <div className="font-bold">{centerName}</div>
                      </td>

                      <td className="border-b px-3 py-2">
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                          <div>
                            <span className="text-slate-500">Reg:</span>{" "}
                            <span className="font-bold">
                              {n(r.totalRegisteredVoters).toLocaleString()}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-500">Cast:</span>{" "}
                            <span className="font-bold">
                              {n(r.ballotsCast).toLocaleString()}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-500">Invalid:</span>{" "}
                            <span className="font-bold">
                              {n(r.invalidBallots).toLocaleString()}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-500">Unmarked:</span>{" "}
                            <span className="font-bold">
                              {n(r.unmarkedBallots).toLocaleString()}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-500">Unused:</span>{" "}
                            <span className="font-bold">
                              {n(r.unusedBallots).toLocaleString()}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-500">Rejected:</span>{" "}
                            <span className="font-bold">
                              {n(r.rejectedBallots).toLocaleString()}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-500">Spoiled:</span>{" "}
                            <span className="font-bold">
                              {n(r.spoiledBallots).toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="border-b px-3 py-2">
                        <div className="font-bold">{actorLabel(r)}</div>
                      </td>

                      <td className="border-b px-3 py-2">
                        <div className="max-w-[260px] whitespace-normal break-words">
                          {String(r.userNote ?? "").trim() ? r.userNote : "—"}
                        </div>
                      </td>

                      <td className="border-b px-3 py-2">
                        <div className="max-w-[260px] whitespace-normal break-words">
                          {String(r.notes ?? "").trim() ? r.notes : "—"}
                        </div>
                      </td>

                      <td className="border-b px-3 py-2 text-right">
                        <button
                          type="button"
                          onClick={() => openCandidates(r)}
                          className="h-8 rounded-xl border bg-white px-3 text-xs font-extrabold hover:bg-slate-50"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-3 flex items-center justify-between gap-2">
            <div className="text-xs text-slate-600">
              Page <span className="font-bold">{safePage + 1}</span> of{" "}
              <span className="font-bold">{totalPages}</span> •{" "}
              <span className="font-bold">{totalElements}</span> total rows
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage(safePage - 1)}
                disabled={safePage <= 0 || historyQ.isFetching}
                className="h-9 rounded-xl border bg-white px-3 text-sm font-extrabold disabled:opacity-50"
              >
                Prev
              </button>
              <button
                type="button"
                onClick={() => setPage(safePage + 1)}
                disabled={safePage >= totalPages - 1 || historyQ.isFetching}
                className="h-9 rounded-xl border bg-white px-3 text-sm font-extrabold disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>

          {open && (
            <div className="fixed inset-0 z-50 flex items-center justify-center">
              <div
                className="absolute inset-0 bg-black/40"
                onClick={() => setOpen(false)}
              />
              <div className="relative w-[min(920px,92vw)] max-h-[85vh] overflow-hidden rounded-2xl border bg-white shadow-xl">
                <div className="flex items-center justify-between border-b px-5 py-4">
                  <div>
                    <div className="text-sm font-extrabold">
                      Candidate Votes
                    </div>
                    <div className="text-xs text-slate-500">
                      {fmtTimeReadable(selected?.dateChanged)} •{" "}
                      {String(selected?.changeType ?? "")} •{" "}
                      {actorLabel(selected)}
                    </div>
                  </div>
                  <button
                    className="h-9 rounded-xl border bg-white px-3 text-sm font-extrabold hover:bg-slate-50"
                    onClick={() => setOpen(false)}
                  >
                    Close
                  </button>
                </div>

                <div className="p-5 overflow-auto max-h-[75vh]">
                  {candidateLines.length === 0 ? (
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                      No candidate votes recorded for this history row.
                    </div>
                  ) : (
                    <div className="overflow-hidden rounded-xl border">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-50">
                          <tr>
                            <th className="border-b px-3 py-2 text-left">
                              Candidate
                            </th>
                            <th className="border-b px-3 py-2 text-right">
                              Votes
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {candidateLines.map((x) => (
                            <tr key={x.key} className="hover:bg-slate-50">
                              <td className="border-b px-3 py-2">
                                <div className="font-bold">{x.label}</div>
                              </td>
                              <td className="border-b px-3 py-2 text-right font-extrabold">
                                {x.votes.toLocaleString()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  <div className="mt-4 grid gap-3">
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-700">
                      <div className="font-extrabold mb-1">
                        User Note (before action)
                      </div>
                      <div>
                        {String(selected?.userNote ?? "").trim()
                          ? selected?.userNote
                          : "—"}
                      </div>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-700">
                      <div className="font-extrabold mb-1">
                        Note (system/audit)
                      </div>
                      <div>
                        {String(selected?.notes ?? "").trim()
                          ? selected?.notes
                          : "—"}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </Panel>
  );
}

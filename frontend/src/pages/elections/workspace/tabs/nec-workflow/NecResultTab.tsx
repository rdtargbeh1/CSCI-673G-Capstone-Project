


// ✅ FILE: src/pages/operations/official/NecResultTab.tsx
//
// ✅ UPDATE:
// - Publish Election uses /api/admin/nec/results/{electionId}/publish
// - Added Unpublish Election uses /api/admin/nec/results/{electionId}/unpublish
// - Keeps Center Publish/Unpublish as-is
// - Uses current logged-in user as actor automatically
// ❗No other logic changed.

import React, { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  RefreshCw,
  CheckCircle2,
  XCircle,
  ChevronDown,
  AlertTriangle,
  Eye,
  X,
  Trash2,
  Megaphone,
  Ban,
} from "lucide-react";

import { Panel, Badge } from "../../../shared/elections-ui";

import { necResultService } from "../../../../../shared/services/necResultService";

import { listContestsByElection } from "../../../../../shared/services/contestService";
import { fetchCounties } from "../../../../../shared/services/countyService";
import { fetchDistricts } from "../../../../../shared/services/districtService";
import { fetchPollingCenters } from "../../../../../shared/services/pollingCenterService";
import { fetchElectionById } from "../../../../../shared/services/electionService";

import {
  fetchElectionCandidates,
  type ElectionCandidateDto,
} from "../../../../../shared/services/electionCandidateService";

import { fetchMe } from "../../../../../shared/services/userService";
import { useAuthStore } from "../../../../../shared/store/authStore";

type PublishModalState =
  | { open: false; mode: "publishElection" | "publishCenter"; scope?: any }
  | { open: true; mode: "publishElection" | "publishCenter"; scope?: any };

// ✅ NEW: Unpublish election modal state
type UnpublishElectionModalState =
  | { open: false }
  | { open: true };

type CandidateVotesModalState =
  | { open: false }
  | {
      open: true;
      resultId: string;
      centerName: string;
      contestName: string;
      uploadTime?: string;
      isPublished?: boolean;
    };

function toLocalIsoNoSeconds(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

function num(n?: number | null) {
  return (n ?? 0).toLocaleString();
}

function clipText(s?: string | null, max = 22) {
  if (!s) return "—";
  if (s.length <= max) return s;
  return `${s.slice(0, max)}…`;
}

function fmtHumanDateTime(v?: string | null) {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v);
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "numeric",
    minute: "2-digit",
  }).format(d);
}

function getOrgIdFromStorage(): string | null {
  const keys = ["orgId", "activeOrgId", "selectedOrgId", "currentOrgId"];
  for (const k of keys) {
    const v = String((window as any)?.localStorage?.getItem?.(k) ?? "").trim();
    if (v) return v;
  }
  return null;
}

function KpiCard(props: { label: string; value: React.ReactNode }) {
  return (
    <div className="shrink-0 rounded-2xl border border-slate-200 bg-white px-4 py-3">
      <div className="text-[12px] font-extrabold text-slate-600 leading-4">
        {props.label}
      </div>
      <div className="mt-1 text-[18px] font-extrabold text-slate-900 leading-6">
        {props.value}
      </div>
    </div>
  );
}

function pickContestId(r: any) {
  return r?.contest?.contestId ?? r?.contestId ?? r?.contest?.contestId ?? null;
}
function pickContestName(r: any) {
  return (
    r?.contest?.contestName ?? r?.contestName ?? r?.contest?.contestName ?? "—"
  );
}
function pickCenterId(r: any) {
  return (
    r?.pollingCenter?.centerId ??
    r?.centerId ??
    r?.pollingCenter?.centerId ??
    null
  );
}
function pickCenterName(r: any) {
  return (
    r?.pollingCenter?.centerName ??
    r?.pollingCenterName ??
    r?.pollingCenter?.centerName ??
    "—"
  );
}

export default function NecResultTab() {
  const { electionId } = useParams();
  const [sp, setSp] = useSearchParams();
  const qc = useQueryClient();

  const contestId = sp.get("contestId") || "all";
  const countyId = sp.get("countyId") || "all";
  const districtId = sp.get("districtId") || "all";
  const centerId = sp.get("centerId") || "all";

  const [publishModal, setPublishModal] = useState<PublishModalState>({
    open: false,
    mode: "publishElection",
  });

  // ✅ NEW: unpublish election modal + reason
  const [unpublishElectionModal, setUnpublishElectionModal] =
    useState<UnpublishElectionModalState>({ open: false });
  const [unpublishElectionReason, setUnpublishElectionReason] = useState("");

  const [candModal, setCandModal] = useState<CandidateVotesModalState>({
    open: false,
  });

  const [actorUserId, setActorUserId] = useState("");
  const [publishedUntil, setPublishedUntil] = useState(() => {
    const d = new Date();
    d.setHours(d.getHours() + 6);
    return toLocalIsoNoSeconds(d);
  });

  const currentOrgId = useAuthStore((s) => s.currentOrgId);
  const orgId = useMemo(
    () => String(currentOrgId ?? "").trim() || getOrgIdFromStorage(),
    [currentOrgId]
  );

  const meQ = useQuery({
    queryKey: ["meForNecPublish", orgId],
    enabled: !!orgId,
    queryFn: () => fetchMe(orgId!),
    staleTime: 30_000,
    retry: 1,
  });

  useEffect(() => {
    const id =
      (meQ.data as any)?.userId ??
      (meQ.data as any)?.id ??
      (meQ.data as any)?.systemUserId ??
      "";
    if (id) setActorUserId(String(id));
  }, [meQ.data]);

  const actorDisplayName = useMemo(() => {
    const me: any = meQ.data;
    if (!me) return "";
    return (
      me.fullName ||
      me.name ||
      [me.firstName, me.lastName].filter(Boolean).join(" ") ||
      me.username ||
      me.email ||
      ""
    );
  }, [meQ.data]);

  const electionQ = useQuery({
    queryKey: ["electionById", electionId],
    enabled: !!electionId,
    queryFn: () => fetchElectionById(electionId!),
  });

  const contestsQ = useQuery({
    queryKey: ["contestsByElection", electionId],
    enabled: !!electionId,
    queryFn: () => listContestsByElection(electionId!),
  });

  const countiesQ = useQuery({
    queryKey: ["countiesForNec"],
    queryFn: () => fetchCounties({ page: 0, size: 500 }),
  });

  const districtsQ = useQuery({
    queryKey: ["districtsForNec", countyId],
    enabled: countyId !== "all",
    queryFn: () => fetchDistricts({ page: 0, size: 500, countyId }),
  });

  const centersQ = useQuery({
    queryKey: ["centersForNec", countyId, districtId],
    enabled: countyId !== "all" || districtId !== "all",
    queryFn: () =>
      fetchPollingCenters({
        page: 0,
        size: 1000,
        countyId: countyId !== "all" ? countyId : undefined,
        districtId: districtId !== "all" ? districtId : undefined,
      }),
  });

  const electionCandidatesQ = useQuery({
    queryKey: ["electionCandidates", electionId],
    enabled: !!electionId,
    queryFn: () => fetchElectionCandidates(electionId!),
  });

  const candidateMap = useMemo(() => {
    const items: ElectionCandidateDto[] = electionCandidatesQ.data ?? [];
    const m = new Map<string, { fullName: string; partyAbbrev?: string | null }>();

    for (const c of items) {
      const meta = {
        fullName: c.fullName ?? c.candidateId,
        partyAbbrev: c.partyAbbrev ?? null,
      };
      if (c.candidateId) m.set(c.candidateId, meta);
      if (c.electId) m.set(c.electId, meta);
    }

    return m;
  }, [electionCandidatesQ.data]);

  const rowsQ = useQuery({
    queryKey: ["necAdminRawResults", electionId],
    enabled: !!electionId,
    queryFn: () => necResultService.adminGetRawResults(electionId!),
  });

  const allRows: any[] = rowsQ.data ?? [];

  const filteredRows = useMemo(() => {
    let rows = allRows;

    if (contestId !== "all") rows = rows.filter((r) => pickContestId(r) === contestId);
    if (centerId !== "all") rows = rows.filter((r) => pickCenterId(r) === centerId);

    if (centerId === "all") {
      const centerItems = centersQ.data?.items ?? [];
      const activeGeoFilter = countyId !== "all" || districtId !== "all";

      if (activeGeoFilter && centerItems.length > 0) {
        const allowedCenterIds = new Set(centerItems.map((c) => c.centerId));
        rows = rows.filter((r) => {
          const cid = pickCenterId(r);
          return cid ? allowedCenterIds.has(cid) : false;
        });
      }
    }

    return rows;
  }, [allRows, contestId, centerId, countyId, districtId, centersQ.data]);

  const summary = useMemo(() => {
    let totalRegisteredVoters = 0;
    let ballotsCast = 0;

    let invalidBallots = 0;
    let unmarkedBallots = 0;
    let rejectedBallots = 0;
    let spoiledBallots = 0;
    let unusedBallots = 0;

    let publishedCount = 0;

    for (const r of filteredRows) {
      totalRegisteredVoters += r.totalRegisteredVoters ?? 0;
      ballotsCast += r.ballotsInBox ?? 0;

      invalidBallots += r.invalidBallots ?? 0;
      unmarkedBallots += r.unmarkedBallots ?? 0;
      rejectedBallots += r.rejectedBallots ?? 0;
      spoiledBallots += r.spoiledBallots ?? 0;
      unusedBallots += r.unusedBallots ?? 0;

      if (r.isPublished) publishedCount += 1;
    }

    const totalRows = filteredRows.length;
    const isPublished = totalRows > 0 ? publishedCount === totalRows : false;
    const isPartialPublished =
      totalRows > 0 ? publishedCount > 0 && publishedCount < totalRows : false;

    return {
      rows: totalRows,
      isPublished,
      isPartialPublished,
      totalRegisteredVoters,
      ballotsCast,
      invalidBallots,
      unmarkedBallots,
      rejectedBallots,
      spoiledBallots,
      unusedBallots,
    };
  }, [filteredRows]);

  const statusPill = summary.isPublished ? (
    <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-extrabold text-emerald-800">
      <CheckCircle2 size={14} className="text-emerald-700" /> PUBLISHED
    </span>
  ) : summary.isPartialPublished ? (
    <span className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-extrabold text-amber-900">
      <AlertTriangle size={14} className="text-amber-700" /> PARTIAL
    </span>
  ) : (
    <span className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-extrabold text-rose-800">
      <XCircle size={14} className="text-rose-700" /> NOT PUBLISHED
    </span>
  );

  const setParam = (k: string, v: string) => {
    const next = new URLSearchParams(sp);
    if (v === "all") next.delete(k);
    else next.set(k, v);
    setSp(next);
  };

  const onChangeContest = (v: string) => setParam("contestId", v);

  const onChangeCounty = (v: string) => {
    const next = new URLSearchParams(sp);
    if (v === "all") next.delete("countyId");
    else next.set("countyId", v);
    next.delete("districtId");
    next.delete("centerId");
    setSp(next);
  };

  const onChangeDistrict = (v: string) => {
    const next = new URLSearchParams(sp);
    if (v === "all") next.delete("districtId");
    else next.set("districtId", v);
    next.delete("centerId");
    setSp(next);
  };

  const onChangeCenter = (v: string) => setParam("centerId", v);

  const onClearFilters = () => {
    const next = new URLSearchParams(sp);
    next.delete("contestId");
    next.delete("countyId");
    next.delete("districtId");
    next.delete("centerId");
    setSp(next);
  };

  // ✅ Publish whole election
  const publishElectionM = useMutation({
    mutationFn: async () => {
      if (!electionId) throw new Error("Missing electionId");
      if (!actorUserId.trim()) throw new Error("Current user not loaded (actorUserId).");
      if (!publishedUntil.trim()) throw new Error("publishedUntil is required");

      return necResultService.adminPublishElection({
        electionId,
        body: {
          actorUserId: actorUserId.trim(),
          publishedUntil: publishedUntil.trim(),
        },
      });
    },
    onSuccess: async () => {
      setPublishModal({ open: false, mode: "publishElection" });
      await qc.invalidateQueries({ queryKey: ["necAdminRawResults", electionId] });
    },
  });

  // ✅ NEW: Unpublish whole election
  const unpublishElectionM = useMutation({
    mutationFn: async () => {
      if (!electionId) throw new Error("Missing electionId");
      if (!actorUserId.trim()) throw new Error("Current user not loaded (actorUserId).");

      return necResultService.adminUnpublishElection({
        electionId,
        actorUserId: actorUserId.trim(),
        reason: unpublishElectionReason.trim() || undefined,
      });
    },
    onSuccess: async () => {
      setUnpublishElectionModal({ open: false });
      setUnpublishElectionReason("");
      await qc.invalidateQueries({ queryKey: ["necAdminRawResults", electionId] });
    },
  });

  // publish selected center + contest (keep)
  const publishSelectedCenterM = useMutation({
    mutationFn: async () => {
      if (!electionId) throw new Error("Missing electionId");
      if (!actorUserId.trim()) throw new Error("Current user not loaded (actorUserId).");
      if (!publishedUntil.trim()) throw new Error("publishedUntil is required");
      if (contestId === "all") throw new Error("Select a contest first");
      if (centerId === "all") throw new Error("Select a center first");

      await necResultService.publishForCenterContest({
        electionId,
        contestId,
        centerId,
        body: {
          actorUserId: actorUserId.trim(),
          publishedUntil: publishedUntil.trim(),
        },
      });
    },
    onSuccess: async () => {
      setPublishModal({ open: false, mode: "publishCenter" });
      await qc.invalidateQueries({ queryKey: ["necAdminRawResults", electionId] });
    },
  });

  // unpublish selected center + contest (keep)
  const unpublishSelectedCenterM = useMutation({
    mutationFn: async () => {
      if (!electionId) throw new Error("Missing electionId");
      if (!actorUserId.trim()) throw new Error("Current user not loaded (actorUserId).");
      if (contestId === "all") throw new Error("Select a contest first");
      if (centerId === "all") throw new Error("Select a center first");

      await necResultService.unpublishForCenterContest({
        electionId,
        contestId,
        centerId,
        actorUserId: actorUserId.trim(),
      });
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["necAdminRawResults", electionId] });
    },
  });

  const onRefresh = async () => {
    await qc.invalidateQueries({ queryKey: ["necAdminRawResults", electionId] });
  };

  const contestOptions = contestsQ.data ?? [];
  const countyOptions = countiesQ.data?.items ?? [];
  const districtOptions = districtsQ.data?.items ?? [];
  const centerOptions = centersQ.data?.items ?? [];

  const electionName =
    electionQ.data?.electionName ||
    (electionQ.isLoading ? "Loading…" : electionId ?? "—");

  const candDtoQ = useQuery({
    queryKey: ["necResultDtoById", candModal.open ? candModal.resultId : "none"],
    enabled: candModal.open,
    queryFn: () => necResultService.get((candModal as any).resultId),
  });

  const candVotes = useMemo(() => {
    const votes = (candDtoQ.data as any)?.candidateVotes as
      | Record<string, number>
      | undefined;

    if (!votes || typeof votes !== "object") {
      return { rows: [] as any[], totalValidVotes: 0 };
    }

    const entries = Object.entries(votes)
      .map(([key, vv]) => ({ key, votes: Number(vv ?? 0) || 0 }))
      .sort((a, b) => b.votes - a.votes);

    const total = entries.reduce((acc, x) => acc + x.votes, 0);

    const rows = entries.map((e) => {
      const meta = candidateMap.get(e.key);
      const name = meta?.fullName ?? "Unknown Candidate";
      const party = meta?.partyAbbrev ? ` (${meta.partyAbbrev})` : "";
      return {
        key: e.key,
        displayName: `${name}${party}`,
        votes: e.votes,
        pct: total > 0 ? `${((e.votes / total) * 100).toFixed(1)}%` : "—",
      };
    });

    return { rows, totalValidVotes: total };
  }, [candDtoQ.data, candidateMap]);

  const registeredForCenter = (candDtoQ.data as any)?.totalRegisteredVoters as
    | number
    | undefined;

  const publishBusy = publishElectionM.isPending || publishSelectedCenterM.isPending;
  const unpublishBusy = unpublishSelectedCenterM.isPending || unpublishElectionM.isPending;

  const actorReady = !!actorUserId.trim() && !meQ.isLoading && !meQ.isError;

  const navSelectClass =
    "shrink-0 w-[200px] appearance-none rounded-xl border border-slate-200 bg-white px-3 py-2 pr-9 text-sm font-extrabold truncate";

  return (
    <div className="flex flex-col gap-3">
      <Panel
        title="NEC Result (Official)"
        right={
          <div className="flex flex-wrap items-center gap-2">
            {statusPill}
            <Badge text="NEC Only" />

            {/* Contest */}
            <div className="relative shrink-0">
              <select
                value={contestId}
                onChange={(e) => onChangeContest(e.target.value)}
                className={navSelectClass}
                disabled={contestsQ.isLoading || contestsQ.isError}
              >
                <option value="all">All contests</option>
                {contestOptions.map((c: any) => (
                  <option key={c.contestId} value={c.contestId}>
                    {c.contestName ?? c.contestId}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={16}
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
              />
            </div>

            {/* County */}
            <div className="relative shrink-0">
              <select
                value={countyId}
                onChange={(e) => onChangeCounty(e.target.value)}
                className={navSelectClass}
                disabled={countiesQ.isLoading || countiesQ.isError}
              >
                <option value="all">All counties</option>
                {countyOptions.map((c) => (
                  <option key={c.countyId} value={c.countyId}>
                    {c.countyName}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={16}
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
              />
            </div>

            {/* District */}
            <div className="relative shrink-0">
              <select
                value={districtId}
                onChange={(e) => onChangeDistrict(e.target.value)}
                className={navSelectClass}
                disabled={countyId === "all" || districtsQ.isLoading || districtsQ.isError}
              >
                <option value="all">All districts</option>
                {districtOptions.map((d) => (
                  <option key={d.districtId} value={d.districtId}>
                    {d.districtName}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={16}
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
              />
            </div>

            {/* Center */}
            <div className="relative shrink-0">
              <select
                value={centerId}
                onChange={(e) => onChangeCenter(e.target.value)}
                className={navSelectClass}
                disabled={
                  (countyId === "all" && districtId === "all") ||
                  centersQ.isLoading ||
                  centersQ.isError
                }
              >
                <option value="all">All centers</option>
                {centerOptions.map((c) => (
                  <option key={c.centerId} value={c.centerId}>
                    {c.centerName}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={16}
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
              />
            </div>

            {/* Clear */}
            <button
              type="button"
              onClick={onClearFilters}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-extrabold hover:bg-slate-50"
              title="Clear contest/county/district/center filters"
            >
              <Trash2 size={16} className="text-slate-700" />
              Clear
            </button>

            {/* Publish Election */}
            <button
              type="button"
              onClick={() => setPublishModal({ open: true, mode: "publishElection" })}
              className="inline-flex items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-600 px-3 py-2 text-sm font-extrabold text-white hover:bg-indigo-700 disabled:opacity-60"
              disabled={publishBusy || !actorReady}
              title={!actorReady ? "Loading current user…" : ""}
            >
              <Megaphone size={16} className="text-white" />
              Publish Election
            </button>

            {/* ✅ NEW: Unpublish Election */}
            <button
              type="button"
              onClick={() => setUnpublishElectionModal({ open: true })}
              className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-700 px-3 py-2 text-sm font-extrabold text-white hover:bg-rose-800 disabled:opacity-60"
              disabled={unpublishBusy || !actorReady}
              title={!actorReady ? "Loading current user…" : ""}
            >
              <Ban size={16} className="text-white" />
              Unpublish Election
            </button>

            {/* Publish Center */}
            <button
              type="button"
              onClick={() => setPublishModal({ open: true, mode: "publishCenter" })}
              className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-600 px-3 py-2 text-sm font-extrabold text-white hover:bg-emerald-700 disabled:opacity-60"
              disabled={contestId === "all" || centerId === "all" || publishBusy || !actorReady}
              title={
                !actorReady
                  ? "Loading current user…"
                  : contestId === "all" || centerId === "all"
                  ? "Select contest + center first"
                  : ""
              }
            >
              <CheckCircle2 size={16} className="text-white" />
              Publish
            </button>

            {/* Unpublish Center */}
            <button
              type="button"
              onClick={() => unpublishSelectedCenterM.mutate()}
              className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-600 px-3 py-2 text-sm font-extrabold text-white hover:bg-rose-700 disabled:opacity-60"
              disabled={contestId === "all" || centerId === "all" || unpublishBusy || !actorReady}
              title={
                !actorReady
                  ? "Loading current user…"
                  : contestId === "all" || centerId === "all"
                  ? "Select contest + center first"
                  : ""
              }
            >
              <Ban size={16} className="text-white" />
              Unpublish
            </button>

            <button
              type="button"
              onClick={onRefresh}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-extrabold hover:bg-slate-50"
              disabled={rowsQ.isFetching}
            >
              <RefreshCw size={16} className="text-slate-700" />
              Refresh
            </button>
          </div>
        }
      >
        {/* KPI row */}
        <div className="mt-2 flex items-center gap-2 overflow-x-auto pb-0.5">
          <KpiCard label="Election" value={clipText(electionName, 28)} />
          <KpiCard label="Centers" value={summary.rows.toLocaleString()} />
          <KpiCard label="Registered" value={summary.totalRegisteredVoters.toLocaleString()} />
          <KpiCard label="Valid Votes" value={summary.ballotsCast.toLocaleString()} />
          <KpiCard label="Invalid" value={summary.invalidBallots.toLocaleString()} />
          <KpiCard label="Unmarked" value={summary.unmarkedBallots.toLocaleString()} />
          <KpiCard label="Rejected" value={summary.rejectedBallots.toLocaleString()} />
          <KpiCard label="Spoiled" value={summary.spoiledBallots.toLocaleString()} />
          <KpiCard label="Unused" value={summary.unusedBallots.toLocaleString()} />
        </div>

        {/* Center Results Table */}
        <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3">
          <div className="mb-2 text-xs font-extrabold text-slate-700">
            Center Results (filtered): {summary.rows.toLocaleString()}
          </div>

          {rowsQ.isLoading ? (
            <div className="text-sm text-slate-600">Loading…</div>
          ) : rowsQ.isError ? (
            <div className="text-sm text-rose-700">Failed to load NEC results.</div>
          ) : filteredRows.length === 0 ? (
            <div className="text-sm text-slate-600">
              No results match the selected filters.
            </div>
          ) : (
            <div className="overflow-auto">
              <table className="min-w-[1550px] w-full">
                <thead>
                  <tr className="text-left text-xs font-extrabold text-slate-700 border-b border-slate-200">
                    <th className="py-2 px-2">Center</th>
                    <th className="py-2 px-2">Contest</th>
                    <th className="py-2 px-2">Registered</th>
                    <th className="py-2 px-2">Valid Votes</th>
                    <th className="py-2 px-2">Invalid</th>
                    <th className="py-2 px-2">Unmarked</th>
                    <th className="py-2 px-2">Rejected</th>
                    <th className="py-2 px-2">Spoiled</th>
                    <th className="py-2 px-2">Unused</th>
                    <th className="py-2 px-2">Upload</th>
                    <th className="py-2 px-2">Signer Key</th>
                    <th className="py-2 px-2">Chain Hash</th>
                    <th className="py-2 px-2">Signature</th>
                    <th className="py-2 px-2">Status</th>
                    <th className="py-2 px-2 text-right">Action</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredRows.map((r) => (
                    <tr key={r.resultId} className="border-b border-slate-100">
                      <td className="py-1.5 px-2 text-sm font-extrabold text-slate-900">
                        {pickCenterName(r)}
                      </td>
                      <td className="py-1.5 px-2 text-sm text-slate-700">
                        {pickContestName(r)}
                      </td>

                      <td className="py-1.5 px-2 text-sm text-slate-700">
                        {num(r.totalRegisteredVoters)}
                      </td>
                      <td className="py-1.5 px-2 text-sm text-slate-700">
                        {num(r.ballotsInBox)}
                      </td>
                      <td className="py-1.5 px-2 text-sm text-slate-700">
                        {num(r.invalidBallots)}
                      </td>
                      <td className="py-1.5 px-2 text-sm text-slate-700">
                        {num(r.unmarkedBallots)}
                      </td>
                      <td className="py-1.5 px-2 text-sm text-slate-700">
                        {num(r.rejectedBallots)}
                      </td>
                      <td className="py-1.5 px-2 text-sm text-slate-700">
                        {num(r.spoiledBallots)}
                      </td>
                      <td className="py-1.5 px-2 text-sm text-slate-700">
                        {num(r.unusedBallots)}
                      </td>

                      <td className="py-1.5 px-2 text-xs text-slate-600">
                        {fmtHumanDateTime(r.uploadTime)}
                      </td>

                      <td className="py-1.5 px-2 text-xs font-mono text-slate-700">
                        {clipText(String(r.resultSignerKeyId ?? "—"), 14)}
                      </td>
                      <td className="py-1.5 px-2 text-xs font-mono text-slate-700">
                        {clipText(String(r.chainHash ?? "—"), 16)}
                      </td>
                      <td className="py-1.5 px-2 text-xs font-mono text-slate-700">
                        {clipText(String(r.resultSignature ?? "—"), 16)}
                      </td>

                      <td className="py-1.5 px-2">
                        {r.isPublished ? (
                          <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-extrabold text-emerald-800">
                            <CheckCircle2 size={14} className="text-emerald-700" /> PUBLISHED
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-extrabold text-rose-800">
                            <XCircle size={14} className="text-rose-700" /> DRAFT
                          </span>
                        )}
                      </td>

                      <td className="py-1.5 px-2 text-right">
                        <button
                          type="button"
                          onClick={() =>
                            setCandModal({
                              open: true,
                              resultId: String(r.resultId),
                              centerName: pickCenterName(r),
                              contestName: pickContestName(r),
                              uploadTime: r.uploadTime,
                              isPublished: !!r.isPublished,
                            })
                          }
                          className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-600 px-3 py-1 text-xs font-extrabold text-white hover:bg-blue-700"
                        >
                          <Eye size={16} className="text-white" />
                          View Candidates
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="mt-2 text-[11px] text-slate-500">
                Candidate names come from Election Candidates (mapped by candidateId and electId).
              </div>
            </div>
          )}
        </div>
      </Panel>

      {/* Publish modal (unchanged) */}
      {publishModal.open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-3">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-4 shadow-xl">
            <div className="flex items-center justify-between">
              <div className="text-sm font-extrabold text-slate-800">
                {publishModal.mode === "publishElection"
                  ? "Publish Election Results"
                  : "Publish Selected Center + Contest"}
              </div>

              <button
                type="button"
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-extrabold hover:bg-slate-50"
                onClick={() => setPublishModal({ open: false, mode: publishModal.mode })}
                disabled={publishBusy}
              >
                Close
              </button>
            </div>

            <div className="mt-3 grid gap-3">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="text-xs font-extrabold text-slate-700">Actor (current user)</div>
                <div className="mt-1 text-sm font-extrabold text-slate-900">
                  {meQ.isLoading ? "Loading current user…" : actorDisplayName || "—"}
                </div>
                <div className="mt-0.5 text-[11px] font-mono text-slate-700 break-all">
                  {actorUserId ? actorUserId : "—"}
                </div>
              </div>

              <div>
                <div className="mb-1 text-xs font-extrabold text-slate-700">
                  Published Until (Local DateTime)
                </div>
                <input
                  type="datetime-local"
                  value={publishedUntil}
                  onChange={(e) => setPublishedUntil(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                />
                <div className="mt-1 text-[11px] text-slate-500">
                  Backend requires this to be in the future.
                </div>
              </div>

              {(publishElectionM.isError || publishSelectedCenterM.isError) && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-extrabold text-rose-800">
                  {(publishElectionM.error as any)?.message ||
                    (publishSelectedCenterM.error as any)?.message ||
                    "Publish failed"}
                </div>
              )}

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (publishModal.mode === "publishElection") publishElectionM.mutate();
                    else publishSelectedCenterM.mutate();
                  }}
                  disabled={publishBusy || !actorReady}
                  className="rounded-xl border border-slate-200 bg-slate-900 px-4 py-2 text-sm font-extrabold text-white hover:bg-slate-800 disabled:opacity-60"
                >
                  {publishBusy ? "Publishing…" : "Publish"}
                </button>
              </div>

              {publishModal.mode === "publishCenter" &&
              (contestId === "all" || centerId === "all") ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-extrabold text-amber-900">
                  Select a <b>contest</b> and a <b>center</b> first before publishing.
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {/* ✅ NEW: Unpublish Election modal */}
      {unpublishElectionModal.open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-3">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-4 shadow-xl">
            <div className="flex items-center justify-between">
              <div className="text-sm font-extrabold text-slate-800">
                Unpublish Election Results
              </div>

              <button
                type="button"
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-extrabold hover:bg-slate-50"
                onClick={() => setUnpublishElectionModal({ open: false })}
                disabled={unpublishBusy}
              >
                Close
              </button>
            </div>

            <div className="mt-3 grid gap-3">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="text-xs font-extrabold text-slate-700">Actor (current user)</div>
                <div className="mt-1 text-sm font-extrabold text-slate-900">
                  {meQ.isLoading ? "Loading current user…" : actorDisplayName || "—"}
                </div>
                <div className="mt-0.5 text-[11px] font-mono text-slate-700 break-all">
                  {actorUserId ? actorUserId : "—"}
                </div>
              </div>

              <div>
                <div className="mb-1 text-xs font-extrabold text-slate-700">
                  Reason (optional)
                </div>
                <textarea
                  value={unpublishElectionReason}
                  onChange={(e) => setUnpublishElectionReason(e.target.value)}
                  className="w-full min-h-[90px] rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                  placeholder="e.g. Correction needed / Court order / Audit issue…"
                />
              </div>

              {unpublishElectionM.isError && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-extrabold text-rose-800">
                  {(unpublishElectionM.error as any)?.message || "Unpublish failed"}
                </div>
              )}

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => unpublishElectionM.mutate()}
                  disabled={unpublishBusy || !actorReady}
                  className="rounded-xl border border-rose-200 bg-rose-700 px-4 py-2 text-sm font-extrabold text-white hover:bg-rose-800 disabled:opacity-60"
                >
                  {unpublishBusy ? "Unpublishing…" : "Unpublish"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* Candidate Votes Modal (unchanged) */}
      {candModal.open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-3">
          <div className="w-full max-w-3xl rounded-2xl border border-slate-200 bg-white shadow-xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <div className="text-sm font-extrabold text-slate-800">
                Candidate Votes —{" "}
                <span className="text-slate-600">{candModal.centerName}</span>
              </div>
              <button
                type="button"
                onClick={() => setCandModal({ open: false })}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-extrabold hover:bg-slate-50"
              >
                <X size={16} />
                Close
              </button>
            </div>

            <div className="p-4 max-h-[75vh] overflow-y-auto overflow-x-hidden">
              <div className="text-xs text-slate-600">
                Contest: <b>{candModal.contestName}</b> • Upload:{" "}
                <b>{fmtHumanDateTime(candModal.uploadTime)}</b> • Status:{" "}
                <b>{candModal.isPublished ? "PUBLISHED" : "DRAFT"}</b>
              </div>

              <div className="mt-3 flex items-center gap-2 overflow-x-auto pb-0.5">
                <KpiCard
                  label="Registered voters"
                  value={candDtoQ.isLoading ? "…" : num(registeredForCenter ?? 0)}
                />
                <KpiCard
                  label="Total valid votes"
                  value={candDtoQ.isLoading ? "…" : num(candVotes.totalValidVotes)}
                />
              </div>

              <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3">
                <div className="mb-2 text-xs font-extrabold text-slate-700">
                  Candidate Votes
                </div>

                {candDtoQ.isLoading ? (
                  <div className="text-sm text-slate-600">Loading votes…</div>
                ) : candDtoQ.isError ? (
                  <div className="text-sm text-rose-700">
                    Failed to load candidate votes for this result.
                  </div>
                ) : candVotes.rows.length === 0 ? (
                  <div className="text-sm text-slate-600">
                    No candidate votes found for this center.
                  </div>
                ) : (
                  <div className="w-full overflow-x-hidden">
                    <table className="w-full table-fixed">
                      <thead>
                        <tr className="text-left text-xs font-extrabold text-slate-700">
                          <th className="py-2 pr-3 w-[65%]">Candidate</th>
                          <th className="py-2 pr-3 w-[15%]">Votes</th>
                          <th className="py-2 pr-3 w-[20%]">% of Center</th>
                        </tr>
                      </thead>
                      <tbody>
                        {candVotes.rows.map((c) => (
                          <tr key={c.key} className="border-t border-slate-100">
                            <td className="py-2 pr-3 text-sm font-extrabold text-slate-900 break-words">
                              {c.displayName}
                            </td>
                            <td className="py-2 pr-3 text-sm text-slate-800">
                              {num(c.votes)}
                            </td>
                            <td className="py-2 pr-3 text-sm text-slate-600">
                              {c.pct}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <div className="mt-2 text-[11px] text-slate-500">
                  If you still see “Unknown Candidate”, it means the vote key doesn’t
                  match ElectionCandidate.candidateId/electId for this election.
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}




// // ✅ FILE: src/pages/operations/official/NecResultTab.tsx
// //
// // ✅ UPDATE (REQUESTED):
// // 1) Publish/Unpublish buttons not active → make them active
// //    - Fetch current logged-in user (actor) automatically (no manual UUID typing)
// //    - Publish Election uses current user as actor
// // 2) Upload time → show human-readable date + time
// // 3) Geo nav: selecting county should NOT expand district/center boxes (fix by locking widths)
// // ❗Do not change anything else.

// import React, { useEffect, useMemo, useState } from "react";
// import { useParams, useSearchParams } from "react-router-dom";
// import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
// import {
//   RefreshCw,
//   CheckCircle2,
//   XCircle,
//   ChevronDown,
//   AlertTriangle,
//   Eye,
//   X,
//   Trash2,
//   Megaphone,
//   Ban,
// } from "lucide-react";

// import { Panel, Badge } from "../../../shared/elections-ui";

// import { necResultService } from "../../../../../shared/services/necResultService";

// import { listContestsByElection } from "../../../../../shared/services/contestService";
// import { fetchCounties } from "../../../../../shared/services/countyService";
// import { fetchDistricts } from "../../../../../shared/services/districtService";
// import { fetchPollingCenters } from "../../../../../shared/services/pollingCenterService";
// import { fetchElectionById } from "../../../../../shared/services/electionService";

// import {
//   fetchElectionCandidates,
//   type ElectionCandidateDto,
// } from "../../../../../shared/services/electionCandidateService";

// import { fetchMe } from "../../../../../shared/services/userService";
// import { useAuthStore } from "../../../../../shared/store/authStore";

// type PublishModalState =
//   | { open: false; mode: "publishElection" | "publishCenter"; scope?: any }
//   | { open: true; mode: "publishElection" | "publishCenter"; scope?: any };

// type CandidateVotesModalState =
//   | { open: false }
//   | {
//       open: true;
//       resultId: string;
//       centerName: string;
//       contestName: string;
//       uploadTime?: string;
//       isPublished?: boolean;
//     };

// function toLocalIsoNoSeconds(d: Date) {
//   const pad = (n: number) => String(n).padStart(2, "0");
//   return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
//     d.getHours()
//   )}:${pad(d.getMinutes())}`;
// }

// function num(n?: number | null) {
//   return (n ?? 0).toLocaleString();
// }

// function clipText(s?: string | null, max = 22) {
//   if (!s) return "—";
//   if (s.length <= max) return s;
//   return `${s.slice(0, max)}…`;
// }

// // ✅ Human readable date+time
// function fmtHumanDateTime(v?: string | null) {
//   if (!v) return "—";
//   const d = new Date(v);
//   if (Number.isNaN(d.getTime())) return String(v); // fallback if backend sends non-ISO
//   return new Intl.DateTimeFormat(undefined, {
//     year: "numeric",
//     month: "short",
//     day: "2-digit",
//     hour: "numeric",
//     minute: "2-digit",
//   }).format(d);
// }

// // ✅ try to get orgId from common storage keys (no other logic changed)
// function getOrgIdFromStorage(): string | null {
//   const keys = ["orgId", "activeOrgId", "selectedOrgId", "currentOrgId"];
//   for (const k of keys) {
//     const v = String((window as any)?.localStorage?.getItem?.(k) ?? "").trim();
//     if (v) return v;
//   }
//   return null;
// }

// // ✅ Slightly bigger card (requested)
// function KpiCard(props: { label: string; value: React.ReactNode }) {
//   return (
//     <div className="shrink-0 rounded-2xl border border-slate-200 bg-white px-4 py-3">
//       <div className="text-[12px] font-extrabold text-slate-600 leading-4">
//         {props.label}
//       </div>
//       <div className="mt-1 text-[18px] font-extrabold text-slate-900 leading-6">
//         {props.value}
//       </div>
//     </div>
//   );
// }

// // admin row shape helpers (kept flexible)
// function pickContestId(r: any) {
//   return r?.contest?.contestId ?? r?.contestId ?? r?.contest?.contestId ?? null;
// }
// function pickContestName(r: any) {
//   return (
//     r?.contest?.contestName ?? r?.contestName ?? r?.contest?.contestName ?? "—"
//   );
// }
// function pickCenterId(r: any) {
//   return (
//     r?.pollingCenter?.centerId ??
//     r?.centerId ??
//     r?.pollingCenter?.centerId ??
//     null
//   );
// }
// function pickCenterName(r: any) {
//   return (
//     r?.pollingCenter?.centerName ??
//     r?.pollingCenterName ??
//     r?.pollingCenter?.centerName ??
//     "—"
//   );
// }

// export default function NecResultTab() {
//   const { electionId } = useParams();
//   const [sp, setSp] = useSearchParams();
//   const qc = useQueryClient();

//   const contestId = sp.get("contestId") || "all";
//   const countyId = sp.get("countyId") || "all";
//   const districtId = sp.get("districtId") || "all";
//   const centerId = sp.get("centerId") || "all";

//   const [publishModal, setPublishModal] = useState<PublishModalState>({
//     open: false,
//     mode: "publishElection",
//   });

//   const [candModal, setCandModal] = useState<CandidateVotesModalState>({
//     open: false,
//   });

//   const [actorUserId, setActorUserId] = useState("");
//   const [publishedUntil, setPublishedUntil] = useState(() => {
//     const d = new Date();
//     d.setHours(d.getHours() + 6);
//     return toLocalIsoNoSeconds(d);
//   });

//   // ✅ Prefer orgId from authStore (more reliable), fallback to localStorage
//   const currentOrgId = useAuthStore((s) => s.currentOrgId);
//   const orgId = useMemo(
//     () => String(currentOrgId ?? "").trim() || getOrgIdFromStorage(),
//     [currentOrgId]
//   );

//   // ✅ Fetch current user (actor) so buttons/modals can work immediately
//   const meQ = useQuery({
//     queryKey: ["meForNecPublish", orgId],
//     enabled: !!orgId,
//     queryFn: () => fetchMe(orgId!),
//     staleTime: 30_000,
//     retry: 1,
//   });

//   // ✅ Always set actorUserId from current user when available (keeps buttons active)
//   useEffect(() => {
//     const id =
//       (meQ.data as any)?.userId ??
//       (meQ.data as any)?.id ??
//       (meQ.data as any)?.systemUserId ??
//       "";
//     if (id) setActorUserId(String(id));
//   }, [meQ.data]);

//   const actorDisplayName = useMemo(() => {
//     const me: any = meQ.data;
//     if (!me) return "";
//     return (
//       me.fullName ||
//       me.name ||
//       [me.firstName, me.lastName].filter(Boolean).join(" ") ||
//       me.username ||
//       me.email ||
//       ""
//     );
//   }, [meQ.data]);

//   // election name
//   const electionQ = useQuery({
//     queryKey: ["electionById", electionId],
//     enabled: !!electionId,
//     queryFn: () => fetchElectionById(electionId!),
//   });

//   // contests
//   const contestsQ = useQuery({
//     queryKey: ["contestsByElection", electionId],
//     enabled: !!electionId,
//     queryFn: () => listContestsByElection(electionId!),
//   });

//   // geo
//   const countiesQ = useQuery({
//     queryKey: ["countiesForNec"],
//     queryFn: () => fetchCounties({ page: 0, size: 500 }),
//   });

//   const districtsQ = useQuery({
//     queryKey: ["districtsForNec", countyId],
//     enabled: countyId !== "all",
//     queryFn: () => fetchDistricts({ page: 0, size: 500, countyId }),
//   });

//   const centersQ = useQuery({
//     queryKey: ["centersForNec", countyId, districtId],
//     enabled: countyId !== "all" || districtId !== "all",
//     queryFn: () =>
//       fetchPollingCenters({
//         page: 0,
//         size: 1000,
//         countyId: countyId !== "all" ? countyId : undefined,
//         districtId: districtId !== "all" ? districtId : undefined,
//       }),
//   });

//   // ✅ election candidates mapping (candidateId OR electId -> fullName/party)
//   const electionCandidatesQ = useQuery({
//     queryKey: ["electionCandidates", electionId],
//     enabled: !!electionId,
//     queryFn: () => fetchElectionCandidates(electionId!),
//   });

//   const candidateMap = useMemo(() => {
//     const items: ElectionCandidateDto[] = electionCandidatesQ.data ?? [];
//     const m = new Map<string, { fullName: string; partyAbbrev?: string | null }>();

//     for (const c of items) {
//       const meta = {
//         fullName: c.fullName ?? c.candidateId,
//         partyAbbrev: c.partyAbbrev ?? null,
//       };

//       if (c.candidateId) m.set(c.candidateId, meta);
//       if (c.electId) m.set(c.electId, meta);
//     }

//     return m;
//   }, [electionCandidatesQ.data]);

//   // admin raw rows
//   const rowsQ = useQuery({
//     queryKey: ["necAdminRawResults", electionId],
//     enabled: !!electionId,
//     queryFn: () => necResultService.adminGetRawResults(electionId!),
//   });

//   const allRows: any[] = rowsQ.data ?? [];

//   const filteredRows = useMemo(() => {
//     let rows = allRows;

//     if (contestId !== "all") {
//       rows = rows.filter((r) => pickContestId(r) === contestId);
//     }

//     if (centerId !== "all") {
//       rows = rows.filter((r) => pickCenterId(r) === centerId);
//     }

//     if (centerId === "all") {
//       const centerItems = centersQ.data?.items ?? [];
//       const activeGeoFilter = countyId !== "all" || districtId !== "all";

//       if (activeGeoFilter && centerItems.length > 0) {
//         const allowedCenterIds = new Set(centerItems.map((c) => c.centerId));
//         rows = rows.filter((r) => {
//           const cid = pickCenterId(r);
//           return cid ? allowedCenterIds.has(cid) : false;
//         });
//       }
//     }

//     return rows;
//   }, [allRows, contestId, centerId, countyId, districtId, centersQ.data]);

//   const summary = useMemo(() => {
//     let totalRegisteredVoters = 0;
//     let ballotsCast = 0;

//     let invalidBallots = 0;
//     let unmarkedBallots = 0;
//     let rejectedBallots = 0;
//     let spoiledBallots = 0;
//     let unusedBallots = 0;

//     let publishedCount = 0;

//     for (const r of filteredRows) {
//       totalRegisteredVoters += r.totalRegisteredVoters ?? 0;
//       ballotsCast += r.ballotsInBox ?? 0;

//       invalidBallots += r.invalidBallots ?? 0;
//       unmarkedBallots += r.unmarkedBallots ?? 0;
//       rejectedBallots += r.rejectedBallots ?? 0;
//       spoiledBallots += r.spoiledBallots ?? 0;
//       unusedBallots += r.unusedBallots ?? 0;

//       if (r.isPublished) publishedCount += 1;
//     }

//     const totalRows = filteredRows.length;
//     const isPublished = totalRows > 0 ? publishedCount === totalRows : false;
//     const isPartialPublished =
//       totalRows > 0 ? publishedCount > 0 && publishedCount < totalRows : false;

//     return {
//       rows: totalRows,
//       isPublished,
//       isPartialPublished,
//       totalRegisteredVoters,
//       ballotsCast,
//       invalidBallots,
//       unmarkedBallots,
//       rejectedBallots,
//       spoiledBallots,
//       unusedBallots,
//     };
//   }, [filteredRows]);

//   const statusPill = summary.isPublished ? (
//     <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-extrabold text-emerald-800">
//       <CheckCircle2 size={14} className="text-emerald-700" /> PUBLISHED
//     </span>
//   ) : summary.isPartialPublished ? (
//     <span className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-extrabold text-amber-900">
//       <AlertTriangle size={14} className="text-amber-700" /> PARTIAL
//     </span>
//   ) : (
//     <span className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-extrabold text-rose-800">
//       <XCircle size={14} className="text-rose-700" /> NOT PUBLISHED
//     </span>
//   );

//   const setParam = (k: string, v: string) => {
//     const next = new URLSearchParams(sp);
//     if (v === "all") next.delete(k);
//     else next.set(k, v);
//     setSp(next);
//   };

//   const onChangeContest = (v: string) => setParam("contestId", v);

//   const onChangeCounty = (v: string) => {
//     const next = new URLSearchParams(sp);
//     if (v === "all") next.delete("countyId");
//     else next.set("countyId", v);
//     next.delete("districtId");
//     next.delete("centerId");
//     setSp(next);
//   };

//   const onChangeDistrict = (v: string) => {
//     const next = new URLSearchParams(sp);
//     if (v === "all") next.delete("districtId");
//     else next.set("districtId", v);
//     next.delete("centerId");
//     setSp(next);
//   };

//   const onChangeCenter = (v: string) => setParam("centerId", v);

//   // ✅ Clear filters button (requested)
//   const onClearFilters = () => {
//     const next = new URLSearchParams(sp);
//     next.delete("contestId");
//     next.delete("countyId");
//     next.delete("districtId");
//     next.delete("centerId");
//     setSp(next);
//   };

//   const publishElectionM = useMutation({
//     mutationFn: async () => {
//       if (!electionId) throw new Error("Missing electionId");
//       if (!actorUserId.trim()) throw new Error("Current user not loaded (actorUserId).");
//       if (!publishedUntil.trim()) throw new Error("publishedUntil is required");

//       return necResultService.adminPublishElection({
//         electionId,
//         body: {
//           actorUserId: actorUserId.trim(),
//           publishedUntil: publishedUntil.trim(),
//         },
//       });
//     },
//     onSuccess: async () => {
//       setPublishModal({ open: false, mode: "publishElection" });
//       await qc.invalidateQueries({ queryKey: ["necAdminRawResults", electionId] });
//     },
//   });

//   const publishSelectedCenterM = useMutation({
//     mutationFn: async () => {
//       if (!electionId) throw new Error("Missing electionId");
//       if (!actorUserId.trim()) throw new Error("Current user not loaded (actorUserId).");
//       if (!publishedUntil.trim()) throw new Error("publishedUntil is required");
//       if (contestId === "all") throw new Error("Select a contest first");
//       if (centerId === "all") throw new Error("Select a center first");

//       await necResultService.publishForCenterContest({
//         electionId,
//         contestId,
//         centerId,
//         body: {
//           actorUserId: actorUserId.trim(),
//           publishedUntil: publishedUntil.trim(),
//         },
//       });
//     },
//     onSuccess: async () => {
//       setPublishModal({ open: false, mode: "publishCenter" });
//       await qc.invalidateQueries({ queryKey: ["necAdminRawResults", electionId] });
//     },
//   });

//   const unpublishSelectedCenterM = useMutation({
//     mutationFn: async () => {
//       if (!electionId) throw new Error("Missing electionId");
//       if (!actorUserId.trim()) throw new Error("Current user not loaded (actorUserId).");
//       if (contestId === "all") throw new Error("Select a contest first");
//       if (centerId === "all") throw new Error("Select a center first");

//       await necResultService.unpublishForCenterContest({
//         electionId,
//         contestId,
//         centerId,
//         actorUserId: actorUserId.trim(),
//       });
//     },
//     onSuccess: async () => {
//       await qc.invalidateQueries({ queryKey: ["necAdminRawResults", electionId] });
//     },
//   });

//   const onRefresh = async () => {
//     await qc.invalidateQueries({ queryKey: ["necAdminRawResults", electionId] });
//   };

//   const contestOptions = contestsQ.data ?? [];
//   const countyOptions = countiesQ.data?.items ?? [];
//   const districtOptions = districtsQ.data?.items ?? [];
//   const centerOptions = centersQ.data?.items ?? [];

//   const electionName =
//     electionQ.data?.electionName ||
//     (electionQ.isLoading ? "Loading…" : electionId ?? "—");

//   // Candidate votes from official DTO endpoint (Map -> clean JSON)
//   const candDtoQ = useQuery({
//     queryKey: ["necResultDtoById", candModal.open ? candModal.resultId : "none"],
//     enabled: candModal.open,
//     queryFn: () => necResultService.get((candModal as any).resultId),
//   });

//   // compute totalValidVotes (sum of candidate votes)
//   const candVotes = useMemo(() => {
//     const votes = (candDtoQ.data as any)?.candidateVotes as
//       | Record<string, number>
//       | undefined;

//     if (!votes || typeof votes !== "object") {
//       return { rows: [] as any[], totalValidVotes: 0 };
//     }

//     const entries = Object.entries(votes)
//       .map(([key, vv]) => ({
//         key,
//         votes: Number(vv ?? 0) || 0,
//       }))
//       .sort((a, b) => b.votes - a.votes);

//     const total = entries.reduce((acc, x) => acc + x.votes, 0);

//     const rows = entries.map((e) => {
//       const meta = candidateMap.get(e.key);
//       const name = meta?.fullName ?? "Unknown Candidate";
//       const party = meta?.partyAbbrev ? ` (${meta.partyAbbrev})` : "";
//       return {
//         key: e.key,
//         displayName: `${name}${party}`,
//         votes: e.votes,
//         pct: total > 0 ? `${((e.votes / total) * 100).toFixed(1)}%` : "—",
//       };
//     });

//     return { rows, totalValidVotes: total };
//   }, [candDtoQ.data, candidateMap]);

//   const registeredForCenter = (candDtoQ.data as any)?.totalRegisteredVoters as
//     | number
//     | undefined;

//   const publishBusy = publishElectionM.isPending || publishSelectedCenterM.isPending;
//   const unpublishBusy = unpublishSelectedCenterM.isPending;

//   // ✅ Buttons active: require actor loaded (from /user/me)
//   const actorReady = !!actorUserId.trim() && !meQ.isLoading && !meQ.isError;

//   // ✅ Prevent “geo selects expanding” by locking widths (no flex growth)
//   const navSelectClass =
//     "shrink-0 w-[200px] appearance-none rounded-xl border border-slate-200 bg-white px-3 py-2 pr-9 text-sm font-extrabold truncate";

//   return (
//     <div className="flex flex-col gap-3">
//       <Panel
//         title="NEC Result (Official)"
//         right={
//           <div className="flex flex-wrap items-center gap-2">
//             {statusPill}
//             <Badge text="NEC Only" />

//             {/* Contest */}
//             <div className="relative shrink-0">
//               <select
//                 value={contestId}
//                 onChange={(e) => onChangeContest(e.target.value)}
//                 className={navSelectClass}
//                 disabled={contestsQ.isLoading || contestsQ.isError}
//               >
//                 <option value="all">All contests</option>
//                 {contestOptions.map((c: any) => (
//                   <option key={c.contestId} value={c.contestId}>
//                     {c.contestName ?? c.contestId}
//                   </option>
//                 ))}
//               </select>
//               <ChevronDown
//                 size={16}
//                 className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
//               />
//             </div>

//             {/* County */}
//             <div className="relative shrink-0">
//               <select
//                 value={countyId}
//                 onChange={(e) => onChangeCounty(e.target.value)}
//                 className={navSelectClass}
//                 disabled={countiesQ.isLoading || countiesQ.isError}
//               >
//                 <option value="all">All counties</option>
//                 {countyOptions.map((c) => (
//                   <option key={c.countyId} value={c.countyId}>
//                     {c.countyName}
//                   </option>
//                 ))}
//               </select>
//               <ChevronDown
//                 size={16}
//                 className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
//               />
//             </div>

//             {/* District */}
//             <div className="relative shrink-0">
//               <select
//                 value={districtId}
//                 onChange={(e) => onChangeDistrict(e.target.value)}
//                 className={navSelectClass}
//                 disabled={countyId === "all" || districtsQ.isLoading || districtsQ.isError}
//               >
//                 <option value="all">All districts</option>
//                 {districtOptions.map((d) => (
//                   <option key={d.districtId} value={d.districtId}>
//                     {d.districtName}
//                   </option>
//                 ))}
//               </select>
//               <ChevronDown
//                 size={16}
//                 className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
//               />
//             </div>

//             {/* Center */}
//             <div className="relative shrink-0">
//               <select
//                 value={centerId}
//                 onChange={(e) => onChangeCenter(e.target.value)}
//                 className={navSelectClass}
//                 disabled={
//                   (countyId === "all" && districtId === "all") ||
//                   centersQ.isLoading ||
//                   centersQ.isError
//                 }
//               >
//                 <option value="all">All centers</option>
//                 {centerOptions.map((c) => (
//                   <option key={c.centerId} value={c.centerId}>
//                     {c.centerName}
//                   </option>
//                 ))}
//               </select>
//               <ChevronDown
//                 size={16}
//                 className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
//               />
//             </div>

//             {/* Clear */}
//             <button
//               type="button"
//               onClick={onClearFilters}
//               className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-extrabold hover:bg-slate-50"
//               title="Clear contest/county/district/center filters"
//             >
//               <Trash2 size={16} className="text-slate-700" />
//               Clear
//             </button>

//             {/* Publish Election */}
//             <button
//               type="button"
//               onClick={() => setPublishModal({ open: true, mode: "publishElection" })}
//               className="inline-flex items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-600 px-3 py-2 text-sm font-extrabold text-white hover:bg-indigo-700 disabled:opacity-60"
//               disabled={publishBusy || !actorReady}
//               title={!actorReady ? "Loading current user…" : ""}
//             >
//               <Megaphone size={16} className="text-white" />
//               Publish Election
//             </button>

//             {/* Publish Center */}
//             <button
//               type="button"
//               onClick={() => setPublishModal({ open: true, mode: "publishCenter" })}
//               className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-600 px-3 py-2 text-sm font-extrabold text-white hover:bg-emerald-700 disabled:opacity-60"
//               disabled={contestId === "all" || centerId === "all" || publishBusy || !actorReady}
//               title={
//                 !actorReady
//                   ? "Loading current user…"
//                   : contestId === "all" || centerId === "all"
//                   ? "Select contest + center first"
//                   : ""
//               }
//             >
//               <CheckCircle2 size={16} className="text-white" />
//               Publish
//             </button>

//             {/* Unpublish Center */}
//             <button
//               type="button"
//               onClick={() => unpublishSelectedCenterM.mutate()}
//               className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-600 px-3 py-2 text-sm font-extrabold text-white hover:bg-rose-700 disabled:opacity-60"
//               disabled={contestId === "all" || centerId === "all" || unpublishBusy || !actorReady}
//               title={
//                 !actorReady
//                   ? "Loading current user…"
//                   : contestId === "all" || centerId === "all"
//                   ? "Select contest + center first"
//                   : ""
//               }
//             >
//               <Ban size={16} className="text-white" />
//               Unpublish
//             </button>

//             <button
//               type="button"
//               onClick={onRefresh}
//               className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-extrabold hover:bg-slate-50"
//               disabled={rowsQ.isFetching}
//             >
//               <RefreshCw size={16} className="text-slate-700" />
//               Refresh
//             </button>
//           </div>
//         }
//       >
//         {/* KPI row */}
//         <div className="mt-2 flex items-center gap-2 overflow-x-auto pb-0.5">
//           <KpiCard label="Election" value={clipText(electionName, 28)} />
//           <KpiCard label="Centers" value={summary.rows.toLocaleString()} />
//           <KpiCard label="Registered" value={summary.totalRegisteredVoters.toLocaleString()} />
//           <KpiCard label="Valid Votes" value={summary.ballotsCast.toLocaleString()} />
//           <KpiCard label="Invalid" value={summary.invalidBallots.toLocaleString()} />
//           <KpiCard label="Unmarked" value={summary.unmarkedBallots.toLocaleString()} />
//           <KpiCard label="Rejected" value={summary.rejectedBallots.toLocaleString()} />
//           <KpiCard label="Spoiled" value={summary.spoiledBallots.toLocaleString()} />
//           <KpiCard label="Unused" value={summary.unusedBallots.toLocaleString()} />
//         </div>

//         {/* Center Results Table */}
//         <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3">
//           <div className="mb-2 text-xs font-extrabold text-slate-700">
//             Center Results (filtered): {summary.rows.toLocaleString()}
//           </div>

//           {rowsQ.isLoading ? (
//             <div className="text-sm text-slate-600">Loading…</div>
//           ) : rowsQ.isError ? (
//             <div className="text-sm text-rose-700">Failed to load NEC results.</div>
//           ) : filteredRows.length === 0 ? (
//             <div className="text-sm text-slate-600">
//               No results match the selected filters.
//             </div>
//           ) : (
//             <div className="overflow-auto">
//               <table className="min-w-[1550px] w-full">
//                 <thead>
//                   <tr className="text-left text-xs font-extrabold text-slate-700 border-b border-slate-200">
//                     <th className="py-2 px-2">Center</th>
//                     <th className="py-2 px-2">Contest</th>
//                     <th className="py-2 px-2">Registered</th>
//                     <th className="py-2 px-2">Valid Votes</th>
//                     <th className="py-2 px-2">Invalid</th>
//                     <th className="py-2 px-2">Unmarked</th>
//                     <th className="py-2 px-2">Rejected</th>
//                     <th className="py-2 px-2">Spoiled</th>
//                     <th className="py-2 px-2">Unused</th>
//                     <th className="py-2 px-2">Upload</th>
//                     <th className="py-2 px-2">Signer Key</th>
//                     <th className="py-2 px-2">Chain Hash</th>
//                     <th className="py-2 px-2">Signature</th>
//                     <th className="py-2 px-2">Status</th>
//                     <th className="py-2 px-2 text-right">Action</th>
//                   </tr>
//                 </thead>

//                 <tbody>
//                   {filteredRows.map((r) => (
//                     <tr key={r.resultId} className="border-b border-slate-100">
//                       <td className="py-1.5 px-2 text-sm font-extrabold text-slate-900">
//                         {pickCenterName(r)}
//                       </td>
//                       <td className="py-1.5 px-2 text-sm text-slate-700">
//                         {pickContestName(r)}
//                       </td>

//                       <td className="py-1.5 px-2 text-sm text-slate-700">
//                         {num(r.totalRegisteredVoters)}
//                       </td>
//                       <td className="py-1.5 px-2 text-sm text-slate-700">
//                         {num(r.ballotsInBox)}
//                       </td>
//                       <td className="py-1.5 px-2 text-sm text-slate-700">
//                         {num(r.invalidBallots)}
//                       </td>
//                       <td className="py-1.5 px-2 text-sm text-slate-700">
//                         {num(r.unmarkedBallots)}
//                       </td>
//                       <td className="py-1.5 px-2 text-sm text-slate-700">
//                         {num(r.rejectedBallots)}
//                       </td>
//                       <td className="py-1.5 px-2 text-sm text-slate-700">
//                         {num(r.spoiledBallots)}
//                       </td>
//                       <td className="py-1.5 px-2 text-sm text-slate-700">
//                         {num(r.unusedBallots)}
//                       </td>

//                       {/* ✅ Human readable date+time */}
//                       <td className="py-1.5 px-2 text-xs text-slate-600">
//                         {fmtHumanDateTime(r.uploadTime)}
//                       </td>

//                       <td className="py-1.5 px-2 text-xs font-mono text-slate-700">
//                         {clipText(String(r.resultSignerKeyId ?? "—"), 14)}
//                       </td>
//                       <td className="py-1.5 px-2 text-xs font-mono text-slate-700">
//                         {clipText(String(r.chainHash ?? "—"), 16)}
//                       </td>
//                       <td className="py-1.5 px-2 text-xs font-mono text-slate-700">
//                         {clipText(String(r.resultSignature ?? "—"), 16)}
//                       </td>

//                       <td className="py-1.5 px-2">
//                         {r.isPublished ? (
//                           <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-extrabold text-emerald-800">
//                             <CheckCircle2 size={14} className="text-emerald-700" /> PUBLISHED
//                           </span>
//                         ) : (
//                           <span className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-extrabold text-rose-800">
//                             <XCircle size={14} className="text-rose-700" /> DRAFT
//                           </span>
//                         )}
//                       </td>

//                       <td className="py-1.5 px-2 text-right">
//                         <button
//                           type="button"
//                           onClick={() =>
//                             setCandModal({
//                               open: true,
//                               resultId: String(r.resultId),
//                               centerName: pickCenterName(r),
//                               contestName: pickContestName(r),
//                               uploadTime: r.uploadTime,
//                               isPublished: !!r.isPublished,
//                             })
//                           }
//                           className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-600 px-3 py-1 text-xs font-extrabold text-white hover:bg-blue-700"
//                         >
//                           <Eye size={16} className="text-white" />
//                           View Candidates
//                         </button>
//                       </td>
//                     </tr>
//                   ))}
//                 </tbody>
//               </table>

//               <div className="mt-2 text-[11px] text-slate-500">
//                 Candidate names come from Election Candidates (mapped by candidateId and electId).
//               </div>
//             </div>
//           )}
//         </div>
//       </Panel>

//       {/* Publish modal */}
//       {publishModal.open ? (
//         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-3">
//           <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-4 shadow-xl">
//             <div className="flex items-center justify-between">
//               <div className="text-sm font-extrabold text-slate-800">
//                 {publishModal.mode === "publishElection"
//                   ? "Publish Election Results"
//                   : "Publish Selected Center + Contest"}
//               </div>

//               <button
//                 type="button"
//                 className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-extrabold hover:bg-slate-50"
//                 onClick={() => setPublishModal({ open: false, mode: publishModal.mode })}
//                 disabled={publishBusy}
//               >
//                 Close
//               </button>
//             </div>

//             <div className="mt-3 grid gap-3">
//               {/* Actor display (auto) */}
//               <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
//                 <div className="text-xs font-extrabold text-slate-700">Actor (current user)</div>
//                 <div className="mt-1 text-sm font-extrabold text-slate-900">
//                   {meQ.isLoading ? "Loading current user…" : actorDisplayName || "—"}
//                 </div>
//                 <div className="mt-0.5 text-[11px] font-mono text-slate-700 break-all">
//                   {actorUserId ? actorUserId : "—"}
//                 </div>
//               </div>

//               {/* Published until */}
//               <div>
//                 <div className="mb-1 text-xs font-extrabold text-slate-700">
//                   Published Until (Local DateTime)
//                 </div>
//                 <input
//                   type="datetime-local"
//                   value={publishedUntil}
//                   onChange={(e) => setPublishedUntil(e.target.value)}
//                   className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
//                 />
//                 <div className="mt-1 text-[11px] text-slate-500">
//                   Backend requires this to be in the future.
//                 </div>
//               </div>

//               {(publishElectionM.isError || publishSelectedCenterM.isError) && (
//                 <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-extrabold text-rose-800">
//                   {(publishElectionM.error as any)?.message ||
//                     (publishSelectedCenterM.error as any)?.message ||
//                     "Publish failed"}
//                 </div>
//               )}

//               <div className="flex items-center justify-end gap-2">
//                 <button
//                   type="button"
//                   onClick={() => {
//                     if (publishModal.mode === "publishElection") {
//                       publishElectionM.mutate();
//                     } else {
//                       publishSelectedCenterM.mutate();
//                     }
//                   }}
//                   disabled={publishBusy || !actorReady}
//                   className="rounded-xl border border-slate-200 bg-slate-900 px-4 py-2 text-sm font-extrabold text-white hover:bg-slate-800 disabled:opacity-60"
//                 >
//                   {publishBusy ? "Publishing…" : "Publish"}
//                 </button>
//               </div>

//               {publishModal.mode === "publishCenter" &&
//               (contestId === "all" || centerId === "all") ? (
//                 <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-extrabold text-amber-900">
//                   Select a <b>contest</b> and a <b>center</b> first before publishing.
//                 </div>
//               ) : null}
//             </div>
//           </div>
//         </div>
//       ) : null}

//       {/* Candidate Votes Modal */}
//       {candModal.open ? (
//         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-3">
//           <div className="w-full max-w-3xl rounded-2xl border border-slate-200 bg-white shadow-xl overflow-hidden">
//             <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
//               <div className="text-sm font-extrabold text-slate-800">
//                 Candidate Votes —{" "}
//                 <span className="text-slate-600">{candModal.centerName}</span>
//               </div>
//               <button
//                 type="button"
//                 onClick={() => setCandModal({ open: false })}
//                 className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-extrabold hover:bg-slate-50"
//               >
//                 <X size={16} />
//                 Close
//               </button>
//             </div>

//             <div className="p-4 max-h-[75vh] overflow-y-auto overflow-x-hidden">
//               <div className="text-xs text-slate-600">
//                 Contest: <b>{candModal.contestName}</b> • Upload:{" "}
//                 <b>{fmtHumanDateTime(candModal.uploadTime)}</b> • Status:{" "}
//                 <b>{candModal.isPublished ? "PUBLISHED" : "DRAFT"}</b>
//               </div>

//               <div className="mt-3 flex items-center gap-2 overflow-x-auto pb-0.5">
//                 <KpiCard
//                   label="Registered voters"
//                   value={candDtoQ.isLoading ? "…" : num(registeredForCenter ?? 0)}
//                 />
//                 <KpiCard
//                   label="Total valid votes"
//                   value={candDtoQ.isLoading ? "…" : num(candVotes.totalValidVotes)}
//                 />
//               </div>

//               <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3">
//                 <div className="mb-2 text-xs font-extrabold text-slate-700">
//                   Candidate Votes
//                 </div>

//                 {candDtoQ.isLoading ? (
//                   <div className="text-sm text-slate-600">Loading votes…</div>
//                 ) : candDtoQ.isError ? (
//                   <div className="text-sm text-rose-700">
//                     Failed to load candidate votes for this result.
//                   </div>
//                 ) : candVotes.rows.length === 0 ? (
//                   <div className="text-sm text-slate-600">
//                     No candidate votes found for this center.
//                   </div>
//                 ) : (
//                   <div className="w-full overflow-x-hidden">
//                     <table className="w-full table-fixed">
//                       <thead>
//                         <tr className="text-left text-xs font-extrabold text-slate-700">
//                           <th className="py-2 pr-3 w-[65%]">Candidate</th>
//                           <th className="py-2 pr-3 w-[15%]">Votes</th>
//                           <th className="py-2 pr-3 w-[20%]">% of Center</th>
//                         </tr>
//                       </thead>
//                       <tbody>
//                         {candVotes.rows.map((c) => (
//                           <tr key={c.key} className="border-t border-slate-100">
//                             <td className="py-2 pr-3 text-sm font-extrabold text-slate-900 break-words">
//                               {c.displayName}
//                             </td>
//                             <td className="py-2 pr-3 text-sm text-slate-800">
//                               {num(c.votes)}
//                             </td>
//                             <td className="py-2 pr-3 text-sm text-slate-600">
//                               {c.pct}
//                             </td>
//                           </tr>
//                         ))}
//                       </tbody>
//                     </table>
//                   </div>
//                 )}

//                 <div className="mt-2 text-[11px] text-slate-500">
//                   If you still see “Unknown Candidate”, it means the vote key doesn’t
//                   match ElectionCandidate.candidateId/electId for this election.
//                 </div>
//               </div>
//             </div>
//           </div>
//         </div>
//       ) : null}
//     </div>
//   );
// }


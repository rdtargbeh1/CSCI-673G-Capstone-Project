
// ✅ FILE: src/pages/operations/official/NecResultTab.tsx

import React, { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import {
  useMutation,
  useQuery,
  useQueryClient,
  useQueries,
} from "@tanstack/react-query";
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
  Clock3,
  ShieldCheck,
} from "lucide-react";

import { Panel } from "../../../shared/elections-ui";
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

type UnpublishElectionModalState = { open: false } | { open: true };

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
    <div className="shrink-0 rounded-lg border border-slate-200 bg-white px-2.5 py-2">
      <div className="text-[14px] font-extrabold text-slate-600 leading-4">
        {props.label}
      </div>
      <div className="mt-0.5 text-[18px] font-extrabold text-slate-900 leading-5">
        {props.value}
      </div>
    </div>
  );
}

// admin row shape helpers (kept flexible)
function pickContestId(r: any) {
  return r?.contest?.contestId ?? r?.contestId ?? null;
}
function pickContestName(r: any) {
  return r?.contest?.contestName ?? r?.contestName ?? "—";
}
function pickCenterId(r: any) {
  return r?.pollingCenter?.centerId ?? r?.centerId ?? null;
}
function pickCenterName(r: any) {
  return r?.pollingCenter?.centerName ?? r?.pollingCenterName ?? "—";
}

// ✅ Normalizers for publish fields
function rowIsPublished(r: any): boolean {
  return Boolean(
    r?.isPublished ??
      r?.published ??
      r?.is_published ??
      r?.is_published_flag ??
      false
  );
}
function rowPublishedUntil(r: any): string | null {
  return (
    r?.publishedUntil ??
    r?.published_until ??
    r?.publishedTill ??
    r?.published_till ??
    null
  );
}
function rowPublishedAt(r: any): string | null {
  return r?.publishedAt ?? r?.published_at ?? null;
}

function msToHuman(ms: number) {
  if (ms <= 0) return "expired";
  const totalMinutes = Math.floor(ms / 60_000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

/**
 * ✅ UPDATED: Status display (read-only)
 * Show ONLY ONE based on status:
 * - Published => green check YES
 * - Unpublished => red X NO
 * Does NOT change any publish/unpublish behavior.
 */
function StatusRadio(props: { published: boolean; expired?: boolean }) {
  const { published, expired } = props;

  if (published) {
    return (
      <div className="inline-flex items-center gap-2">
        <span
          className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-extrabold text-emerald-800"
          title="Published"
        >
          <span className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-emerald-300 bg-emerald-600">
            <CheckCircle2 size={16} className="text-white" />
          </span>
          YES
        </span>

        {expired ? (
          <span className="ml-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[14px] font-extrabold text-amber-900">
            EXPIRED
          </span>
        ) : null}
      </div>
    );
  }

  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-[11px] font-extrabold text-rose-800"
      title="Not Published"
    >
      <span className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-rose-300 bg-rose-600">
        <XCircle size={14} className="text-white" />
      </span>
      NO
    </span>
  );
}

/**
 * Some controllers serialize JsonNode in inconsistent wrappers.
 * This attempts to extract the actual votes payload from common nested shapes.
 */
function extractCandidateVotesPayload(raw: any): any {
  if (raw == null) return null;

  if (typeof raw === "string") {
    const s = raw.trim();
    if (!s) return null;
    try {
      return extractCandidateVotesPayload(JSON.parse(s));
    } catch {
      return null;
    }
  }

  if (Array.isArray(raw)) return raw;

  if (typeof raw === "object") {
    if (raw.candidateVotes != null) return raw.candidateVotes;
    if (raw.candidate_votes != null) return raw.candidate_votes;
    if (raw.votes != null) return raw.votes;
    if (raw.data != null) return raw.data;
    if (raw.value != null) return raw.value;
    if (raw.payload != null) return raw.payload;
    if (raw.fields != null) return raw.fields;
    if (raw.node != null) return raw.node;
    return raw;
  }

  return null;
}

/**
 * ✅ Normalize candidate votes into Record<string, number>
 * Supports:
 * - { "candId": 10, "cand2": "5" }
 * - { "candId": { votes: 10 } }
 * - [[candId, 10], ...]
 * - [{candidateId/electId, votes}, ...]
 */
function normalizeCandidateVotes(raw: any): Record<string, number> | null {
  const payload = extractCandidateVotesPayload(raw);
  if (payload == null) return null;

  if (Array.isArray(payload)) {
    // [[key, value], ...]
    if (
      payload.length > 0 &&
      Array.isArray(payload[0]) &&
      payload[0].length >= 2
    ) {
      const out: Record<string, number> = {};
      for (const pair of payload) {
        const k = String(pair?.[0] ?? "").trim();
        const v = Number(pair?.[1] ?? 0);
        if (k) out[k] = Number.isFinite(v) ? v : 0;
      }
      return Object.keys(out).length ? out : null;
    }

    // [{candidateId/electId/optionId, votes/totalVotes/...}, ...]
    const out: Record<string, number> = {};
    for (const item of payload) {
      if (!item || typeof item !== "object") continue;

      const key =
        (item as any).candidateId ??
        (item as any).electId ??
        (item as any).optionId ??
        (item as any).id ??
        (item as any).key ??
        (item as any).candidate ??
        (item as any).label ??
        null;

      const val =
        (item as any).votes ??
        (item as any).totalVotes ??
        (item as any).voteTotal ??
        (item as any).count ??
        (item as any).value ??
        (item as any).total ??
        (item as any).vote_count ??
        null;

      const k = String(key ?? "").trim();
      const v = Number(val ?? 0);

      if (k) out[k] = Number.isFinite(v) ? v : 0;
    }

    return Object.keys(out).length ? out : null;
  }

  if (typeof payload === "object") {
    const out: Record<string, number> = {};
    for (const [k0, v0] of Object.entries(payload)) {
      const k = String(k0 ?? "").trim();
      if (!k) continue;

      if (typeof v0 === "number") out[k] = Number.isFinite(v0) ? v0 : 0;
      else if (typeof v0 === "string") {
        const n = Number(v0);
        out[k] = Number.isFinite(n) ? n : 0;
      } else if (v0 && typeof v0 === "object") {
        const inner =
          (v0 as any).votes ??
          (v0 as any).totalVotes ??
          (v0 as any).voteTotal ??
          (v0 as any).count ??
          (v0 as any).value ??
          (v0 as any).total ??
          0;
        const n = Number(inner ?? 0);
        out[k] = Number.isFinite(n) ? n : 0;
      } else out[k] = 0;
    }

    return Object.keys(out).length ? out : null;
  }

  return null;
}

/**
 * ✅ Try computing valid votes from the ADMIN row.
 * Returns null when votes aren’t present/parseable.
 */
function rowValidVotesFromAdminRow(r: any): number | null {
  const direct = r?.validVotes ?? r?.valid_votes;
  if (typeof direct === "number" && Number.isFinite(direct)) return direct;

  const raw =
    r?.candidateVotes ??
    r?.candidate_votes ??
    r?.necResult?.candidateVotes ??
    r?.necResult?.candidate_votes ??
    r?.result?.candidateVotes ??
    r?.result?.candidate_votes ??
    null;

  const m = normalizeCandidateVotes(raw);
  if (!m) return null;

  const total = Object.values(m)
    .map((x) => Number(x ?? 0) || 0)
    .reduce((acc, x) => acc + x, 0);

  return Number.isFinite(total) ? total : null;
}

/**
 * ✅ Compute valid votes from the DTO endpoint (single truth).
 */
function validVotesFromDto(dto: any): number | null {
  const m = normalizeCandidateVotes(dto?.candidateVotes ?? dto?.candidate_votes);
  if (!m) return null;

  const total = Object.values(m)
    .map((x) => Number(x ?? 0) || 0)
    .reduce((acc, x) => acc + x, 0);

  return Number.isFinite(total) ? total : null;
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

  // ✅ ACTOR resolution
  const currentOrgId = useAuthStore((s: any) => s.currentOrgId);
  const orgId = useMemo(
    () => String(currentOrgId ?? "").trim() || getOrgIdFromStorage(),
    [currentOrgId]
  );

  const authUserId = useAuthStore((s: any) => {
    return (
      s?.userId ??
      s?.currentUserId ??
      s?.me?.userId ??
      s?.user?.userId ??
      s?.authUser?.userId ??
      s?.profile?.userId ??
      ""
    );
  });

  const authUserName = useAuthStore((s: any) => {
    const u = s?.me ?? s?.user ?? s?.authUser ?? s?.profile ?? null;
    if (!u) return "";
    return (
      u.fullName ||
      u.name ||
      [u.firstName, u.lastName].filter(Boolean).join(" ") ||
      u.username ||
      u.email ||
      ""
    );
  });

  useEffect(() => {
    if (!actorUserId && authUserId) setActorUserId(String(authUserId));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authUserId]);

  const meQ = useQuery({
    queryKey: ["meForNecPublish", orgId],
    enabled: !!orgId && !authUserId,
    queryFn: () => fetchMe(orgId!),
    staleTime: 30_000,
    retry: 1,
  });

  useEffect(() => {
    if (actorUserId) return;
    const id =
      (meQ.data as any)?.userId ??
      (meQ.data as any)?.id ??
      (meQ.data as any)?.systemUserId ??
      "";
    if (id) setActorUserId(String(id));
  }, [meQ.data, actorUserId]);

  const actorDisplayName = useMemo(() => {
    if (authUserName) return authUserName;
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
  }, [authUserName, meQ.data]);

  const actorReady = !!actorUserId.trim();

  // election name
  const electionQ = useQuery({
    queryKey: ["electionById", electionId],
    enabled: !!electionId,
    queryFn: () => fetchElectionById(electionId!),
  });

  // contests
  const contestsQ = useQuery({
    queryKey: ["contestsByElection", electionId],
    enabled: !!electionId,
    queryFn: () => listContestsByElection(electionId!),
  });

  // geo
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

  // candidates
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

  // admin raw rows
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

  /**
   * ✅ FRONTEND FIX:
   * If admin rows don't include candidateVotes, fetch DTO per resultId
   * and compute valid votes from candidateVotes.
   */
  const rowsNeedingDto = useMemo(() => {
    return filteredRows
      .map((r) => String(r?.resultId ?? "").trim())
      .filter(Boolean)
      .filter((id) => {
        const r = filteredRows.find((x) => String(x?.resultId) === id);
        if (!r) return false;
        return rowValidVotesFromAdminRow(r) == null; // needs dto
      });
  }, [filteredRows]);

  const dtoQueries = useQueries({
    queries: rowsNeedingDto.map((id) => ({
      queryKey: ["necResultDtoForValidVotes", id],
      queryFn: () => necResultService.get(id),
      staleTime: 60_000,
      retry: 1,
    })),
  });

  const validVotesByResultId = useMemo(() => {
    const m = new Map<string, number>();
    for (let i = 0; i < rowsNeedingDto.length; i++) {
      const id = rowsNeedingDto[i];
      const q = dtoQueries[i];
      const vv = q?.data ? validVotesFromDto(q.data as any) : null;
      if (vv != null) m.set(id, vv);
    }
    return m;
  }, [rowsNeedingDto, dtoQueries]);

  function rowValidVotesFinal(r: any): number | null {
    const fromAdmin = rowValidVotesFromAdminRow(r);
    if (fromAdmin != null) return fromAdmin;

    const id = String(r?.resultId ?? "").trim();
    if (!id) return null;

    const vv = validVotesByResultId.get(id);
    return typeof vv === "number" ? vv : null;
  }

  // ✅ Election publish summary
  const publishSummary = useMemo(() => {
    const now = Date.now();
    const totalRows = filteredRows.length;
    let publishedCount = 0;

    const untilValues: string[] = [];
    const atValues: string[] = [];

    for (const r of filteredRows) {
      if (rowIsPublished(r)) {
        publishedCount++;
        const u = rowPublishedUntil(r);
        const a = rowPublishedAt(r);
        if (u) untilValues.push(u);
        if (a) atValues.push(a);
      }
    }

    const isPublished = totalRows > 0 ? publishedCount === totalRows : false;
    const isPartial =
      totalRows > 0 ? publishedCount > 0 && publishedCount < totalRows : false;

    const uniqUntil = Array.from(new Set(untilValues));
    const uniqAt = Array.from(new Set(atValues));

    const until =
      uniqUntil.length === 1 ? uniqUntil[0] : uniqUntil.length > 1 ? "MIXED" : null;
    const publishedAt =
      uniqAt.length === 1 ? uniqAt[0] : uniqAt.length > 1 ? "MIXED" : null;

    const untilMs = until && until !== "MIXED" ? new Date(until).getTime() : null;
    const expiresIn =
      untilMs && !Number.isNaN(untilMs) ? msToHuman(untilMs - now) : null;
    const expired = untilMs && !Number.isNaN(untilMs) ? untilMs <= now : false;

    return {
      totalRows,
      publishedCount,
      isPublished,
      isPartial,
      until,
      publishedAt,
      expiresIn,
      expired,
    };
  }, [filteredRows]);

  const statusPill = publishSummary.isPublished ? (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-extrabold text-emerald-800">
      <CheckCircle2 size={14} className="text-emerald-700" /> PUBLISHED
    </span>
  ) : publishSummary.isPartial ? (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-extrabold text-amber-900">
      <AlertTriangle size={14} className="text-amber-700" /> PARTIAL
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-[11px] font-extrabold text-rose-800">
      <XCircle size={14} className="text-rose-700" /> NOT PUBLISHED
    </span>
  );

  // ✅ Summary (Valid Votes computed from final row valid)
  const summary = useMemo(() => {
    let totalRegisteredVoters = 0;
    let ballotsCast = 0;
    let validVotes = 0;

    let invalidBallots = 0;
    let unmarkedBallots = 0;
    let rejectedBallots = 0;
    let spoiledBallots = 0;
    let unusedBallots = 0;

    for (const r of filteredRows) {
      totalRegisteredVoters += r.totalRegisteredVoters ?? 0;
      ballotsCast += r.ballotsInBox ?? 0;

      const vv = rowValidVotesFinal(r);
      validVotes += vv ?? 0;

      invalidBallots += r.invalidBallots ?? 0;
      unmarkedBallots += r.unmarkedBallots ?? 0;
      rejectedBallots += r.rejectedBallots ?? 0;
      spoiledBallots += r.spoiledBallots ?? 0;
      unusedBallots += r.unusedBallots ?? 0;
    }

    return {
      rows: filteredRows.length,
      totalRegisteredVoters,
      ballotsCast,
      validVotes,
      invalidBallots,
      unmarkedBallots,
      rejectedBallots,
      spoiledBallots,
      unusedBallots,
    };
  }, [filteredRows, validVotesByResultId]);

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

  // ✅ Publish election (UNCHANGED LOGIC)
  const publishElectionM = useMutation({
    mutationFn: async () => {
      if (!electionId) throw new Error("Missing electionId");
      if (!actorUserId.trim()) throw new Error("Actor not loaded.");
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

  // ✅ Unpublish election (UNCHANGED LOGIC)
  const unpublishElectionM = useMutation({
    mutationFn: async () => {
      if (!electionId) throw new Error("Missing electionId");
      if (!actorUserId.trim()) throw new Error("Actor not loaded.");

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

  const publishSelectedCenterM = useMutation({
    mutationFn: async () => {
      if (!electionId) throw new Error("Missing electionId");
      if (!actorUserId.trim()) throw new Error("Actor not loaded.");
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

  const unpublishSelectedCenterM = useMutation({
    mutationFn: async () => {
      if (!electionId) throw new Error("Missing electionId");
      if (!actorUserId.trim()) throw new Error("Actor not loaded.");
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

    // also refresh cached DTO valid-votes
    for (const id of rowsNeedingDto) {
      await qc.invalidateQueries({ queryKey: ["necResultDtoForValidVotes", id] });
    }
  };

  const contestOptions = contestsQ.data ?? [];
  const countyOptions = countiesQ.data?.items ?? [];
  const districtOptions = districtsQ.data?.items ?? [];
  const centerOptions = centersQ.data?.items ?? [];

  const electionName =
    electionQ.data?.electionName ||
    (electionQ.isLoading ? "Loading…" : electionId ?? "—");

  // Candidate votes modal uses DTO endpoint
  const candDtoQ = useQuery({
    queryKey: ["necResultDtoById", candModal.open ? candModal.resultId : "none"],
    enabled: candModal.open,
    queryFn: () => necResultService.get((candModal as any).resultId),
  });

  const candVotes = useMemo(() => {
    const votes = normalizeCandidateVotes((candDtoQ.data as any)?.candidateVotes);

    if (!votes) return { rows: [] as any[], totalValidVotes: 0 };

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
  const unpublishBusy =
    unpublishSelectedCenterM.isPending || unpublishElectionM.isPending;

  const navSelectClass =
    "shrink-0 w-[160px] sm:w-[176px] md:w-[186px] appearance-none rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 pr-8 text-base font-extrabold truncate leading-5 focus:outline-none focus:ring-2 focus:ring-slate-200";
  const iconRightClass =
    "pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500";
  const smallBtnBase =
    "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-base font-extrabold leading-5 disabled:opacity-60";

  // ✅ Your original label behavior is preserved
  const publishElectionLabel = publishSummary.isPublished
    ? "Extend Publish"
    : publishSummary.isPartial
    ? "Publish Remaining"
    : "Publish Election";

  return (
    <div className="flex flex-col gap-1.5">
      <Panel
        title="NEC Result (Official)"
        right={
          <div className="flex flex-wrap items-center gap-1.5">
            <div className="flex flex-wrap items-center gap-1.5">
              <div className="relative">
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
                <ChevronDown size={18} className={iconRightClass} />
              </div>

              <div className="relative">
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
                <ChevronDown size={18} className={iconRightClass} />
              </div>

              <div className="relative">
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
                <ChevronDown size={18} className={iconRightClass} />
              </div>

              <div className="relative">
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
                <ChevronDown size={18} className={iconRightClass} />
              </div>

              <button
                type="button"
                onClick={onClearFilters}
                className={`${smallBtnBase} border-slate-200 bg-white hover:bg-slate-50`}
                title="Clear contest/county/district/center filters"
              >
                <Trash2 size={18} className="text-slate-700" />
                <span className="hidden sm:inline">Clear</span>
              </button>

              <button
                type="button"
                onClick={() => setPublishModal({ open: true, mode: "publishElection" })}
                className={`${smallBtnBase} border-indigo-200 bg-indigo-600 text-white hover:bg-indigo-700`}
                disabled={publishBusy || !actorReady}
                title={!actorReady ? "Actor not loaded yet" : ""}
              >
                <Megaphone size={18} className="text-white" />
                {publishElectionLabel}
              </button>

              {statusPill}

              <button
                type="button"
                onClick={() => setUnpublishElectionModal({ open: true })}
                className={`${smallBtnBase} border-rose-200 bg-rose-700 text-white hover:bg-rose-800`}
                disabled={unpublishBusy || !actorReady || publishSummary.publishedCount === 0}
                title={
                  publishSummary.publishedCount === 0
                    ? "Election is not published yet"
                    : !actorReady
                    ? "Actor not loaded yet"
                    : ""
                }
              >
                <Ban size={18} className="text-white" />
                <span className="hidden sm:inline">Unpublish</span>
                <span className="sm:hidden">Unpub</span>
              </button>

              <button
                type="button"
                onClick={onRefresh}
                className={`${smallBtnBase} border-slate-200 bg-white hover:bg-slate-50`}
                disabled={rowsQ.isFetching}
              >
                <RefreshCw size={16} className="text-slate-700" />
                <span className="hidden sm:inline">Refresh</span>
              </button>
            </div>
          </div>
        }
      >
        <div className="mt-1.5 rounded-xl border border-slate-200 bg-gradient-to-b from-white to-slate-50 px-3 py-2">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-2">
              <div className="mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white">
                <ShieldCheck className="text-slate-700" size={16} />
              </div>

              <div className="min-w-0">
                <div className="text-xl font-extrabold text-slate-900 leading-4">
                  Election Publication
                </div>

                <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-base text-slate-700">
                  <span className="font-extrabold">
                    {publishSummary.isPublished
                      ? "Published"
                      : publishSummary.isPartial
                      ? "Partially Published"
                      : "Draft"}
                  </span>

                  <span className="text-slate-300">•</span>

                  <span>
                    Centers:{" "}
                    <b>
                      {publishSummary.publishedCount}/{publishSummary.totalRows}
                    </b>
                  </span>

                  {publishSummary.until ? (
                    <>
                      <span className="text-slate-300">•</span>
                      <span className="inline-flex items-center gap-1">
                        <Clock3 size={14} className="text-slate-600" />
                        <b>
                          {publishSummary.until === "MIXED"
                            ? "Mixed windows"
                            : fmtHumanDateTime(publishSummary.until)}
                        </b>
                        {publishSummary.until !== "MIXED" && publishSummary.expiresIn ? (
                          <span className="ml-1 rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[14px] font-extrabold text-slate-700">
                            {publishSummary.expired
                              ? "EXPIRED"
                              : `in ${publishSummary.expiresIn}`}
                          </span>
                        ) : null}
                      </span>
                    </>
                  ) : null}

                  {actorReady ? (
                    <>
                      <span className="text-slate-300">•</span>
                      <span className="min-w-0">
                        Actor:{" "}
                        <b className="truncate inline-block max-w-[220px] align-bottom">
                          {actorDisplayName || "Current user"}
                        </b>
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="text-slate-300">•</span>
                      <span className="text-rose-700 font-extrabold">
                        Actor not loaded
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="w-full lg:w-auto rounded-lg border border-slate-200 bg-white px-3 py-2 text-[12px] text-slate-700">
              <div className="font-extrabold text-slate-900 leading-4">Tip</div>
              <div className="mt-0.5 leading-4">
                Publish for official release. Unpublish for corrections/disputes.
              </div>
            </div>
          </div>
        </div>

        {/* KPI row */}
        <div className="mt-2 flex items-center gap-1.5 overflow-x-auto pb-0.5">
          <KpiCard label="Election" value={clipText(electionName, 28)} />
          <KpiCard label="Centers" value={summary.rows.toLocaleString()} />
          <KpiCard label="Registered" value={summary.totalRegisteredVoters.toLocaleString()} />
          <KpiCard label="Cast" value={summary.ballotsCast.toLocaleString()} />
          <KpiCard label="Valid Votes" value={summary.validVotes.toLocaleString()} />
          <KpiCard label="Invalid" value={summary.invalidBallots.toLocaleString()} />
          <KpiCard label="Unmarked" value={summary.unmarkedBallots.toLocaleString()} />
          <KpiCard label="Rejected" value={summary.rejectedBallots.toLocaleString()} />
          <KpiCard label="Spoiled" value={summary.spoiledBallots.toLocaleString()} />
          <KpiCard label="Unused" value={summary.unusedBallots.toLocaleString()} />
        </div>

        <div className="mt-2 rounded-2xl border border-slate-200 bg-white p-2">
          {rowsQ.isLoading ? (
            <div className="text-sm text-slate-600 px-1 py-2">Loading…</div>
          ) : rowsQ.isError ? (
            <div className="text-sm text-rose-700 px-1 py-2">Failed to load NEC results.</div>
          ) : filteredRows.length === 0 ? (
            <div className="text-base text-slate-600 px-1 py-2">
              No results match the selected filters.
            </div>
          ) : (
            <div className="overflow-auto">
              <table className="min-w-[1600px] w-full">
                <thead>
                  <tr className="text-left text-[16px] font-extrabold text-slate-700 border-b border-slate-200">
                    <th className="py-2 px-2">Center</th>
                    <th className="py-2 px-2">Contest</th>
                    <th className="py-2 px-2">Registered</th>
                    <th className="py-2 px-2">Ballots Cast</th>
                    <th className="py-2 px-2">Valid Votes</th>
                    <th className="py-2 px-2">Invalid</th>
                    <th className="py-2 px-2">Unmarked</th>
                    <th className="py-2 px-2">Rejected</th>
                    <th className="py-2 px-2">Spoiled</th>
                    <th className="py-2 px-2">Unused</th>
                    <th className="py-2 px-2">Upload</th>
                    <th className="py-2 px-2">Published Until</th>
                    <th className="py-2 px-2">Chain Hash</th>
                    <th className="py-2 px-2">Signature</th>
                    <th className="py-2 px-2">Publish</th>
                    <th className="py-2 px-2 text-right">Action</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredRows.map((r) => {
                    const isPub = rowIsPublished(r);
                    const until = rowPublishedUntil(r);
                    const untilMs = until ? new Date(until).getTime() : null;
                    const expired =
                      untilMs && !Number.isNaN(untilMs) ? untilMs <= Date.now() : false;
                    const expiresIn =
                      untilMs && !Number.isNaN(untilMs)
                        ? msToHuman(untilMs - Date.now())
                        : null;

                    const vv = rowValidVotesFinal(r);

                    return (
                      <tr key={r.resultId} className="border-b border-slate-100">
                        <td className="py-1.5 px-2 text-base font-bold text-slate-900">
                          {pickCenterName(r)}
                        </td>
                        <td className="py-1.5 px-2 text-base text-slate-700">
                          {pickContestName(r)}
                        </td>

                        <td className="py-1.5 px-2 text-base text-slate-700">
                          {num(r.totalRegisteredVoters)}
                        </td>

                        <td className="py-1.5 px-2 text-base text-slate-700">
                          {num(r.ballotsInBox)}
                        </td>

                        <td className="py-1.5 px-2 text-base text-slate-700">
                          {vv == null ? "Loading…" : num(vv)}
                        </td>

                        <td className="py-1.5 px-2 text-base text-slate-700">
                          {num(r.invalidBallots)}
                        </td>
                        <td className="py-1.5 px-2 text-base text-slate-700">
                          {num(r.unmarkedBallots)}
                        </td>
                        <td className="py-1.5 px-2 text-base text-slate-700">
                          {num(r.rejectedBallots)}
                        </td>
                        <td className="py-1.5 px-2 text-base text-slate-700">
                          {num(r.spoiledBallots)}
                        </td>
                        <td className="py-1.5 px-2 text-base text-slate-700">
                          {num(r.unusedBallots)}
                        </td>

                        <td className="py-1.5 px-2 text-base text-slate-600">
                          {fmtHumanDateTime(r.uploadTime)}
                        </td>

                        <td className="py-1.5 px-2 text-base text-slate-700">
                          {until ? (
                            <div className="flex flex-col">
                              <span className="font-bold">
                                {fmtHumanDateTime(until)}
                              </span>
                              {expiresIn ? (
                                <span
                                  className={`mt-0.5 inline-flex w-fit rounded-full border px-2 py-0.5 text-[12px] font-bold ${
                                    expired
                                      ? "border-rose-200 bg-rose-50 text-rose-800"
                                      : "border-slate-200 bg-white text-slate-700"
                                  }`}
                                >
                                  {expired ? "EXPIRED" : `expires in ${expiresIn}`}
                                </span>
                              ) : null}
                            </div>
                          ) : (
                            "—"
                          )}
                        </td>

                        <td className="py-1.5 px-2 text-sm font-mono text-slate-700">
                          {clipText(String(r.chainHash ?? "—"), 16)}
                        </td>
                        <td className="py-1.5 px-2 text-sm font-mono text-slate-700">
                          {clipText(String(r.resultSignature ?? "—"), 16)}
                        </td>

                        {/* ✅ UPDATED: show ONLY YES or ONLY NO */}
                        <td className="py-1.5 px-2">
                          <StatusRadio published={isPub} expired={expired} />
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
                                isPublished: isPub,
                              })
                            }
                            className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-600 px-3 py-1.5 text-xs font-extrabold text-white hover:bg-blue-700"
                          >
                            <Eye size={18} className="text-white" />
                            View Cand
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              <div className="mt-2 text-base text-slate-500 px-1 pb-1">
                Candidate names come from Election Candidates (mapped by candidateId and electId).
              </div>
            </div>
          )}
        </div>
      </Panel>

      {/* Publish modal */}
      {publishModal.open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-3">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-4 shadow-xl">
            <div className="flex items-center justify-between">
              <div className="text-lg font-extrabold text-slate-800">
                {publishModal.mode === "publishElection"
                  ? "Publish Election Results"
                  : "Publish Selected Center + Contest"}
              </div>

              <button
                type="button"
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-extrabold hover:bg-slate-50"
                onClick={() => setPublishModal({ open: false, mode: publishModal.mode })}
                disabled={publishBusy}
              >
                Close
              </button>
            </div>

            <div className="mt-3 grid gap-3">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="text-sm font-extrabold text-slate-700">
                  Actor (current user)
                </div>
                <div className="mt-1 text-base font-extrabold text-slate-900">
                  {actorDisplayName || "—"}
                </div>
                {/* <div className="mt-0.5 text-[11px] font-mono text-slate-700 break-all">
                  {actorUserId ? actorUserId : "—"}
                </div> */}
              </div>

              <div>
                <div className="mb-1 text-sm font-extrabold text-slate-700">
                  Published Until (Local DateTime)
                </div>
                <input
                  type="datetime-local"
                  value={publishedUntil}
                  onChange={(e) => setPublishedUntil(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-base"
                />
                <div className="mt-1 text-base text-slate-500">
                  When the time expires, backend auto-unpublishes.
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
                  className="rounded-lg border border-slate-200 bg-slate-900 px-4 py-2 text-base font-extrabold text-white hover:bg-slate-800 disabled:opacity-60"
                >
                  {publishBusy ? "Publishing…" : "Publish"}
                </button>
              </div>

              {publishModal.mode === "publishCenter" &&
              (contestId === "all" || centerId === "all") ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-base font-extrabold text-amber-900">
                  Select a <b>contest</b> and a <b>center</b> first before publishing.
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {/* Unpublish Election modal */}
      {unpublishElectionModal.open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-3">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-4 shadow-xl">
            <div className="flex items-center justify-between">
              <div className="text-lg font-extrabold text-slate-800">
                Unpublish Election Results
              </div>

              <button
                type="button"
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-extrabold hover:bg-slate-50"
                onClick={() => setUnpublishElectionModal({ open: false })}
                disabled={unpublishBusy}
              >
                Close
              </button>
            </div>

            <div className="mt-3 grid gap-3">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="text-sm font-extrabold text-slate-700">
                  Actor (current user)
                </div>
                <div className="mt-1 text-base font-extrabold text-slate-900">
                  {actorDisplayName || "—"}
                </div>
                {/* <div className="mt-0.5 text-[11px] font-mono text-slate-700 break-all">
                  {actorUserId ? actorUserId : "—"}
                </div> */}
              </div>

              <div>
                <div className="mb-1 text-base font-extrabold text-slate-700">
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
                  className="rounded-lg border border-rose-200 bg-rose-700 px-4 py-2 text-sm font-extrabold text-white hover:bg-rose-800 disabled:opacity-60"
                >
                  {unpublishBusy ? "Unpublishing…" : "Unpublish"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* Candidate Votes Modal */}
      {candModal.open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-3">
          <div className="w-full max-w-3xl rounded-2xl border border-slate-200 bg-white shadow-xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <div className="text-xl font-extrabold text-slate-800 bg-slate-200">
                Candidate Votes —{" "}
                <span className="text-slate-600">{candModal.centerName}</span>
              </div>
              <button
                type="button"
                onClick={() => setCandModal({ open: false })}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-extrabold hover:bg-slate-50"
              >
                <X size={16} />
                Close
              </button>
            </div>

            <div className="p-4 max-h-[75vh] overflow-y-auto overflow-x-hidden">
              <div className="text-base text-slate-600">
                Contest: <b>{candModal.contestName}</b> • Upload:{" "}
                <b>{fmtHumanDateTime(candModal.uploadTime)}</b> • Status:{" "}
                <b>{candModal.isPublished ? "PUBLISHED" : "DRAFT"}</b>
              </div>

              <div className="mt-2 flex items-center gap-1.5 overflow-x-auto pb-0.5">
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
                <div className="mb-2 text-xl font-extrabold text-slate-700">
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
                        <tr className="text-left text-base font-extrabold text-slate-700">
                          <th className="py-2 pr-3 w-[65%]">Candidate</th>
                          <th className="py-2 pr-3 w-[15%]">Votes</th>
                          <th className="py-2 pr-3 w-[20%]">% of Center</th>
                        </tr>
                      </thead>
                      <tbody>
                        {candVotes.rows.map((c) => (
                          <tr key={c.key} className="border-t border-slate-100">
                            <td className="py-2 pr-3 text-base font-bold text-slate-900 break-words">
                              {c.displayName}
                            </td>
                            <td className="py-2 pr-3 text-base text-slate-800">
                              {num(c.votes)}
                            </td>
                            <td className="py-2 pr-3 text-base text-slate-600">
                              {c.pct}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <div className="mt-2 text-[14px] text-slate-500">
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


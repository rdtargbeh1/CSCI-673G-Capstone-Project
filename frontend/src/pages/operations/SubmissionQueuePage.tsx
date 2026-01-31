

// ✅ FILE: src/pages/operations/SubmissionQueuePage.tsx
//
// ✅ UPDATE (REQUESTED):
// 1) Add "Spoiled" column on the table.
// 2) Fix Invalid Total: spoiled MUST NOT be included in Invalid total (same as SubmissionTab).
//    - Invalid = invalidBallots + rejectedBallots + unmarkedBallots
//    - Spoiled shown separately
//    - Cast = valid + invalid + spoiled
// 3) Evidence column now comes from TallySheet uploads (backend /api/tally-sheets/submission/{submissionId})
//    - If no tally sheet uploads → show "Missing evidence"
//    - Missing Evidence tab uses tally-sheet evidence too.

import React, { useEffect, useMemo, useState } from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
  useQueries,
} from "@tanstack/react-query";
import {
  Plus,
  RefreshCw,
  Pencil,
  Eye,
  Flag,
  X,
  FileText,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";

import { useAuthStore } from "../../shared/store/authStore";
import { apiClient } from "../../shared/lib/apiClient";
import { Panel, Badge } from "../elections/shared/elections-ui";

import {
  listActiveElections,
  type ElectionDto,
} from "../../shared/services/electionService";

import { listContestsByElection } from "../../shared/services/contestService";
import type { ContestDto } from "../../auth/contestTypes";

import {
  fetchCounties,
  type CountyDto,
} from "../../shared/services/countyService";

import {
  fetchDistrictsByCounty,
  type DistrictDto,
} from "../../shared/services/districtService";

import {
  fetchPollingCenters,
  type PollingCenterDto,
} from "../../shared/services/pollingCenterService";

import {
  searchSubmissions,
  verifySubmission,
  flagSubmission,
  type VoteSubmissionDto,
  type VoteStatus,
} from "../../shared/services/voteSubmissionService";

import { fetchMe } from "../../shared/services/userService";
import type { UserDto } from "../../auth/userTypes";

import {
  fetchOrganizations,
  type Organization,
} from "../../shared/services/organizationService";

import { listOptionsByContest } from "../../shared/services/contestOptionService";

import SubmissionFormModal from "../elections/workspace/tabs/submissions/SubmissionFormModal";

/** ---------------- helpers ---------------- */
function safeStr(v: any) {
  return typeof v === "string" ? v : v == null ? "" : String(v);
}
function friendlyError(err: any): string {
  return (
    safeStr(err?.response?.data?.message) ||
    safeStr(err?.response?.data?.error) ||
    safeStr(err?.message) ||
    "Request failed."
  );
}
function fullName(u: any) {
  const fn = String(u?.firstName ?? "").trim();
  const ln = String(u?.lastName ?? "").trim();
  const nm = `${fn} ${ln}`.trim();
  return nm || String(u?.userName ?? "—");
}
function fmtNum(v: any) {
  const n = Number(v);
  if (!isFinite(n)) return "—";
  return String(n);
}
function computeValidVotes(s: any) {
  const vv = s?.validVotes;
  if (typeof vv === "number" && isFinite(vv)) return vv;
  const map = s?.candidateVotes ?? {};
  return Object.values(map).reduce(
    (a: number, b: any) => a + (Number(b) || 0),
    0
  );
}
function computeSpoiled(s: any) {
  return Number(s?.spoiledBallots) || 0;
}

/**
 * ✅ FIX: Invalid Total (match SubmissionTab)
 * - DO NOT include spoiled ballots in invalid total
 */
function computeInvalidTotal(s: any) {
  return (
    (Number(s?.invalidBallots) || 0) +
    (Number(s?.rejectedBallots) || 0) +
    (Number(s?.unmarkedBallots) || 0)
  );
}

/**
 * ✅ Cast should include spoiled (since spoiled is no longer inside invalid)
 */
function computeBallotsCast(s: any) {
  const bc = s?.ballotsCast;
  if (typeof bc === "number" && isFinite(bc)) return bc;
  return computeValidVotes(s) + computeInvalidTotal(s) + computeSpoiled(s);
}

/** Tally sheet DTO (minimal; adjust if you want more fields) */
type TallySheetDto = {
  uploadId?: string;
  submissionId?: string;
  url?: string;
  fileUrl?: string;
  originalFileName?: string;
  createdAt?: string;
};

/** Fetch tally sheets for a submission */
async function fetchTallySheetsBySubmission(submissionId: string) {
  const { data } = await apiClient.get(`/tally-sheets/submission/${submissionId}`);
  return (data ?? []) as TallySheetDto[];
}

type QueueTab = "ALL" | VoteStatus | "MISSING_EVIDENCE";
type OrgDto = { orgId: string; orgName: string };

export default function SubmissionQueuePage() {
  const qc = useQueryClient();

  const user = useAuthStore((s) => s.user);
  const dashboardMode = useAuthStore((s) => s.dashboardMode);
  const currentOrgId = useAuthStore((s) => s.currentOrgId);
  const role = useAuthStore((s) => s.getRoleLabel());

  const agentId = user?.userId ?? "";

  const canCreate = [
    "DATA_ENTRY",
    "SUPERVISOR",
    "COORDINATOR",
    "ADMIN",
    "PARTY_ADMIN",
    "AGENT",
  ].includes((role || "DATA_ENTRY").toUpperCase());

  const canVerify =
    Boolean(currentOrgId) || dashboardMode === "SYSTEM" || dashboardMode === "NEC";

  const canFlag = canVerify;

  const [queue, setQueue] = useState<QueueTab>("ALL");

  /** ---------------- Elections ---------------- */
  const electionsQ = useQuery<ElectionDto[]>({
    queryKey: ["elections", "active"],
    queryFn: () => listActiveElections(),
    staleTime: 60_000,
    retry: 1,
  });

  const elections = electionsQ.data ?? [];
  const [electionId, setElectionId] = useState<string>("");

  useEffect(() => {
    if (!electionId && elections.length) {
      const sorted = [...elections].sort((a, b) => (b.year ?? 0) - (a.year ?? 0));
      setElectionId(sorted[0].electionId);
    }
  }, [elections, electionId]);

  /** ---------------- Contests ---------------- */
  const contestsQ = useQuery<ContestDto[]>({
    enabled: Boolean(electionId),
    queryKey: ["election-contests", electionId],
    queryFn: () => listContestsByElection(electionId),
    staleTime: 60_000,
    retry: 1,
  });
  const contests = contestsQ.data ?? [];
  const [filterContest, setFilterContest] = useState<string>("");

  /** ---------------- SYSTEM tenant selection ---------------- */
  const [systemSelectedOrgId, setSystemSelectedOrgId] = useState<string>("");

  const orgsQ = useQuery<OrgDto[]>({
    enabled: dashboardMode === "SYSTEM",
    queryKey: ["orgs", "tenant-list"],
    queryFn: async () => {
      const res = await fetchOrganizations({
        page: 0,
        size: 500,
        active: true,
        orgType: undefined,
        orgId: undefined,
        search: undefined,
      });
      return (res.items ?? []).map((o: Organization) => ({
        orgId: o.orgId,
        orgName: o.orgName,
      }));
    },
    staleTime: 60_000,
    retry: 1,
  });

  const orgs = orgsQ.data ?? [];

  const effectiveOrgId =
    dashboardMode === "SYSTEM"
      ? systemSelectedOrgId || undefined
      : currentOrgId || undefined;

  /** ---------------- Actor / Verifier ---------------- */
  const meQ = useQuery<UserDto>({
    enabled: Boolean(effectiveOrgId),
    queryKey: ["users", "me", "ops", effectiveOrgId],
    queryFn: () => fetchMe(effectiveOrgId as string),
    staleTime: 60_000,
    retry: 1,
  });

  const actorUser = meQ.data ?? user;
  const actorName = fullName(actorUser);
  const actorUserId = (actorUser as any)?.userId ?? (user as any)?.userId ?? "";

  /** ---------------- Geo Filters ---------------- */
  const countiesQ = useQuery<CountyDto[]>({
    queryKey: ["counties", "all"],
    queryFn: async () =>
      (await fetchCounties({ page: 0, size: 500 })).items as CountyDto[],
    staleTime: 60_000,
    retry: 1,
  });
  const counties = countiesQ.data ?? [];
  const [filterCounty, setFilterCounty] = useState<string>("");

  const districtsQ = useQuery<DistrictDto[]>({
    enabled: Boolean(filterCounty),
    queryKey: ["districts", "by-county", filterCounty],
    queryFn: async () => (await fetchDistrictsByCounty(filterCounty)) as any,
    staleTime: 60_000,
    retry: 1,
  });
  const districts = districtsQ.data ?? [];
  const [filterDistrict, setFilterDistrict] = useState<string>("");

  const centersQ = useQuery<PollingCenterDto[]>({
    enabled: Boolean(filterCounty) || Boolean(filterDistrict),
    queryKey: ["polling-centers", "filtered", filterCounty, filterDistrict],
    queryFn: async () => {
      const p = await fetchPollingCenters({
        page: 0,
        size: 500,
        countyId: filterCounty || undefined,
        districtId: filterDistrict || undefined,
      });
      return p.items as PollingCenterDto[];
    },
    staleTime: 60_000,
    retry: 1,
  });
  const centers = centersQ.data ?? [];
  const [filterCenter, setFilterCenter] = useState<string>("");

  useEffect(() => {
    setFilterDistrict("");
    setFilterCenter("");
  }, [filterCounty]);

  useEffect(() => {
    setFilterCenter("");
  }, [filterDistrict]);

  /** ---------------- List + Pagination ---------------- */
  const [page, setPage] = useState(0);
  const size = 20;

  useEffect(() => {
    setPage(0);
  }, [
    queue,
    electionId,
    filterContest,
    filterCounty,
    filterDistrict,
    filterCenter,
    effectiveOrgId,
  ]);

  const enabled = Boolean(electionId) && Boolean(effectiveOrgId);

  const submissionsQ = useQuery({
    enabled,
    queryKey: [
      "ops-submission-queue",
      electionId,
      page,
      size,
      queue,
      effectiveOrgId,
      filterContest,
      filterCounty,
      filterDistrict,
      filterCenter,
    ],
    queryFn: () =>
      searchSubmissions({
        orgId: effectiveOrgId,
        electionId,
        page,
        size,
        status: queue === "ALL" || queue === "MISSING_EVIDENCE" ? undefined : (queue as any),
        contestId: filterContest || undefined,
        countyId: filterCounty || undefined,
        districtId: filterDistrict || undefined,
        centerId: filterCenter || undefined,
        placeId: undefined,
      }),
    staleTime: 10_000,
    retry: 1,
  });

  const rawItems: VoteSubmissionDto[] = (submissionsQ.data?.items ?? []) as any;

  /**
   * ✅ Evidence comes from tally sheet uploads.
   * We fetch tally-sheets per submission on the current page (size=20).
   * This avoids depending on stale submission fields like tallySheetCount/tallySheetUrl.
   */
  const submissionIds = useMemo(
    () =>
      (rawItems as any[])
        .map((s) => String(s?.submissionId ?? ""))
        .filter(Boolean),
    [rawItems]
  );

  const tallySheetQueries = useQueries({
    queries: submissionIds.map((id) => ({
      queryKey: ["tally-sheets", "by-submission", id],
      queryFn: () => fetchTallySheetsBySubmission(id),
      enabled: enabled && Boolean(id),
      staleTime: 30_000,
      retry: 1,
    })),
  });

  const evidenceMap = useMemo(() => {
    const map = new Map<string, { count: number; firstUrl?: string }>();
    submissionIds.forEach((id, idx) => {
      const q = tallySheetQueries[idx];
      if (!q || q.isLoading || q.isError) return;
      const arr = (q.data ?? []) as TallySheetDto[];
      const first = arr[0];
      const url = String(first?.url ?? first?.fileUrl ?? "").trim() || undefined;
      map.set(id, { count: arr.length, firstUrl: url });
    });
    return map;
  }, [submissionIds, tallySheetQueries]);

  const evidenceLoading = useMemo(() => {
    // if any query is still loading, treat as loading for the page
    return tallySheetQueries.some((q) => q.isLoading);
  }, [tallySheetQueries]);

  const hasEvidence = (submissionId: string) => {
    if (!submissionId) return false;
    const v = evidenceMap.get(submissionId);
    return (v?.count ?? 0) > 0;
  };

  const items: VoteSubmissionDto[] = useMemo(() => {
    if (queue !== "MISSING_EVIDENCE") return rawItems as any;
    return (rawItems as any[]).filter((s) => {
      const id = String(s?.submissionId ?? "");
      // While evidence is loading, don't hide rows unexpectedly:
      if (evidenceLoading) return true;
      return !hasEvidence(id);
    }) as any;
  }, [rawItems, queue, evidenceLoading, evidenceMap]);

  const clearFilters = () => {
    setFilterContest("");
    setFilterCounty("");
    setFilterDistrict("");
    setFilterCenter("");
    setPage(0);
  };

  const refetchList = async () => {
    await qc.invalidateQueries({ queryKey: ["ops-submission-queue", electionId] });
    // Also refresh tally sheet evidence for current page
    await qc.invalidateQueries({ queryKey: ["tally-sheets"] });
  };

  /** ---------------- Status Cards (reduced) ---------------- */
  const statusCounts = useMemo(() => {
    const base = {
      ALL: 0,
      PENDING: 0,
      VERIFIED: 0,
      REJECTED: 0,
      FLAGGED: 0,
      DRAFT: 0,
      MISSING_EVIDENCE: 0,
    };

    for (const s of rawItems as any[]) {
      base.ALL++;
      const st = String(s?.status ?? "").toUpperCase();
      if ((base as any)[st] != null) (base as any)[st] += 1;

      const id = String(s?.submissionId ?? "");
      if (!id) continue;

      // While loading, don't inflate missing evidence
      if (!evidenceLoading && !hasEvidence(id)) base.MISSING_EVIDENCE += 1;
    }
    return base;
  }, [rawItems, evidenceLoading, evidenceMap]);

  /** ---------------- Create/Edit ---------------- */
  const [openNew, setOpenNew] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [editId, setEditId] = useState<string>("");

  const canEditRow = (s: VoteSubmissionDto) => {
    const st = String((s as any).status ?? "").toUpperCase();
    return canCreate && (st === "PENDING" || st === "REJECTED" || st === "DRAFT");
  };

  const isFlaggedRow = (s: VoteSubmissionDto) =>
    String((s as any).status ?? "").toUpperCase() === "FLAGGED";

  /** ---------------- Flag/Unflag ---------------- */
  const flagM = useMutation({
    mutationFn: async (p: { id: string; flagged: boolean }) => {
      return flagSubmission(p.id, {
        actorUserId,
        flagged: p.flagged,
        comments: p.flagged ? "Flagged in Operations queue" : undefined,
      } as any);
    },
    onSuccess: async () => {
      await refetchList();
    },
  });

  /** ---------------- VERIFY ---------------- */
  const [openVerify, setOpenVerify] = useState(false);
  const [verifyId, setVerifyId] = useState<string>("");
  const [verifyDecision, setVerifyDecision] = useState<"ACCEPT" | "REJECT">("ACCEPT");
  const [verifyComment, setVerifyComment] = useState<string>("");

  const verifierMeQ = useQuery<UserDto>({
    enabled: openVerify && Boolean(effectiveOrgId),
    queryKey: ["users", "me", "verify", effectiveOrgId],
    queryFn: () => fetchMe(effectiveOrgId as string),
    staleTime: 60_000,
    retry: 1,
  });

  const verifierUser = verifierMeQ.data ?? user;
  const verifierName = fullName(verifierUser) || "—";

  const verifyM = useMutation({
    mutationFn: async (p: { id: string; accept: boolean; comment?: string }) => {
      return verifySubmission(p.id, {
        verifierUserId: (verifierUser as any)?.userId ?? (user as any)?.userId,
        accept: p.accept,
        comment: p.comment,
      } as any);
    },
    onSuccess: async () => {
      await refetchList();
    },
  });

  /** ---------------- Drawer (View) ---------------- */
  const [openDrawer, setOpenDrawer] = useState(false);
  const [drawerRow, setDrawerRow] = useState<VoteSubmissionDto | null>(null);

  const drawerContestId = String((drawerRow as any)?.contestId ?? "");

  const contestOptionsQ = useQuery<any[]>({
    enabled: openDrawer && Boolean(drawerContestId),
    queryKey: ["contest-options", "drawer", drawerContestId],
    queryFn: async () =>
      (await listOptionsByContest({ contestId: drawerContestId, onlyActive: true })) as any,
    staleTime: 60_000,
    retry: 1,
  });

  const candidateNameByKey = useMemo(() => {
    const map = new Map<string, string>();
    const opts = (contestOptionsQ.data ?? []) as any[];
    for (const o of opts) {
      const voteKey = String(o?.electId ?? o?.optionId ?? o?.id ?? "");
      if (!voteKey) continue;
      const name =
        o?.electionCandidate ??
        o?.candidateName ??
        o?.optionLabel ??
        o?.label ??
        o?.name ??
        voteKey;
      map.set(voteKey, String(name));
    }
    return map;
  }, [contestOptionsQ.data]);

  const drawerVotes = useMemo(() => {
    const cv = ((drawerRow as any)?.candidateVotes ?? {}) as Record<string, number>;
    const entries = Object.entries(cv).map(([k, v]) => ({
      key: k,
      name: candidateNameByKey.get(k) ?? k,
      votes: Number(v) || 0,
    }));
    entries.sort((a, b) => b.votes - a.votes);
    return entries;
  }, [drawerRow, candidateNameByKey]);

  const electionName =
    elections.find((e) => e.electionId === electionId)?.electionName ?? "—";

  return (
    <div className="flex flex-col gap-3">
      <Panel
        title="Operations • Submission Queue"
        right={
          <div className="flex flex-col gap-3 w-full">
            {/* ✅ UPDATED: cards smaller + RIGHT-ALIGNED */}
            <div className="w-full flex justify-end">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-1.5 w-auto">
                <StatCard label="All" value={statusCounts.ALL} tone="gray" icon={<FileText className="h-3.5 w-3.5" />} />
                <StatCard label="Pending" value={statusCounts.PENDING} tone="blue" icon={<AlertTriangle className="h-3.5 w-3.5" />} />
                <StatCard label="Flagged" value={statusCounts.FLAGGED} tone="orange" icon={<Flag className="h-3.5 w-3.5" />} />
                <StatCard label="Draft" value={statusCounts.DRAFT} tone="purple" icon={<FileText className="h-3.5 w-3.5" />} />
                <StatCard label="Verified" value={statusCounts.VERIFIED} tone="green" icon={<CheckCircle2 className="h-3.5 w-3.5" />} />
                <StatCard label="Rejected" value={statusCounts.REJECTED} tone="red" icon={<X className="h-3.5 w-3.5" />} />
                <StatCard label="Missing Evidence" value={statusCounts.MISSING_EVIDENCE} tone="amber" icon={<FileText className="h-3.5 w-3.5" />} />
              </div>
            </div>

            <div className="w-full flex flex-col gap-2">
              <div className="w-full flex justify-end">
                <div className="flex flex-wrap gap-2 items-center justify-end">
                  <StatusPill active={queue === "ALL"} label="All" tone="gray" onClick={() => setQueue("ALL")} />
                  <StatusPill active={queue === "PENDING"} label="Pending" tone="blue" onClick={() => setQueue("PENDING")} />
                  <StatusPill active={queue === "FLAGGED"} label="Flagged" tone="orange" onClick={() => setQueue("FLAGGED")} />
                  <StatusPill active={queue === "DRAFT"} label="Draft" tone="purple" onClick={() => setQueue("DRAFT")} />
                  <StatusPill active={queue === "VERIFIED"} label="Verified" tone="green" onClick={() => setQueue("VERIFIED")} />
                  <StatusPill active={queue === "REJECTED"} label="Rejected" tone="red" onClick={() => setQueue("REJECTED")} />
                  <StatusPill active={queue === "MISSING_EVIDENCE"} label="Missing Evidence" tone="amber" onClick={() => setQueue("MISSING_EVIDENCE")} />
                  <Badge text={`Actor: ${actorName}`} />
                </div>
              </div>

              <div className="w-full flex justify-end">
                <div className="flex flex-wrap gap-2 items-center justify-end">
                  {dashboardMode === "SYSTEM" ? (
                    <select
                      value={systemSelectedOrgId}
                      onChange={(e) => {
                        setSystemSelectedOrgId(e.target.value);
                        setPage(0);
                      }}
                      className="h-9 rounded-lg border bg-white px-3 text-sm font-semibold max-w-[220px]"
                      title="Select tenant (organization)"
                    >
                      <option value="">-- Select tenant --</option>
                      {orgs.map((o) => (
                        <option key={o.orgId} value={o.orgId}>
                          {o.orgName}
                        </option>
                      ))}
                    </select>
                  ) : null}

                  <select
                    value={electionId}
                    onChange={(e) => {
                      setElectionId(e.target.value);
                      setPage(0);
                    }}
                    className="h-9 rounded-lg border bg-white px-3 text-sm font-semibold max-w-[240px]"
                  >
                    {elections.map((el) => (
                      <option key={el.electionId} value={el.electionId}>
                        {el.electionName} ({el.year})
                      </option>
                    ))}
                  </select>

                  <select
                    value={filterContest}
                    onChange={(e) => {
                      setFilterContest(e.target.value);
                      setPage(0);
                    }}
                    className="h-9 rounded-lg border bg-white px-3 text-sm font-semibold max-w-[240px]"
                    disabled={!electionId}
                    title="Filter by contest"
                  >
                    <option value="">All contests</option>
                    {contests.map((ct: ContestDto) => (
                      <option key={ct.contestId} value={ct.contestId}>
                        {ct.contestName}
                      </option>
                    ))}
                  </select>

                  <select
                    value={filterCounty}
                    onChange={(e) => {
                      setFilterCounty(e.target.value);
                      setPage(0);
                    }}
                    className="h-9 rounded-lg border bg-white px-3 text-sm font-semibold max-w-200px"
                  >
                    <option value="">All counties</option>
                    {counties.map((c) => (
                      <option key={c.countyId} value={c.countyId}>
                        {c.countyName}
                      </option>
                    ))}
                  </select>

                  <select
                    value={filterDistrict}
                    onChange={(e) => {
                      setFilterDistrict(e.target.value);
                      setPage(0);
                    }}
                    disabled={!filterCounty}
                    className="h-9 rounded-lg border bg-white px-3 text-sm font-semibold disabled:bg-slate-50 max-w-[220px]"
                  >
                    <option value="">All districts</option>
                    {districts.map((d) => (
                      <option key={d.districtId} value={d.districtId}>
                        {d.districtName}
                      </option>
                    ))}
                  </select>

                  <select
                    value={filterCenter}
                    onChange={(e) => {
                      setFilterCenter(e.target.value);
                      setPage(0);
                    }}
                    disabled={!filterCounty && !filterDistrict}
                    className="h-9 rounded-lg border bg-white px-3 text-sm font-semibold disabled:bg-slate-50 max-w-[240px]"
                  >
                    <option value="">All centers</option>
                    {centers.map((c) => (
                      <option key={c.centerId} value={c.centerId}>
                        {c.centerName}
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    onClick={clearFilters}
                    className="h-9 rounded-lg border bg-white px-3 text-sm font-bold inline-flex items-center gap-2"
                  >
                    <X size={14} />
                    Clear
                  </button>

                  <button
                    type="button"
                    onClick={() => submissionsQ.refetch()}
                    disabled={submissionsQ.isFetching || !enabled}
                    className={`h-9 rounded-lg border bg-white px-3 text-sm font-bold inline-flex items-center gap-2 ${
                      submissionsQ.isFetching || !enabled ? "opacity-60" : ""
                    }`}
                  >
                    <RefreshCw size={14} />
                    Refresh
                  </button>

                  {canCreate ? (
                    <button
                      type="button"
                      onClick={() => setOpenNew(true)}
                      className="h-9 rounded-lg px-4 text-sm font-extrabold inline-flex items-center gap-2
                                 bg-blue-600 text-white border border-blue-700 shadow-sm
                                 hover:bg-blue-700 active:bg-blue-800"
                    >
                      <Plus size={14} />
                      New Submission
                    </button>
                  ) : null}
                </div>
              </div>

              {dashboardMode === "SYSTEM" && !effectiveOrgId ? (
                <div className="text-xs font-bold text-red-700 text-right">
                  Select a tenant (organization) to view submissions in Operations.
                </div>
              ) : null}
            </div>
          </div>
        }
      >
        {submissionsQ.isError ? (
          <div className="p-3 rounded-xl border border-red-200 bg-red-50 text-red-700 text-sm font-bold">
            {friendlyError(submissionsQ.error)}
          </div>
        ) : null}

        {/* ✅ TABLE (kept) */}
        <div className="w-full overflow-x-auto border rounded-2xl">
          <table className="min-w-1280px w-full text-[12px] sm:text-[13px]">
            <thead className="bg-slate-50 text-slate-600">
              <tr className="text-left">
                <Th>Center</Th>
                <Th>Place</Th>
                <Th>Evidence</Th>
                <Th className="text-right">Registered</Th>
                <Th className="text-right">Ballots Issued</Th>
                <Th className="text-right">Valid</Th>
                <Th className="text-right">Invalid</Th>
                <Th className="text-right">Spoiled</Th>
                <Th className="text-right">Cast (In Box)</Th>
                <Th className="text-right">Unused</Th>
                <Th>Agent</Th>
                <Th>Contest</Th>
                <Th>Status</Th>
                <Th>Time</Th>
                <Th>Actions</Th>
              </tr>
            </thead>

            <tbody>
              {submissionsQ.isLoading ? (
                <tr>
                  <td className="p-3 text-slate-500" colSpan={15}>
                    Loading submissions…
                  </td>
                </tr>
              ) : !items.length ? (
                <tr>
                  <td className="p-3 text-slate-500" colSpan={15}>
                    No submissions found.
                  </td>
                </tr>
              ) : (
                items.map((s: any) => {
                  const valid = computeValidVotes(s);
                  const invalid = computeInvalidTotal(s);
                  const spoiled = computeSpoiled(s);
                  const cast = computeBallotsCast(s);
                  const unused = s?.unusedBallots ?? s?.blankBallots ?? 0;

                  const place =
                    s?.placeLabel ??
                    (s?.placeNumber != null
                      ? `Place ${s.placeNumber}`
                      : s?.placeCode ?? "—");

                  const flagged = isFlaggedRow(s);

                  const sid = String(s?.submissionId ?? "");
                  const evidenceOk = evidenceLoading ? false : hasEvidence(sid);
                  const evidenceCount = evidenceMap.get(sid)?.count ?? 0;
                  const evidenceUrl = evidenceMap.get(sid)?.firstUrl;

                  return (
                    <tr key={s.submissionId} className="border-t">
                      <Td title={s.centerName ?? ""} className="truncate max-w-220px">
                        {s.centerName ?? "—"}
                      </Td>
                      <Td title={place} className="truncate max-w-160px">
                        {place}
                      </Td>

                      <Td>
                        {evidenceLoading ? (
                          <span className="inline-flex rounded-full px-2 py-0.5 text-[11px] font-extrabold bg-slate-50 text-slate-700 border border-slate-200">
                            Checking…
                          </span>
                        ) : (
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-extrabold ${
                              evidenceOk
                                ? "bg-green-50 text-green-700 border border-green-200"
                                : "bg-red-50 text-red-700 border border-red-200"
                            }`}
                            title={
                              evidenceOk
                                ? `Tally sheet attached (${evidenceCount})`
                                : "No tally sheet uploaded during submission"
                            }
                          >
                            {evidenceOk ? (
                              evidenceUrl ? (
                                <a
                                  className="underline underline-offset-2"
                                  href={evidenceUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  Attached ({evidenceCount})
                                </a>
                              ) : (
                                `Attached (${evidenceCount})`
                              )
                            ) : (
                              "Missing evidence"
                            )}
                          </span>
                        )}
                      </Td>

                      <Td className="text-right font-semibold">{fmtNum(s.registeredVoters)}</Td>
                      <Td className="text-right font-semibold">{fmtNum(s.ballotsIssued)}</Td>

                      <Td className="text-right font-semibold">{valid}</Td>
                      <Td className="text-right font-semibold">{invalid}</Td>
                      <Td className="text-right font-semibold">{spoiled}</Td>
                      <Td className="text-right font-semibold">{cast}</Td>

                      <Td className="text-right font-semibold">{fmtNum(unused)}</Td>

                      <Td className="truncate max-w-170px">{s.agentName ?? "—"}</Td>
                      <Td className="truncate max-w-220px">{s.contestName ?? "—"}</Td>
                      <Td>{s.status ?? "—"}</Td>
                      <Td className="whitespace-nowrap">
                        {s.submissionTime ? new Date(s.submissionTime).toLocaleString() : "—"}
                      </Td>

                      <Td>
                        <div className="flex gap-2 items-center">
                          <button
                            type="button"
                            className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md border bg-white"
                            onClick={() => {
                              setDrawerRow(s);
                              setOpenDrawer(true);
                            }}
                            title="View details"
                          >
                            <Eye size={14} className="text-red-600" />
                          </button>

                          <button
                            type="button"
                            className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md border bg-white ${
                              !canEditRow(s) ? "opacity-50" : ""
                            }`}
                            disabled={!canEditRow(s)}
                            onClick={() => {
                              setEditId(s.submissionId);
                              setOpenEdit(true);
                            }}
                            title={
                              flagged
                                ? "Flagged submissions are not editable. Unflag in Edit modal."
                                : "Edit"
                            }
                          >
                            <Pencil size={14} className="text-green-600" />
                          </button>

                          <button
                            type="button"
                            className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md border bg-white ${
                              !canVerify || verifyM.isPending ? "opacity-50" : ""
                            }`}
                            disabled={!canVerify || verifyM.isPending}
                            onClick={() => {
                              setVerifyId(String(s.submissionId ?? ""));
                              setVerifyDecision("ACCEPT");
                              setVerifyComment("");
                              setOpenVerify(true);
                            }}
                            title="Verify"
                          >
                            <CheckCircle2 size={14} className="text-blue-600" />
                          </button>

                          <button
                            type="button"
                            className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md border bg-white ${
                              !canFlag || flagM.isPending ? "opacity-50" : ""
                            }`}
                            disabled={!canFlag || flagM.isPending}
                            onClick={() => {
                              const id = String(s.submissionId ?? "");
                              if (!id) return;

                              if (!actorUserId) {
                                alert("actorUserId missing. Ensure /users/me loads.");
                                return;
                              }

                              if (flagged) {
                                if (!confirm("Unflag this submission?")) return;
                                flagM.mutate({ id, flagged: false });
                              } else {
                                if (!confirm("Flag this submission?")) return;
                                flagM.mutate({ id, flagged: true });
                              }
                            }}
                            title={flagged ? "Unflag" : "Flag"}
                          >
                            <Flag size={14} className="text-orange-600" />
                          </button>
                        </div>

                        {flagM.isError ? (
                          <div className="mt-1 text-[11px] font-bold text-red-700">
                            {friendlyError(flagM.error)}
                          </div>
                        ) : null}
                      </Td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="mt-3 flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
          <div className="flex gap-2 items-center">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={!submissionsQ.data || page <= 0 || submissionsQ.isFetching}
              className="h-9 rounded-lg border bg-white px-3 text-sm font-bold"
            >
              Prev
            </button>

            <button
              type="button"
              onClick={() =>
                setPage((p) =>
                  submissionsQ.data && p + 1 < (submissionsQ.data as any).totalPages ? p + 1 : p
                )
              }
              disabled={
                !submissionsQ.data ||
                submissionsQ.isFetching ||
                (submissionsQ.data as any).page + 1 >= ((submissionsQ.data as any).totalPages ?? 0)
              }
              className="h-9 rounded-lg border bg-white px-3 text-sm font-bold"
            >
              Next
            </button>
          </div>

          <div className="text-xs text-slate-600 sm:text-right">
            Page {submissionsQ.data ? (submissionsQ.data as any).page + 1 : page + 1} /{" "}
            {submissionsQ.data ? (submissionsQ.data as any).totalPages : "?"}
          </div>
        </div>

        {/* Bottom placeholders */}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-2">
          <NoteCard
            title="Alerts & Exceptions (placeholder)"
            lines={[
              "• Ballots Cast > Ballots Issued",
              "• High invalid % over threshold",
              "• Repeat flagged centers/places",
            ]}
          />
          <NoteCard
            title="Agent Activity (placeholder)"
            lines={[
              "• Top agents by submissions",
              "• Last 1 hour activity",
              "• Latest submissions by agent",
            ]}
          />
          <NoteCard
            title="Quick Queries (placeholder)"
            lines={[
              "• Submissions by contest category",
              "• Submissions by center",
              "• Latest verified submissions",
            ]}
          />
        </div>
      </Panel>

      {/* VERIFY Modal */}
      {openVerify ? (
        <ModalShell
          title="Verify Submission"
          subtitle={`Reviewer: ${verifierName}`}
          onClose={() => {
            if (verifyM.isPending) return;
            setOpenVerify(false);
          }}
          busy={verifyM.isPending}
          maxWidth="max-w-xl"
        >
          <div className="grid grid-cols-1 gap-2">
            <Field label="Verifier (current user)">
              <input
                type="text"
                value={verifierName}
                readOnly
                className="px-2.5 py-1.5 rounded-md border w-full bg-slate-50 text-sm"
              />
            </Field>

            <Field label="Decision">
              <div className="flex gap-3 items-center">
                <label className="inline-flex items-center gap-2 text-sm font-bold">
                  <input
                    type="radio"
                    name="verifyDecision"
                    checked={verifyDecision === "ACCEPT"}
                    onChange={() => setVerifyDecision("ACCEPT")}
                  />
                  Accept
                </label>
                <label className="inline-flex items-center gap-2 text-sm font-bold text-red-700">
                  <input
                    type="radio"
                    name="verifyDecision"
                    checked={verifyDecision === "REJECT"}
                    onChange={() => setVerifyDecision("REJECT")}
                  />
                  Reject
                </label>
              </div>
            </Field>

            <Field label="Comment (optional)">
              <textarea
                value={verifyComment}
                onChange={(e) => setVerifyComment(e.target.value)}
                className="px-2.5 py-1.5 rounded-md border w-full text-sm"
                rows={3}
                placeholder="Add a review note (optional)…"
              />
            </Field>

            {verifyM.isError ? (
              <div className="mt-1 p-2 rounded-md border border-red-200 bg-red-50 text-red-700 text-sm font-bold">
                {friendlyError(verifyM.error)}
              </div>
            ) : null}

            <div className="mt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpenVerify(false)}
                disabled={verifyM.isPending}
                className={`px-3 py-1.5 rounded-md border bg-white text-sm ${
                  verifyM.isPending ? "opacity-60" : ""
                }`}
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={verifyM.isPending}
                onClick={() => {
                  if (!verifyId) return;
                  verifyM.mutate(
                    {
                      id: verifyId,
                      accept: verifyDecision === "ACCEPT",
                      comment: verifyComment?.trim() ? verifyComment.trim() : undefined,
                    },
                    { onSuccess: () => setOpenVerify(false) }
                  );
                }}
                className={`px-3 py-1.5 rounded-md border bg-white text-sm font-extrabold ${
                  verifyM.isPending ? "opacity-60" : ""
                }`}
              >
                Submit Review
              </button>
            </div>
          </div>
        </ModalShell>
      ) : null}

      {/* ✅ Drawer (VIEW) — NOT full-height */}
      {openDrawer ? (
        <Drawer
          title="Submission Details"
          subtitle={`${electionName} • ${(drawerRow as any)?.contestName ?? "—"}`}
          onClose={() => setOpenDrawer(false)}
        >
          {!drawerRow ? (
            <div className="text-sm text-slate-600">No row selected.</div>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <Info label="Status" value={String((drawerRow as any).status ?? "—")} />
                <Info label="Agent" value={String((drawerRow as any).agentName ?? "—")} />
                <Info label="Center" value={String((drawerRow as any).centerName ?? "—")} />
                <Info
                  label="Place"
                  value={String(
                    (drawerRow as any).placeLabel ??
                      ((drawerRow as any).placeNumber != null
                        ? `Place ${(drawerRow as any).placeNumber}`
                        : (drawerRow as any).placeCode ?? "—")
                  )}
                />
                <Info label="Registered Voters" value={fmtNum((drawerRow as any).registeredVoters)} />
                <Info label="Ballots Issued" value={fmtNum((drawerRow as any).ballotsIssued)} />

                {/* Evidence from tally sheets */}
                <Info
                  label="Evidence"
                  value={
                    evidenceLoading
                      ? "Checking…"
                      : hasEvidence(String((drawerRow as any)?.submissionId ?? ""))
                      ? `Attached (${evidenceMap.get(String((drawerRow as any)?.submissionId ?? ""))?.count ?? 0})`
                      : "Missing evidence"
                  }
                />

                <Info
                  label="Submitted At"
                  value={
                    (drawerRow as any).submissionTime
                      ? new Date((drawerRow as any).submissionTime).toLocaleString()
                      : "—"
                  }
                />
              </div>

              <div className="rounded-xl border p-3">
                <div className="text-sm font-extrabold mb-2">Candidate Votes</div>

                {contestOptionsQ.isLoading ? (
                  <div className="text-sm text-slate-600">Loading candidate names…</div>
                ) : contestOptionsQ.isError ? (
                  <div className="text-sm font-bold text-red-700">
                    {friendlyError(contestOptionsQ.error)}
                  </div>
                ) : !drawerVotes.length ? (
                  <div className="text-sm text-slate-600">No candidate votes.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <div className="rounded-lg border max-h-[520px] sm:max-h-[560px] overflow-y-auto">
                      <table className="w-full min-w-[420px]">
                        <thead className="bg-slate-50 sticky top-0 z-10">
                          <tr className="text-left">
                            <th className="p-2 text-[11px] font-extrabold text-slate-600">
                              Candidate
                            </th>
                            <th className="p-2 text-[11px] font-extrabold text-slate-600 text-right">
                              Votes
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {drawerVotes.map((r) => (
                            <tr key={r.key} className="border-t">
                              <td className="p-2 text-sm font-bold">{r.name}</td>
                              <td className="p-2 text-sm font-extrabold text-right">
                                {fmtNum(r.votes)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {drawerVotes.length > 15 ? (
                      <div className="mt-2 text-[11px] font-bold text-slate-600">
                        This contest has {drawerVotes.length} candidates. Scroll to view all.
                      </div>
                    ) : null}
                  </div>
                )}
              </div>

              {(drawerRow as any)?.comments ? (
                <div className="rounded-xl border p-3">
                  <div className="text-sm font-extrabold mb-1">Notes</div>
                  <div className="text-sm text-slate-700 whitespace-pre-wrap">
                    {(drawerRow as any).comments}
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </Drawer>
      ) : null}

      {/* New Submission */}
      <SubmissionFormModal
        mode="create"
        open={openNew}
        onClose={() => setOpenNew(false)}
        effectiveOrgId={effectiveOrgId}
        dashboardMode={dashboardMode}
        user={user}
        agentId={agentId}
        canCreate={canCreate}
        electionId={electionId}
        elections={elections}
        contests={contests}
        onSaved={async () => {
          await refetchList();
          setPage(0);
        }}
      />

      {/* Edit Submission */}
      <SubmissionFormModal
        mode="edit"
        open={openEdit}
        onClose={() => setOpenEdit(false)}
        effectiveOrgId={effectiveOrgId}
        dashboardMode={dashboardMode}
        user={user}
        agentId={agentId}
        canCreate={canCreate}
        electionId={electionId}
        elections={elections}
        contests={contests}
        submissionId={editId}
        onSaved={async () => {
          await refetchList();
        }}
      />
    </div>
  );
}

/** ---------------- UI components ---------------- */

type Tone = "gray" | "blue" | "orange" | "purple" | "green" | "red" | "amber";

function toneStyles(t: Tone) {
  switch (t) {
    case "blue":
      return { icon: "text-blue-600", bg: "bg-blue-50", border: "border-blue-200" };
    case "orange":
      return { icon: "text-orange-600", bg: "bg-orange-50", border: "border-orange-200" };
    case "purple":
      return { icon: "text-purple-600", bg: "bg-purple-50", border: "border-purple-200" };
    case "green":
      return { icon: "text-green-600", bg: "bg-green-50", border: "border-green-200" };
    case "red":
      return { icon: "text-red-600", bg: "bg-red-50", border: "border-red-200" };
    case "amber":
      return { icon: "text-amber-700", bg: "bg-amber-50", border: "border-amber-200" };
    default:
      return { icon: "text-slate-600", bg: "bg-slate-50", border: "border-slate-200" };
  }
}

function StatCard(props: { label: string; value: number; icon?: React.ReactNode; tone: Tone }) {
  const ts = toneStyles(props.tone);
  return (
    <div className="rounded-xl border bg-white px-2 py-1.5 flex items-center gap-1.5">
      <div className={`h-8 w-8 rounded-lg border ${ts.border} ${ts.bg} grid place-items-center`}>
        <span className={ts.icon}>{props.icon}</span>
      </div>

      <div className="min-w-0 leading-tight">
        <div className="text-[10px] font-extrabold text-slate-600 truncate">{props.label}</div>
        <div className="text-base font-extrabold leading-4">{props.value}</div>
      </div>
    </div>
  );
}

function StatusPill(props: { active: boolean; label: string; tone: Tone; onClick: () => void }) {
  const ts = toneStyles(props.tone);
  return (
    <button
      type="button"
      onClick={props.onClick}
      className={`relative h-9 px-3 rounded-xl border text-sm font-extrabold transition ${
        props.active ? `bg-white border-slate-300 shadow-sm` : `bg-white border-slate-200 hover:bg-slate-50`
      }`}
      title={props.label}
    >
      <span className="inline-flex items-center gap-2">
        <span className={`h-2.5 w-2.5 rounded-full ${ts.icon}`} />
        <span className="text-slate-800">{props.label}</span>
      </span>
      {props.active ? <span className="absolute left-3 right-3 -bottom-1 h-1 rounded-full bg-blue-600" /> : null}
    </button>
  );
}

function Th(props: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      {...props}
      className={`p-2 text-[10px] sm:text-[11px] font-extrabold ${props.className ?? ""}`}
    />
  );
}

function Td(props: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return <td {...props} className={`p-2 align-top text-slate-800 ${props.className ?? ""}`} />;
}

function NoteCard(props: { title: string; lines: string[] }) {
  return (
    <div className="rounded-2xl border bg-white p-3">
      <div className="text-sm font-extrabold">{props.title}</div>
      <div className="mt-2 text-[12px] text-slate-700 space-y-1">
        {props.lines.map((l, i) => (
          <div key={i}>{l}</div>
        ))}
      </div>
    </div>
  );
}

function Info(props: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-slate-50 px-3 py-2">
      <div className="text-[11px] font-extrabold text-slate-600">{props.label}</div>
      <div className="text-sm font-extrabold text-slate-900">{props.value}</div>
    </div>
  );
}

function Drawer(props: { title: string; subtitle?: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-slate-900/40" onClick={props.onClose} />

      <div className="absolute inset-y-0 right-0 p-3 sm:p-4 flex items-start justify-end">
        <div
          className="
            w-full
            max-w-[560px]
            bg-white
            shadow-2xl
            border
            rounded-2xl
            overflow-hidden
            mt-6
            mb-6
            max-h-[calc(100vh-3rem)]
            flex flex-col
          "
        >
          <div className="p-3 border-b flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-base font-extrabold">{props.title}</div>
              {props.subtitle ? (
                <div className="text-xs text-slate-500 mt-0.5 truncate">{props.subtitle}</div>
              ) : null}
            </div>
            <button type="button" onClick={props.onClose} className="px-3 py-1.5 rounded-md border bg-white text-sm">
              Close
            </button>
          </div>

          <div className="p-3 overflow-y-auto">{props.children}</div>
        </div>
      </div>
    </div>
  );
}

function Field(props: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[11px] font-extrabold text-slate-600 mb-1">{props.label}</div>
      {props.children}
    </div>
  );
}

function ModalShell(props: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  busy?: boolean;
  children: React.ReactNode;
  maxWidth?: string;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/40"
      onClick={() => props.onClose()}
    >
      <div
        className={`w-full ${props.maxWidth ?? "max-w-4xl"} bg-white rounded-xl border border-slate-200 p-3 mx-auto shadow-xl`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-start gap-3">
          <div className="min-w-0">
            <div className="font-extrabold text-base">{props.title}</div>
            {props.subtitle ? <div className="text-xs text-slate-500 mt-0.5">{props.subtitle}</div> : null}
          </div>
          <button
            type="button"
            onClick={props.onClose}
            disabled={Boolean(props.busy)}
            className={`px-3 py-1.5 rounded-md border border-slate-200 bg-white text-sm ${props.busy ? "opacity-60" : ""}`}
          >
            Close
          </button>
        </div>

        <div className="mt-2">{props.children}</div>
      </div>
    </div>
  );
}


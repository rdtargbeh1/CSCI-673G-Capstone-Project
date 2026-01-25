

// ✅ FILE: src/pages/elections/workspace/tabs/submissions/SubmissionsTab.tsx
//
// ✅ FIXES
// 1) Adds "ALL" queue so users can see all submissions before filtering.
// 2) Fixes frontend tally math to match backend:
//
//    ballotsInBox = validVotes + invalidBallots + unmarkedBallots + rejectedBallots
//    invalid(In Box) = invalidBallots + unmarkedBallots + rejectedBallots
//    spoiledBallots is OUTSIDE the box (do NOT add to invalid)
//    ballotsIssued = ballotsInBox + unusedBallots + spoiledBallots (when ballotsIssued provided)
//
// ✅ UI
// - Adds Spoiled column
// - Cast column uses ballotsInBox
// - Missing Evidence remains a UI-only filter
//
// NOTE: No other business logic changed.

import React, { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  RefreshCw,
  CheckCircle2,
  Trash2,
  Pencil,
  X,
  FlagOff,
} from "lucide-react";

import { useAuthStore } from "../../../../../shared/store/authStore";
import { Panel, Badge } from "../../../shared/elections-ui";

import {
  listActiveElections,
  type ElectionDto,
} from "../../../../../shared/services/electionService";

import { listContestsByElection } from "../../../../../shared/services/contestService";
import type { ContestDto } from "../../../../../auth/contestTypes";

import {
  fetchCounties,
  type CountyDto,
} from "../../../../../shared/services/countyService";

import {
  fetchDistrictsByCounty,
  type DistrictDto,
} from "../../../../../shared/services/districtService";

import {
  fetchPollingCenters,
  type PollingCenterDto,
} from "../../../../../shared/services/pollingCenterService";

import {
  searchSubmissions,
  deleteSubmission,
  verifySubmission,
  flagSubmission,
  type VoteSubmissionDto,
  type VoteStatus,
} from "../../../../../shared/services/voteSubmissionService";

import { fetchMe } from "../../../../../shared/services/userService";
import type { UserDto } from "../../../../../auth/userTypes";

import SubmissionFormModal from "./SubmissionFormModal";

import {
  fetchOrganizations,
  type Organization,
} from "../../../../../shared/services/organizationService";

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
function avgPct(values: Array<number | null | undefined>) {
  const nums = values.filter(
    (x) => typeof x === "number" && isFinite(x as any)
  ) as number[];
  if (!nums.length) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}
function fmtPct(v?: number | null) {
  if (v == null || !isFinite(v)) return "—";
  return `${v.toFixed(2)}%`;
}
function fmtNum(v: any) {
  const n = Number(v);
  if (!isFinite(n)) return "—";
  return String(n);
}
function fmtAllocSource(v: any) {
  const s = String(v ?? "").toUpperCase();
  if (!s) return "—";
  if (s === "PLACE") return "Place";
  if (s === "CENTER") return "Center";
  if (s === "NONE") return "None";
  return s;
}

function sumCandidateVotes(v?: Record<string, number>) {
  if (!v) return 0;
  return Object.values(v).reduce((a, b) => a + (Number(b) || 0), 0);
}

/** ✅ STRICT: invalid IN BOX (backend rule) */
function computeInvalidInBox(s: any) {
  return (
    (Number(s?.invalidBallots) || 0) +
    (Number(s?.unmarkedBallots) || 0) +
    (Number(s?.rejectedBallots) || 0)
  );
}

/** ✅ valid votes = backend validVotes OR sum(candidateVotes) */
function computeValidVotes(s: any) {
  const vv = Number(s?.validVotes);
  if (isFinite(vv)) return vv;
  return sumCandidateVotes(s?.candidateVotes ?? {});
}

/** ✅ ballots cast IN BOX = ballotsInBox (never add spoiled here) */
function computeBallotsInBox(s: any) {
  const bib = Number(s?.ballotsInBox);
  if (isFinite(bib)) return bib;
  return computeValidVotes(s) + computeInvalidInBox(s);
}

/** evidence check for MISSING_EVIDENCE tab */
function hasEvidence(s: any) {
  const cnt = Number(s?.tallySheetCount ?? 0);
  const url = String(s?.tallySheetUrl ?? "").trim();
  return cnt > 0 || Boolean(url);
}

// ✅ queues: add ALL
type Queue = "ALL" | VoteStatus | "MISSING_EVIDENCE";

/** SYSTEM tenant dropdown type */
type OrgDto = { orgId: string; orgName: string };

export default function SubmissionsTab() {
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

  // ✅ Verify must be active for all tenant dashboards (tenant-level entity)
  const canVerify =
    Boolean(currentOrgId) || dashboardMode === "SYSTEM" || dashboardMode === "NEC";

  const canUnflag = canVerify;

  // ✅ Default to ALL so tenant sees everything first
  const [queue, setQueue] = useState<Queue>("ALL");

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

  /** ---------------- Actor (for unflag) ---------------- */
  const actorMeQ = useQuery<UserDto>({
    enabled: Boolean(effectiveOrgId),
    queryKey: ["users", "me", "actor", effectiveOrgId],
    queryFn: () => fetchMe(effectiveOrgId as string),
    staleTime: 60_000,
    retry: 1,
  });
  const actorUser = actorMeQ.data ?? user;
  const actorUserId = (actorUser as any)?.userId ?? (user as any)?.userId ?? "";

  /** ---------------- Filters ---------------- */
  const [filterContest, setFilterContest] = useState<string>("");

  const countiesQ = useQuery<CountyDto[]>({
    queryKey: ["counties", "all"],
    queryFn: async () => (await fetchCounties({ page: 0, size: 500 })).items as CountyDto[],
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
  }, [queue, electionId, filterContest, filterCounty, filterDistrict, filterCenter, effectiveOrgId]);

  // SYSTEM must pick tenant
  const submissionsEnabled = Boolean(electionId) && Boolean(effectiveOrgId);

  const submissionsQ = useQuery({
    enabled: submissionsEnabled,
    queryKey: [
      "vote-submissions",
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
        // ✅ ALL = no status filter
        // ✅ MISSING_EVIDENCE = no status filter (UI-only)
        status:
          queue === "ALL" || queue === "MISSING_EVIDENCE"
            ? undefined
            : (queue as any),

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

  // ✅ UI-only filter for Missing Evidence
  const items: VoteSubmissionDto[] = useMemo(() => {
    if (queue !== "MISSING_EVIDENCE") return rawItems as any;
    return (rawItems as any[]).filter((s) => !hasEvidence(s)) as any;
  }, [rawItems, queue]);

  const turnoutAvg = useMemo(
    () => avgPct(items.map((x) => Number((x as any).turnoutPct))),
    [items]
  );
  const invalidAvg = useMemo(
    () => avgPct(items.map((x) => Number((x as any).invalidPct))),
    [items]
  );

  const clearFilters = () => {
    setFilterContest("");
    setFilterCounty("");
    setFilterDistrict("");
    setFilterCenter("");
    setPage(0);
  };

  const refetchList = async () => {
    await qc.invalidateQueries({ queryKey: ["vote-submissions", electionId] });
  };

  /** ---------------- Create/Edit modals ---------------- */
  const [openNew, setOpenNew] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [editId, setEditId] = useState<string>("");

  /** ---------------- Verify modal ---------------- */
  const [openVerify, setOpenVerify] = useState(false);
  const [verifyId, setVerifyId] = useState<string>("");
  const [verifyDecision, setVerifyDecision] = useState<"ACCEPT" | "REJECT">("ACCEPT");
  const [verifyComment, setVerifyComment] = useState<string>("");

  const verifierMeQ = useQuery<UserDto>({
    enabled: openVerify && Boolean(effectiveOrgId),
    queryKey: ["users", "me", effectiveOrgId],
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

  /** ---------------- Delete ---------------- */
  const deleteM = useMutation({
    mutationFn: async (id: string) => deleteSubmission(id),
    onSuccess: async () => {
      await refetchList();
    },
  });

  /** ---------------- Unflag ---------------- */
  const unflagM = useMutation({
    mutationFn: async (p: { id: string }) => {
      return flagSubmission(p.id, {
        actorUserId,
        flagged: false,
        comments: undefined,
      } as any);
    },
    onSuccess: async () => {
      await refetchList();
    },
  });

  const canEditRow = (s: VoteSubmissionDto) => {
    const st = String((s as any).status ?? "").toUpperCase();
    return canCreate && (st === "PENDING" || st === "REJECTED" || st === "DRAFT");
  };

  const isFlaggedRow = (s: VoteSubmissionDto) =>
    String((s as any).status ?? "").toUpperCase() === "FLAGGED";

  const ActiveMark = ({ on }: { on: boolean }) =>
    on ? (
      <span
        style={{
          position: "absolute",
          left: 10,
          right: 10,
          bottom: -6,
          height: 3,
          borderRadius: 999,
          background: "#2563eb",
        }}
      />
    ) : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <Panel
        title="Vote Submissions"
        right={
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {/* Queue */}
            <div className="flex gap-2 items-center flex-wrap">
              {/* ✅ NEW: All */}
              <button type="button" onClick={() => setQueue("ALL")} style={btn(queue === "ALL")}>
                All
                <ActiveMark on={queue === "ALL"} />
              </button>

              <button type="button" onClick={() => setQueue("PENDING")} style={btn(queue === "PENDING")}>
                Pending
                <ActiveMark on={queue === "PENDING"} />
              </button>

              <button type="button" onClick={() => setQueue("FLAGGED")} style={btn(queue === "FLAGGED")}>
                Flagged
                <ActiveMark on={queue === "FLAGGED"} />
              </button>

              <button type="button" onClick={() => setQueue("DRAFT")} style={btn(queue === "DRAFT")}>
                Draft
                <ActiveMark on={queue === "DRAFT"} />
              </button>

              <button type="button" onClick={() => setQueue("VERIFIED")} style={btn(queue === "VERIFIED")}>
                Verified
                <ActiveMark on={queue === "VERIFIED"} />
              </button>

              <button type="button" onClick={() => setQueue("REJECTED")} style={btn(queue === "REJECTED")}>
                Rejected
                <ActiveMark on={queue === "REJECTED"} />
              </button>

              <button
                type="button"
                onClick={() => setQueue("MISSING_EVIDENCE")}
                style={btn(queue === "MISSING_EVIDENCE")}
              >
                Missing Evidence
                <ActiveMark on={queue === "MISSING_EVIDENCE"} />
              </button>

              <Badge text={canVerify ? "Verifier Role" : "Submitter Role"} />

              {canCreate && (
                <button
                  type="button"
                  onClick={() => setOpenNew(true)}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md border bg-white font-extrabold text-sm"
                >
                  <Plus size={14} />
                  New Submission
                </button>
              )}
            </div>

            {/* Filters */}
            <div className="flex gap-2 items-center flex-wrap">
              {dashboardMode === "SYSTEM" ? (
                <select
                  value={systemSelectedOrgId}
                  onChange={(e) => {
                    setSystemSelectedOrgId(e.target.value);
                    setPage(0);
                  }}
                  className="px-2.5 py-1.5 rounded-md border bg-white text-sm"
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
                className="px-2.5 py-1.5 rounded-md border bg-white text-sm"
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
                className="px-2.5 py-1.5 rounded-md border bg-white text-sm"
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
                className="px-2.5 py-1.5 rounded-md border bg-white text-sm"
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
                className="px-2.5 py-1.5 rounded-md border bg-white text-sm disabled:bg-slate-50"
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
                className="px-2.5 py-1.5 rounded-md border bg-white text-sm disabled:bg-slate-50"
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
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md border bg-white text-sm"
              >
                <X size={14} />
                Clear
              </button>

              <button
                type="button"
                onClick={() => submissionsQ.refetch()}
                disabled={submissionsQ.isFetching || !submissionsEnabled}
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md border bg-white text-sm ${
                  submissionsQ.isFetching || !submissionsEnabled ? "opacity-60" : ""
                }`}
              >
                <RefreshCw size={14} />
                Refresh
              </button>
            </div>

            {dashboardMode === "SYSTEM" && !effectiveOrgId ? (
              <div className="text-xs font-bold text-red-700">
                Select a tenant (organization) to view or submit vote submissions.
              </div>
            ) : null}
          </div>
        }
      >
        <div className="flex flex-wrap gap-2 mb-2">
          <Badge text={`Turnout (avg): ${fmtPct(turnoutAvg)}`} />
          <Badge text={`Invalid % (avg): ${fmtPct(invalidAvg)}`} />
          <Badge text={`Rows: ${items.length}`} />
        </div>

        {submissionsQ.isError ? (
          <div className="p-2 rounded-md border border-red-200 bg-red-50 text-red-700 text-sm font-bold">
            {friendlyError(submissionsQ.error)}
          </div>
        ) : null}

        <div className="w-full overflow-x-auto border rounded-xl">
          <table className="min-w-1550px w-full text-[13px]">
            <thead className="bg-slate-50 text-slate-600">
              <tr className="text-left">
                <Th>Center</Th>
                <Th>Place</Th>

                <Th className="text-right">Registered</Th>
                <Th className="text-right">Ballots Issued</Th>
                <Th>Alloc Src</Th>

                <Th className="text-right">Valid</Th>
                <Th className="text-right">Invalid (In Box)</Th>
                <Th className="text-right">Cast (In Box)</Th>
                <Th className="text-right">Spoiled</Th>
                <Th className="text-right">Unused</Th>

                <Th>Agent</Th>
                <Th>Verified By</Th>
                <Th>Contest</Th>
                <Th>Status</Th>
                <Th>Time</Th>
                <Th>Actions</Th>
              </tr>
            </thead>

            <tbody>
              {submissionsQ.isLoading ? (
                <tr>
                  <td className="p-2 text-slate-500" colSpan={16}>
                    Loading submissions…
                  </td>
                </tr>
              ) : !items.length ? (
                <tr>
                  <td className="p-2 text-slate-500" colSpan={16}>
                    No submissions found.
                  </td>
                </tr>
              ) : (
                items.map((s) => {
                  const valid = computeValidVotes(s as any);
                  const invalidInBox = computeInvalidInBox(s as any);
                  const castInBox = computeBallotsInBox(s as any); // ✅ ballotsInBox
                  const spoiled = Number((s as any).spoiledBallots) || 0; // ✅ separate
                  const unused = Number((s as any).unusedBallots) || 0;

                  const place =
                    (s as any).placeLabel ??
                    ((s as any).placeNumber != null
                      ? `Place ${(s as any).placeNumber}`
                      : (s as any).placeCode ?? "—");

                  const flagged = isFlaggedRow(s as any);

                  return (
                    <tr key={(s as any).submissionId} className="border-t">
                      <Td title={(s as any).centerName ?? ""} className="truncate">
                        {(s as any).centerName ?? "—"}
                      </Td>
                      <Td title={place} className="truncate">
                        {place}
                      </Td>

                      <Td className="text-right font-semibold">
                        {fmtNum((s as any).registeredVoters)}
                      </Td>
                      <Td className="text-right font-semibold">
                        {fmtNum((s as any).ballotsIssued)}
                      </Td>
                      <Td className="truncate">{fmtAllocSource((s as any).allocationSource)}</Td>

                      <Td className="text-right font-semibold">{valid}</Td>
                      <Td className="text-right font-semibold">{invalidInBox}</Td>
                      <Td className="text-right font-semibold">{castInBox}</Td>
                      <Td className="text-right font-semibold">{fmtNum(spoiled)}</Td>
                      <Td className="text-right font-semibold">{fmtNum(unused)}</Td>

                      <Td className="truncate">{(s as any).agentName ?? "—"}</Td>
                      <Td className="truncate">{(s as any).verifiedByName ?? "—"}</Td>
                      <Td className="truncate">{(s as any).contestName ?? "—"}</Td>
                      <Td>{(s as any).status ?? "—"}</Td>
                      <Td>
                        {(s as any).submissionTime
                          ? new Date((s as any).submissionTime).toLocaleString()
                          : "—"}
                      </Td>

                      <Td>
                        <div className="flex gap-1.5 items-center">
                          <button
                            type="button"
                            className={`inline-flex items-center gap-1 px-2 py-1 rounded-md border bg-white ${
                              !canEditRow(s as any) ? "opacity-50" : ""
                            }`}
                            disabled={!canEditRow(s as any)}
                            onClick={() => {
                              setEditId((s as any).submissionId);
                              setOpenEdit(true);
                            }}
                            title={
                              flagged
                                ? "Flagged submissions are not editable. Unflag first."
                                : "Edit"
                            }
                          >
                            <Pencil size={13} />
                          </button>

                          {flagged ? (
                            <button
                              type="button"
                              className={`inline-flex items-center gap-1 px-2 py-1 rounded-md border bg-white text-slate-800 ${
                                !canUnflag || unflagM.isPending ? "opacity-50" : ""
                              }`}
                              disabled={!canUnflag || unflagM.isPending}
                              onClick={() => {
                                if (!canUnflag) return;
                                const id = (s as any).submissionId;
                                if (!id) return;
                                if (
                                  !confirm(
                                    "Unflag this submission? It will return to normal workflow."
                                  )
                                )
                                  return;
                                unflagM.mutate({ id });
                              }}
                              title="Unflag"
                            >
                              <FlagOff size={13} />
                              Unflag
                            </button>
                          ) : null}

                          <button
                            type="button"
                            className={`inline-flex items-center gap-1 px-2 py-1 rounded-md border bg-white ${
                              !canVerify || verifyM.isPending ? "opacity-50" : ""
                            }`}
                            disabled={!canVerify || verifyM.isPending}
                            onClick={() => {
                              setVerifyId((s as any).submissionId);
                              setVerifyDecision("ACCEPT");
                              setVerifyComment("");
                              setOpenVerify(true);
                            }}
                            title="Verify"
                          >
                            <CheckCircle2 size={13} />
                            Verify
                          </button>

                          <button
                            type="button"
                            className={`inline-flex items-center gap-1 px-2 py-1 rounded-md border bg-white text-red-700 ${
                              deleteM.isPending ? "opacity-50" : ""
                            }`}
                            disabled={deleteM.isPending}
                            onClick={() => {
                              if (!confirm("Delete this submission? This action cannot be undone."))
                                return;
                              deleteM.mutate((s as any).submissionId);
                            }}
                            title="Delete"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>

                        {unflagM.isError && flagged ? (
                          <div className="mt-1 text-[11px] font-bold text-red-700">
                            {friendlyError(unflagM.error)}
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
        <div className="mt-3 flex gap-2 items-center">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={!submissionsQ.data || page <= 0 || submissionsQ.isFetching}
            className="px-3 py-1.5 rounded-md border bg-white text-sm"
          >
            Prev
          </button>

          <div className="text-xs text-slate-600">
            Page {submissionsQ.data ? (submissionsQ.data as any).page + 1 : page + 1} /{" "}
            {submissionsQ.data ? (submissionsQ.data as any).totalPages : "?"}
          </div>

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
            className="px-3 py-1.5 rounded-md border bg-white text-sm"
          >
            Next
          </button>
        </div>
      </Panel>

      {/* ---------------- Verify Modal ---------------- */}
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

/** --------- UI helpers ---------- */
function btn(active: boolean) {
  return {
    padding: "6px 10px",
    borderRadius: 10,
    border: active ? "2px solid #2563eb" : "1px solid #e5e7eb",
    background: active ? "#eff6ff" : "#fff",
    fontWeight: 800,
    fontSize: 12,
    color: active ? "#1d4ed8" : "#111827",
    position: "relative",
    boxShadow: active ? "0 1px 0 rgba(37, 99, 235, 0.35)" : "none",
  } as const;
}
function Th(props: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      {...props}
      className={`p-2 text-[10px] font-extrabold ${props.className ?? ""}`}
    />
  );
}
function Td(props: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return <td {...props} className={`p-2 align-top ${props.className ?? ""}`} />;
}
function Field(props: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[11px] font-extrabold text-slate-600 mb-1">
        {props.label}
      </div>
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
            {props.subtitle ? (
              <div className="text-xs text-slate-500 mt-0.5">
                {props.subtitle}
              </div>
            ) : null}
          </div>
          <button
            type="button"
            onClick={props.onClose}
            disabled={Boolean(props.busy)}
            className={`px-3 py-1.5 rounded-md border border-slate-200 bg-white text-sm ${
              props.busy ? "opacity-60" : ""
            }`}
          >
            Close
          </button>
        </div>

        <div className="mt-2">{props.children}</div>
      </div>
    </div>
  );
}


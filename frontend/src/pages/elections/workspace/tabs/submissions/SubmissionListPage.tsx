// src/pages/elections/workspace/tabs/submissions/SubmissionListPage.tsx

import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import {
  ChevronLeft,
  ChevronRight,
  Eye,
  FileCheck2,
  FilterX,
  Plus,
  ShieldAlert,
} from "lucide-react";

import { useAuthStore } from "../../../../../shared/store/authStore";
import { Panel } from "../../../shared/elections-ui";

import { listContestsByElection } from "../../../../../shared/services/contestService";
import { fetchCounties } from "../../../../../shared/services/countyService";
import { fetchDistrictsByCounty } from "../../../../../shared/services/districtService";
import { fetchPollingCenters } from "../../../../../shared/services/pollingCenterService";
import { fetchOrganizations } from "../../../../../shared/services/organizationService";

import {
  searchSubmissions,
  type VoteStatus,
  type VoteSubmissionDto,
} from "../../../../../shared/services/voteSubmissionService";

// ============================================================================
// TYPES
// ============================================================================

type Queue = "ALL" | "DELETED" | "MISSING_EVIDENCE" | VoteStatus;

// ============================================================================
// HELPERS
// ============================================================================

function num(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function validVotes(row: any) {
  if (Number.isFinite(Number(row?.validVotes))) {
    return Number(row.validVotes);
  }

  return Object.values(row?.candidateVotes ?? {}).reduce(
    (total: number, value: any) => total + num(value),
    0,
  );
}

function invalidVotes(row: any) {
  return (
    num(row?.invalidBallots) +
    num(row?.rejectedBallots) +
    num(row?.unmarkedBallots)
  );
}

function ballotsInBox(row: any) {
  if (Number.isFinite(Number(row?.ballotsInBox))) {
    return Number(row.ballotsInBox);
  }

  return validVotes(row) + invalidVotes(row);
}

function turnoutPct(row: any) {
  const backend = Number(row?.turnoutPct);

  if (Number.isFinite(backend) && backend > 0) {
    return backend;
  }

  const registered = num(row?.registeredVoters);

  if (!registered) {
    return null;
  }

  return (ballotsInBox(row) / registered) * 100;
}

function formatPercent(value: number | null) {
  if (value === null || !Number.isFinite(value)) {
    return "—";
  }

  return `${value.toFixed(2)}%`;
}

function status(row: any) {
  return String(row?.status ?? "").toUpperCase();
}

function evidenceCount(row: any) {
  return Math.max(0, num(row?.tallySheetCount));
}

function hasEvidence(row: any) {
  return (
    Boolean(row?.hasTallySheet) ||
    evidenceCount(row) > 0 ||
    Boolean(String(row?.tallySheetUrl ?? "").trim())
  );
}

function deletedStamp(row: any) {
  return row?.dateDeleted ?? row?.deletedAt ?? row?.date_deleted ?? null;
}

function placeLabel(row: any) {
  return (
    row?.placeLabel ??
    (row?.placeNumber != null
      ? `Place ${row.placeNumber}`
      : (row?.placeCode ?? "—"))
  );
}

function formatDate(value: unknown) {
  if (!value) {
    return "—";
  }

  const date = new Date(String(value));

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleString();
}

function queueLabel(value: Queue) {
  const labels: Record<string, string> = {
    ALL: "All Active",
    PENDING: "Pending",
    FLAGGED: "Flagged",
    DRAFT: "Draft",
    VERIFIED: "Verified",
    REJECTED: "Rejected",
    MISSING_EVIDENCE: "Missing Evidence",
    DELETED: "Deleted",
  };

  return labels[value] ?? value;
}

function statusClass(value: string) {
  switch (value) {
    case "VERIFIED":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";

    case "FLAGGED":
      return "border-amber-200 bg-amber-50 text-amber-700";

    case "REJECTED":
      return "border-red-200 bg-red-50 text-red-700";

    case "DELETED":
      return "border-slate-300 bg-slate-100 text-slate-500";

    case "DRAFT":
      return "border-slate-200 bg-slate-100 text-slate-600";

    default:
      return "border-blue-200 bg-blue-50 text-blue-700";
  }
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function SubmissionListPage() {
  const navigate = useNavigate();

  const { electionId } = useParams<{
    electionId: string;
  }>();

  // ==========================================================================
  // DASHBOARD CONTEXT
  // ==========================================================================

  const dashboardMode = useAuthStore((state: any) => state.dashboardMode);

  const currentOrgId = useAuthStore((state: any) =>
    String(state.currentOrgId ?? ""),
  );

  const normalizedMode = String(dashboardMode ?? "").toUpperCase();

  const isSystem = normalizedMode === "SYSTEM";
  const isNec = normalizedMode === "NEC";
  const isTenant = normalizedMode === "TENANT";

  // SYSTEM is read-only for creating vote submissions.
  // NEC and TENANT participate in the election workflow.
  const canCreate = isNec || isTenant;

  // ==========================================================================
  // SYSTEM ORGANIZATION SELECTION
  //
  // IMPORTANT:
  // This is deliberately LOCAL state.
  //
  // A SYSTEM user is not changing their authenticated tenant.
  // They are selecting an organization whose submissions they want to inspect.
  // ==========================================================================

  const [systemSelectedOrgId, setSystemSelectedOrgId] = useState<string>("");

  const effectiveOrgId = isSystem
    ? systemSelectedOrgId || undefined
    : currentOrgId || undefined;

  const orgContextReady = Boolean(effectiveOrgId);

  // ==========================================================================
  // ORGANIZATIONS
  // ==========================================================================

  const orgsQ = useQuery({
    enabled: isSystem,

    queryKey: ["orgs", "submission-list"],

    queryFn: async () => {
      const response = await fetchOrganizations({
        page: 0,
        size: 500,
        active: true,
      });

      return response.items ?? [];
    },

    staleTime: 60_000,
    retry: 1,
  });

  // ==========================================================================
  // QUEUES
  // ==========================================================================

  const [queue, setQueue] = useState<Queue>("ALL");

  const queues: Queue[] = [
    "ALL",
    "PENDING",
    "FLAGGED",
    "DRAFT",
    "VERIFIED",
    "REJECTED",
    "MISSING_EVIDENCE",
    "DELETED",
  ];

  // ==========================================================================
  // FILTER LOOKUPS
  // ==========================================================================

  const contestsQ = useQuery({
    enabled: Boolean(electionId),

    queryKey: ["election-contests", electionId, "submission-list"],

    queryFn: () => listContestsByElection(String(electionId)),

    staleTime: 60_000,
    retry: 1,
  });

  const countiesQ = useQuery({
    queryKey: ["counties", "submission-list"],

    queryFn: async () =>
      (
        await fetchCounties({
          page: 0,
          size: 500,
        })
      ).items,

    staleTime: 60_000,
    retry: 1,
  });

  // ==========================================================================
  // FILTER STATE
  // ==========================================================================

  const [contestId, setContestId] = useState("");
  const [countyId, setCountyId] = useState("");
  const [districtId, setDistrictId] = useState("");
  const [centerId, setCenterId] = useState("");

  // ==========================================================================
  // DISTRICTS
  // ==========================================================================

  const districtsQ = useQuery({
    enabled: Boolean(countyId),

    queryKey: ["districts", "submission-list", countyId],

    queryFn: () => fetchDistrictsByCounty(countyId),

    staleTime: 60_000,
    retry: 1,
  });

  // ==========================================================================
  // CENTERS
  // ==========================================================================

  const centersQ = useQuery({
    enabled: Boolean(countyId || districtId),

    queryKey: ["centers", "submission-list", countyId, districtId],

    queryFn: async () =>
      (
        await fetchPollingCenters({
          page: 0,
          size: 500,
          countyId: countyId || undefined,
          districtId: districtId || undefined,
        })
      ).items,

    staleTime: 60_000,
    retry: 1,
  });

  // ==========================================================================
  // CASCADING FILTERS
  // ==========================================================================

  useEffect(() => {
    setDistrictId("");
    setCenterId("");
  }, [countyId]);

  useEffect(() => {
    setCenterId("");
  }, [districtId]);

  // ==========================================================================
  // PAGINATION
  // ==========================================================================

  const [page, setPage] = useState(0);
  const [size, setSize] = useState(20);

  useEffect(() => {
    setPage(0);
  }, [
    queue,
    electionId,
    effectiveOrgId,
    contestId,
    countyId,
    districtId,
    centerId,
    size,
  ]);

  // ==========================================================================
  // SEARCH PARAMETERS
  // ==========================================================================

  const includeDeleted = queue === "DELETED";

  const statusParam =
    queue === "DELETED"
      ? "DELETED"
      : queue === "ALL" || queue === "MISSING_EVIDENCE"
        ? undefined
        : queue;

  // ==========================================================================
  // SUBMISSION QUERY
  // ==========================================================================

  const submissionsQ = useQuery({
    enabled: Boolean(electionId && effectiveOrgId),

    queryKey: [
      "vote-submissions",
      electionId,
      effectiveOrgId,
      queue,
      contestId,
      countyId,
      districtId,
      centerId,
      page,
      size,
    ],

    queryFn: () =>
      searchSubmissions({
        orgId: effectiveOrgId,
        electionId,
        page,
        size,
        includeDeleted,
        status: statusParam,
        contestId: contestId || undefined,
        countyId: countyId || undefined,
        districtId: districtId || undefined,
        centerId: centerId || undefined,
        placeId: undefined,
      } as any),

    staleTime: 10_000,
    retry: 1,
  });

  // ==========================================================================
  // ITEMS
  // ==========================================================================

  const rawItems = (submissionsQ.data?.items ?? []) as VoteSubmissionDto[];

  const items = useMemo(() => {
    let rows = rawItems;

    if (queue === "MISSING_EVIDENCE") {
      rows = rows.filter((row) => !hasEvidence(row));
    }

    if (queue === "DELETED") {
      rows = rows.filter(
        (row) => status(row) === "DELETED" || Boolean(deletedStamp(row)),
      );
    }

    return rows;
  }, [rawItems, queue]);

  const totalPages = Math.max(
    1,
    Number((submissionsQ.data as any)?.totalPages ?? 1),
  );

  // ==========================================================================
  // NAVIGATION
  // ==========================================================================

  function openNewSubmission() {
    if (!electionId || !effectiveOrgId) {
      return;
    }

    navigate(`/elections/${electionId}/submissions/new`);
  }

  function openSubmission(submissionId: string) {
    if (!electionId || !submissionId) {
      return;
    }

    navigate(`/elections/${electionId}/submissions/${submissionId}`);
  }

  // ==========================================================================
  // CLEAR FILTERS
  // ==========================================================================

  function clearFilters() {
    setContestId("");
    setCountyId("");
    setDistrictId("");
    setCenterId("");
  }

  // ==========================================================================
  // CREATE STATE
  // ==========================================================================

  const createDisabled = !electionId || !effectiveOrgId;

  // ==========================================================================
  // RENDER
  // ==========================================================================

  return (
    <Panel title="Vote Submissions">
      <div className="flex flex-col gap-2">
        {/* ================================================================ */}
        {/* TOOLBAR */}
        {/* ================================================================ */}

        <section className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5">
          <div className="min-w-0">
            <div className="text-sm font-extrabold text-slate-900">
              Submission Queue
            </div>

            <div className="mt-0.5 hidden text-xs text-slate-500 sm:block">
              Review and manage polling-place vote submissions.
            </div>
          </div>

          {canCreate && queue !== "DELETED" ? (
            <button
              type="button"
              disabled={createDisabled}
              onClick={openNewSubmission}
              className={[
                "inline-flex min-h-10 shrink-0 items-center justify-center gap-1.5 rounded-lg px-3 text-xs font-bold text-white transition sm:text-sm",
                createDisabled
                  ? "cursor-not-allowed bg-slate-400"
                  : "bg-blue-700 hover:bg-blue-800",
              ].join(" ")}
            >
              <Plus size={16} />

              <span className="hidden sm:inline">New Submission</span>

              <span className="sm:hidden">New</span>
            </button>
          ) : null}
        </section>

        {/* ================================================================ */}
        {/* SYSTEM ORGANIZATION SELECTOR */}
        {/* ================================================================ */}

        {isSystem ? (
          <section className="rounded-xl border border-slate-200 bg-white p-2">
            <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center">
              <label className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                Organization
              </label>

              <select
                value={systemSelectedOrgId}
                onChange={(event) => {
                  setSystemSelectedOrgId(event.target.value);

                  // Reset filters when switching organization.
                  setContestId("");
                  setCountyId("");
                  setDistrictId("");
                  setCenterId("");
                  setPage(0);
                }}
                className="min-h-10 w-full rounded-lg border border-slate-300 px-3 text-sm sm:max-w-[360px]"
              >
                <option value="">Select organization</option>

                {(orgsQ.data ?? []).map((org: any) => (
                  <option key={org.orgId} value={org.orgId}>
                    {org.orgName}
                  </option>
                ))}
              </select>
            </div>

            {!orgContextReady ? (
              <div className="mt-2 text-xs font-semibold text-amber-700">
                Select an organization to view its vote submissions.
              </div>
            ) : null}
          </section>
        ) : null}

        {/* ================================================================ */}
        {/* QUEUES */}
        {/* ================================================================ */}

        <section className="rounded-xl border border-slate-200 bg-white p-2">
          <div className="flex gap-1.5 overflow-x-auto sm:flex-wrap">
            {queues.map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setQueue(value)}
                className={[
                  "shrink-0 rounded-lg border px-2.5 py-1.5 text-xs font-bold",
                  queue === value
                    ? "border-blue-300 bg-blue-50 text-blue-700"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
                ].join(" ")}
              >
                {queueLabel(value)}
              </button>
            ))}
          </div>
        </section>

        {/* ================================================================ */}
        {/* FILTERS */}
        {/* ================================================================ */}

        <section className="rounded-xl border border-slate-200 bg-white p-2">
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-[1fr_1fr_1fr_1.2fr_auto]">
            <select
              value={contestId}
              onChange={(event) => setContestId(event.target.value)}
              className="min-h-10 rounded-lg border border-slate-300 px-2 text-xs sm:text-sm"
            >
              <option value="">All contests</option>

              {(contestsQ.data ?? []).map((contest: any) => (
                <option key={contest.contestId} value={contest.contestId}>
                  {contest.contestName}
                </option>
              ))}
            </select>

            <select
              value={countyId}
              onChange={(event) => setCountyId(event.target.value)}
              className="min-h-10 rounded-lg border border-slate-300 px-2 text-xs sm:text-sm"
            >
              <option value="">All counties</option>

              {(countiesQ.data ?? []).map((county: any) => (
                <option key={county.countyId} value={county.countyId}>
                  {county.countyName}
                </option>
              ))}
            </select>

            <select
              value={districtId}
              onChange={(event) => setDistrictId(event.target.value)}
              disabled={!countyId}
              className="min-h-10 rounded-lg border border-slate-300 px-2 text-xs disabled:bg-slate-50 sm:text-sm"
            >
              <option value="">All districts</option>

              {(districtsQ.data ?? []).map((district: any) => (
                <option key={district.districtId} value={district.districtId}>
                  {district.districtName}
                </option>
              ))}
            </select>

            <select
              value={centerId}
              onChange={(event) => setCenterId(event.target.value)}
              disabled={!countyId && !districtId}
              className="min-h-10 rounded-lg border border-slate-300 px-2 text-xs disabled:bg-slate-50 sm:text-sm"
            >
              <option value="">All centers</option>

              {(centersQ.data ?? []).map((center: any) => (
                <option key={center.centerId} value={center.centerId}>
                  {center.centerName}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg border border-slate-300 px-3 text-xs font-bold hover:bg-slate-50 sm:text-sm"
            >
              <FilterX size={14} />
              Clear
            </button>
          </div>
        </section>

        {/* ================================================================ */}
        {/* SUBMISSION LIST */}
        {/* ================================================================ */}

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-3 py-2">
            <div className="flex items-center gap-1.5">
              <FileCheck2 size={15} className="text-blue-600" />

              <span className="text-sm font-bold text-slate-800">
                {queueLabel(queue)}
              </span>
            </div>

            <span className="text-xs font-semibold text-slate-500">
              {items.length} on page
            </span>
          </div>

          {/* Desktop headers */}

          {items.length > 0 && !(isSystem && !orgContextReady) ? (
            <div className="hidden grid-cols-[minmax(200px,1.5fr)_minmax(110px,.85fr)_minmax(130px,.9fr)_68px_74px_68px_68px_68px_72px_68px_100px] items-center gap-3 border-b border-slate-200 bg-white px-3 py-2 text-[9px] font-bold uppercase tracking-wide text-slate-400 lg:grid">
              <div>Polling Location</div>
              <div>Contest</div>
              <div>Submitted By</div>
              <div className="text-right">Registered</div>
              <div className="text-right">Received</div>
              <div className="text-right">Valid</div>
              <div className="text-right">Invalid</div>
              <div className="text-right">In Box</div>
              <div className="text-right">Turnout</div>
              <div className="text-center">Evidence</div>
              <div>Status</div>
            </div>
          ) : null}

          {/* Content */}

          {isSystem && !orgContextReady ? (
            <div className="p-10 text-center">
              <ShieldAlert size={26} className="mx-auto text-amber-400" />

              <div className="mt-2 text-sm font-bold text-slate-800">
                Select an organization
              </div>

              <div className="mt-1 text-xs text-slate-500">
                Choose an organization to inspect its vote submissions.
              </div>
            </div>
          ) : submissionsQ.isLoading ? (
            <div className="p-8 text-center text-sm text-slate-500">
              Loading submissions...
            </div>
          ) : submissionsQ.isError ? (
            <div className="p-10 text-center">
              <ShieldAlert size={26} className="mx-auto text-red-400" />

              <div className="mt-2 text-sm font-bold text-red-700">
                Unable to load submissions
              </div>

              <div className="mt-1 text-xs text-red-600">
                {String(
                  (submissionsQ.error as any)?.response?.data?.message ??
                    (submissionsQ.error as any)?.response?.data?.error ??
                    (submissionsQ.error as any)?.message ??
                    "Request failed.",
                )}
              </div>
            </div>
          ) : items.length === 0 ? (
            <div className="p-8 text-center">
              <FileCheck2 size={24} className="mx-auto text-slate-300" />

              <div className="mt-2 text-sm font-bold text-slate-700">
                {queue === "MISSING_EVIDENCE"
                  ? "No submissions are missing evidence"
                  : "No submissions found"}
              </div>

              {queue === "MISSING_EVIDENCE" ? (
                <div className="mt-1 text-xs text-slate-500">
                  All submissions currently have evidence attached.
                </div>
              ) : null}
            </div>
          ) : (
            items.map((row: any) => {
              const id = String(row.submissionId ?? "");

              const rowStatus = status(row);
              const rowValid = validVotes(row);
              const rowInvalid = invalidVotes(row);
              const rowInBox = ballotsInBox(row);
              const rowTurnout = turnoutPct(row);
              const rowEvidenceCount = evidenceCount(row);

              return (
                <button
                  key={id}
                  type="button"
                  disabled={!id}
                  onClick={() => openSubmission(id)}
                  className="block w-full border-b border-slate-100 text-left transition last:border-b-0 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {/* ====================================================== */}
                  {/* MOBILE / TABLET */}
                  {/* ====================================================== */}

                  <div className="px-3 py-3 lg:hidden">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-extrabold text-slate-900">
                          {row.centerName ?? "Unknown center"}
                        </div>

                        <div className="mt-0.5 truncate text-xs font-semibold text-blue-700">
                          {placeLabel(row)}
                          {" • "}
                          {row.contestName ?? "—"}
                        </div>
                      </div>

                      <span
                        className={[
                          "shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-bold",
                          statusClass(rowStatus),
                        ].join(" ")}
                      >
                        {rowStatus || "UNKNOWN"}
                      </span>
                    </div>

                    <div className="mt-3 grid grid-cols-2 border-y border-slate-200">
                      <MobileValue
                        label="Valid"
                        value={rowValid.toLocaleString()}
                        emphasis
                      />

                      <MobileValue
                        label="Invalid"
                        value={rowInvalid.toLocaleString()}
                      />

                      <MobileValue
                        label="In Box"
                        value={rowInBox.toLocaleString()}
                        emphasis
                      />

                      <MobileValue
                        label="Turnout"
                        value={formatPercent(rowTurnout)}
                      />
                    </div>

                    <div className="mt-2 flex items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3 text-[10px]">
                        <span className="text-slate-500">
                          Evidence{" "}
                          <strong
                            className={
                              hasEvidence(row)
                                ? "text-emerald-700"
                                : "text-amber-700"
                            }
                          >
                            {rowEvidenceCount}
                          </strong>
                        </span>

                        <span className="hidden truncate text-slate-500 sm:inline">
                          {row.agentName ?? "—"}
                        </span>
                      </div>

                      <div className="flex shrink-0 items-center gap-2 text-[10px] text-slate-500">
                        <span className="hidden sm:inline">
                          {formatDate(row.submissionTime)}
                        </span>

                        <Eye size={15} className="text-slate-400" />
                      </div>
                    </div>
                  </div>

                  {/* ====================================================== */}
                  {/* DESKTOP */}
                  {/* ====================================================== */}

                  <div className="hidden grid-cols-[minmax(200px,1.5fr)_minmax(110px,.85fr)_minmax(130px,.9fr)_68px_74px_68px_68px_68px_72px_68px_100px] items-center gap-3 px-3 py-3 lg:grid">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-bold text-slate-900">
                        {row.centerName ?? "—"}
                      </div>

                      <div className="mt-0.5 truncate text-[11px] text-slate-500">
                        {placeLabel(row)}
                      </div>
                    </div>

                    <div className="truncate text-xs font-semibold text-slate-700">
                      {row.contestName ?? "—"}
                    </div>

                    <div className="min-w-0">
                      <div className="truncate text-xs font-semibold text-slate-700">
                        {row.agentName ?? "—"}
                      </div>

                      <div className="mt-0.5 truncate text-[10px] text-slate-400">
                        {formatDate(row.submissionTime)}
                      </div>
                    </div>

                    <DesktopNumber value={num(row.registeredVoters)} />

                    <DesktopNumber value={num(row.ballotsReceived)} />

                    <DesktopNumber value={rowValid} emphasis />

                    <DesktopNumber value={rowInvalid} />

                    <DesktopNumber value={rowInBox} emphasis />

                    <div className="text-right text-xs font-bold text-slate-800">
                      {formatPercent(rowTurnout)}
                    </div>

                    <div className="text-center">
                      <span
                        className={[
                          "inline-flex min-w-7 justify-center rounded-full px-2 py-1 text-[10px] font-extrabold",
                          hasEvidence(row)
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-amber-50 text-amber-700",
                        ].join(" ")}
                      >
                        {rowEvidenceCount}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span
                        className={[
                          "rounded-full border px-2 py-1 text-[9px] font-bold",
                          statusClass(rowStatus),
                        ].join(" ")}
                      >
                        {rowStatus || "UNKNOWN"}
                      </span>

                      <Eye size={14} className="shrink-0 text-slate-400" />
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </section>

        {/* ================================================================ */}
        {/* PAGINATION */}
        {/* ================================================================ */}

        <section className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2">
          <span className="text-xs font-semibold text-slate-500">
            Page {page + 1} of {totalPages}
          </span>

          <div className="flex items-center gap-1.5">
            <select
              value={size}
              onChange={(event) => setSize(Number(event.target.value))}
              className="min-h-8 rounded-lg border border-slate-300 px-2 text-xs"
            >
              <option value={10}>10</option>

              <option value={20}>20</option>

              <option value={50}>50</option>
            </select>

            <button
              type="button"
              disabled={page === 0}
              onClick={() => setPage((value) => Math.max(0, value - 1))}
              className="inline-flex min-h-8 items-center rounded-lg border border-slate-300 px-2 hover:bg-slate-50 disabled:opacity-40"
            >
              <ChevronLeft size={14} />
            </button>

            <button
              type="button"
              disabled={page >= totalPages - 1}
              onClick={() => setPage((value) => value + 1)}
              className="inline-flex min-h-8 items-center rounded-lg border border-slate-300 px-2 hover:bg-slate-50 disabled:opacity-40"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </section>
      </div>
    </Panel>
  );
}

// ============================================================================
// MOBILE VALUE
// ============================================================================

function MobileValue({
  label,
  value,
  emphasis = false,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-1 py-2.5 odd:pr-3 even:pl-3">
      <span
        className={[
          "text-xs font-semibold",
          emphasis ? "text-blue-600" : "text-slate-500",
        ].join(" ")}
      >
        {label}
      </span>

      <span
        className={[
          "text-sm font-extrabold",
          emphasis ? "text-blue-700" : "text-slate-900",
        ].join(" ")}
      >
        {value}
      </span>
    </div>
  );
}

// ============================================================================
// DESKTOP NUMBER
// ============================================================================

function DesktopNumber({
  value,
  emphasis = false,
}: {
  value: number;
  emphasis?: boolean;
}) {
  return (
    <div
      className={[
        "text-right text-sm font-extrabold",
        emphasis ? "text-blue-700" : "text-slate-900",
      ].join(" ")}
    >
      {value.toLocaleString()}
    </div>
  );
}

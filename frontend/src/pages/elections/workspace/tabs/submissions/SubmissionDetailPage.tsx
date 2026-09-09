// src/pages/elections/workspace/tabs/submissions/SubmissionDetailPage.tsx

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  Download,
  Eye,
  FileCheck2,
  FileEdit,
  FileText,
  Fingerprint,
  Flag,
  FlagOff,
  Image as ImageIcon,
  MapPin,
  Pencil,
  ShieldCheck,
  Trash2,
  UserRound,
  Vote,
} from "lucide-react";

import { useAuthStore } from "../../../../../shared/store/authStore";

import {
  getSubmission,
  type VoteSubmissionDto,
} from "../../../../../shared/services/voteSubmissionService";

import {
  listOptionsByContest,
  type ContestOptionDto,
} from "../../../../../shared/services/contestOptionService";

import {
  fetchAllocations,
  type PollingCenterAllocationDto,
} from "../../../../../shared/services/pollingCenterAllocationService";

import {
  fetchFileBlob,
  listEntityFiles,
  type FileUploadDto,
} from "../../../../../shared/services/fileUploadService";

// ============================================================================
// TYPES
// ============================================================================

type SubmissionDetailPageProps = {
  submissionId?: string;
};

type ActionVariant = "blue" | "green" | "amber" | "red" | "slate";

// ============================================================================
// HELPERS
// ============================================================================

function safeNumber(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function nullableNumber(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function formatNumber(value: unknown) {
  const number = nullableNumber(value);
  return number === null ? "—" : number.toLocaleString();
}

function formatPercent(value: unknown) {
  const number = nullableNumber(value);
  return number === null ? "—" : `${number.toFixed(2)}%`;
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

function sumCandidateVotes(votes?: Record<string, number>) {
  if (!votes) {
    return 0;
  }

  return Object.values(votes).reduce(
    (sum, value) => sum + safeNumber(value),
    0,
  );
}

function computeValidVotes(submission: VoteSubmissionDto) {
  const backendValue = nullableNumber(submission.validVotes);

  if (backendValue !== null) {
    return backendValue;
  }

  return sumCandidateVotes(submission.candidateVotes ?? {});
}

function computeInvalidInBox(submission: VoteSubmissionDto) {
  return (
    safeNumber(submission.invalidBallots) +
    safeNumber(submission.rejectedBallots) +
    safeNumber(submission.unmarkedBallots)
  );
}

function computeBallotsInBox(submission: VoteSubmissionDto) {
  const backendValue = nullableNumber(submission.ballotsInBox);

  if (backendValue !== null) {
    return backendValue;
  }

  return computeValidVotes(submission) + computeInvalidInBox(submission);
}

function computeOutsideBox(submission: VoteSubmissionDto) {
  return (
    safeNumber(submission.spoiledBallots) + safeNumber(submission.unusedBallots)
  );
}

function computeExpectedInBox(submission: VoteSubmissionDto) {
  const backendValue = nullableNumber(submission.expectedBallotsInBox);

  if (backendValue !== null) {
    return backendValue;
  }

  const received = nullableNumber(submission.ballotsReceived);

  if (received === null) {
    return null;
  }

  return received - computeOutsideBox(submission);
}

function computeBallotDelta(submission: VoteSubmissionDto) {
  const backendValue = nullableNumber(submission.ballotDelta);

  if (backendValue !== null) {
    return backendValue;
  }

  const expected = computeExpectedInBox(submission);

  if (expected === null) {
    return null;
  }

  return computeBallotsInBox(submission) - expected;
}

function computeTurnoutPct(submission: VoteSubmissionDto) {
  const backendValue = nullableNumber(submission.turnoutPct);

  if (backendValue !== null) {
    return backendValue;
  }

  const registered = safeNumber(submission.registeredVoters);

  if (!registered) {
    return null;
  }

  return (computeBallotsInBox(submission) / registered) * 100;
}

function computeValidPct(submission: VoteSubmissionDto) {
  const backendValue = nullableNumber(submission.validPct);

  if (backendValue !== null) {
    return backendValue;
  }

  const ballotsInBox = computeBallotsInBox(submission);

  if (!ballotsInBox) {
    return null;
  }

  return (computeValidVotes(submission) / ballotsInBox) * 100;
}

function computeInvalidPct(submission: VoteSubmissionDto) {
  const backendValue = nullableNumber(submission.invalidPct);

  if (backendValue !== null) {
    return backendValue;
  }

  const ballotsInBox = computeBallotsInBox(submission);

  if (!ballotsInBox) {
    return null;
  }

  return (computeInvalidInBox(submission) / ballotsInBox) * 100;
}

function getPlaceLabel(submission: VoteSubmissionDto) {
  return (
    submission.placeLabel ??
    (submission.placeNumber != null
      ? `Place ${submission.placeNumber}`
      : (submission.placeCode ?? "—"))
  );
}

function getStatus(submission?: VoteSubmissionDto) {
  return String(submission?.status ?? "").toUpperCase();
}

function getFriendlyError(error: any) {
  return (
    error?.response?.data?.message ??
    error?.response?.data?.error ??
    error?.message ??
    "The submission could not be loaded."
  );
}

function shortHash(value?: string | null) {
  if (!value) {
    return "—";
  }

  if (value.length <= 24) {
    return value;
  }

  return `${value.slice(0, 12)}…${value.slice(-10)}`;
}

function statusClasses(status: string) {
  switch (status) {
    case "VERIFIED":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";

    case "FLAGGED":
      return "border-amber-200 bg-amber-50 text-amber-700";

    case "REJECTED":
      return "border-red-200 bg-red-50 text-red-700";

    case "DELETED":
      return "border-slate-300 bg-slate-100 text-slate-500";

    case "DRAFT":
      return "border-slate-300 bg-slate-100 text-slate-600";

    case "PENDING":
    default:
      return "border-blue-200 bg-blue-50 text-blue-700";
  }
}

function getAttachmentName(file: FileUploadDto, index: number) {
  if (file.fileName?.trim()) {
    return file.fileName.trim();
  }

  const tagName = String(
    file.tags?.originalName ?? file.tags?.fileName ?? file.tags?.name ?? "",
  ).trim();

  if (tagName) {
    return tagName;
  }

  const stored = String(file.fileUrl ?? "");

  if (stored) {
    const normalized = stored.replace(/\\/g, "/");
    const last = normalized.split("/").pop();

    if (last) {
      try {
        return decodeURIComponent(last);
      } catch {
        return last;
      }
    }
  }

  return `Attachment ${index + 1}`;
}

function isImageAttachment(file: FileUploadDto) {
  return String(file.mimeType ?? "")
    .toLowerCase()
    .startsWith("image/");
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function SubmissionDetailPage({
  submissionId: submissionIdProp,
}: SubmissionDetailPageProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const { electionId } = useParams<{ electionId: string }>();

  // ==========================================================================
  // INTERNAL ROUTE
  // ==========================================================================

  const submissionId = useMemo(() => {
    if (submissionIdProp && String(submissionIdProp).trim()) {
      return String(submissionIdProp).trim();
    }

    const match = location.pathname.match(/\/submissions\/([^/]+)\/?$/);

    if (!match?.[1]) {
      return "";
    }

    try {
      return decodeURIComponent(match[1]);
    } catch {
      return match[1];
    }
  }, [location.pathname, submissionIdProp]);

  // ==========================================================================
  // AUTH
  // ==========================================================================

  const dashboardMode = useAuthStore((state: any) => state.dashboardMode);

  const currentOrgId = useAuthStore((state: any) => state.currentOrgId);

  const canReview =
    Boolean(currentOrgId) ||
    dashboardMode === "SYSTEM" ||
    dashboardMode === "NEC";

  // ==========================================================================
  // PATHS
  // ==========================================================================

  const basePath =
    electionId && submissionId
      ? `/elections/${electionId}/submissions/${submissionId}`
      : "";

  const backToList = () => {
    navigate(`/elections/${electionId}/submissions`);
  };

  // ==========================================================================
  // SUBMISSION
  // ==========================================================================

  const submissionQuery = useQuery<VoteSubmissionDto>({
    enabled: Boolean(submissionId),

    queryKey: ["vote-submission", "detail", submissionId, currentOrgId],

    queryFn: () => getSubmission(submissionId),

    staleTime: 10_000,

    retry: 1,
  });

  const submission = submissionQuery.data;

  const centerId = String(submission?.centerId ?? "");

  const contestId = String(submission?.contestId ?? "");

  // ==========================================================================
  // GEOGRAPHY
  // ==========================================================================

  const centerAllocationQuery = useQuery<PollingCenterAllocationDto | null>({
    enabled: Boolean(electionId && centerId),

    queryKey: ["submission-center-geography", electionId, centerId],

    queryFn: async () => {
      const page = await fetchAllocations({
        electionId,
        centerId,
        page: 0,
        size: 20,
      });

      return (
        (page.items ?? []).find((item) => {
          const itemCenterId = String(
            item.pollingCenterId ?? (item as any).centerId ?? "",
          );

          return itemCenterId === centerId;
        }) ?? null
      );
    },

    staleTime: 60_000,

    retry: 1,
  });

  const centerAllocation = centerAllocationQuery.data;

  const countyName =
    submission?.countyName ?? centerAllocation?.countyName ?? "—";

  const districtName =
    submission?.districtName ?? centerAllocation?.districtName ?? "—";

  // ==========================================================================
  // CONTEST OPTIONS
  // ==========================================================================

  const optionsQuery = useQuery<ContestOptionDto[]>({
    enabled: Boolean(contestId),

    queryKey: ["contest-options", "submission-detail", contestId],

    queryFn: () =>
      listOptionsByContest({
        contestId,
        onlyActive: false,
      }) as any,

    staleTime: 60_000,

    retry: 1,
  });

  // ==========================================================================
  // CANDIDATE RESULTS
  // ==========================================================================

  const candidateRows = useMemo(() => {
    const votes: Record<string, number> = submission?.candidateVotes ?? {};

    const options = optionsQuery.data ?? [];

    const optionMap = new Map<string, any>();

    (options as any[]).forEach((option) => {
      const possibleIds = [
        option?.optionId,
        option?.contestOptionId,
        option?.electId,
        option?.candidateId,
      ]
        .filter(Boolean)
        .map(String);

      possibleIds.forEach((id) => {
        optionMap.set(id, option);
      });
    });

    return Object.entries(votes)
      .map(([key, voteCount]) => {
        const option = optionMap.get(String(key));

        const candidateName =
          option?.electionCandidate ??
          option?.candidateFullName ??
          option?.fullName ??
          option?.candidateName ??
          option?.optionLabel ??
          "Unknown Candidate";

        const abbreviation = String(
          option?.abbreviation ?? option?.partyAbbreviation ?? "",
        ).trim();

        return {
          id: key,

          candidateName: String(candidateName),

          partyLabel: abbreviation || "Independent",

          votes: safeNumber(voteCount),

          order: Number(option?.optionOrder ?? 999999),
        };
      })
      .sort((first, second) => {
        if (first.order !== second.order) {
          return first.order - second.order;
        }

        return first.candidateName.localeCompare(second.candidateName);
      });
  }, [submission?.candidateVotes, optionsQuery.data]);

  // ==========================================================================
  // EVIDENCE FILES
  //
  // We need fileId for authenticated preview/download.
  // Every active attachment is considered evidence.
  // ==========================================================================

  const evidenceOrgId = String(submission?.orgId ?? currentOrgId ?? "");

  const evidenceQuery = useQuery<FileUploadDto[]>({
    enabled: Boolean(submissionId && evidenceOrgId),

    queryKey: ["vote-submission-evidence", submissionId, evidenceOrgId],

    queryFn: () =>
      listEntityFiles({
        orgId: evidenceOrgId,
        relatedTable: "vote_submission",
        relatedId: submissionId,
      }),

    staleTime: 10_000,

    retry: 1,
  });

  const attachments = useMemo(() => {
    return (evidenceQuery.data ?? []).filter((file) => !file.dateDeleted);
  }, [evidenceQuery.data]);

  // ==========================================================================
  // DERIVED VALUES
  // ==========================================================================

  const status = getStatus(submission);

  const place = submission ? getPlaceLabel(submission) : "—";

  const validVotes = submission ? computeValidVotes(submission) : 0;

  const invalidInBox = submission ? computeInvalidInBox(submission) : 0;

  const ballotsInBox = submission ? computeBallotsInBox(submission) : 0;

  const outsideBox = submission ? computeOutsideBox(submission) : 0;

  const expectedInBox = submission ? computeExpectedInBox(submission) : null;

  const ballotDelta = submission ? computeBallotDelta(submission) : null;

  const turnoutPct = submission ? computeTurnoutPct(submission) : null;

  const validPct = submission ? computeValidPct(submission) : null;

  const invalidPct = submission ? computeInvalidPct(submission) : null;

  const backendEvidenceCount = safeNumber(submission?.tallySheetCount);

  const evidenceCount = Math.max(attachments.length, backendEvidenceCount);

  const evidenceAttached =
    attachments.length > 0 ||
    Boolean(submission?.hasTallySheet) ||
    backendEvidenceCount > 0 ||
    Boolean(submission?.tallySheetUrl);

  const deleted = status === "DELETED";

  const flagged = status === "FLAGGED";

  // ==========================================================================
  // ACTION RULES
  // ==========================================================================

  const canEdit = !deleted && status !== "VERIFIED";

  const canVerify =
    !deleted && canReview && (status === "PENDING" || status === "REJECTED");

  const canFlag =
    !deleted &&
    canReview &&
    !flagged &&
    (status === "PENDING" || status === "VERIFIED" || status === "REJECTED");

  const canUnflag = !deleted && canReview && flagged;

  const canAmend = !deleted && status === "VERIFIED";

  const canDelete = !deleted;

  // ==========================================================================
  // MISSING ID
  // ==========================================================================

  if (!submissionId) {
    return (
      <PageMessage
        title="Missing submission ID"
        description="The vote submission ID could not be determined from the current route."
        onBack={backToList}
      />
    );
  }

  // ==========================================================================
  // LOADING
  // ==========================================================================

  if (submissionQuery.isLoading) {
    return (
      <div className="py-16 text-center">
        <div className="mx-auto h-7 w-7 animate-spin rounded-full border-2 border-slate-200 border-t-blue-600" />

        <div className="mt-3 text-sm font-semibold text-slate-500">
          Loading submission...
        </div>
      </div>
    );
  }

  // ==========================================================================
  // ERROR
  // ==========================================================================

  if (submissionQuery.isError || !submission) {
    const error: any = submissionQuery.error;

    const statusCode = error?.response?.status;

    const message = getFriendlyError(error);

    return (
      <PageMessage
        title="Unable to load vote submission"
        description={statusCode ? `HTTP ${statusCode}: ${message}` : message}
        onBack={backToList}
      />
    );
  }

  // ==========================================================================
  // RENDER
  // ==========================================================================

  return (
    <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-3">
      {/* ================================================================== */}
      {/* HEADER */}
      {/* ================================================================== */}

      <section className="border-b border-slate-200 bg-white pb-4 lg:rounded-xl lg:border lg:p-4">
        <button
          type="button"
          onClick={backToList}
          className="inline-flex h-9 w-fit items-center justify-center gap-1.5 rounded-md bg-[#00095f] px-3 text-xs 
            font-bold leading-none  text-white hover:bg-[#000b73]  hover:text-[#cb3242]"
        >
          <ArrowLeft size={14} className="shrink-0" />
          <span>Back</span>
        </button>

        <div className="mt-2 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl">
                Vote Submission
              </h1>

              <span
                className={[
                  "inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold sm:text-xs",
                  statusClasses(status),
                ].join(" ")}
              >
                {status || "—"}
              </span>
            </div>

            <div className="mt-1.5 text-base font-bold text-slate-900 sm:text-lg">
              {submission.centerName ??
                centerAllocation?.centerName ??
                "Unknown Polling Center"}
            </div>

            <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs font-semibold text-slate-500 sm:text-sm">
              <span>{place}</span>

              <span className="text-slate-300">•</span>

              <span>{submission.contestName ?? "—"}</span>

              <span className="hidden text-slate-300 sm:inline">•</span>

              <span className="hidden sm:inline">
                {submission.electionName ?? "—"}
              </span>
            </div>
          </div>

          {/* ACTIONS */}

          <div className="grid grid-cols-3 gap-1.5 sm:flex sm:flex-wrap sm:gap-2 lg:justify-end">
            <ActionButton
              label="Edit"
              icon={<Pencil size={14} />}
              disabled={!canEdit}
              onClick={() => navigate(`${basePath}/edit`)}
              variant="blue"
            />

            <ActionButton
              label="Verify"
              icon={<CheckCircle2 size={14} />}
              disabled={!canVerify}
              onClick={() => navigate(`${basePath}/verify`)}
              variant="green"
            />

            {flagged ? (
              <ActionButton
                label="Unflag"
                icon={<FlagOff size={14} />}
                disabled={!canUnflag}
                onClick={() => navigate(`${basePath}/unflag`)}
                variant="slate"
              />
            ) : (
              <ActionButton
                label="Flag"
                icon={<Flag size={14} />}
                disabled={!canFlag}
                onClick={() => navigate(`${basePath}/flag`)}
                variant="amber"
              />
            )}

            <ActionButton
              label="Amend"
              icon={<FileEdit size={14} />}
              disabled={!canAmend}
              onClick={() => navigate(`${basePath}/amend`)}
              variant="amber"
            />

            <ActionButton
              label="Delete"
              icon={<Trash2 size={14} />}
              disabled={!canDelete}
              onClick={() => navigate(`${basePath}/delete`)}
              variant="red"
            />
          </div>
        </div>

        {/* SUMMARY */}

        <div className="mt-4 grid grid-cols-3 border-y border-slate-200 py-3 sm:grid-cols-6">
          <SummaryValue
            label="Registered"
            value={formatNumber(submission.registeredVoters)}
          />

          <SummaryValue
            label="Issued"
            value={formatNumber(submission.ballotsIssued)}
          />

          <SummaryValue
            label="Received"
            value={formatNumber(submission.ballotsReceived)}
          />

          <SummaryValue
            label="Valid"
            value={formatNumber(validVotes)}
            emphasis
          />

          <SummaryValue
            label="In Box"
            value={formatNumber(ballotsInBox)}
            emphasis
          />

          <SummaryValue label="Turnout" value={formatPercent(turnoutPct)} />
        </div>
      </section>

      {/* ================================================================== */}
      {/* MAIN GRID */}
      {/* ================================================================== */}

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.85fr)]">
        {/* ================================================================ */}
        {/* LEFT */}
        {/* ================================================================ */}

        <div className="min-w-0 space-y-3">
          {/* ============================================================ */}
          {/* CONTEXT */}
          {/* ============================================================ */}

          <Section title="Submission Context" icon={<MapPin size={16} />}>
            <div className="divide-y divide-slate-200 sm:grid sm:grid-cols-2 sm:divide-y-0">
              <InfoRow
                label="Election"
                value={submission.electionName ?? "—"}
              />

              <InfoRow label="Contest" value={submission.contestName ?? "—"} />

              <InfoRow label="Organization" value={submission.orgName ?? "—"} />

              <InfoRow label="County" value={countyName} />

              <InfoRow label="District" value={districtName} />

              <InfoRow
                label="Polling Center"
                value={
                  submission.centerName ?? centerAllocation?.centerName ?? "—"
                }
              />

              <InfoRow label="Polling Place" value={place} />

              <InfoRow
                label="Center Code"
                value={submission.centerCode ?? "—"}
                className="hidden md:grid"
              />

              <InfoRow
                label="Place Code"
                value={submission.placeCode ?? "—"}
                className="hidden md:grid"
              />

              <InfoRow
                label="Allocation"
                value={submission.allocationSource ?? "—"}
                className="hidden lg:grid"
              />
            </div>
          </Section>

          {/* ============================================================ */}
          {/* BALLOT RECONCILIATION */}
          {/* ============================================================ */}

          <Section title="Ballot Reconciliation" icon={<Vote size={16} />}>
            <div className="grid gap-x-8 gap-y-1 sm:grid-cols-2 xl:grid-cols-3">
              {/* Row 1 */}
              <MetricRow
                label="Registered"
                value={formatNumber(submission.registeredVoters)}
                className="hidden sm:flex"
              />

              <MetricRow
                label="Ballots Issued"
                value={formatNumber(submission.ballotsIssued)}
                className="hidden sm:flex"
              />

              <MetricRow
                label="Ballots Received"
                value={formatNumber(submission.ballotsReceived)}
                className="hidden sm:flex"
              />

              {/* Row 2 */}
              <MetricRow
                label="Valid Votes"
                value={formatNumber(validVotes)}
                emphasis
              />

              <MetricRow
                label="Ballots In Box"
                value={formatNumber(ballotsInBox)}
                emphasis
              />

              <MetricRow
                label="Outside Box"
                value={formatNumber(outsideBox)}
                className="hidden md:flex"
              />

              {/* Row 3 */}
              <MetricRow
                label="Valid %"
                value={formatPercent(validPct)}
                emphasis
              />

              <MetricRow
                label="Unmarked"
                value={formatNumber(submission.unmarkedBallots)}
              />

              <MetricRow
                label="Spoiled"
                value={formatNumber(submission.spoiledBallots)}
                sublabel="Outside box"
              />

              {/* Row 4 */}
              <MetricRow
                label="Invalid"
                value={formatNumber(submission.invalidBallots)}
              />

              <MetricRow
                label="Rejected"
                value={formatNumber(submission.rejectedBallots)}
              />

              <MetricRow
                label="Unused"
                value={formatNumber(submission.unusedBallots)}
                sublabel="Outside box"
              />

              {/* Row 5 */}
              <MetricRow label="Invalid %" value={formatPercent(invalidPct)} />

              <div className="hidden xl:block" />

              <MetricRow
                label="Invalid In Box"
                value={formatNumber(invalidInBox)}
              />

              {/* Row 6 */}
              <MetricRow
                label="Turnout %"
                value={formatPercent(turnoutPct)}
                emphasis
              />

              <MetricRow
                label="Ballot Delta"
                value={formatNumber(ballotDelta)}
                warning={ballotDelta !== null && ballotDelta !== 0}
                className="hidden md:flex"
              />

              <MetricRow
                label="Expected In Box"
                value={formatNumber(expectedInBox)}
                className="hidden md:flex"
              />
            </div>
          </Section>

          {/* ============================================================ */}
          {/* CANDIDATE RESULTS */}
          {/* ============================================================ */}

          <Section
            title="Candidate Results"
            icon={<FileCheck2 size={16} />}
            right={
              <span className="text-xs font-semibold text-slate-500">
                Valid total:{" "}
                <strong className="text-slate-900">
                  {formatNumber(validVotes)}
                </strong>
              </span>
            }
          >
            {optionsQuery.isLoading ? (
              <div className="py-8 text-center text-sm font-semibold text-slate-500">
                Loading candidate results...
              </div>
            ) : candidateRows.length === 0 ? (
              <div className="py-6 text-sm text-slate-500">
                No candidate vote values are available.
              </div>
            ) : (
              <div className="divide-y divide-slate-200">
                <div className="hidden grid-cols-[minmax(0,1fr)_90px] px-1 pb-2 text-[10px] font-bold uppercase tracking-wide text-slate-400 sm:grid">
                  <span>Candidate</span>

                  <span className="text-right">Votes</span>
                </div>

                {candidateRows.map((row) => (
                  <div
                    key={row.id}
                    className="flex items-center justify-between gap-4 py-3 sm:grid sm:grid-cols-[minmax(0,1fr)_90px]"
                  >
                    <div className="min-w-0 truncate text-sm font-bold text-slate-900 sm:text-base">
                      {row.candidateName}

                      <span className="font-semibold text-slate-500">
                        {" - "}
                        {row.partyLabel}
                      </span>
                    </div>

                    <div className="shrink-0 text-right text-base font-extrabold text-blue-700 sm:text-lg">
                      {formatNumber(row.votes)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Section>
        </div>

        {/* ================================================================ */}
        {/* RIGHT */}
        {/* ================================================================ */}

        <div className="min-w-0 space-y-3">
          {/* ============================================================ */}
          {/* EVIDENCE */}
          {/* ============================================================ */}

          <Section title="Evidence / Tally Sheet" icon={<FileText size={16} />}>
            {evidenceQuery.isLoading ? (
              <div className="py-4 text-sm font-semibold text-slate-500">
                Loading evidence...
              </div>
            ) : (
              <>
                <div
                  className={[
                    "flex items-start gap-3 rounded-lg border px-3 py-3",

                    evidenceAttached
                      ? "border-emerald-200 bg-emerald-50"
                      : "border-amber-200 bg-amber-50",
                  ].join(" ")}
                >
                  {evidenceAttached ? (
                    <ShieldCheck
                      size={18}
                      className="mt-0.5 shrink-0 text-emerald-600"
                    />
                  ) : (
                    <AlertTriangle
                      size={18}
                      className="mt-0.5 shrink-0 text-amber-600"
                    />
                  )}

                  <div className="min-w-0">
                    <div
                      className={[
                        "text-sm font-bold",

                        evidenceAttached
                          ? "text-emerald-800"
                          : "text-amber-800",
                      ].join(" ")}
                    >
                      {evidenceAttached
                        ? "Evidence Attached"
                        : "Evidence Missing"}
                    </div>

                    <div className="mt-0.5 text-xs text-slate-600">
                      Attachments: <strong>{evidenceCount}</strong>
                    </div>
                  </div>
                </div>

                {attachments.length > 0 ? (
                  <EvidenceViewer attachments={attachments} />
                ) : evidenceAttached ? (
                  <div className="mt-3 text-xs text-slate-500">
                    Evidence exists, but no attachment metadata was returned.
                  </div>
                ) : null}
              </>
            )}
          </Section>

          {/* ============================================================ */}
          {/* SUBMISSION & REVIEW */}
          {/* ============================================================ */}

          <Section title="Submission & Review" icon={<UserRound size={16} />}>
            <div className="divide-y divide-slate-200">
              <InfoRow
                label="Submitted By"
                value={submission.agentName ?? "—"}
              />

              <InfoRow
                label="Submitted"
                value={formatDate(submission.submissionTime)}
              />

              {submission.verifiedByName || submission.dateVerified ? (
                <>
                  <InfoRow
                    label="Verified By"
                    value={submission.verifiedByName ?? "—"}
                  />

                  <InfoRow
                    label="Verified On"
                    value={formatDate(submission.dateVerified)}
                  />
                </>
              ) : null}

              {submission.flaggedByName || submission.dateFlagged ? (
                <>
                  <InfoRow
                    label="Flagged By"
                    value={submission.flaggedByName ?? "—"}
                  />

                  <InfoRow
                    label="Flagged On"
                    value={formatDate(submission.dateFlagged)}
                  />
                </>
              ) : null}
            </div>
          </Section>

          {/* ============================================================ */}
          {/* RECORD INFORMATION */}
          {/* ============================================================ */}

          <Section title="Record Information" icon={<FileCheck2 size={16} />}>
            <div className="divide-y divide-slate-200">
              <InfoRow
                label="Date Created"
                value={formatDate(submission.dateCreated)}
              />

              <InfoRow
                label="Date Updated"
                value={formatDate(submission.dateUpdated)}
              />

              <InfoRow
                label="Version"
                value={formatNumber(submission.version)}
                className="hidden md:grid"
              />

              <InfoRow
                label="Discrepancy"
                value={
                  submission.hasDiscrepancy === undefined ||
                  submission.hasDiscrepancy === null
                    ? "—"
                    : submission.hasDiscrepancy
                      ? "Yes"
                      : "No"
                }
                className="hidden md:grid"
              />

              {submission.latitude != null && submission.longitude != null ? (
                <InfoRow
                  label="GPS"
                  value={`${submission.latitude}, ${submission.longitude}`}
                  className="hidden lg:grid"
                />
              ) : null}
            </div>

            {submission.comments ? (
              <div className="mt-3 border-t border-slate-200 pt-3">
                <div className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                  Submission Comments
                </div>

                <div className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                  {submission.comments}
                </div>
              </div>
            ) : null}

            {deleted ? (
              <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-3">
                <div className="text-xs font-bold text-red-800">
                  Deleted Record
                </div>

                <div className="mt-1 text-sm text-red-700">
                  Deleted: {formatDate(submission.dateDeleted)}
                </div>
              </div>
            ) : null}
          </Section>

          {/* ============================================================ */}
          {/* DESKTOP-ONLY INTEGRITY */}
          {/* ============================================================ */}

          <details className="group hidden border-b border-slate-200 bg-white lg:block lg:overflow-hidden lg:rounded-xl lg:border">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3">
              <div className="flex min-w-0 items-center gap-2 text-base font-extrabold text-slate-900">
                <Fingerprint size={16} className="text-blue-600" />
                Integrity & Audit
              </div>

              <ChevronDown
                size={16}
                className="text-slate-400 transition-transform group-open:rotate-180"
              />
            </summary>

            <div className="divide-y divide-slate-200 p-4">
              <InfoRow label="Client IP" value={submission.clientIp ?? "—"} />

              <InfoRow
                label="Submission Hash"
                value={
                  <code
                    title={submission.submissionHash ?? ""}
                    className="break-all font-mono text-xs"
                  >
                    {shortHash(submission.submissionHash)}
                  </code>
                }
              />

              <InfoRow
                label="Chain Hash"
                value={
                  <code
                    title={submission.chainHash ?? ""}
                    className="break-all font-mono text-xs"
                  >
                    {shortHash(submission.chainHash)}
                  </code>
                }
              />

              <InfoRow
                label="Signer Key"
                value={submission.submissionSignerKeyId ?? "—"}
              />

              <InfoRow
                label="Idempotency"
                value={submission.idempotencyKey ?? "—"}
              />

              {submission.userAgent ? (
                <InfoRow
                  label="User Agent"
                  value={
                    <span className="break-words text-xs">
                      {submission.userAgent}
                    </span>
                  }
                />
              ) : null}
            </div>
          </details>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// EVIDENCE VIEWER
// ============================================================================

function EvidenceViewer({ attachments }: { attachments: FileUploadDto[] }) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  const selectedFile = attachments[selectedIndex];

  const hasMultiple = attachments.length > 1;

  const previous = () => {
    setSelectedIndex((current) =>
      current <= 0 ? attachments.length - 1 : current - 1,
    );
  };

  const next = () => {
    setSelectedIndex((current) =>
      current >= attachments.length - 1 ? 0 : current + 1,
    );
  };

  return (
    <div className="mt-3">
      {hasMultiple ? (
        <div className="mb-2 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={previous}
            className="inline-flex min-h-9 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 hover:bg-slate-50"
          >
            Previous
          </button>

          <div className="text-xs font-semibold text-slate-500">
            {selectedIndex + 1} of {attachments.length}
          </div>

          <button
            type="button"
            onClick={next}
            className="inline-flex min-h-9 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 hover:bg-slate-50"
          >
            Next
          </button>
        </div>
      ) : null}

      <EvidenceAttachment
        key={selectedFile.fileId}
        file={selectedFile}
        index={selectedIndex}
      />
    </div>
  );
}

// ============================================================================
// EVIDENCE ATTACHMENT
// ============================================================================

function EvidenceAttachment({
  file,
  index,
}: {
  file: FileUploadDto;
  index: number;
}) {
  const [previewUrl, setPreviewUrl] = useState("");

  const [previewOpen, setPreviewOpen] = useState(false);

  const [loadingPreview, setLoadingPreview] = useState(false);

  const [previewError, setPreviewError] = useState(false);

  const [downloadBusy, setDownloadBusy] = useState(false);

  const fileName = getAttachmentName(file, index);

  const image = isImageAttachment(file);

  // ==========================================================================
  // LOAD PREVIEW
  //
  // Mobile:
  // - do not load image until user taps View
  //
  // Tablet/Desktop:
  // - show current selected image inline
  // ==========================================================================

  useEffect(() => {
    let active = true;

    let objectUrl = "";

    if (!image || !file.fileId) {
      return;
    }

    const desktop =
      typeof window !== "undefined" &&
      window.matchMedia("(min-width: 768px)").matches;

    if (!desktop && !previewOpen) {
      return;
    }

    setLoadingPreview(true);

    setPreviewError(false);

    fetchFileBlob(file.fileId)
      .then((blob) => {
        if (!active) {
          return;
        }

        objectUrl = URL.createObjectURL(blob);

        setPreviewUrl(objectUrl);
      })
      .catch(() => {
        if (active) {
          setPreviewError(true);
        }
      })
      .finally(() => {
        if (active) {
          setLoadingPreview(false);
        }
      });

    return () => {
      active = false;

      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [file.fileId, image, previewOpen]);

  // ==========================================================================
  // VIEW
  // ==========================================================================

  const openFile = async () => {
    const mobile =
      typeof window !== "undefined" &&
      !window.matchMedia("(min-width: 768px)").matches;

    if (mobile) {
      setPreviewOpen(true);
      return;
    }

    try {
      const blob = await fetchFileBlob(file.fileId);

      const url = URL.createObjectURL(blob);

      window.open(url, "_blank", "noopener,noreferrer");

      window.setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 60_000);
    } catch {
      // Keep current UI available for retry.
    }
  };

  // ==========================================================================
  // CLOSE MOBILE PREVIEW
  // ==========================================================================

  const closePreview = () => {
    setPreviewOpen(false);
  };

  // ==========================================================================
  // DOWNLOAD
  // ==========================================================================

  const downloadFile = async () => {
    try {
      setDownloadBusy(true);

      const blob = await fetchFileBlob(file.fileId);

      const url = URL.createObjectURL(blob);

      const anchor = document.createElement("a");

      anchor.href = url;

      anchor.download = fileName;

      document.body.appendChild(anchor);

      anchor.click();

      anchor.remove();

      URL.revokeObjectURL(url);
    } finally {
      setDownloadBusy(false);
    }
  };

  // ==========================================================================
  // RENDER
  // ==========================================================================

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
      {/* ==================================================================== */}
      {/* MOBILE */}
      {/* ==================================================================== */}

      <div className="md:hidden">
        {!previewOpen ? (
          // ------------------------------------------------------------------
          // COMPACT MOBILE FILE ROW
          // ------------------------------------------------------------------

          <div className="flex items-center gap-3 p-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
              {image ? <ImageIcon size={21} /> : <FileText size={21} />}
            </div>

            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-bold text-slate-800">
                {fileName}
              </div>

              <div className="mt-0.5 text-[10px] font-semibold text-slate-400">
                {file.mimeType || file.fileType || "Attachment"}
              </div>
            </div>

            <div className="flex shrink-0 gap-1.5">
              <button
                type="button"
                onClick={openFile}
                className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                aria-label="View attachment"
                title="View attachment"
              >
                <Eye size={16} />
              </button>

              <button
                type="button"
                onClick={downloadFile}
                disabled={downloadBusy}
                className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-lg border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 disabled:opacity-50"
                aria-label="Download attachment"
                title="Download attachment"
              >
                <Download size={16} />
              </button>
            </div>
          </div>
        ) : (
          // ------------------------------------------------------------------
          // MOBILE OPEN PREVIEW
          // ------------------------------------------------------------------

          <>
            <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-3 py-2">
              <div className="min-w-0">
                <div className="truncate text-xs font-bold text-slate-800">
                  {fileName}
                </div>

                <div className="text-[10px] font-semibold text-slate-400">
                  {file.mimeType || file.fileType || "Attachment"}
                </div>
              </div>

              <button
                type="button"
                onClick={closePreview}
                className="shrink-0 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600"
              >
                Close
              </button>
            </div>

            {image ? (
              <div className="flex max-h-[65vh] min-h-40 items-center justify-center overflow-auto bg-slate-50">
                {loadingPreview ? (
                  <div className="py-14 text-sm font-semibold text-slate-400">
                    Loading attachment...
                  </div>
                ) : previewUrl ? (
                  <img
                    src={previewUrl}
                    alt={fileName}
                    className="max-h-[65vh] w-full object-contain"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-2 py-12 text-slate-400">
                    <ImageIcon size={26} />

                    <span className="text-xs font-semibold">
                      {previewError
                        ? "Preview unavailable"
                        : "Unable to display image"}
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex min-h-36 flex-col items-center justify-center gap-3 bg-slate-50 px-4 text-center">
                <FileText size={30} className="text-slate-400" />

                <div className="text-xs font-semibold text-slate-500">
                  Preview is not available for this file type.
                </div>

                <button
                  type="button"
                  onClick={downloadFile}
                  disabled={downloadBusy}
                  className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 text-xs font-bold text-blue-700 disabled:opacity-50"
                >
                  <Download size={14} />

                  {downloadBusy ? "Downloading..." : "Download File"}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* ==================================================================== */}
      {/* TABLET / DESKTOP */}
      {/* ==================================================================== */}

      <div className="hidden md:block">
        {image ? (
          <div className="flex min-h-40 items-center justify-center bg-slate-50">
            {loadingPreview ? (
              <div className="py-12 text-sm font-semibold text-slate-400">
                Loading preview...
              </div>
            ) : previewUrl ? (
              <img
                src={previewUrl}
                alt={fileName}
                className="max-h-72 w-full object-contain"
              />
            ) : (
              <div className="flex flex-col items-center gap-2 py-10 text-slate-400">
                <ImageIcon size={26} />

                <span className="text-xs font-semibold">
                  {previewError ? "Preview unavailable" : "Image attachment"}
                </span>
              </div>
            )}
          </div>
        ) : (
          <div className="flex min-h-24 items-center justify-center bg-slate-50">
            <FileText size={28} className="text-slate-400" />
          </div>
        )}

        <div className="flex items-center justify-between gap-3 border-t border-slate-200 px-3 py-2.5">
          <div className="min-w-0">
            <div className="truncate text-xs font-bold text-slate-800">
              {fileName}
            </div>

            <div className="mt-0.5 text-[10px] font-semibold text-slate-400">
              {file.mimeType || file.fileType || "Attachment"}
            </div>
          </div>

          <div className="flex shrink-0 gap-1.5">
            <button
              type="button"
              onClick={openFile}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
            >
              <Eye size={13} />
              View
            </button>

            <button
              type="button"
              onClick={downloadFile}
              disabled={downloadBusy}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-2.5 text-xs font-bold text-blue-700 hover:bg-blue-100 disabled:opacity-50"
            >
              <Download size={13} />

              {downloadBusy ? "Downloading..." : "Download"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// SECTION
// ============================================================================

function Section({
  title,
  icon,
  right,
  children,
}: {
  title: string;
  icon: ReactNode;
  right?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="border-b border-slate-200 bg-white pb-1 lg:overflow-hidden lg:rounded-xl lg:border lg:pb-0">
      <div className="flex items-center justify-between gap-3 border-b border-slate-200 py-2.5 lg:bg-slate-50 lg:px-4 lg:py-3">
        <div className="flex min-w-0 items-center gap-2 text-sm font-extrabold text-slate-900 sm:text-base">
          <span className="shrink-0 text-blue-600">{icon}</span>

          <span className="truncate">{title}</span>
        </div>

        {right ? <div className="shrink-0">{right}</div> : null}
      </div>

      <div className="py-1 lg:p-4">{children}</div>
    </section>
  );
}

// ============================================================================
// INFO ROW
// ============================================================================

function InfoRow({
  label,
  value,
  className = "",
}: {
  label: string;
  value: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={[
        "grid min-w-0 grid-cols-[110px_minmax(0,1fr)] items-start gap-3 py-2.5",
        "sm:grid-cols-[135px_minmax(0,1fr)] sm:px-2",
        "lg:grid-cols-[120px_minmax(0,1fr)] lg:px-2",
        className,
      ].join(" ")}
    >
      <div className="pt-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-400">
        {label}
      </div>

      <div className="min-w-0 break-words text-sm font-semibold text-slate-900">
        {value}
      </div>
    </div>
  );
}

// ============================================================================
// METRIC ROW
// ============================================================================

function MetricRow({
  label,
  value,
  emphasis = false,
  warning = false,
  sublabel,
  className = "",
}: {
  label: string;
  value: ReactNode;
  emphasis?: boolean;
  warning?: boolean;
  sublabel?: string;
  className?: string;
}) {
  return (
    <div
      className={[
        "flex min-h-12 items-center justify-between gap-6 py-3 sm:px-2 lg:px-3",
        className,
      ].join(" ")}
    >
      <div className="min-w-0">
        <div
          className={[
            "text-xs font-semibold",
            warning
              ? "text-red-600"
              : emphasis
                ? "text-blue-600"
                : "text-slate-500",
          ].join(" ")}
        >
          {label}
        </div>

        {sublabel ? (
          <div className="mt-1 text-[9px] font-semibold uppercase tracking-wide text-slate-400">
            {sublabel}
          </div>
        ) : null}
      </div>

      <span
        className={[
          "shrink-0 text-base font-extrabold",
          warning
            ? "text-red-700"
            : emphasis
              ? "text-blue-700"
              : "text-slate-900",
        ].join(" ")}
      >
        {value}
      </span>
    </div>
  );
}

// ============================================================================
// SUMMARY
// ============================================================================

function SummaryValue({
  label,
  value,
  emphasis = false,
}: {
  label: string;
  value: ReactNode;
  emphasis?: boolean;
}) {
  return (
    <div className="min-w-0 px-2 text-center sm:px-3">
      <div
        className={[
          "truncate text-[8px] font-bold uppercase tracking-wide sm:text-[9px]",

          emphasis ? "text-blue-500" : "text-slate-400",
        ].join(" ")}
      >
        {label}
      </div>

      <div
        className={[
          "mt-0.5 truncate text-base font-extrabold sm:text-lg",

          emphasis ? "text-blue-700" : "text-slate-900",
        ].join(" ")}
      >
        {value}
      </div>
    </div>
  );
}

// ============================================================================
// ACTION BUTTON
// ============================================================================

function ActionButton({
  label,
  icon,
  disabled,
  onClick,
  variant,
}: {
  label: string;
  icon: ReactNode;
  disabled?: boolean;
  onClick: () => void;
  variant: ActionVariant;
}) {
  const enabledClass =
    variant === "blue"
      ? "border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100"
      : variant === "green"
        ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
        : variant === "amber"
          ? "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"
          : variant === "red"
            ? "border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
            : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50";

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={[
        "inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg border px-2.5 text-xs font-bold transition sm:px-3",

        disabled
          ? "cursor-not-allowed border-slate-200 bg-slate-50 text-slate-300 opacity-70"
          : enabledClass,
      ].join(" ")}
    >
      {icon}

      {label}
    </button>
  );
}

// ============================================================================
// PAGE MESSAGE
// ============================================================================

function PageMessage({
  title,
  description,
  onBack,
}: {
  title: string;
  description: string;
  onBack: () => void;
}) {
  return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-4">
      <div className="flex items-start gap-3">
        <AlertTriangle size={18} className="mt-0.5 shrink-0 text-red-600" />

        <div className="min-w-0">
          <div className="font-bold text-red-800">{title}</div>

          <div className="mt-1 text-sm text-red-700">{description}</div>

          <button
            type="button"
            onClick={onBack}
            className="mt-3 inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 text-sm font-bold text-red-700"
          >
            <ArrowLeft size={14} />
            Back to Submissions
          </button>
        </div>
      </div>
    </div>
  );
}

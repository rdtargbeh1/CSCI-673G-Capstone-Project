// src/pages/admin-security/oversight/SubmissionActionDetailPage.tsx

import { useMemo, type ReactNode } from "react";

import { useQuery } from "@tanstack/react-query";

import { useNavigate, useParams } from "react-router-dom";

import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  FilePenLine,
  Flag,
  FlagOff,
  History,
  ShieldCheck,
  Trash2,
  XCircle,
} from "lucide-react";

import { AdminShell } from "../shared/admin-ui";

import {
  countVoteSubmissionActionsByType,
  getVoteSubmissionAction,
  type VoteSubmissionActionDto,
  type VoteSubmissionActionType,
} from "../../../shared/services/voteSubmissionActionService";

import { listOptionsByContest } from "../../../shared/services/contestOptionService";

// ============================================================================
// HELPERS
// ============================================================================

function clean(value: unknown) {
  return value == null ? "" : String(value).trim();
}

function formatDate(value?: string | null) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value).replace("T", " ");
  }

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  }).format(date);
}

function actionLabel(actionType: VoteSubmissionActionType) {
  switch (actionType) {
    case "EDIT":
      return "Edited";

    case "VERIFY":
      return "Verified";

    case "REJECT":
      return "Rejected";

    case "FLAG":
      return "Flagged";

    case "UNFLAG":
      return "Unflagged";

    case "AMEND":
      return "Amended";

    case "RESUBMIT":
      return "Resubmitted";

    case "REOPEN":
      return "Reopened";

    case "DELETE":
      return "Deleted";

    default:
      return actionType;
  }
}

function actionIcon(actionType: VoteSubmissionActionType) {
  switch (actionType) {
    case "EDIT":
      return <FilePenLine size={13} />;

    case "VERIFY":
      return <CheckCircle2 size={13} />;

    case "REJECT":
      return <XCircle size={13} />;

    case "FLAG":
      return <Flag size={13} />;

    case "UNFLAG":
      return <FlagOff size={13} />;

    case "AMEND":
      return <FilePenLine size={13} />;

    case "RESUBMIT":
      return <FilePenLine size={13} />;

    case "REOPEN":
      return <History size={13} />;

    case "DELETE":
      return <Trash2 size={13} />;

    default:
      return <History size={13} />;
  }
}

function actionClass(actionType: VoteSubmissionActionType) {
  switch (actionType) {
    case "EDIT":
      return "border-indigo-200 bg-indigo-50 text-indigo-700";

    case "VERIFY":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";

    case "REJECT":
      return "border-red-200 bg-red-50 text-red-700";

    case "FLAG":
      return "border-amber-200 bg-amber-50 text-amber-700";

    case "UNFLAG":
      return "border-teal-200 bg-teal-50 text-teal-700";

    case "AMEND":
      return "border-blue-200 bg-blue-50 text-blue-700";

    case "RESUBMIT":
      return "border-violet-200 bg-violet-50 text-violet-700";

    case "REOPEN":
      return "border-cyan-200 bg-cyan-50 text-cyan-700";

    case "DELETE":
      return "border-red-200 bg-red-50 text-red-700";

    default:
      return "border-slate-200 bg-slate-50 text-slate-700";
  }
}

function formatPlaceNumber(value?: number | null) {
  if (
    value === null ||
    value === undefined ||
    !Number.isFinite(Number(value))
  ) {
    return "";
  }

  return String(value).padStart(2, "0");
}

function placeDisplay(action: VoteSubmissionActionDto) {
  const number = formatPlaceNumber(action.placeNumber);

  const label = clean(action.placeLabel);

  const code = clean(action.placeCode);

  if (number && label) {
    return `Place #${number} • ${label}`;
  }

  if (number && code) {
    return `Place #${number} • ${code}`;
  }

  if (number) {
    return `Place #${number}`;
  }

  return label || code || "—";
}

function errorText(error: any) {
  return (
    clean(error?.response?.data?.message) ||
    clean(error?.response?.data?.error) ||
    clean(error?.message) ||
    "Unable to load submission action."
  );
}

// ============================================================================
// CANDIDATE HELPERS
// ============================================================================

function candidateName(option: any) {
  if (!option) {
    return "";
  }

  if (
    typeof option?.electionCandidate === "string" &&
    clean(option.electionCandidate)
  ) {
    return clean(option.electionCandidate);
  }

  return (
    clean(option?.candidateName) ||
    clean(option?.fullName) ||
    clean(option?.label) ||
    clean(option?.optionLabel) ||
    clean(option?.name) ||
    clean(option?.electionCandidate?.candidateName) ||
    clean(option?.electionCandidate?.fullName) ||
    clean(option?.electionCandidate?.name) ||
    ""
  );
}

function candidateParty(option: any) {
  return (
    clean(option?.abbreviation) ||
    clean(option?.partyAbbreviation) ||
    clean(option?.party?.abbreviation) ||
    clean(option?.politicalParty?.abbreviation) ||
    ""
  );
}

// ============================================================================
// VOTE CHANGE DATA
// ============================================================================

type VoteChangeValue = {
  before?: number | null;
  after?: number | null;
  delta?: number | null;
};

type CandidateVoteChanges = Record<string, VoteChangeValue>;

type VoteActionData = {
  before?: Record<string, any>;

  after?: Record<string, any>;

  changes?: {
    candidateVotes?: CandidateVoteChanges;

    ballotsReceived?: VoteChangeValue;
    ballotsInBox?: VoteChangeValue;
    invalidBallots?: VoteChangeValue;
    unmarkedBallots?: VoteChangeValue;
    rejectedBallots?: VoteChangeValue;
    spoiledBallots?: VoteChangeValue;
    unusedBallots?: VoteChangeValue;

    [key: string]: unknown;
  };

  changedFieldCount?: number;
};

function voteFieldLabel(field: string) {
  switch (field) {
    case "ballotsReceived":
      return "Ballots Received";

    case "ballotsInBox":
      return "Ballots In Box";

    case "invalidBallots":
      return "Invalid Ballots";

    case "unmarkedBallots":
      return "Unmarked Ballots";

    case "rejectedBallots":
      return "Rejected Ballots";

    case "spoiledBallots":
      return "Spoiled Ballots";

    case "unusedBallots":
      return "Unused Ballots";

    default:
      return field;
  }
}

function formatNumber(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  const number = Number(value);

  if (Number.isNaN(number)) {
    return String(value);
  }

  return new Intl.NumberFormat().format(number);
}

function formatDelta(value: unknown) {
  const number = Number(value ?? 0);

  if (!Number.isFinite(number)) {
    return "";
  }

  if (number > 0) {
    return `+${new Intl.NumberFormat().format(number)}`;
  }

  return new Intl.NumberFormat().format(number);
}

function hasVoteChangeData(actionData: unknown) {
  if (!actionData || typeof actionData !== "object") {
    return false;
  }

  const data = actionData as VoteActionData;

  return Boolean(data.changes && Object.keys(data.changes).length > 0);
}

// ============================================================================
// PAGE
// ============================================================================

export default function SubmissionActionDetailPage() {
  const navigate = useNavigate();

  const { actionId = "" } = useParams();

  // ==========================================================================
  // ACTION
  // ==========================================================================

  const actionQ = useQuery({
    enabled: Boolean(actionId),

    queryKey: ["vote-submission-action", actionId],

    queryFn: () => getVoteSubmissionAction(actionId),

    staleTime: 0,

    retry: 1,
  });

  const action = actionQ.data;

  // ==========================================================================
  // ACTION TYPE COUNT FOR THIS SUBMISSION
  // ==========================================================================

  const actionTypeCountQ = useQuery({
    enabled: Boolean(action?.submissionId && action?.actionType),

    queryKey: [
      "vote-submission-action-count-by-type",
      action?.submissionId,
      action?.actionType,
    ],

    queryFn: () =>
      countVoteSubmissionActionsByType(
        String(action!.submissionId),
        action!.actionType,
      ),

    staleTime: 30_000,

    retry: 1,
  });

  const actionTypeCount = Number.isFinite(Number(actionTypeCountQ.data))
    ? Number(actionTypeCountQ.data)
    : null;

  const contestId = clean(action?.contestId);

  // ==========================================================================
  // CONTEST OPTIONS
  //
  // Used only to resolve candidate IDs contained in actionData into names.
  // ==========================================================================

  const optionsQ = useQuery({
    enabled: Boolean(contestId),

    queryKey: ["contest-options", "submission-action-detail", contestId],

    queryFn: () =>
      listOptionsByContest({
        contestId,
        onlyActive: false,
      }) as any,

    staleTime: 60_000,

    retry: 1,
  });

  // ==========================================================================
  // CANDIDATE LOOKUP
  // ==========================================================================

  const candidateLookup = useMemo(() => {
    const result = new Map<
      string,
      {
        name: string;
        party: string;
      }
    >();

    const options = Array.isArray(optionsQ.data) ? optionsQ.data : [];

    for (const option of options) {
      const name = candidateName(option) || "Candidate";

      const party = candidateParty(option);

      const ids = [
        option?.electId,
        option?.optionId,
        option?.id,
        option?.candidateId,
        option?.electionCandidateId,
        option?.electionCandidate?.candidateId,
        option?.electionCandidate?.userId,
      ]
        .filter(Boolean)
        .map((value) => String(value).trim());

      for (const id of ids) {
        if (!id) {
          continue;
        }

        result.set(id, {
          name,
          party,
        });
      }
    }

    return result;
  }, [optionsQ.data]);

  // ==========================================================================
  // BACK
  // ==========================================================================

  function goBack() {
    navigate("/admin-security/submission-actions");
  }

  // ==========================================================================
  // LOADING
  // ==========================================================================

  if (actionQ.isLoading) {
    return (
      <AdminShell
        title="Submission Action Detail"
        subtitle="Loading complete action record."
      >
        <div className="app-detail">
          <div className="mx-auto w-full max-w-[980px] xl:max-w-[1180px] 2xl:max-w-[1320px]">
            <BackButton onClick={goBack} />

            <div className="mt-3 rounded-xl border border-slate-200 bg-white py-14 text-center">
              <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-slate-200 border-t-blue-600" />

              <div className="mt-2 text-xs font-semibold text-slate-500">
                Loading action...
              </div>
            </div>
          </div>
        </div>
      </AdminShell>
    );
  }

  // ==========================================================================
  // ERROR
  // ==========================================================================

  if (actionQ.isError || !action) {
    return (
      <AdminShell
        title="Submission Action Detail"
        subtitle="Complete vote-submission action record."
      >
        <div className="app-detail">
          <div className="mx-auto w-full max-w-[980px] xl:max-w-[1180px] 2xl:max-w-[1320px]">
            <BackButton onClick={goBack} />

            <div className="mt-3 border-l-4 border-red-500 bg-red-50 px-3 py-3">
              <div className="flex items-start gap-2">
                <AlertTriangle
                  size={16}
                  className="mt-0.5 shrink-0 text-red-600"
                />

                <div className="text-xs font-bold text-red-700">
                  {errorText(actionQ.error)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </AdminShell>
    );
  }

  // ==========================================================================
  // RENDER
  // ==========================================================================

  return (
    <AdminShell
      title="Submission Action Detail"
      subtitle="Complete certified action and audit record."
    >
      <div className="app-detail">
        {/* ================================================================== */}
        {/* OLD PAGE WIDTH */}
        {/* ================================================================== */}

        <div className="mx-auto w-full max-w-[980px] xl:max-w-[1180px] 2xl:max-w-[1320px]">
          {/* ================================================================ */}
          {/* BACK */}
          {/* ================================================================ */}

          <BackButton onClick={goBack} />

          {/* ================================================================ */}
          {/* RECORD */}
          {/* ================================================================ */}

          <article className="mt-3 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            {/* ============================================================== */}
            {/* HEADER */}
            {/* ============================================================== */}

            <header className="border-b border-slate-200 bg-slate-50 px-3.5 py-3.5 sm:px-4 sm:py-4">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={[
                    "inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[12px] font-extrabold uppercase tracking-wide",

                    actionClass(action.actionType),
                  ].join(" ")}
                >
                  {actionIcon(action.actionType)}

                  {actionLabel(action.actionType)}
                </span>

                <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-2 py-1 text-[11px] font-extrabold text-slate-700">
                  {actionTypeCountQ.isFetching
                    ? "Counting..."
                    : `${actionTypeCount ?? "—"} ${
                        actionTypeCount === 1 ? "occurrence" : "occurrences"
                      }`}
                </span>

                {action.certificationConfirmed ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#bf0013]">
                    <ShieldCheck size={14} />
                    Certified
                  </span>
                ) : null}
              </div>

              <h2 className="mt-2 text-lg font-extrabold leading-tight text-slate-900 sm:text-xl">
                {clean(action.electionName) || "Election"}
              </h2>

              <div className="mt-0.5 text-[14px] font-semibold text-slate-500 sm:text-sm">
                {clean(action.contestName) || "—"}
              </div>
            </header>

            {/* ============================================================== */}
            {/* OLD TWO-COLUMN BODY */}
            {/* ============================================================== */}

            <div className="2xl:grid 2xl:grid-cols-[minmax(0,1.65fr)_minmax(300px,0.8fr)]">
              {/* ============================================================ */}
              {/* LEFT — PRIMARY RECORD */}
              {/* ============================================================ */}

              <main className="min-w-0 px-3.5 sm:px-4 2xl:border-r 2xl:border-slate-200">
                {/* ========================================================== */}
                {/* LOCATION */}
                {/* ========================================================== */}

                <DetailSection title="Location">
                  <ResponsiveFieldGrid>
                    <Field
                      label="County"
                      value={
                        clean(action.countyName)
                          ? `${action.countyName} County`
                          : "—"
                      }
                    />

                    <Field
                      label="District"
                      value={clean(action.districtName) || "—"}
                    />

                    <Field
                      label="Polling Center"
                      value={clean(action.centerName) || "—"}
                    />

                    <Field label="Polling Place" value={placeDisplay(action)} />
                  </ResponsiveFieldGrid>
                </DetailSection>

                {/* ========================================================== */}
                {/* ACTION */}
                {/* ========================================================== */}

                <DetailSection title="Action">
                  <ResponsiveFieldGrid>
                    <Field
                      label="Action By"
                      value={clean(action.actorName) || "Unknown user"}
                    />

                    <Field
                      label="Action Time"
                      value={formatDate(
                        action.actionTime ?? action.dateCreated,
                      )}
                    />

                    <Field
                      label={`${actionLabel(action.actionType)} Count`}
                      value={
                        actionTypeCountQ.isFetching
                          ? "Loading..."
                          : actionTypeCount !== null
                            ? `${actionTypeCount}`
                            : "—"
                      }
                    />

                    <StatusField
                      label="Status Before"
                      value={clean(action.statusBefore) || "—"}
                    />

                    <StatusField
                      label="Status After"
                      value={clean(action.statusAfter) || "—"}
                    />
                  </ResponsiveFieldGrid>
                </DetailSection>

                {/* ========================================================== */}
                {/* REVIEW */}
                {/* ========================================================== */}

                {clean(action.reason) || clean(action.comments) ? (
                  <DetailSection title="Review Information">
                    <div className="space-y-3">
                      {clean(action.reason) ? (
                        <TextField
                          label="Reason"
                          value={action.reason as string}
                        />
                      ) : null}

                      {clean(action.comments) ? (
                        <TextField
                          label="Comments"
                          value={action.comments as string}
                        />
                      ) : null}
                    </div>
                  </DetailSection>
                ) : null}

                {/* ========================================================== */}
                {/* CERTIFICATION */}
                {/* ========================================================== */}

                <DetailSection title="Certification" last>
                  <ResponsiveFieldGrid>
                    <Field
                      label="Confirmed"
                      value={action.certificationConfirmed ? "Yes" : "No"}
                    />

                    <Field
                      label="Typed Signature"
                      value={clean(action.typedSignature) || "—"}
                    />
                  </ResponsiveFieldGrid>

                  {clean(action.certificationStatement) ? (
                    <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
                      <TextField
                        label="Certification Statement"
                        value={action.certificationStatement as string}
                      />
                    </div>
                  ) : null}
                </DetailSection>
              </main>

              {/* ============================================================ */}
              {/* RIGHT — AUDIT / CHANGES */}
              {/* ============================================================ */}

              <aside className="min-w-0 border-t border-slate-200 bg-slate-50/50 px-3.5 sm:px-4 2xl:border-t-0">
                {/* ========================================================== */}
                {/* TECHNICAL AUDIT */}
                {/* ========================================================== */}

                <DetailSection title="Technical Audit">
                  <div className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2 2xl:grid-cols-1">
                    <Field
                      label="Client IP"
                      value={clean(action.clientIp) || "—"}
                    />

                    <Field
                      label="User Agent"
                      value={clean(action.userAgent) || "—"}
                    />

                    <Field
                      label="Center Code"
                      value={clean(action.centerCode) || "—"}
                    />

                    <Field
                      label="Place Code"
                      value={clean(action.placeCode) || "—"}
                    />
                  </div>
                </DetailSection>

                {/* ========================================================== */}
                {/* VOTE DATA CHANGES */}
                {/* ========================================================== */}

                {hasVoteChangeData(action.actionData) ? (
                  <VoteChangesSection
                    actionData={action.actionData as VoteActionData}
                    candidateLookup={candidateLookup}
                  />
                ) : action.actionData &&
                  Object.keys(action.actionData).length > 0 ? (
                  <DetailSection title="Action Data" last>
                    <pre className="max-h-64 overflow-auto rounded-lg bg-slate-950 p-3 text-[9px] leading-4 text-slate-100 sm:text-[10px]">
                      {JSON.stringify(action.actionData, null, 2)}
                    </pre>
                  </DetailSection>
                ) : null}
              </aside>
            </div>

            {/* ============================================================== */}
            {/* AUDIT REFERENCES — FULL WIDTH HORIZONTAL */}
            {/* ============================================================== */}

            <div className="border-t border-slate-200 bg-slate-50/40 px-3.5 sm:px-4">
              <DetailSection title="Audit References" last>
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                  <Reference label="Action ID" value={action.actionId} />

                  <Reference
                    label="Submission ID"
                    value={action.submissionId}
                  />

                  <Reference label="Organization ID" value={action.orgId} />

                  <Reference label="Actor User ID" value={action.actorUserId} />

                  <Reference label="Election ID" value={action.electionId} />

                  <Reference label="Contest ID" value={action.contestId} />

                  <Reference label="County ID" value={action.countyId} />

                  <Reference label="District ID" value={action.districtId} />

                  <Reference label="Center ID" value={action.centerId} />

                  <Reference label="Polling Place ID" value={action.placeId} />
                </div>
              </DetailSection>
            </div>
          </article>
        </div>
      </div>
    </AdminShell>
  );
}

// ============================================================================
// BACK BUTTON
// ============================================================================

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-9 items-center gap-1.5 rounded-md bg-[#00095f] px-3 text-xs font-bold text-white hover:bg-[#4c59d2]"
    >
      <ArrowLeft size={14} />
      Back
    </button>
  );
}

// ============================================================================
// RESPONSIVE FIELD GRID
// ============================================================================

function ResponsiveFieldGrid({ children }: { children: ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2 lg:gap-x-8">
      {children}
    </div>
  );
}

// ============================================================================
// DETAIL SECTION
// ============================================================================

function DetailSection({
  title,
  children,
  last = false,
}: {
  title: string;
  children: ReactNode;
  last?: boolean;
}) {
  return (
    <section
      className={[
        "py-3.5 sm:py-4",

        last ? "" : "border-b border-slate-200",
      ].join(" ")}
    >
      <h3 className="mb-3 text-[11px] font-extrabold uppercase tracking-[0.08em] text-slate-500 sm:text-[11px]">
        {title}
      </h3>

      {children}
    </section>
  );
}

// ============================================================================
// FIELD
// ============================================================================

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <div className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
        {label}
      </div>

      <div className="mt-1 break-words text-[12px] font-semibold leading-4 text-slate-800 sm:text-base">
        {value}
      </div>
    </div>
  );
}

// ============================================================================
// STATUS FIELD
// ============================================================================

function StatusField({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <div className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
        {label}
      </div>

      <div className="mt-1">
        <span className="inline-flex rounded-md border border-slate-200 bg-slate-100 px-2 py-1 text-[11px] font-extrabold text-slate-700 sm:text-sm">
          {value}
        </span>
      </div>
    </div>
  );
}

// ============================================================================
// TEXT FIELD
// ============================================================================

function TextField({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <div className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
        {label}
      </div>

      <div className="mt-1 whitespace-pre-wrap text-[12px] leading-5 text-slate-700 sm:text-base">
        {value}
      </div>
    </div>
  );
}

// ============================================================================
// VOTE CHANGES
// ============================================================================

function VoteChangesSection({
  actionData,
  candidateLookup,
}: {
  actionData: VoteActionData;

  candidateLookup: Map<
    string,
    {
      name: string;
      party: string;
    }
  >;
}) {
  const changes = actionData.changes ?? {};

  const candidateChanges = changes.candidateVotes ?? {};

  const candidateEntries = Object.entries(candidateChanges);

  const tallyEntries = Object.entries(changes).filter(
    ([field, value]) =>
      field !== "candidateVotes" && value && typeof value === "object",
  ) as Array<[string, VoteChangeValue]>;

  return (
    <DetailSection title="Vote Data Changes" last>
      <div className="space-y-4  ">
        {/* ================================================================ */}
        {/* CANDIDATE VOTES */}
        {/* ================================================================ */}

        {candidateEntries.length > 0 ? (
          <div>
            <div className="mb-2 flex items-center justify-between gap-2 ">
              <div className="text-[13px] font-extrabold uppercase tracking-wide text-slate-400 ">
                Candidate Votes
              </div>

              <div className="text-[11px] font-semibold text-slate-600">
                {candidateEntries.length} changed
              </div>
            </div>

            <div className="overflow-hidden rounded-lg border border-slate-200 bg-blue-50">
              {candidateEntries.map(([candidateId, change], index) => {
                const candidate = candidateLookup.get(candidateId);

                const displayName = candidate?.name || "Unknown Candidate";

                const party = candidate?.party || "";

                return (
                  <div
                    key={candidateId}
                    className={[
                      "px-2 py-1.5",

                      index > 0 ? "border-t border-slate-100" : "",
                    ].join(" ")}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="break-words text-[13px] font-bold text-slate-800">
                          {displayName}

                          {party ? (
                            <span className="ml-1 font-semibold text-slate-400">
                              • {party}
                            </span>
                          ) : null}
                        </div>

                        {/* <div
                          title={candidateId}
                          className="mt-0.5 truncate font-mono text-[7px] text-slate-400"
                        >
                          {candidateId}
                        </div> */}
                      </div>

                      <ChangeValues change={change} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}

        {/* ================================================================ */}
        {/* BALLOT / TALLY */}
        {/* ================================================================ */}

        {tallyEntries.length > 0 ? (
          <div>
            <div className="mb-2 text-[12px] font-extrabold uppercase tracking-wide text-slate-400">
              Ballot & Tally Changes
            </div>

            <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
              {tallyEntries.map(([field, change], index) => (
                <div
                  key={field}
                  className={[
                    "grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-3 py-2.5",

                    index > 0 ? "border-t border-slate-100" : "",
                  ].join(" ")}
                >
                  <div className="text-[12px] font-bold text-slate-700">
                    {voteFieldLabel(field)}
                  </div>

                  <ChangeValues change={change} />
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {candidateEntries.length === 0 && tallyEntries.length === 0 ? (
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-xs font-semibold text-slate-500">
            No vote-data values changed.
          </div>
        ) : null}
      </div>
    </DetailSection>
  );
}

// ============================================================================
// CHANGE VALUES
// ============================================================================

function ChangeValues({ change }: { change: VoteChangeValue }) {
  return (
    <div className="flex shrink-0 items-center gap-1.5 whitespace-nowrap">
      <span className="text-[10px] font-bold text-slate-500">
        {formatNumber(change.before)}
      </span>

      <span className="text-[10px] font-black text-slate-300">→</span>

      <span className="text-[12px] font-extrabold text-slate-900">
        {formatNumber(change.after)}
      </span>

      <DeltaBadge value={change.delta} />
    </div>
  );
}

// ============================================================================
// DELTA BADGE
// ============================================================================

function DeltaBadge({ value }: { value?: number | null }) {
  const delta = Number(value ?? 0);

  if (!Number.isFinite(delta)) {
    return null;
  }

  return (
    <span
      className={[
        "inline-flex min-w-[36px] justify-center rounded-md border px-1.5 py-0.5 text-[10px] font-extrabold",

        delta > 0
          ? "border-emerald-200 bg-emerald-50 text-[#0013bf]"
          : delta < 0
            ? "border-red-200 bg-red-50 text-[#bf0013]"
            : "border-slate-200 bg-slate-50 text-slate-500",
      ].join(" ")}
    >
      {formatDelta(delta)}
    </span>
  );
}

// ============================================================================
// REFERENCE
// ============================================================================

function Reference({ label, value }: { label: string; value?: string | null }) {
  const displayValue = clean(value) || "—";

  return (
    <div className="min-w-0">
      <div className="text-[9px] font-bold uppercase tracking-wide text-slate-400">
        {label}
      </div>

      <div
        title={displayValue}
        className="mt-1 truncate rounded-md border border-slate-200 bg-white px-2 py-1.5 font-mono text-[10px] leading-4 text-slate-600"
      >
        {displayValue}
      </div>
    </div>
  );
}

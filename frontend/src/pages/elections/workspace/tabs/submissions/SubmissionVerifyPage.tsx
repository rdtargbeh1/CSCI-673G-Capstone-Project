// src/pages/elections/workspace/tabs/submissions/SubmissionVerifyPage.tsx

import { useMemo, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";

import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  FileCheck2,
  FileText,
  MapPin,
  Vote,
  XCircle,
} from "lucide-react";

import { useAuthStore } from "../../../../../shared/store/authStore";
import { Panel } from "../../../shared/elections-ui";

import {
  getSubmission,
  verifySubmission,
} from "../../../../../shared/services/voteSubmissionService";

import { fetchMe } from "../../../../../shared/services/userService";

import SubmissionCertification, {
  certificationReady,
} from "./shared/SubmissionCertification";

// ============================================================================
// HELPERS
// ============================================================================

function num(value: unknown) {
  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : 0;
}

function validVotes(submission: any) {
  if (Number.isFinite(Number(submission?.validVotes))) {
    return Number(submission.validVotes);
  }

  return Object.values(submission?.candidateVotes ?? {}).reduce(
    (total: number, value: any) => total + num(value),
    0,
  );
}

function invalidInBox(submission: any) {
  return (
    num(submission?.invalidBallots) +
    num(submission?.rejectedBallots) +
    num(submission?.unmarkedBallots)
  );
}

function ballotsInBox(submission: any) {
  if (Number.isFinite(Number(submission?.ballotsInBox))) {
    return Number(submission.ballotsInBox);
  }

  return validVotes(submission) + invalidInBox(submission);
}

function turnoutPct(submission: any) {
  const backend = Number(submission?.turnoutPct);

  if (Number.isFinite(backend) && backend > 0) {
    return backend;
  }

  const registered = num(submission?.registeredVoters);

  if (!registered) {
    return null;
  }

  return (ballotsInBox(submission) / registered) * 100;
}

function formatNumber(value: unknown) {
  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed.toLocaleString() : "—";
}

function formatPercent(value: number | null) {
  if (value === null || !Number.isFinite(value)) {
    return "—";
  }

  return `${value.toFixed(2)}%`;
}

function evidenceCount(submission: any) {
  const count = num(submission?.tallySheetCount);

  if (count > 0) {
    return count;
  }

  if (
    submission?.hasTallySheet ||
    String(submission?.tallySheetUrl ?? "").trim()
  ) {
    return 1;
  }

  return 0;
}

function placeLabel(submission: any) {
  return (
    submission?.placeLabel ??
    (submission?.placeNumber != null
      ? `Place ${submission.placeNumber}`
      : (submission?.placeCode ?? "—"))
  );
}

function errorText(error: any) {
  return (
    error?.response?.data?.message ??
    error?.response?.data?.error ??
    error?.message ??
    "Verification failed."
  );
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function SubmissionVerifyPage({
  submissionId,
}: {
  submissionId: string;
}) {
  const navigate = useNavigate();

  const queryClient = useQueryClient();

  const { electionId } = useParams();

  const currentOrgId = useAuthStore((state: any) => state.currentOrgId);

  const user = useAuthStore((state: any) => state.user);

  // ==========================================================================
  // FORM STATE
  // ==========================================================================

  const [decision, setDecision] = useState<"ACCEPT" | "REJECT">("ACCEPT");

  const [comment, setComment] = useState("");

  const [signature, setSignature] = useState("");

  const [certified, setCertified] = useState(false);

  // ==========================================================================
  // SUBMISSION
  // ==========================================================================

  const submissionQ = useQuery({
    enabled: Boolean(submissionId),

    queryKey: ["vote-submission", "verify", submissionId],

    queryFn: () => getSubmission(submissionId),

    staleTime: 0,

    retry: 1,
  });

  const submission: any = submissionQ.data;

  // ==========================================================================
  // REVIEWER
  // ==========================================================================

  const meQ = useQuery({
    enabled: Boolean(currentOrgId),

    queryKey: ["users", "me", "verify", currentOrgId],

    queryFn: () => fetchMe(String(currentOrgId)),

    staleTime: 60_000,
  });

  const reviewer: any = meQ.data ?? user;

  const reviewerId = String(reviewer?.userId ?? "");

  const reviewerName =
    [reviewer?.firstName, reviewer?.middleName, reviewer?.lastName]
      .filter(Boolean)
      .join(" ")
      .trim() ||
    reviewer?.userName ||
    "";

  // ==========================================================================
  // SNAPSHOT
  // ==========================================================================

  const snapshot = useMemo(() => {
    if (!submission) {
      return {
        valid: 0,

        invalid: 0,

        inBox: 0,

        turnout: null as number | null,

        evidence: 0,
      };
    }

    return {
      valid: validVotes(submission),

      invalid: invalidInBox(submission),

      inBox: ballotsInBox(submission),

      turnout: turnoutPct(submission),

      evidence: evidenceCount(submission),
    };
  }, [submission]);

  // ==========================================================================
  // CERTIFICATION
  // ==========================================================================

  const rejectCommentReady = decision !== "REJECT" || comment.trim().length > 0;

  const certificationStatement =
    decision === "ACCEPT"
      ? "I reviewed this vote submission and its supporting evidence and authorize verification."
      : "I reviewed this vote submission and its supporting evidence and authorize rejection.";

  const certificationComplete = certificationReady(
    reviewerName,
    signature,
    certified,
  );

  // ==========================================================================
  // MUTATION
  // ==========================================================================

  const verifyM = useMutation({
    mutationFn: () =>
      verifySubmission(submissionId, {
        verifierUserId: reviewerId,

        accept: decision === "ACCEPT",

        comment: comment.trim() || undefined,

        // ==============================================================
        // ACTION CERTIFICATION
        // ==============================================================

        typedSignature: signature.trim(),

        certificationStatement,

        certificationConfirmed: certified,
      } as any),

    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["vote-submission"],
      });

      await queryClient.invalidateQueries({
        queryKey: ["vote-submissions"],
      });

      await queryClient.invalidateQueries({
        queryKey: ["vote-submission-actions", submissionId],
      });

      navigate(`/elections/${electionId}/submissions/${submissionId}`);
    },
  });

  // ==========================================================================
  // SUBMIT READINESS
  // ==========================================================================

  const submitReady =
    Boolean(reviewerId) &&
    rejectCommentReady &&
    certificationComplete &&
    !verifyM.isPending;

  // ==========================================================================
  // NAVIGATION
  // ==========================================================================

  const back = () =>
    navigate(`/elections/${electionId}/submissions/${submissionId}`);

  // ==========================================================================
  // LOADING
  // ==========================================================================

  if (submissionQ.isLoading) {
    return (
      <div className="app-form py-10 text-center">
        <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-slate-200 border-t-blue-600" />

        <div className="mt-2 text-xs font-semibold text-slate-500">
          Loading submission...
        </div>
      </div>
    );
  }

  // ==========================================================================
  // ERROR
  // ==========================================================================

  if (submissionQ.isError || !submission) {
    return (
      <div className="app-form">
        <Panel title="Verify Vote Submission">
          <div className="border-l-4 border-red-500 bg-red-50 px-3 py-3">
            <div className="flex items-start gap-2">
              <AlertTriangle
                size={16}
                className="mt-0.5 shrink-0 text-red-600"
              />

              <div>
                <div className="text-sm font-bold text-red-800">
                  Unable to load submission
                </div>

                <div className="mt-1 text-xs text-red-700">
                  {errorText(submissionQ.error)}
                </div>
              </div>
            </div>
          </div>
        </Panel>
      </div>
    );
  }

  return (
    <div className="app-form">
      <Panel title="Verify Vote Submission">
        <main className="mx-auto w-full max-w-[1000px] pb-14">
          {/* ============================================================ */}
          {/* BACK */}
          {/* ============================================================ */}

          <button
            type="button"
            onClick={back}
            className="inline-flex h-8 w-fit items-center justify-center gap-1 rounded-md bg-[#00095f] px-2.5 text-[11px] font-bold leading-none text-white hover:bg-[#000b73] hover:text-[#cb3242] sm:h-9 sm:px-3 sm:text-xs"
          >
            <ArrowLeft size={13} className="shrink-0" />

            <span>Back</span>
          </button>

          {/* ============================================================ */}
          {/* SUBMISSION SNAPSHOT */}
          {/* ============================================================ */}

          <section className="mt-2 border-b border-slate-200 pb-2">
            <div className="flex items-start gap-2">
              <MapPin size={15} className="mt-0.5 shrink-0 text-blue-600" />

              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-extrabold text-slate-900">
                  {submission.centerName ?? "Unknown Polling Center"}
                </div>

                <div className="mt-0.5 text-[10px] font-semibold text-slate-500 sm:text-xs">
                  {placeLabel(submission)} • {submission.contestName ?? "—"}
                </div>
              </div>
            </div>

            <div className="mt-2 grid grid-cols-3 gap-y-2 border-y border-slate-100 py-2 sm:grid-cols-6">
              <SnapshotValue
                label="Registered"
                value={formatNumber(submission.registeredVoters)}
              />

              <SnapshotValue
                label="Received"
                value={formatNumber(submission.ballotsReceived)}
              />

              <SnapshotValue
                label="Valid"
                value={formatNumber(snapshot.valid)}
                emphasis
              />

              <SnapshotValue
                label="Invalid"
                value={formatNumber(snapshot.invalid)}
              />

              <SnapshotValue
                label="In Box"
                value={formatNumber(snapshot.inBox)}
                emphasis
              />

              <SnapshotValue
                label="Turnout"
                value={formatPercent(snapshot.turnout)}
              />
            </div>

            <div className="mt-1.5 flex justify-between text-[9px] text-slate-500">
              <span>
                Evidence{" "}
                <strong className="text-emerald-700">
                  {snapshot.evidence}
                </strong>
              </span>

              <span>
                Status{" "}
                <strong className="text-slate-700">
                  {String(submission.status ?? "—").toUpperCase()}
                </strong>
              </span>
            </div>
          </section>

          {/* ============================================================ */}
          {/* DECISION */}
          {/* ============================================================ */}

          <FlatSection title="Review Decision" icon={<Vote size={14} />}>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setDecision("ACCEPT");

                  setCertified(false);
                }}
                className={[
                  "flex h-10 items-center justify-center gap-1.5 rounded-md border text-[11px] font-bold sm:text-sm",

                  decision === "ACCEPT"
                    ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                    : "border-slate-200 bg-white text-slate-700",
                ].join(" ")}
              >
                <CheckCircle2 size={15} />
                Verify
              </button>

              <button
                type="button"
                onClick={() => {
                  setDecision("REJECT");

                  setCertified(false);
                }}
                className={[
                  "flex h-10 items-center justify-center gap-1.5 rounded-md border text-[11px] font-bold sm:text-sm",

                  decision === "REJECT"
                    ? "border-red-300 bg-red-50 text-red-700"
                    : "border-slate-200 bg-white text-slate-700",
                ].join(" ")}
              >
                <XCircle size={15} />
                Reject
              </button>
            </div>
          </FlatSection>

          {/* ============================================================ */}
          {/* COMMENT */}
          {/* ============================================================ */}

          <FlatSection
            title="Review Comment"
            icon={<FileText size={14} />}
            right={
              <span
                className={[
                  "text-[8px] font-bold uppercase",

                  decision === "REJECT" ? "text-red-600" : "text-slate-400",
                ].join(" ")}
              >
                {decision === "REJECT" ? "Required" : "Optional"}
              </span>
            }
          >
            <textarea
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              rows={3}
              placeholder={
                decision === "REJECT"
                  ? "Explain why this submission is being rejected..."
                  : "Add review findings or observations..."
              }
              className="w-full resize-y rounded-md border border-slate-300 px-2.5 py-2 text-[11px] outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-100 sm:text-sm"
            />

            <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-2 text-[9px]">
              <span className="flex items-center gap-1 font-semibold text-slate-600">
                <FileCheck2
                  size={12}
                  className={
                    snapshot.evidence > 0
                      ? "text-emerald-600"
                      : "text-amber-600"
                  }
                />
                Supporting Evidence
              </span>

              <strong
                className={
                  snapshot.evidence > 0 ? "text-emerald-700" : "text-amber-700"
                }
              >
                {snapshot.evidence}
              </strong>
            </div>
          </FlatSection>

          {/* ============================================================ */}
          {/* CERTIFICATION */}
          {/* ============================================================ */}

          <SubmissionCertification
            title="Reviewer Certification"
            signerName={reviewerName}
            value={signature}
            confirmed={certified}
            onChange={(value) => {
              setSignature(value);

              setCertified(false);
            }}
            onConfirmedChange={setCertified}
            statement={certificationStatement}
          />

          {/* ============================================================ */}
          {/* MUTATION ERROR */}
          {/* ============================================================ */}

          {verifyM.isError ? (
            <div className="mt-2 border-l-4 border-red-500 bg-red-50 px-3 py-2 text-xs font-bold text-red-700">
              {errorText(verifyM.error)}
            </div>
          ) : null}
        </main>

        {/* ================================================================ */}
        {/* ACTIONS */}
        {/* ================================================================ */}

        <div className="sticky bottom-0 z-20 border-t border-slate-200 bg-white/95 shadow-[0_-3px_10px_rgba(15,23,42,0.04)] backdrop-blur">
          <div className="mx-auto grid w-full max-w-[1000px] grid-cols-[.8fr_1.2fr] gap-2 py-2 sm:flex sm:justify-end">
            <button
              type="button"
              onClick={back}
              disabled={verifyM.isPending}
              className="min-h-9 rounded-md border border-slate-300 px-3 text-xs font-bold"
            >
              Cancel
            </button>

            <button
              type="button"
              disabled={!submitReady}
              onClick={() => verifyM.mutate()}
              className={[
                "inline-flex min-h-9 items-center justify-center gap-1.5 rounded-md px-3 text-xs font-extrabold text-white disabled:bg-slate-400 sm:min-w-[160px]",

                decision === "REJECT"
                  ? "bg-red-700 hover:bg-red-800"
                  : "bg-blue-700 hover:bg-blue-800",
              ].join(" ")}
            >
              {decision === "REJECT" ? (
                <XCircle size={13} />
              ) : (
                <CheckCircle2 size={13} />
              )}

              {verifyM.isPending
                ? "Submitting..."
                : decision === "REJECT"
                  ? "Reject Submission"
                  : "Verify Submission"}
            </button>
          </div>
        </div>
      </Panel>
    </div>
  );
}

// ============================================================================
// FLAT SECTION
// ============================================================================

function FlatSection({
  title,
  icon,
  right,
  children,
}: {
  title: string;
  icon?: ReactNode;
  right?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="border-b border-slate-200 py-2.5">
      <header className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          {icon ? <span className="text-blue-600">{icon}</span> : null}

          <h2 className="text-[12px] font-extrabold text-slate-900 sm:text-sm">
            {title}
          </h2>
        </div>

        {right}
      </header>

      {children}
    </section>
  );
}

// ============================================================================
// SNAPSHOT VALUE
// ============================================================================

function SnapshotValue({
  label,
  value,
  emphasis = false,
}: {
  label: string;
  value: ReactNode;
  emphasis?: boolean;
}) {
  return (
    <div className="text-center">
      <div className="text-[7px] font-bold uppercase text-slate-400">
        {label}
      </div>

      <div
        className={[
          "mt-0.5 text-[12px] font-extrabold sm:text-sm",

          emphasis ? "text-blue-700" : "text-slate-900",
        ].join(" ")}
      >
        {value}
      </div>
    </div>
  );
}

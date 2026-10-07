// src/pages/elections/workspace/tabs/submissions/SubmissionResubmitPage.tsx

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";

import {
  AlertTriangle,
  ArrowLeft,
  MapPin,
  RotateCcw,
  Vote,
} from "lucide-react";

import { useAuthStore } from "../../../../../shared/store/authStore";
import { Panel } from "../../../shared/elections-ui";

import {
  getSubmission,
  resubmitRejectedSubmission,
} from "../../../../../shared/services/voteSubmissionService";

import { listOptionsByContest } from "../../../../../shared/services/contestOptionService";
import { fetchMe } from "../../../../../shared/services/userService";

import SubmissionCertification, {
  certificationReady,
} from "./shared/SubmissionCertification";

// ============================================================================
// HELPERS
// ============================================================================

function clamp(value: unknown) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed < 0) {
    return 0;
  }

  return Math.floor(parsed);
}

function num(value: unknown) {
  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : 0;
}

function sum(values: Record<string, number>) {
  return Object.values(values).reduce(
    (total, value) => total + (Number(value) || 0),
    0,
  );
}

function candidateName(option: any) {
  return (
    option?.electionCandidate ??
    option?.candidateName ??
    option?.fullName ??
    option?.label ??
    option?.optionLabel ??
    "Candidate"
  );
}

function partyLabel(option: any) {
  const abbreviation = String(
    option?.abbreviation ?? option?.partyAbbreviation ?? "",
  ).trim();

  return abbreviation || "Independent";
}

function placeLabel(submission: any) {
  return (
    submission?.placeLabel ??
    (submission?.placeNumber != null
      ? `Place ${submission.placeNumber}`
      : (submission?.placeCode ?? "—"))
  );
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

function errorText(error: any) {
  return (
    error?.response?.data?.message ??
    error?.response?.data?.error ??
    error?.message ??
    "The submission could not be resubmitted."
  );
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function SubmissionResubmitPage({
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

  const [reason, setReason] = useState("");

  const [signature, setSignature] = useState("");

  const [certified, setCertified] = useState(false);

  const [candidateVotes, setCandidateVotes] = useState<Record<string, number>>(
    {},
  );

  const [invalidBallots, setInvalidBallots] = useState<number | "">("");

  const [rejectedBallots, setRejectedBallots] = useState<number | "">("");

  const [unmarkedBallots, setUnmarkedBallots] = useState<number | "">("");

  const [spoiledBallots, setSpoiledBallots] = useState<number | "">("");

  const [unusedBallots, setUnusedBallots] = useState<number | "">("");

  // ==========================================================================
  // SUBMISSION
  // ==========================================================================

  const submissionQ = useQuery({
    enabled: Boolean(submissionId),

    queryKey: ["vote-submission", "resubmit", submissionId],

    queryFn: () => getSubmission(submissionId),

    staleTime: 0,

    retry: 1,
  });

  const submission: any = submissionQ.data;

  const contestId = String(submission?.contestId ?? "");

  const status = String(submission?.status ?? "").toUpperCase();

  const validStatus = status === "REJECTED";

  // ==========================================================================
  // OPTIONS
  // ==========================================================================

  const optionsQ = useQuery({
    enabled: Boolean(contestId),

    queryKey: ["contest-options", "resubmit", contestId],

    queryFn: () =>
      listOptionsByContest({
        contestId,

        onlyActive: true,
      }) as any,

    staleTime: 60_000,
  });

  const options = useMemo(
    () =>
      (optionsQ.data ?? [])
        .filter(
          (option: any) =>
            String(option?.optionType ?? "").toUpperCase() === "CANDIDATE",
        )
        .sort((a: any, b: any) => (a.optionOrder ?? 0) - (b.optionOrder ?? 0)),

    [optionsQ.data],
  );

  // ==========================================================================
  // HYDRATE CURRENT REJECTED VALUES
  // ==========================================================================

  useEffect(() => {
    if (!submission) {
      return;
    }

    setCandidateVotes(submission.candidateVotes ?? {});

    setInvalidBallots(submission.invalidBallots ?? "");

    setRejectedBallots(submission.rejectedBallots ?? "");

    setUnmarkedBallots(submission.unmarkedBallots ?? "");

    setSpoiledBallots(submission.spoiledBallots ?? "");

    setUnusedBallots(submission.unusedBallots ?? "");
  }, [submission]);

  // ==========================================================================
  // ACTOR
  // ==========================================================================

  const meQ = useQuery({
    enabled: Boolean(currentOrgId),

    queryKey: ["users", "me", "resubmit", currentOrgId],

    queryFn: () => fetchMe(String(currentOrgId)),

    staleTime: 60_000,
  });

  const actor: any = meQ.data ?? user;

  const actorId = String(actor?.userId ?? "");

  /*
   * Backend certification validates:
   *
   * firstName + lastName
   *
   * and falls back to userName when the name is unavailable.
   *
   * Middle name is intentionally excluded.
   */
  const actorName =
    [actor?.firstName, actor?.lastName].filter(Boolean).join(" ").trim() ||
    actor?.userName ||
    "";

  // ==========================================================================
  // CALCULATIONS
  // ==========================================================================

  const validVotes = sum(candidateVotes);

  const invalidInBox =
    num(invalidBallots) + num(rejectedBallots) + num(unmarkedBallots);

  /*
   * Backend requires:
   *
   * ballotsInBox =
   * candidate votes
   * + invalid
   * + rejected
   * + unmarked
   */
  const ballotsInBox = validVotes + invalidInBox;

  const outsideBox = num(spoiledBallots) + num(unusedBallots);

  const registered = num(submission?.registeredVoters);

  const ballotsIssued = num(submission?.ballotsIssued);

  const ballotsReceived = num(submission?.ballotsReceived);

  const validPct = ballotsInBox > 0 ? (validVotes / ballotsInBox) * 100 : null;

  const invalidPct =
    ballotsInBox > 0 ? (invalidInBox / ballotsInBox) * 100 : null;

  const turnoutPct = registered > 0 ? (ballotsInBox / registered) * 100 : null;

  const expectedInBox = ballotsReceived - outsideBox;

  const ballotDelta = ballotsInBox - expectedInBox;

  // ==========================================================================
  // ORIGINAL VALUES
  // ==========================================================================

  const originalCandidateVotes = submission?.candidateVotes ?? {};

  const originalInvalid = num(submission?.invalidBallots);

  const originalRejected = num(submission?.rejectedBallots);

  const originalUnmarked = num(submission?.unmarkedBallots);

  const originalSpoiled = num(submission?.spoiledBallots);

  const originalUnused = num(submission?.unusedBallots);

  // ==========================================================================
  // CHANGES
  // ==========================================================================

  const hasChanges = useMemo(() => {
    if (!submission) {
      return false;
    }

    const candidateChanged = options.some((option: any) => {
      const key = String(option.electId ?? option.optionId ?? option.id);

      return (
        num(candidateVotes[key]) !== num(submission?.candidateVotes?.[key])
      );
    });

    const ballotChanged =
      num(invalidBallots) !== originalInvalid ||
      num(rejectedBallots) !== originalRejected ||
      num(unmarkedBallots) !== originalUnmarked ||
      num(spoiledBallots) !== originalSpoiled ||
      num(unusedBallots) !== originalUnused;

    return candidateChanged || ballotChanged;
  }, [
    submission,
    options,
    candidateVotes,
    invalidBallots,
    rejectedBallots,
    unmarkedBallots,
    spoiledBallots,
    unusedBallots,
    originalInvalid,
    originalRejected,
    originalUnmarked,
    originalSpoiled,
    originalUnused,
  ]);

  // ==========================================================================
  // VALIDATION
  // ==========================================================================

  const reasonReady = reason.trim().length > 0;

  /*
   * The agent may correct a rejected submission.
   *
   * A correction is expected in the normal workflow, but the backend also
   * permits resubmission using the existing values when the rejection itself
   * did not require changing vote totals.
   *
   * Therefore we DO NOT require hasChanges to enable resubmission.
   */

  const certificationStatement =
    "I reviewed this rejected submission and certify that the values being resubmitted accurately reflect the supporting election record.";

  const certificationComplete = certificationReady(
    actorName,
    signature,
    certified,
  );

  // ==========================================================================
  // BALLOT VALIDATION
  // ==========================================================================

  /*
   * Backend strict inventory rule:
   *
   * ballotsIssued =
   * ballotsInBox
   * + unusedBallots
   * + spoiledBallots
   */
  const issuedReconciles =
    ballotsIssued <= 0 ||
    ballotsIssued === ballotsInBox + num(unusedBallots) + num(spoiledBallots);

  const turnoutValid = registered <= 0 || ballotsInBox <= registered;

  // ==========================================================================
  // MUTATION
  // ==========================================================================

  const resubmitM = useMutation({
    mutationFn: () =>
      resubmitRejectedSubmission(submissionId, {
        actorUserId: actorId,

        reason: reason.trim(),

        candidateVotes,

        ballotsInBox,

        invalidBallots: num(invalidBallots),

        rejectedBallots: num(rejectedBallots),

        unmarkedBallots: num(unmarkedBallots),

        spoiledBallots: num(spoiledBallots),

        unusedBallots: num(unusedBallots),

        // ====================================================================
        // ACTION CERTIFICATION
        // ====================================================================

        typedSignature: signature.trim(),

        certificationStatement,

        certificationConfirmed: certified,
      }),

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

  const canSubmit =
    validStatus &&
    reasonReady &&
    certificationComplete &&
    issuedReconciles &&
    turnoutValid &&
    ballotsInBox > 0 &&
    Boolean(actorId) &&
    !resubmitM.isPending;

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

        <div className="mt-2 text-xs text-slate-500">
          Loading rejected submission...
        </div>
      </div>
    );
  }

  // ==========================================================================
  // LOAD ERROR
  // ==========================================================================

  if (submissionQ.isError || !submission) {
    return (
      <div className="app-form">
        <Panel title="Correct & Resubmit Vote Submission">
          <div className="border-l-4 border-red-500 bg-red-50 px-3 py-3 text-xs text-red-700">
            {errorText(submissionQ.error)}
          </div>
        </Panel>
      </div>
    );
  }

  // ==========================================================================
  // RENDER
  // ==========================================================================

  return (
    <div className="app-form">
      <Panel title="Correct & Resubmit Vote Submission">
        <main className="mx-auto w-full max-w-[1100px] pb-14">
          {/* ================================================================ */}
          {/* BACK */}
          {/* ================================================================ */}

          <button
            type="button"
            onClick={back}
            className="inline-flex h-8 w-fit items-center justify-center gap-1 rounded-md bg-[#00095f] px-2.5 text-[11px] font-bold leading-none text-white hover:bg-[#000b73] hover:text-[#cb3242] sm:h-9 sm:px-3 sm:text-xs"
          >
            <ArrowLeft size={13} className="shrink-0" />

            <span>Back</span>
          </button>

          {/* ================================================================ */}
          {/* SUBMISSION */}
          {/* ================================================================ */}

          <section className="mt-2 flex items-start gap-2 border-b border-slate-200 pb-2">
            <MapPin size={15} className="mt-0.5 shrink-0 text-blue-600" />

            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-extrabold text-slate-900">
                {submission.centerName ?? "Unknown Polling Center"}
              </div>

              <div className="text-[10px] font-semibold text-slate-500">
                {placeLabel(submission)} • {submission.contestName ?? "—"}
              </div>
            </div>

            <span className="rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[8px] font-bold text-red-700">
              {status || "REJECTED"}
            </span>
          </section>

          {/* ================================================================ */}
          {/* EXPLANATION */}
          {/* ================================================================ */}

          <div className="my-2 flex items-start gap-2 border-l-4 border-blue-400 bg-blue-50 px-2.5 py-2">
            <RotateCcw size={14} className="mt-0.5 shrink-0 text-blue-700" />

            <div>
              <div className="text-[11px] font-extrabold text-blue-900">
                Rejected Submission Correction
              </div>

              <div className="text-[10px] leading-4 text-blue-800">
                Review the rejected submission, correct any values identified
                during review, explain the resubmission, and certify the
                corrected record. The same submission will return to the review
                queue.
              </div>
            </div>
          </div>

          {/* ================================================================ */}
          {/* INVALID STATUS */}
          {/* ================================================================ */}

          {!validStatus ? (
            <div className="mb-2 flex items-start gap-2 border-l-4 border-amber-500 bg-amber-50 px-3 py-2">
              <AlertTriangle
                size={14}
                className="mt-0.5 shrink-0 text-amber-700"
              />

              <div className="text-xs font-bold text-amber-800">
                Only REJECTED submissions can be corrected and resubmitted.
              </div>
            </div>
          ) : null}

          {/* ================================================================ */}
          {/* CANDIDATE RESULTS */}
          {/* ================================================================ */}

          <FlatSection
            title="Candidate Results"
            icon={<Vote size={14} />}
            right={
              <span className="text-[9px] text-slate-500">
                Rejected → Corrected
              </span>
            }
          >
            <div className="divide-y divide-slate-100">
              {options.map((option: any) => {
                const key = String(
                  option.electId ?? option.optionId ?? option.id,
                );

                const original = num(originalCandidateVotes[key]);

                const current = num(candidateVotes[key]);

                const change = current - original;

                return (
                  <div
                    key={key}
                    className="grid grid-cols-[minmax(0,1fr)_46px_60px_44px] items-center gap-1.5 py-1.5 pr-2 sm:grid-cols-[minmax(0,1fr)_70px_82px_62px] sm:gap-2 sm:pr-0"
                  >
                    <div className="min-w-0 truncate pr-1 text-[10px] font-bold text-slate-900 sm:text-[13px]">
                      {candidateName(option)}

                      <span className="font-semibold text-slate-500">
                        {" - "}
                        {partyLabel(option)}
                      </span>
                    </div>

                    <div className="text-right">
                      <div className="text-[6px] font-bold uppercase text-slate-400">
                        Orig
                      </div>

                      <div className="text-[10px] text-slate-500">
                        {original}
                      </div>
                    </div>

                    <div>
                      <div className="text-[6px] font-bold uppercase text-slate-400">
                        New
                      </div>

                      <input
                        type="number"
                        min={0}
                        inputMode="numeric"
                        value={current}
                        disabled={!validStatus || resubmitM.isPending}
                        onFocus={(event) => event.currentTarget.select()}
                        onChange={(event) =>
                          setCandidateVotes((values) => ({
                            ...values,

                            [key]: clamp(event.target.value),
                          }))
                        }
                        className="h-8 w-full rounded-md border border-slate-300 px-1 text-right text-[12px] font-extrabold text-blue-700 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-100 disabled:bg-slate-100 disabled:text-slate-400"
                      />
                    </div>

                    <div className="text-right">
                      <div className="text-[6px] font-bold uppercase text-slate-400">
                        Chg
                      </div>

                      <div
                        className={[
                          "text-[10px] font-extrabold",

                          change > 0
                            ? "text-emerald-600"
                            : change < 0
                              ? "text-red-600"
                              : "text-slate-400",
                        ].join(" ")}
                      >
                        {change > 0 ? `+${change}` : change}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </FlatSection>

          {/* ================================================================ */}
          {/* BALLOT RECONCILIATION */}
          {/* ================================================================ */}

          <FlatSection title="Ballot Reconciliation" icon={<Vote size={14} />}>
            {/* ============================================================ */}
            {/* MOBILE / TABLET */}
            {/* ============================================================ */}

            <div className="grid grid-cols-2 gap-3 lg:hidden">
              <MetricColumn>
                <ReadMetric
                  label="Registered"
                  value={formatNumber(registered)}
                />

                <ReadMetric
                  label="Ballots Received"
                  value={formatNumber(ballotsReceived)}
                />

                <ReadMetric
                  label="Ballots In Box"
                  value={formatNumber(ballotsInBox)}
                  emphasis
                />

                <ReadMetric
                  label="Valid %"
                  value={formatPercent(validPct)}
                  emphasis
                />

                <EditableMetric
                  label="Spoiled"
                  value={spoiledBallots}
                  original={originalSpoiled}
                  disabled={!validStatus || resubmitM.isPending}
                  onChange={setSpoiledBallots}
                />

                <EditableMetric
                  label="Rejected"
                  value={rejectedBallots}
                  original={originalRejected}
                  disabled={!validStatus || resubmitM.isPending}
                  onChange={setRejectedBallots}
                />

                <ReadMetric
                  label="Invalid %"
                  value={formatPercent(invalidPct)}
                />

                <ReadMetric
                  label="Turnout %"
                  value={formatPercent(turnoutPct)}
                  emphasis
                  warning={!turnoutValid}
                />

                <ReadMetric
                  label="Expected In Box"
                  value={formatNumber(expectedInBox)}
                />
              </MetricColumn>

              <MetricColumn>
                <ReadMetric
                  label="Ballots Issued"
                  value={formatNumber(ballotsIssued)}
                />

                <ReadMetric
                  label="Valid Votes"
                  value={formatNumber(validVotes)}
                  emphasis
                />

                <ReadMetric
                  label="Outside Box"
                  value={formatNumber(outsideBox)}
                />

                <EditableMetric
                  label="Unmarked"
                  value={unmarkedBallots}
                  original={originalUnmarked}
                  disabled={!validStatus || resubmitM.isPending}
                  onChange={setUnmarkedBallots}
                />

                <EditableMetric
                  label="Invalid"
                  value={invalidBallots}
                  original={originalInvalid}
                  disabled={!validStatus || resubmitM.isPending}
                  onChange={setInvalidBallots}
                />

                <EditableMetric
                  label="Unused"
                  value={unusedBallots}
                  original={originalUnused}
                  disabled={!validStatus || resubmitM.isPending}
                  onChange={setUnusedBallots}
                />

                <ReadMetric
                  label="Invalid In Box"
                  value={formatNumber(invalidInBox)}
                />

                <ReadMetric
                  label="Ballot Delta"
                  value={formatNumber(ballotDelta)}
                  warning={ballotDelta !== 0}
                />
              </MetricColumn>
            </div>

            {/* ============================================================ */}
            {/* DESKTOP */}
            {/* ============================================================ */}

            <div className="hidden lg:grid lg:grid-cols-3 lg:gap-x-8">
              <ReadMetric label="Registered" value={formatNumber(registered)} />

              <ReadMetric
                label="Ballots Issued"
                value={formatNumber(ballotsIssued)}
              />

              <ReadMetric
                label="Ballots Received"
                value={formatNumber(ballotsReceived)}
              />

              <ReadMetric
                label="Valid Votes"
                value={formatNumber(validVotes)}
                emphasis
              />

              <ReadMetric
                label="Ballots In Box"
                value={formatNumber(ballotsInBox)}
                emphasis
              />

              <ReadMetric
                label="Outside Box"
                value={formatNumber(outsideBox)}
              />

              <ReadMetric
                label="Valid %"
                value={formatPercent(validPct)}
                emphasis
              />

              <EditableMetric
                label="Unmarked"
                value={unmarkedBallots}
                original={originalUnmarked}
                disabled={!validStatus || resubmitM.isPending}
                onChange={setUnmarkedBallots}
              />

              <EditableMetric
                label="Spoiled"
                value={spoiledBallots}
                original={originalSpoiled}
                disabled={!validStatus || resubmitM.isPending}
                onChange={setSpoiledBallots}
              />

              <EditableMetric
                label="Invalid"
                value={invalidBallots}
                original={originalInvalid}
                disabled={!validStatus || resubmitM.isPending}
                onChange={setInvalidBallots}
              />

              <EditableMetric
                label="Rejected"
                value={rejectedBallots}
                original={originalRejected}
                disabled={!validStatus || resubmitM.isPending}
                onChange={setRejectedBallots}
              />

              <EditableMetric
                label="Unused"
                value={unusedBallots}
                original={originalUnused}
                disabled={!validStatus || resubmitM.isPending}
                onChange={setUnusedBallots}
              />

              <ReadMetric label="Invalid %" value={formatPercent(invalidPct)} />

              <ReadMetric
                label="Invalid In Box"
                value={formatNumber(invalidInBox)}
              />

              <ReadMetric
                label="Turnout %"
                value={formatPercent(turnoutPct)}
                emphasis
                warning={!turnoutValid}
              />

              <ReadMetric
                label="Ballot Delta"
                value={formatNumber(ballotDelta)}
                warning={ballotDelta !== 0}
              />

              <ReadMetric
                label="Expected In Box"
                value={formatNumber(expectedInBox)}
              />

              <div />
            </div>
          </FlatSection>

          {/* ================================================================ */}
          {/* INVENTORY ERROR */}
          {/* ================================================================ */}

          {!issuedReconciles ? (
            <div className="mt-2 flex items-start gap-2 border-l-4 border-red-500 bg-red-50 px-3 py-2">
              <AlertTriangle
                size={14}
                className="mt-0.5 shrink-0 text-red-600"
              />

              <div className="text-[10px] font-bold leading-4 text-red-700 sm:text-xs">
                Ballots Issued must equal Ballots In Box + Unused + Spoiled.
              </div>
            </div>
          ) : null}

          {/* ================================================================ */}
          {/* TURNOUT ERROR */}
          {/* ================================================================ */}

          {!turnoutValid ? (
            <div className="mt-2 flex items-start gap-2 border-l-4 border-red-500 bg-red-50 px-3 py-2">
              <AlertTriangle
                size={14}
                className="mt-0.5 shrink-0 text-red-600"
              />

              <div className="text-[10px] font-bold leading-4 text-red-700 sm:text-xs">
                Ballots In Box cannot exceed the number of registered voters.
              </div>
            </div>
          ) : null}

          {/* ================================================================ */}
          {/* CHANGES */}
          {/* ================================================================ */}

          <div className="flex justify-between border-b border-slate-200 py-2 text-[10px]">
            <span className="text-slate-500">Resubmission Changes</span>

            <strong
              className={hasChanges ? "text-emerald-700" : "text-slate-500"}
            >
              {hasChanges ? "Corrections detected" : "No value changes entered"}
            </strong>
          </div>

          {/* ================================================================ */}
          {/* REASON */}
          {/* ================================================================ */}

          <FlatSection
            title="Resubmission Reason"
            icon={<RotateCcw size={14} />}
            right={
              <span className="text-[8px] font-bold uppercase text-blue-600">
                Required
              </span>
            }
          >
            <textarea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              rows={2}
              disabled={!validStatus || resubmitM.isPending}
              placeholder="Explain why this rejected submission is being resubmitted and describe any corrections made..."
              className="w-full rounded-md border border-slate-300 px-2.5 py-2 text-[11px] outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-100 disabled:bg-slate-100"
            />
          </FlatSection>

          {/* ================================================================ */}
          {/* CERTIFICATION */}
          {/* ================================================================ */}

          <SubmissionCertification
            title="Resubmission Certification"
            signerName={actorName}
            value={signature}
            confirmed={certified}
            onChange={(value) => {
              setSignature(value);

              setCertified(false);
            }}
            onConfirmedChange={setCertified}
            statement={certificationStatement}
          />

          {/* ================================================================ */}
          {/* MUTATION ERROR */}
          {/* ================================================================ */}

          {resubmitM.isError ? (
            <div className="mt-2 flex items-start gap-2 border-l-4 border-red-500 bg-red-50 px-3 py-2 text-xs font-bold text-red-700">
              <AlertTriangle size={14} className="shrink-0" />

              <span>{errorText(resubmitM.error)}</span>
            </div>
          ) : null}
        </main>

        {/* ================================================================== */}
        {/* ACTIONS */}
        {/* ================================================================== */}

        <div className="sticky bottom-0 z-20 border-t border-slate-200 bg-white/95">
          <div className="mx-auto grid w-full max-w-[1100px] grid-cols-[.8fr_1.2fr] gap-2 py-2 sm:flex sm:justify-end">
            <button
              type="button"
              onClick={back}
              disabled={resubmitM.isPending}
              className="min-h-9 rounded-md border px-3 text-xs font-bold"
            >
              Cancel
            </button>

            <button
              type="button"
              disabled={!canSubmit}
              onClick={() => resubmitM.mutate()}
              className="inline-flex min-h-9 items-center justify-center gap-1 rounded-md bg-blue-700 px-3 text-xs font-extrabold text-white hover:bg-blue-800 disabled:bg-slate-400 sm:min-w-[175px]"
            >
              <RotateCcw size={13} />

              {resubmitM.isPending ? "Resubmitting..." : "Correct & Resubmit"}
            </button>
          </div>
        </div>
      </Panel>
    </div>
  );
}

// ============================================================================
// SHARED LOCAL UI
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

function MetricColumn({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/40 px-2.5 py-2">
      {children}
    </div>
  );
}

function ReadMetric({
  label,
  value,
  emphasis = false,
  warning = false,
}: {
  label: string;
  value: ReactNode;
  emphasis?: boolean;
  warning?: boolean;
}) {
  return (
    <div className="flex min-h-8 items-center justify-between gap-2 border-b border-slate-100 py-1.5">
      <span
        className={[
          "text-[9px] font-semibold sm:text-xs",

          warning
            ? "text-red-600"
            : emphasis
              ? "text-blue-600"
              : "text-slate-500",
        ].join(" ")}
      >
        {label}
      </span>

      <strong
        className={[
          "text-[11px] font-extrabold sm:text-sm",

          warning
            ? "text-red-700"
            : emphasis
              ? "text-blue-700"
              : "text-slate-900",
        ].join(" ")}
      >
        {value}
      </strong>
    </div>
  );
}

function EditableMetric({
  label,
  value,
  original,
  disabled = false,
  onChange,
}: {
  label: string;
  value: number | "";
  original: number;
  disabled?: boolean;
  onChange: (value: number | "") => void;
}) {
  const changed = num(value) !== original;

  return (
    <div className="flex min-h-8 items-center justify-between gap-2 border-b border-slate-100 py-1.5">
      <span className="text-[9px] font-semibold text-slate-500 sm:text-xs">
        {label}
      </span>

      <input
        type="number"
        min={0}
        inputMode="numeric"
        value={value}
        disabled={disabled}
        onFocus={(event) => event.currentTarget.select()}
        onChange={(event) =>
          onChange(event.target.value === "" ? "" : clamp(event.target.value))
        }
        className={[
          "h-8 w-[60px] rounded-md border px-1.5 text-right text-[12px] font-extrabold outline-none",

          disabled
            ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400"
            : changed
              ? "border-blue-300 text-blue-700"
              : "border-slate-300 text-slate-900",
        ].join(" ")}
      />
    </div>
  );
}

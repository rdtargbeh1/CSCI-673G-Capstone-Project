// src/pages/elections/workspace/tabs/submissions/SubmissionReopenPage.tsx

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, ArrowLeft, MapPin, RotateCcw } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";

import { useAuthStore } from "../../../../../shared/store/authStore";
import { Panel } from "../../../shared/elections-ui";

import {
  getSubmission,
  reopenRejectedSubmission,
} from "../../../../../shared/services/voteSubmissionService";

import { fetchMe } from "../../../../../shared/services/userService";

import SubmissionCertification, {
  certificationReady,
} from "./shared/SubmissionCertification";

// ============================================================================
// HELPERS
// ============================================================================

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
    "The submission could not be reopened."
  );
}

function signerName(user: any) {
  return (
    [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim() ||
    user?.userName ||
    ""
  );
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function SubmissionReopenPage({
  submissionId,
}: {
  submissionId: string;
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { electionId } = useParams();

  const currentOrgId = useAuthStore((state: any) => state.currentOrgId);
  const user = useAuthStore((state: any) => state.user);

  const [reason, setReason] = useState("");
  const [signature, setSignature] = useState("");
  const [certified, setCertified] = useState(false);

  const submissionQ = useQuery({
    enabled: Boolean(submissionId),
    queryKey: ["vote-submission", "reopen", submissionId],
    queryFn: () => getSubmission(submissionId),
    staleTime: 0,
    retry: 1,
  });

  const submission: any = submissionQ.data;

  const meQ = useQuery({
    enabled: Boolean(currentOrgId),
    queryKey: ["users", "me", "reopen", currentOrgId],
    queryFn: () => fetchMe(String(currentOrgId)),
    staleTime: 60_000,
  });

  const actor: any = meQ.data ?? user;

  const actorId = String(actor?.userId ?? "");
  const actorName = signerName(actor);

  const certificationStatement =
    "I reviewed this rejected submission and certify that reopening it for another review is authorized.";

  const certificationComplete = certificationReady(
    actorName,
    signature,
    certified,
  );

  const status = String(submission?.status ?? "").toUpperCase();

  const mutation = useMutation({
    mutationFn: () =>
      reopenRejectedSubmission(submissionId, {
        actorUserId: actorId,
        reason: reason.trim(),
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

  const canSubmit =
    status === "REJECTED" &&
    Boolean(actorId) &&
    reason.trim().length > 0 &&
    certificationComplete &&
    !mutation.isPending;

  const back = () =>
    navigate(`/elections/${electionId}/submissions/${submissionId}`);

  if (submissionQ.isLoading) {
    return (
      <div className="app-form py-10 text-center">
        <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-slate-200 border-t-amber-600" />

        <div className="mt-2 text-xs font-semibold text-slate-500">
          Loading submission...
        </div>
      </div>
    );
  }

  if (submissionQ.isError || !submission) {
    return (
      <div className="app-form">
        <Panel title="Reopen Rejected Submission">
          <div className="border-l-4 border-red-500 bg-red-50 px-3 py-3 text-xs font-bold text-red-700">
            {errorText(submissionQ.error)}
          </div>
        </Panel>
      </div>
    );
  }

  return (
    <div className="app-form">
      <Panel title="Reopen Rejected Submission">
        <main className="mx-auto w-full max-w-[900px] pb-14">
          <button
            type="button"
            onClick={back}
            className="inline-flex h-8 items-center gap-1 rounded-md bg-[#00095f] px-2.5 text-[11px] font-bold text-white hover:bg-[#000b73] hover:text-[#cb3242] sm:h-9 sm:px-3 sm:text-xs"
          >
            <ArrowLeft size={13} />
            Back
          </button>

          <section className="mt-2 flex items-start gap-2 border-b border-slate-200 pb-3">
            <MapPin size={15} className="mt-0.5 shrink-0 text-blue-600" />

            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-extrabold text-slate-900">
                {submission.centerName ?? "Unknown Polling Center"}
              </div>

              <div className="mt-0.5 text-xs font-semibold text-slate-500">
                {placeLabel(submission)} • {submission.contestName ?? "—"}
              </div>
            </div>

            <span className="rounded-full border border-red-200 bg-red-50 px-2 py-1 text-[9px] font-bold text-red-700">
              {status}
            </span>
          </section>

          <section className="border-b border-slate-200 py-3">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-sm font-extrabold text-slate-900">
                Reopen Reason
              </h2>

              <span className="text-[8px] font-bold uppercase text-red-600">
                Required
              </span>
            </div>

            <textarea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              rows={4}
              placeholder="Explain why this rejected submission should be returned to review..."
              className="w-full resize-y rounded-md border border-slate-300 px-2.5 py-2 text-xs outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-100 sm:text-sm"
            />
          </section>

          <SubmissionCertification
            title="Reopen Certification"
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

          {status !== "REJECTED" ? (
            <div className="mt-3 border-l-4 border-amber-500 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800">
              Only REJECTED submissions can be reopened.
            </div>
          ) : null}

          {mutation.isError ? (
            <div className="mt-3 flex items-start gap-2 border-l-4 border-red-500 bg-red-50 px-3 py-2 text-xs font-bold text-red-700">
              <AlertTriangle size={14} className="shrink-0" />
              {errorText(mutation.error)}
            </div>
          ) : null}
        </main>

        <div className="sticky bottom-0 z-20 border-t border-slate-200 bg-white/95">
          <div className="mx-auto grid w-full max-w-[900px] grid-cols-[.8fr_1.2fr] gap-2 py-2 sm:flex sm:justify-end">
            <button
              type="button"
              onClick={back}
              disabled={mutation.isPending}
              className="min-h-9 rounded-md border border-slate-300 px-3 text-xs font-bold"
            >
              Cancel
            </button>

            <button
              type="button"
              disabled={!canSubmit}
              onClick={() => mutation.mutate()}
              className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-md bg-amber-600 px-3 text-xs font-extrabold text-white hover:bg-amber-700 disabled:bg-slate-400 sm:min-w-[170px]"
            >
              <RotateCcw size={13} />

              {mutation.isPending ? "Reopening..." : "Reopen Submission"}
            </button>
          </div>
        </div>
      </Panel>
    </div>
  );
}

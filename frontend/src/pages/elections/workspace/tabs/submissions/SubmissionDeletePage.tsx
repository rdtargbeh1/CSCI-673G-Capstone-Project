// src/pages/elections/workspace/tabs/submissions/SubmissionDeletePage.tsx

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  MapPin,
  Trash2,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";

import { useAuthStore } from "../../../../../shared/store/authStore";
import { Panel } from "../../../shared/elections-ui";

import {
  deleteSubmission,
  getSubmission,
} from "../../../../../shared/services/voteSubmissionService";

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
    "The submission could not be deleted."
  );
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function SubmissionDeletePage({
  submissionId,
}: {
  submissionId: string;
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { electionId } = useParams();

  const user = useAuthStore((state: any) => state.user);

  const [reason, setReason] = useState("");
  const [confirmation, setConfirmation] = useState("");

  // ==========================================================================
  // SUBMISSION
  // ==========================================================================

  const submissionQ = useQuery({
    enabled: Boolean(submissionId),
    queryKey: ["vote-submission", "delete", submissionId],
    queryFn: () => getSubmission(submissionId),
    staleTime: 0,
    retry: 1,
  });

  const submission: any = submissionQ.data;

  // ==========================================================================
  // VALIDATION
  // ==========================================================================

  const reasonReady = reason.trim().length > 0;
  const confirmationReady = confirmation.trim().toUpperCase() === "DELETE";

  // ==========================================================================
  // MUTATION
  // ==========================================================================

  const mutation = useMutation({
    mutationFn: () =>
      deleteSubmission(submissionId, {
        reason: reason.trim(),
        deletedByUserId: (user as any)?.userId,
      } as any),

    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["vote-submission"],
      });

      await queryClient.invalidateQueries({
        queryKey: ["vote-submissions"],
      });

      navigate(`/elections/${electionId}/submissions`);
    },
  });

  const canDelete =
    reasonReady &&
    confirmationReady &&
    Boolean((user as any)?.userId) &&
    !mutation.isPending;

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
        <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-slate-200 border-t-red-600" />

        <div className="mt-2 text-xs font-semibold text-slate-500">
          Loading submission...
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
        <Panel title="Delete Vote Submission">
          <div className="mx-auto w-full max-w-[900px]">
            <div className="border-l-4 border-red-500 bg-red-50 px-3 py-3">
              <div className="flex items-start gap-2">
                <AlertTriangle
                  size={16}
                  className="mt-0.5 shrink-0 text-red-600"
                />

                <div className="min-w-0">
                  <div className="text-sm font-bold text-red-800">
                    Unable to load submission
                  </div>

                  <div className="mt-1 text-xs text-red-700">
                    {errorText(submissionQ.error)}
                  </div>

                  <button
                    type="button"
                    onClick={back}
                    className="mt-2 inline-flex min-h-8 items-center gap-1.5 border border-red-200 bg-white px-2.5 text-xs font-bold text-red-700"
                  >
                    <ArrowLeft size={13} />
                    Back
                  </button>
                </div>
              </div>
            </div>
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
      <Panel title="Delete Vote Submission">
        <main className="mx-auto w-full max-w-[900px] pb-14">
          {/* ================================================================= */}
          {/* BACK */}
          {/* ================================================================= */}

          <button
            type="button"
            onClick={back}
            className="inline-flex h-9 w-fit items-center justify-center gap-1.5 rounded-md bg-[#00095f] px-3 text-xs 
            font-bold leading-none  text-white hover:bg-[#000b73]  hover:text-[#cb3242]"
          >
            <ArrowLeft size={14} className="shrink-0" />
            <span>Back</span>
          </button>

          {/* ================================================================= */}
          {/* SUBMISSION IDENTITY */}
          {/* ================================================================= */}

          <section className="flex items-start gap-2 border-b border-slate-200 pb-2">
            <MapPin size={15} className="mt-0.5 shrink-0 text-blue-600" />

            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-extrabold text-slate-900 sm:text-base">
                {submission.centerName ?? "Unknown Polling Center"}
              </div>

              <div className="mt-0.5 flex flex-wrap items-center gap-x-1 text-[10px] font-semibold text-slate-500 sm:text-xs">
                <span>{placeLabel(submission)}</span>

                <span className="text-slate-300">•</span>

                <span>{submission.contestName ?? "—"}</span>

                {submission.electionName ? (
                  <>
                    <span className="hidden text-slate-300 sm:inline">•</span>

                    <span className="hidden sm:inline">
                      {submission.electionName}
                    </span>
                  </>
                ) : null}
              </div>
            </div>

            {submission.status ? (
              <span className="shrink-0 rounded-full border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[8px] font-bold text-slate-600 sm:px-2 sm:py-1 sm:text-[9px]">
                {String(submission.status).toUpperCase()}
              </span>
            ) : null}
          </section>

          {/* ================================================================= */}
          {/* DELETE WARNING */}
          {/* ================================================================= */}

          <section className="my-3 border-l-4 border-red-500 bg-red-50 px-3 py-2.5">
            <div className="flex items-start gap-2">
              <AlertTriangle
                size={16}
                className="mt-0.5 shrink-0 text-red-700"
              />

              <div className="min-w-0">
                <div className="text-[12px] font-extrabold text-red-900 sm:text-sm">
                  Delete Submission
                </div>

                <div className="mt-0.5 text-[10px] leading-4 text-red-800 sm:text-xs sm:leading-5">
                  This submission will be removed from normal operational
                  queues. It will remain available through deleted and audit
                  workflows.
                </div>
              </div>
            </div>
          </section>

          {/* ================================================================= */}
          {/* DELETION REASON */}
          {/* ================================================================= */}

          <section className="border-b border-slate-200 py-3">
            <header className="mb-2 flex items-center justify-between gap-2">
              <h2 className="text-[12px] font-extrabold text-slate-900 sm:text-sm">
                Deletion Reason
              </h2>

              <span
                className={[
                  "text-[8px] font-bold uppercase tracking-wide",
                  reasonReady ? "text-emerald-600" : "text-red-600",
                ].join(" ")}
              >
                {reasonReady ? "Provided" : "Required"}
              </span>
            </header>

            <textarea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              maxLength={500}
              rows={3}
              required
              placeholder="Explain why this vote submission must be deleted..."
              className={[
                "w-full resize-y rounded-md border px-2.5 py-2 text-[12px] leading-4 outline-none focus:ring-1 sm:text-sm sm:leading-5",
                reasonReady
                  ? "border-slate-300 focus:border-blue-500 focus:ring-blue-100"
                  : "border-red-300 focus:border-red-500 focus:ring-red-100",
              ].join(" ")}
            />

            <div className="mt-1 flex items-center justify-between gap-3">
              {!reasonReady ? (
                <span className="text-[9px] font-semibold text-red-700">
                  A deletion reason is required.
                </span>
              ) : (
                <span />
              )}

              <span className="text-[8px] font-semibold text-slate-400">
                {reason.length}/500
              </span>
            </div>
          </section>

          {/* ================================================================= */}
          {/* CONFIRMATION */}
          {/* ================================================================= */}

          <section className="border-b border-slate-200 py-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-[12px] font-extrabold text-slate-900 sm:text-sm">
                  Confirm Deletion
                </div>

                <div className="mt-0.5 text-[9px] text-slate-500 sm:text-[10px]">
                  Type <strong>DELETE</strong> to continue.
                </div>
              </div>

              {confirmationReady ? (
                <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-700">
                  <CheckCircle2 size={11} />
                  Confirmed
                </span>
              ) : (
                <span className="text-[8px] font-bold uppercase text-red-600">
                  Required
                </span>
              )}
            </div>

            <input
              value={confirmation}
              onChange={(event) =>
                setConfirmation(event.target.value.toUpperCase())
              }
              autoComplete="off"
              spellCheck={false}
              placeholder="DELETE"
              className={[
                "mt-2 h-9 w-full rounded-md border px-2.5 text-[12px] font-bold uppercase tracking-wide outline-none focus:ring-1 sm:h-10 sm:text-sm",
                confirmationReady
                  ? "border-emerald-300 text-emerald-700 focus:border-emerald-500 focus:ring-emerald-100"
                  : confirmation.length > 0
                    ? "border-red-300 text-red-700 focus:border-red-500 focus:ring-red-100"
                    : "border-slate-300 text-slate-900 focus:border-blue-500 focus:ring-blue-100",
              ].join(" ")}
            />
          </section>

          {/* ================================================================= */}
          {/* READY STATE */}
          {/* ================================================================= */}

          <section className="flex items-center justify-between gap-3 border-b border-slate-200 py-2 text-[10px] sm:text-xs">
            <span className="font-semibold text-slate-500">
              Delete Readiness
            </span>

            <strong className={canDelete ? "text-red-700" : "text-slate-500"}>
              {canDelete ? "Ready to delete" : "Confirmation incomplete"}
            </strong>
          </section>

          {/* ================================================================= */}
          {/* ERROR */}
          {/* ================================================================= */}

          {mutation.isError ? (
            <div className="mt-2 border-l-4 border-red-500 bg-red-50 px-2.5 py-2 text-xs font-bold text-red-700">
              {errorText(mutation.error)}
            </div>
          ) : null}
        </main>

        {/* =================================================================== */}
        {/* ACTION BAR */}
        {/* =================================================================== */}

        <div className="sticky bottom-0 z-20 border-t border-slate-200 bg-white/95 shadow-[0_-3px_10px_rgba(15,23,42,0.04)] backdrop-blur">
          <div className="mx-auto grid w-full max-w-[900px] grid-cols-[.8fr_1.2fr] gap-2 py-2 sm:flex sm:justify-end">
            <button
              type="button"
              onClick={back}
              disabled={mutation.isPending}
              className="min-h-9 rounded-md border border-slate-300 bg-white px-3 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 sm:min-w-[100px]"
            >
              Cancel
            </button>

            <button
              type="button"
              disabled={!canDelete}
              onClick={() => mutation.mutate()}
              className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-md bg-red-700 px-3 text-xs font-extrabold text-white hover:bg-red-800 disabled:cursor-not-allowed disabled:bg-slate-400 sm:min-w-[165px]"
            >
              <Trash2 size={13} />

              {mutation.isPending ? "Deleting..." : "Delete Submission"}
            </button>
          </div>
        </div>
      </Panel>
    </div>
  );
}

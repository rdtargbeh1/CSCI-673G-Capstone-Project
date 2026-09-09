// src/pages/elections/workspace/tabs/submissions/SubmissionFlagPage.tsx

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, ArrowLeft, Flag, FlagOff, MapPin } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";

import { useAuthStore } from "../../../../../shared/store/authStore";
import { Panel } from "../../../shared/elections-ui";

import {
  flagSubmission,
  getSubmission,
} from "../../../../../shared/services/voteSubmissionService";

import { fetchMe } from "../../../../../shared/services/userService";

import SubmissionCertification, {
  certificationReady,
} from "./shared/SubmissionCertification";

// ============================================================================
// TYPES
// ============================================================================

type Props = {
  submissionId: string;
  mode: "flag" | "unflag";
};

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
    "The action could not be completed."
  );
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function SubmissionFlagPage({ submissionId, mode }: Props) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { electionId } = useParams();

  const currentOrgId = useAuthStore((state: any) => state.currentOrgId);
  const user = useAuthStore((state: any) => state.user);

  const isFlag = mode === "flag";

  const [reason, setReason] = useState("");
  const [signature, setSignature] = useState("");
  const [certified, setCertified] = useState(false);

  const submissionQ = useQuery({
    enabled: Boolean(submissionId),
    queryKey: ["vote-submission", mode, submissionId],
    queryFn: () => getSubmission(submissionId),
    staleTime: 0,
    retry: 1,
  });

  const submission: any = submissionQ.data;

  const meQ = useQuery({
    enabled: Boolean(currentOrgId),
    queryKey: ["users", "me", mode, currentOrgId],
    queryFn: () => fetchMe(String(currentOrgId)),
    staleTime: 60_000,
  });

  const actor: any = meQ.data ?? user;

  const actorId = String(actor?.userId ?? "");

  const actorName =
    [actor?.firstName, actor?.middleName, actor?.lastName]
      .filter(Boolean)
      .join(" ")
      .trim() ||
    actor?.userName ||
    "";

  const reasonReady = reason.trim().length > 0;

  const certificationComplete = certificationReady(
    actorName,
    signature,
    certified,
  );

  const mutation = useMutation({
    mutationFn: () =>
      flagSubmission(submissionId, {
        actorUserId: actorId,
        flagged: isFlag,
        comments: reason.trim(),
      } as any),

    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["vote-submission"],
      });

      await queryClient.invalidateQueries({
        queryKey: ["vote-submissions"],
      });

      navigate(`/elections/${electionId}/submissions/${submissionId}`);
    },
  });

  const canSubmit =
    reasonReady &&
    certificationComplete &&
    Boolean(actorId) &&
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
        <Panel
          title={
            isFlag ? "Flag Vote Submission" : "Resolve / Unflag Submission"
          }
        >
          <div className="border-l-4 border-red-500 bg-red-50 px-3 py-3">
            {errorText(submissionQ.error)}
          </div>
        </Panel>
      </div>
    );
  }

  return (
    <div className="app-form">
      <Panel
        title={isFlag ? "Flag Vote Submission" : "Resolve / Unflag Submission"}
      >
        <main className="mx-auto w-full max-w-[900px] pb-14">
          <button
            type="button"
            onClick={back}
            className="inline-flex h-8 w-fit items-center justify-center gap-1 rounded-md bg-[#00095f] px-2.5 text-[11px] font-bold leading-none text-white hover:bg-[#000b73] hover:text-[#cb3242] sm:h-9 sm:px-3 sm:text-xs"
          >
            <ArrowLeft size={13} className="shrink-0" />
            <span>Back</span>
          </button>

          {/* Submission */}
          <section className="mt-2 flex items-start gap-2 border-b border-slate-200 pb-2">
            <MapPin size={15} className="mt-0.5 shrink-0 text-blue-600" />

            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-extrabold text-slate-900">
                {submission.centerName ?? "Unknown Polling Center"}
              </div>

              <div className="mt-0.5 text-[10px] font-semibold text-slate-500 sm:text-xs">
                {placeLabel(submission)} • {submission.contestName ?? "—"}
              </div>
            </div>

            {isFlag ? (
              <Flag size={15} className="shrink-0 text-amber-600" />
            ) : (
              <FlagOff size={15} className="shrink-0 text-emerald-600" />
            )}
          </section>

          {/* Reason */}
          <section className="border-b border-slate-200 py-2.5">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-[12px] font-extrabold text-slate-900 sm:text-sm">
                {isFlag ? "Reason for Flag" : "Resolution Explanation"}
              </h2>

              <span className="text-[8px] font-bold uppercase text-amber-600">
                Required
              </span>
            </div>

            <textarea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              rows={3}
              placeholder={
                isFlag
                  ? "Describe the issue or discrepancy requiring review..."
                  : "Explain how the flagged issue was resolved..."
              }
              className="w-full resize-y rounded-md border border-slate-300 px-2.5 py-2 text-[11px] outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-100 sm:text-sm"
            />

            {!reasonReady ? (
              <div className="mt-1 text-[9px] font-semibold text-amber-700">
                {isFlag
                  ? "A reason is required."
                  : "A resolution explanation is required."}
              </div>
            ) : null}
          </section>

          {/* Shared certification */}
          <SubmissionCertification
            title={isFlag ? "Flag Certification" : "Resolution Certification"}
            signerName={actorName}
            value={signature}
            confirmed={certified}
            onChange={(value) => {
              setSignature(value);
              setCertified(false);
            }}
            onConfirmedChange={setCertified}
            statement={
              isFlag
                ? "I reviewed this submission and certify that the issue described above requires further review."
                : "I reviewed the flagged issue and certify that the resolution above accurately reflects the outcome."
            }
          />

          {mutation.isError ? (
            <div className="mt-2 flex items-start gap-2 border-l-4 border-red-500 bg-red-50 px-3 py-2 text-xs font-bold text-red-700">
              <AlertTriangle size={14} className="shrink-0" />
              {errorText(mutation.error)}
            </div>
          ) : null}
        </main>

        {/* Actions */}
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
              className={[
                "inline-flex min-h-9 items-center justify-center gap-1.5 rounded-md px-3 text-xs font-extrabold text-white disabled:bg-slate-400 sm:min-w-[155px]",
                isFlag
                  ? "bg-amber-600 hover:bg-amber-700"
                  : "bg-emerald-700 hover:bg-emerald-800",
              ].join(" ")}
            >
              {isFlag ? <Flag size={13} /> : <FlagOff size={13} />}

              {mutation.isPending
                ? "Saving..."
                : isFlag
                  ? "Flag Submission"
                  : "Resolve Flag"}
            </button>
          </div>
        </div>
      </Panel>
    </div>
  );
}

// src/pages/admin-security/oversight/SubmissionActionDetailPage.tsx

import { type ReactNode } from "react";

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
  getVoteSubmissionAction,
  type VoteSubmissionActionDto,
  type VoteSubmissionActionType,
} from "../../../shared/services/voteSubmissionActionService";

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

    case "DELETE":
      return "Deleted";

    default:
      return actionType;
  }
}

function actionIcon(actionType: VoteSubmissionActionType) {
  switch (actionType) {
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

    case "DELETE":
      return <Trash2 size={13} />;

    default:
      return <History size={13} />;
  }
}

function actionClass(actionType: VoteSubmissionActionType) {
  switch (actionType) {
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
// PAGE
// ============================================================================

export default function SubmissionActionDetailPage() {
  const navigate = useNavigate();

  const { actionId = "" } = useParams();

  const actionQ = useQuery({
    enabled: Boolean(actionId),

    queryKey: ["vote-submission-action", actionId],

    queryFn: () => getVoteSubmissionAction(actionId),

    staleTime: 0,

    retry: 1,
  });

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
          <div className="mx-auto w-full max-w-[860px] 2xl:max-w-[1100px]">
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

  if (actionQ.isError || !actionQ.data) {
    return (
      <AdminShell
        title="Submission Action Detail"
        subtitle="Complete vote-submission action record."
      >
        <div className="app-detail">
          <div className="mx-auto w-full max-w-[860px] 2xl:max-w-[1100px]">
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

  const action = actionQ.data;

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
        {/* RESPONSIVE RECORD WIDTH */}
        {/* ================================================================== */}

        <div className="mx-auto w-full max-w-[860px] xl:max-w-[940px] 2xl:max-w-[1100px]">
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
                    "inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[11px]  font-extrabold uppercase tracking-wide",

                    actionClass(action.actionType),
                  ].join(" ")}
                >
                  {actionIcon(action.actionType)}

                  {actionLabel(action.actionType)}
                </span>

                {action.certificationConfirmed ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#bf0013]">
                    <ShieldCheck size={14} />
                    Certified
                  </span>
                ) : null}
              </div>

              <h2 className="mt-2 text-lg font-extrabold leading-tight text-slate-900 sm:text-lg">
                {clean(action.electionName) || "Election"}
              </h2>

              <div className="mt-0.5 text-[14px] font-semibold text-slate-500 sm:text-xs">
                {clean(action.contestName) || "—"}
              </div>
            </header>

            {/* ============================================================== */}
            {/* BODY */}
            {/* ============================================================== */}

            <div className="2xl:grid 2xl:grid-cols-[minmax(0,1.65fr)_minmax(300px,0.8fr)]">
              {/* ============================================================ */}
              {/* PRIMARY RECORD */}
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
              {/* AUDIT SECTION */}
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
                {/* ACTION DATA */}
                {/* ========================================================== */}

                {action.actionData &&
                Object.keys(action.actionData).length > 0 ? (
                  <DetailSection title="Action Data">
                    <pre className="max-h-64 overflow-auto rounded-lg bg-slate-950 p-3 text-[9px] leading-4 text-slate-100 sm:text-[10px]">
                      {JSON.stringify(action.actionData, null, 2)}
                    </pre>
                  </DetailSection>
                ) : null}

                {/* ========================================================== */}
                {/* AUDIT REFERENCES */}
                {/* ========================================================== */}

                <DetailSection title="Audit References" last>
                  <div className="grid grid-cols-1 gap-x-4 gap-y-2.5 sm:grid-cols-2 2xl:grid-cols-1">
                    <Reference label="Action ID" value={action.actionId} />

                    <Reference
                      label="Submission ID"
                      value={action.submissionId}
                    />

                    <Reference label="Organization ID" value={action.orgId} />

                    <Reference
                      label="Actor User ID"
                      value={action.actorUserId}
                    />

                    <Reference label="Election ID" value={action.electionId} />

                    <Reference label="Contest ID" value={action.contestId} />

                    <Reference label="County ID" value={action.countyId} />

                    <Reference label="District ID" value={action.districtId} />

                    <Reference label="Center ID" value={action.centerId} />

                    <Reference
                      label="Polling Place ID"
                      value={action.placeId}
                    />
                  </div>
                </DetailSection>
              </aside>
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
      <h3 className="mb-3 text-[11px] font-extrabold uppercase tracking-[0.08em] text-slate-500 sm:text-[10px]">
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

      <div className="mt-1 break-words text-[12px] font-semibold leading-4 text-slate-800 sm:text-xs">
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
        <span className="inline-flex rounded-md border border-slate-200 bg-slate-100 px-2 py-1 text-[11px] font-extrabold text-slate-700 sm:text-xs">
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

      <div className="mt-1 whitespace-pre-wrap text-[12px] leading-5 text-slate-700 sm:text-xs">
        {value}
      </div>
    </div>
  );
}

// ============================================================================
// REFERENCE
// ============================================================================

function Reference({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="min-w-0">
      <div className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
        {label}
      </div>

      <div className="mt-1 break-all rounded-md border border-slate-200 bg-white px-2 py-1.5 font-mono text-[8px] leading-4 text-slate-600 sm:text-[12px]">
        {clean(value) || "—"}
      </div>
    </div>
  );
}

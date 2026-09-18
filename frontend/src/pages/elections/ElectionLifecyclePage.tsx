// src/pages/elections/ElectionLifecyclePage.tsx

import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  Clock3,
  RefreshCw,
  Save,
  ShieldCheck,
  Vote,
} from "lucide-react";

import { useAuthStore } from "../../shared/store/authStore";

import {
  fetchElectionById,
  updateElectionLifecycle,
  type ElectionAccessStatus,
} from "../../shared/services/electionService";

// ============================================================================
// LIFECYCLE STATUS
// ============================================================================

const ALL_LIFECYCLE_STATUSES: ElectionAccessStatus[] = [
  "DRAFT",
  "AVAILABLE",
  "ARCHIVED",
  "CANCELLED",
];

// ============================================================================
// HELPERS
// ============================================================================

function friendlyError(error: any) {
  return (
    error?.response?.data?.message ??
    error?.response?.data?.error ??
    error?.message ??
    "Something went wrong."
  );
}

function lifecycleLabel(status: ElectionAccessStatus | null | undefined) {
  switch (status) {
    case "DRAFT":
      return "Draft";

    case "AVAILABLE":
      return "Available";

    case "ARCHIVED":
      return "Archived";

    case "CANCELLED":
      return "Cancelled";

    default:
      return "—";
  }
}

function lifecycleBadgeClass(status: ElectionAccessStatus | null | undefined) {
  switch (status) {
    case "DRAFT":
      return "border-amber-200 bg-amber-50 text-amber-800";

    case "AVAILABLE":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";

    case "ARCHIVED":
      return "border-slate-300 bg-slate-100 text-slate-700";

    case "CANCELLED":
      return "border-[#bf0013]/25 bg-[#bf0013]/5 text-[#bf0013]";

    default:
      return "border-slate-200 bg-white text-slate-600";
  }
}

function toDateTimeLocal(value: string | null | undefined) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value.length >= 16 ? value.slice(0, 16) : value;
  }

  const pad = (number: number) => String(number).padStart(2, "0");

  return `${date.getFullYear()}-${pad(
    date.getMonth() + 1,
  )}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function toApiLocalDateTime(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  return trimmed.length === 16 ? `${trimmed}:00` : trimmed;
}

function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return "Not set";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
}

function allowedLifecycleTargets(
  current: ElectionAccessStatus,
): ElectionAccessStatus[] {
  switch (current) {
    case "DRAFT":
      return ["DRAFT", "AVAILABLE", "CANCELLED"];

    case "AVAILABLE":
      return ["AVAILABLE", "ARCHIVED", "CANCELLED"];

    case "CANCELLED":
      return ["CANCELLED", "ARCHIVED"];

    case "ARCHIVED":
      return ["ARCHIVED"];

    default:
      return [current];
  }
}

function validateTimeline(
  availableAt: string,
  startAt: string,
  endAt: string,
  availableUntil: string,
) {
  const values = [availableAt, startAt, endAt, availableUntil];

  if (values.some((value) => !value)) {
    return null;
  }

  const availableTime = new Date(availableAt).getTime();

  const startTime = new Date(startAt).getTime();

  const endTime = new Date(endAt).getTime();

  const untilTime = new Date(availableUntil).getTime();

  if (
    [availableTime, startTime, endTime, untilTime].some((value) =>
      Number.isNaN(value),
    )
  ) {
    return "One or more lifecycle dates are invalid.";
  }

  if (availableTime > startTime) {
    return "Available At must be before or equal to Operational Start.";
  }

  if (startTime > endTime) {
    return "Operational Start must be before or equal to Operational End.";
  }

  if (endTime > untilTime) {
    return "Operational End must be before or equal to Available Until.";
  }

  return null;
}

// ============================================================================
// PAGE
// ============================================================================

export default function ElectionLifecyclePage() {
  const { electionId } = useParams<{
    electionId: string;
  }>();

  const navigate = useNavigate();

  const queryClient = useQueryClient();

  // ==========================================================================
  // ACCESS
  // ==========================================================================

  const dashboardMode = useAuthStore((state) => state.dashboardMode);

  const canManageLifecycle =
    dashboardMode === "NEC" || dashboardMode === "SYSTEM";

  // ==========================================================================
  // QUERY
  // ==========================================================================

  const electionQuery = useQuery({
    enabled: Boolean(electionId),

    queryKey: ["election", "detail", electionId],

    queryFn: () => fetchElectionById(electionId!),

    staleTime: 10_000,
    retry: 1,
  });

  const election = electionQuery.data;

  // ==========================================================================
  // FORM STATE
  // ==========================================================================

  const [lifecycleStatus, setLifecycleStatus] =
    useState<ElectionAccessStatus>("DRAFT");

  const [availableAt, setAvailableAt] = useState("");

  const [startAt, setStartAt] = useState("");

  const [endAt, setEndAt] = useState("");

  const [availableUntil, setAvailableUntil] = useState("");

  const [archivedReason, setArchivedReason] = useState("");

  const [touched, setTouched] = useState(false);

  // ==========================================================================
  // SYNC
  // ==========================================================================

  useEffect(() => {
    if (!election) {
      return;
    }

    setLifecycleStatus(election.accessStatus ?? "DRAFT");

    setAvailableAt(toDateTimeLocal(election.availableAt));

    setStartAt(toDateTimeLocal(election.startAt));

    setEndAt(toDateTimeLocal(election.endAt));

    setAvailableUntil(toDateTimeLocal(election.availableUntil));

    setArchivedReason(election.archivedReason ?? "");

    setTouched(false);
  }, [election]);

  // ==========================================================================
  // DERIVED
  // ==========================================================================

  const currentStatus: ElectionAccessStatus = election?.accessStatus ?? "DRAFT";

  const lifecycleTargets = useMemo(
    () => allowedLifecycleTargets(currentStatus),

    [currentStatus],
  );

  const timelineError = validateTimeline(
    availableAt,
    startAt,
    endAt,
    availableUntil,
  );

  const requiresFullTimeline = lifecycleStatus === "AVAILABLE";

  const missingRequiredTimeline =
    requiresFullTimeline &&
    (!availableAt || !startAt || !endAt || !availableUntil);

  const archivedTerminal = currentStatus === "ARCHIVED";

  const hasChanges =
    Boolean(election) &&
    (lifecycleStatus !== currentStatus ||
      availableAt !== toDateTimeLocal(election?.availableAt) ||
      startAt !== toDateTimeLocal(election?.startAt) ||
      endAt !== toDateTimeLocal(election?.endAt) ||
      availableUntil !== toDateTimeLocal(election?.availableUntil) ||
      archivedReason.trim() !== (election?.archivedReason ?? "").trim());

  // ==========================================================================
  // SAVE
  // ==========================================================================

  const lifecycleMutation = useMutation({
    mutationFn: async () => {
      if (!electionId || !election) {
        throw new Error("Election not loaded.");
      }

      if (!canManageLifecycle) {
        throw new Error(
          "You do not have permission to manage election lifecycle.",
        );
      }

      if (missingRequiredTimeline) {
        throw new Error(
          "Available At, Operational Start, Operational End, and Available Until are required before an election can become Available.",
        );
      }

      if (timelineError) {
        throw new Error(timelineError);
      }

      return updateElectionLifecycle(electionId, {
        accessStatus: lifecycleStatus,

        availableAt: toApiLocalDateTime(availableAt),

        startAt: toApiLocalDateTime(startAt),

        endAt: toApiLocalDateTime(endAt),

        availableUntil: toApiLocalDateTime(availableUntil),

        archivedReason: archivedReason.trim() || null,
      });
    },

    onSuccess: async (updated) => {
      await queryClient.invalidateQueries({
        queryKey: ["election"],
      });

      await queryClient.invalidateQueries({
        queryKey: ["elections"],
      });

      navigate(`/elections/${updated?.electionId ?? electionId}`, {
        replace: true,
      });
    },
  });

  // ==========================================================================
  // CANCEL / BACK
  // ==========================================================================

  const goBackToElection = () => {
    if (hasChanges && !lifecycleMutation.isPending) {
      const confirmed = window.confirm(
        "Discard the unsaved lifecycle changes and return to the election detail page?",
      );

      if (!confirmed) {
        return;
      }
    }

    navigate(`/elections/${electionId}`);
  };

  // ==========================================================================
  // GUARDS
  // ==========================================================================

  if (!electionId) {
    return (
      <div className="app-form mx-auto w-full max-w-6xl">
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
          Missing election ID.
        </div>
      </div>
    );
  }

  if (electionQuery.isLoading) {
    return (
      <div className="app-form mx-auto w-full max-w-6xl">
        <div className="rounded-xl border border-slate-200 bg-white p-5 text-center text-sm font-semibold text-slate-600">
          Loading election lifecycle…
        </div>
      </div>
    );
  }

  if (electionQuery.isError || !election) {
    return (
      <div className="app-form mx-auto w-full max-w-6xl">
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <div className="flex items-start gap-2">
            <AlertCircle size={18} className="mt-0.5 shrink-0 text-red-700" />

            <div>
              <div className="font-bold text-red-800">
                Unable to load election
              </div>

              <div className="mt-1 text-sm text-red-700">
                {friendlyError(electionQuery.error)}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!canManageLifecycle) {
    return (
      <div className="app-form mx-auto w-full max-w-4xl">
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="bg-[#0013bf] px-4 py-4 text-white">
            <div className="flex items-center gap-3">
              <ShieldCheck size={22} className="shrink-0" />

              <div>
                <h1 className="text-lg font-extrabold sm:text-xl">
                  Election Lifecycle
                </h1>

                <p className="mt-0.5 text-xs text-white/80 sm:text-sm">
                  {election.electionName}
                </p>
              </div>
            </div>
          </div>

          <div className="p-4">
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-800">
              Lifecycle management is restricted to authorized NEC or SYSTEM
              administrators.
            </div>

            <button
              type="button"
              onClick={() => navigate(`/elections/${electionId}`)}
              className="mt-4 inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#0013bf] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#0010a3]"
            >
              <ArrowLeft size={17} />
              Back to Election
            </button>
          </div>
        </section>
      </div>
    );
  }

  // ==========================================================================
  // RENDER
  // ==========================================================================

  return (
    <div className="app-form mx-auto w-full max-w-6xl">
      <div className="flex min-w-0 flex-col gap-3">
        {/* ================================================================
            HEADER
        ================================================================ */}

        <section className="overflow-hidden rounded-xl bg-[#0013bf] text-white">
          <div className="flex min-w-0 items-start gap-3 px-4 py-3.5 sm:px-5">
            <button
              type="button"
              onClick={goBackToElection}
              disabled={lifecycleMutation.isPending}
              className="inline-flex min-h-10 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-white/30 bg-white/10 px-3 py-2 text-sm font-bold text-white transition hover:bg-white/20 disabled:opacity-50"
            >
              <ArrowLeft size={17} />

              <span className="hidden sm:inline">Back</span>
            </button>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-extrabold tracking-tight text-white sm:text-2xl">
                  Election Lifecycle
                </h1>

                <span className="inline-flex items-center rounded-full border border-white/30 bg-white/10 px-2.5 py-1 text-xs font-bold text-white">
                  {lifecycleLabel(currentStatus)}
                </span>

                <span className="inline-flex items-center gap-1 rounded-full border border-white/20 bg-white/10 px-2.5 py-1 text-xs font-bold text-white/90">
                  {election.isActive && <CheckCircle2 size={12} />}
                  Technical: {election.isActive ? "Active" : "Inactive"}
                </span>
              </div>

              <div className="mt-1 text-sm font-semibold text-white/90">
                {election.electionName}
              </div>

              <div className="mt-0.5 text-xs text-white/70">
                {election.year}
                {" • "}
                Manage release and operational timing
              </div>
            </div>
          </div>
        </section>

        {/* ================================================================
            DESKTOP TWO-COLUMN WORKSPACE
        ================================================================ */}

        <div className="grid min-w-0 grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_320px]">
          {/* ==============================================================
              LEFT — FORM
          ============================================================== */}

          <div className="flex min-w-0 flex-col gap-3">
            {/* STATUS */}

            <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
              <SectionHeader
                icon={<Vote size={17} />}
                title="Lifecycle Status"
                subtitle="Choose the next lifecycle state allowed from the current status."
              />

              <div className="p-3 sm:p-4">
                <div className="grid gap-3 md:grid-cols-[220px_minmax(0,1fr)] md:items-end">
                  <div>
                    <FieldLabel label="New Lifecycle Status" />

                    <select
                      value={lifecycleStatus}
                      onChange={(event) => {
                        setTouched(true);

                        setLifecycleStatus(
                          event.target.value as ElectionAccessStatus,
                        );
                      }}
                      disabled={archivedTerminal || lifecycleMutation.isPending}
                      className="min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-900 outline-none focus:border-[#0013bf] focus:ring-2 focus:ring-[#0013bf]/15 disabled:cursor-not-allowed disabled:bg-slate-100"
                    >
                      {ALL_LIFECYCLE_STATUSES.map((status) => {
                        const allowed = lifecycleTargets.includes(status);

                        return (
                          <option
                            key={status}
                            value={status}
                            disabled={!allowed}
                          >
                            {lifecycleLabel(status)}

                            {!allowed ? " — not allowed" : ""}
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-500">
                    Current status is{" "}
                    <strong className="text-slate-700">
                      {lifecycleLabel(currentStatus)}
                    </strong>
                    . Invalid transitions are disabled. The backend validates
                    every lifecycle change.
                  </div>
                </div>
              </div>
            </section>

            {/* TIMELINE */}

            <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
              <SectionHeader
                icon={<CalendarClock size={17} />}
                title="Election Timeline"
                subtitle="Configure release, operational start/end, and final availability."
              />

              <div className="grid grid-cols-1 gap-3 p-3 sm:grid-cols-2 sm:p-4">
                <LifecycleDateField
                  label="Available At"
                  value={availableAt}
                  setValue={(value) => {
                    setTouched(true);

                    setAvailableAt(value);
                  }}
                  disabled={archivedTerminal}
                />

                <LifecycleDateField
                  label="Operational Start"
                  value={startAt}
                  setValue={(value) => {
                    setTouched(true);

                    setStartAt(value);
                  }}
                  disabled={archivedTerminal}
                />

                <LifecycleDateField
                  label="Operational End"
                  value={endAt}
                  setValue={(value) => {
                    setTouched(true);

                    setEndAt(value);
                  }}
                  disabled={archivedTerminal}
                />

                <LifecycleDateField
                  label="Available Until"
                  value={availableUntil}
                  setValue={(value) => {
                    setTouched(true);

                    setAvailableUntil(value);
                  }}
                  disabled={archivedTerminal}
                />
              </div>

              <div className="border-t border-slate-200 bg-[#0013bf]/5 px-3 py-2.5 sm:px-4">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Required order
                </div>

                <div className="mt-0.5 text-xs font-bold text-[#0013bf] sm:text-sm">
                  Available At ≤ Operational Start ≤ Operational End ≤ Available
                  Until
                </div>
              </div>
            </section>

            {/* REASON */}

            {(lifecycleStatus === "ARCHIVED" ||
              lifecycleStatus === "CANCELLED") && (
              <section
                className={
                  lifecycleStatus === "CANCELLED"
                    ? "overflow-hidden rounded-xl border border-[#bf0013]/25 bg-white"
                    : "overflow-hidden rounded-xl border border-slate-300 bg-white"
                }
              >
                <div
                  className={
                    lifecycleStatus === "CANCELLED"
                      ? "border-b border-[#bf0013]/15 bg-[#bf0013]/5 px-3 py-2.5 sm:px-4"
                      : "border-b border-slate-200 bg-slate-50 px-3 py-2.5 sm:px-4"
                  }
                >
                  <div
                    className={
                      lifecycleStatus === "CANCELLED"
                        ? "font-bold text-[#bf0013]"
                        : "font-bold text-slate-900"
                    }
                  >
                    {lifecycleStatus === "CANCELLED"
                      ? "Cancellation Reason"
                      : "Archive Reason"}
                  </div>
                </div>

                <div className="p-3 sm:p-4">
                  <textarea
                    value={archivedReason}
                    onChange={(event) => {
                      setTouched(true);

                      setArchivedReason(event.target.value);
                    }}
                    disabled={archivedTerminal}
                    maxLength={250}
                    rows={3}
                    placeholder={
                      lifecycleStatus === "CANCELLED"
                        ? "Enter the reason for cancelling this election"
                        : "Enter the reason for archiving this election"
                    }
                    className="w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-[#0013bf] focus:ring-2 focus:ring-[#0013bf]/15 disabled:bg-slate-100"
                  />

                  <div className="mt-1 text-right text-[11px] font-medium text-slate-400">
                    {archivedReason.length}/250
                  </div>
                </div>
              </section>
            )}

            {/* MOBILE ACTION PANEL */}

            <div className="lg:hidden">
              <LifecycleSidePanel
                election={election}
                currentStatus={currentStatus}
                lifecycleStatus={lifecycleStatus}
                archivedTerminal={archivedTerminal}
                hasChanges={hasChanges}
                missingRequiredTimeline={missingRequiredTimeline}
                timelineError={timelineError}
                touched={touched}
                pending={lifecycleMutation.isPending}
                error={
                  lifecycleMutation.isError
                    ? friendlyError(lifecycleMutation.error)
                    : null
                }
                onCancel={goBackToElection}
                onSave={() => {
                  setTouched(true);

                  lifecycleMutation.mutate();
                }}
              />
            </div>
          </div>

          {/* ==============================================================
              RIGHT — DESKTOP SUMMARY / ACTIONS
          ============================================================== */}

          <aside className="hidden lg:block">
            <div className="sticky top-4">
              <LifecycleSidePanel
                election={election}
                currentStatus={currentStatus}
                lifecycleStatus={lifecycleStatus}
                archivedTerminal={archivedTerminal}
                hasChanges={hasChanges}
                missingRequiredTimeline={missingRequiredTimeline}
                timelineError={timelineError}
                touched={touched}
                pending={lifecycleMutation.isPending}
                error={
                  lifecycleMutation.isError
                    ? friendlyError(lifecycleMutation.error)
                    : null
                }
                onCancel={goBackToElection}
                onSave={() => {
                  setTouched(true);

                  lifecycleMutation.mutate();
                }}
              />
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// SECTION HEADER
// ============================================================================

function SectionHeader({
  icon,
  title,
  subtitle,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="flex items-start gap-2.5 border-b border-slate-200 px-3 py-2.5 sm:px-4">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#0013bf]/10 text-[#0013bf]">
        {icon}
      </div>

      <div className="min-w-0">
        <div className="font-bold text-slate-900">{title}</div>

        <div className="mt-0.5 text-xs leading-5 text-slate-500">
          {subtitle}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// FIELD LABEL
// ============================================================================

function FieldLabel({ label }: { label: string }) {
  return (
    <label className="mb-1.5 block text-sm font-bold text-slate-700">
      {label}
    </label>
  );
}

// ============================================================================
// DATE FIELD
// ============================================================================

function LifecycleDateField({
  label,
  value,
  setValue,
  disabled = false,
}: {
  label: string;
  value: string;
  setValue: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <div>
      <FieldLabel label={label} />

      <input
        type="datetime-local"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        disabled={disabled}
        className="min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-[#0013bf] focus:ring-2 focus:ring-[#0013bf]/15 disabled:cursor-not-allowed disabled:bg-slate-100"
      />
    </div>
  );
}

// ============================================================================
// DESKTOP/MOBILE SIDE PANEL
// ============================================================================

function LifecycleSidePanel({
  election,
  currentStatus,
  lifecycleStatus,
  archivedTerminal,
  hasChanges,
  missingRequiredTimeline,
  timelineError,
  touched,
  pending,
  error,
  onCancel,
  onSave,
}: {
  election: {
    isActive: boolean;
    availableAt?: string | null;
    startAt?: string | null;
    endAt?: string | null;
    availableUntil?: string | null;
    archiveDue?: boolean;
  };
  currentStatus: ElectionAccessStatus;
  lifecycleStatus: ElectionAccessStatus;
  archivedTerminal: boolean;
  hasChanges: boolean;
  missingRequiredTimeline: boolean;
  timelineError: string | null;
  touched: boolean;
  pending: boolean;
  error: string | null;
  onCancel: () => void;
  onSave: () => void;
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      {/* SUMMARY */}

      <div className="border-b border-slate-200 px-4 py-3">
        <div className="text-xs font-bold uppercase tracking-[0.08em] text-slate-400">
          Lifecycle Summary
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-bold ${lifecycleBadgeClass(
              currentStatus,
            )}`}
          >
            {lifecycleLabel(currentStatus)}
          </span>

          <span
            className={
              election.isActive
                ? "inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700"
                : "inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600"
            }
          >
            {election.isActive && <CheckCircle2 size={12} />}
            Technical: {election.isActive ? "Active" : "Inactive"}
          </span>
        </div>

        {election.archiveDue && (
          <div className="mt-2 inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-800">
            <Clock3 size={12} />
            Archive Due
          </div>
        )}
      </div>

      {/* TIMELINE SNAPSHOT */}

      <div className="border-b border-slate-200 p-4">
        <div className="mb-3 text-xs font-bold uppercase tracking-[0.08em] text-slate-400">
          Current Timeline
        </div>

        <div className="grid grid-cols-2 gap-x-3 gap-y-3 lg:grid-cols-1">
          <MiniValue
            label="Available"
            value={formatDateTime(election.availableAt)}
          />

          <MiniValue label="Start" value={formatDateTime(election.startAt)} />

          <MiniValue label="End" value={formatDateTime(election.endAt)} />

          <MiniValue
            label="Available Until"
            value={formatDateTime(election.availableUntil)}
          />
        </div>
      </div>

      {/* TRANSITION NOTICE */}

      <div className="border-b border-slate-200 p-4">
        <div className="text-xs font-bold uppercase tracking-[0.08em] text-slate-400">
          Selected Transition
        </div>

        <div className="mt-2 flex items-center gap-2 text-sm font-bold text-slate-900">
          <span>{lifecycleLabel(currentStatus)}</span>

          <span className="text-slate-400">→</span>

          <span
            className={
              lifecycleStatus === "CANCELLED"
                ? "text-[#bf0013]"
                : lifecycleStatus === "AVAILABLE"
                  ? "text-emerald-700"
                  : "text-slate-700"
            }
          >
            {lifecycleLabel(lifecycleStatus)}
          </span>
        </div>

        {lifecycleStatus === "AVAILABLE" && (
          <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs leading-5 text-emerald-800">
            Available releases the election to eligible tenant organizations
            according to the configured window. Official NEC result publication
            remains separate.
          </div>
        )}

        {lifecycleStatus === "ARCHIVED" && (
          <div className="mt-3 rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-700">
            Archived preserves this election as a historical record and ends
            normal election operations.
          </div>
        )}

        {lifecycleStatus === "CANCELLED" && (
          <div className="mt-3 rounded-lg border border-[#bf0013]/25 bg-[#bf0013]/5 px-3 py-2 text-xs leading-5 text-[#8f000e]">
            Cancelled is a controlled lifecycle transition and removes the
            election from normal active operations.
          </div>
        )}
      </div>

      {/* ERRORS */}

      {touched && missingRequiredTimeline && (
        <div className="border-b border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold leading-5 text-red-700">
          Available At, Operational Start, Operational End, and Available Until
          are required before an election can become Available.
        </div>
      )}

      {touched && timelineError && (
        <div className="border-b border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold leading-5 text-red-700">
          {timelineError}
        </div>
      )}

      {error && (
        <div className="border-b border-[#bf0013]/25 bg-[#bf0013]/5 px-4 py-3 text-xs font-semibold leading-5 text-[#8f000e]">
          {error}
        </div>
      )}

      {/* ACTIONS */}

      <div className="bg-slate-50 p-3">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-1">
          <button
            type="button"
            onClick={onSave}
            disabled={
              pending ||
              archivedTerminal ||
              !hasChanges ||
              missingRequiredTimeline ||
              Boolean(timelineError)
            }
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#0013bf] px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-[#0010a3] disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {pending ? (
              <RefreshCw size={16} className="animate-spin" />
            ) : (
              <Save size={16} />
            )}

            {pending ? "Saving…" : "Save Lifecycle"}
          </button>

          <button
            type="button"
            onClick={onCancel}
            disabled={pending}
            className="inline-flex min-h-11 items-center justify-center rounded-lg border border-[#bf0013]/35 bg-white px-4 py-2 text-sm font-bold text-[#bf0013] transition hover:bg-[#bf0013]/5 disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// MINI VALUE
// ============================================================================

function MiniValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <div className="text-[10px] font-bold uppercase tracking-[0.07em] text-slate-400">
        {label}
      </div>

      <div
        className="mt-0.5 break-words text-xs font-bold leading-5 text-slate-800"
        title={value}
      >
        {value}
      </div>
    </div>
  );
}

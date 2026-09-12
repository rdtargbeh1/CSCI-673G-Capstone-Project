// src/pages/elections/ElectionDetailPage.tsx

import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  AlertCircle,
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock3,
  ChevronDown,
  ChevronUp,
  Edit3,
  ExternalLink,
  Power,
  PowerOff,
  RefreshCw,
  Save,
  Settings2,
  Trash2,
  UserRound,
  Vote,
} from "lucide-react";

import { useAuthStore } from "../../shared/store/authStore";

import {
  deleteElection,
  fetchElectionById,
  setElectionActive,
  updateElection,
  type ElectionAccessStatus,
  type ElectionType,
} from "../../shared/services/electionService";

// ============================================================================
// ELECTION TYPES
// ============================================================================

const ELECTION_TYPE_OPTIONS: {
  value: ElectionType;
  label: string;
}[] = [
  {
    value: "PRESIDENTIAL",
    label: "Presidential",
  },
  {
    value: "LEGISLATIVE",
    label: "Legislative",
  },
  {
    value: "SENATORIAL",
    label: "Senatorial",
  },
  {
    value: "REPRESENTATIVE",
    label: "Representative",
  },
  {
    value: "REFERENDUM",
    label: "Referendum",
  },
  {
    value: "PRESIDENTIAL_GENERAL",
    label: "Presidential General",
  },
  {
    value: "BY_ELECTION",
    label: "By-Election",
  },
  {
    value: "LOCAL",
    label: "Local",
  },
];

// ============================================================================
// HELPERS
// ============================================================================

function electionTypeLabel(value: ElectionType | null | undefined) {
  if (!value) {
    return "—";
  }

  return (
    ELECTION_TYPE_OPTIONS.find((option) => option.value === value)?.label ??
    String(value)
  );
}

function normalizeName(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function parseYear(value: string): number | undefined {
  const trimmed = value.trim();

  if (!trimmed) {
    return undefined;
  }

  const parsed = Number(trimmed);

  return Number.isFinite(parsed) ? parsed : undefined;
}

function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
}

function friendlyError(error: any) {
  return (
    error?.response?.data?.message ??
    error?.response?.data?.error ??
    error?.message ??
    "Something went wrong."
  );
}

function friendlySaveError(error: any) {
  const message = friendlyError(error);

  if (/duplicate|unique|already exists|constraint/i.test(message)) {
    return "Election already exists with the same name and year. Please choose a different name or year.";
  }

  return message;
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
      return "border-red-200 bg-red-50 text-red-700";
    default:
      return "border-slate-200 bg-white text-slate-600";
  }
}

// ============================================================================
// PAGE
// ============================================================================

export default function ElectionDetailPage() {
  const { electionId } = useParams<{
    electionId: string;
  }>();

  const navigate = useNavigate();

  const queryClient = useQueryClient();

  // ==========================================================================
  // ACCESS
  // ==========================================================================

  const dashboardMode = useAuthStore((state) => state.dashboardMode);

  /*
   * UI/domain hint only. The backend remains authoritative and enforces
   * SYSTEM_ADMIN or NEC tenant NEC_ADMIN for election governance.
   */
  const canManageElection =
    dashboardMode === "NEC" || dashboardMode === "SYSTEM";

  // ==========================================================================
  // PAGE STATE
  // ==========================================================================

  const [editing, setEditing] = useState(false);

  const [mobileDetailsExpanded, setMobileDetailsExpanded] = useState(false);

  const [touched, setTouched] = useState(false);

  // ==========================================================================
  // EDIT STATE
  // ==========================================================================

  const [electionName, setElectionName] = useState("");

  const [year, setYear] = useState("");

  const [electionType, setElectionType] = useState<ElectionType>(
    "PRESIDENTIAL_GENERAL",
  );

  const [active, setActive] = useState(true);

  const [ballotSparePercent, setBallotSparePercent] = useState<number | "">("");

  const [enforceBallotsGteRegistered, setEnforceBallotsGteRegistered] =
    useState(true);

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
  // SYNC FORM
  // ==========================================================================

  useEffect(() => {
    if (!election) {
      return;
    }

    setElectionName(election.electionName ?? "");

    setYear(String(election.year ?? ""));

    setElectionType(election.electionType ?? "PRESIDENTIAL_GENERAL");

    setActive(!!election.isActive);

    setBallotSparePercent(
      election.ballotSparePercent == null
        ? ""
        : Number(election.ballotSparePercent),
    );

    setEnforceBallotsGteRegistered(
      election.enforceBallotsGteRegistered ?? true,
    );
  }, [election]);

  // ==========================================================================
  // REFRESH
  // ==========================================================================

  const refreshElection = async () => {
    await queryClient.invalidateQueries({
      queryKey: ["election"],
    });

    await queryClient.invalidateQueries({
      queryKey: ["elections"],
    });

    await electionQuery.refetch();
  };

  // ==========================================================================
  // UPDATE
  // ==========================================================================

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!electionId) {
        throw new Error("Missing election ID.");
      }

      const name = normalizeName(electionName);

      const parsedYear = parseYear(year);

      if (!name) {
        throw new Error("Election name is required.");
      }

      if (!parsedYear) {
        throw new Error("Election year is required.");
      }

      const spare =
        ballotSparePercent === "" ? null : Number(ballotSparePercent);

      if (spare != null) {
        if (!Number.isFinite(spare)) {
          throw new Error("Spare percent is invalid.");
        }

        if (spare < 0 || spare > 100) {
          throw new Error("Spare percent must be between 0 and 100.");
        }
      }

      return updateElection(electionId, {
        electionName: name,

        year: parsedYear,

        electionType,

        isActive: !!active,

        ballotSparePercent: spare,

        enforceBallotsGteRegistered,
      });
    },

    onSuccess: async () => {
      setEditing(false);

      setTouched(false);

      await refreshElection();
    },
  });

  // ==========================================================================
  // ACTIVATE / DEACTIVATE
  // ==========================================================================

  const activeMutation = useMutation({
    mutationFn: async () => {
      if (!election) {
        throw new Error("Election not loaded.");
      }

      return setElectionActive(election.electionId, !election.isActive);
    },

    onSuccess: async () => {
      await refreshElection();
    },
  });

  // ==========================================================================
  // DELETE
  // ==========================================================================

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!electionId) {
        throw new Error("Missing election ID.");
      }

      await deleteElection(electionId);
    },

    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["elections"],
      });

      navigate("/elections", {
        replace: true,
      });
    },
  });

  // ==========================================================================
  // BEGIN EDIT
  // ==========================================================================

  const beginEdit = () => {
    if (!canManageElection || !election) {
      return;
    }

    setElectionName(election.electionName ?? "");

    setYear(String(election.year ?? ""));

    setElectionType(election.electionType ?? "PRESIDENTIAL_GENERAL");

    setActive(!!election.isActive);

    setBallotSparePercent(
      election.ballotSparePercent == null
        ? ""
        : Number(election.ballotSparePercent),
    );

    setEnforceBallotsGteRegistered(
      election.enforceBallotsGteRegistered ?? true,
    );

    setTouched(false);

    setEditing(true);
  };

  // ==========================================================================
  // CANCEL EDIT
  // ==========================================================================

  const cancelEdit = () => {
    if (!election) {
      return;
    }

    setElectionName(election.electionName ?? "");

    setYear(String(election.year ?? ""));

    setElectionType(election.electionType ?? "PRESIDENTIAL_GENERAL");

    setActive(!!election.isActive);

    setBallotSparePercent(
      election.ballotSparePercent == null
        ? ""
        : Number(election.ballotSparePercent),
    );

    setEnforceBallotsGteRegistered(
      election.enforceBallotsGteRegistered ?? true,
    );

    setTouched(false);

    setEditing(false);
  };

  // ==========================================================================
  // SAVE
  // ==========================================================================

  const saveChanges = () => {
    setTouched(true);

    if (!canManageElection) {
      return;
    }

    const name = normalizeName(electionName);

    const parsedYear = parseYear(year);

    if (!name || !parsedYear) {
      return;
    }

    if (ballotSparePercent !== "") {
      const spare = Number(ballotSparePercent);

      if (!Number.isFinite(spare) || spare < 0 || spare > 100) {
        return;
      }
    }

    updateMutation.mutate();
  };

  // ==========================================================================
  // DELETE HANDLER
  // ==========================================================================

  const deleteCurrentElection = () => {
    if (!canManageElection || !election) {
      return;
    }

    const confirmed = window.confirm(
      `Delete election "${election.electionName}" (${election.year})?\n\nThis action is permanent.`,
    );

    if (confirmed) {
      deleteMutation.mutate();
    }
  };

  // ==========================================================================
  // ROUTE GUARD
  // ==========================================================================

  if (!electionId) {
    return (
      <div className="app-detail">
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
          Missing election ID.
        </div>
      </div>
    );
  }

  // ==========================================================================
  // LOADING
  // ==========================================================================

  if (electionQuery.isLoading) {
    return (
      <div className="app-detail">
        <div className="rounded-xl border border-slate-200 bg-white p-5 text-center text-base text-slate-600">
          Loading election…
        </div>
      </div>
    );
  }

  // ==========================================================================
  // ERROR
  // ==========================================================================

  if (electionQuery.isError || !election) {
    return (
      <div className="app-detail">
        <div className="flex gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
          <AlertCircle size={18} className="mt-0.5 shrink-0" />

          <div>{friendlyError(electionQuery.error)}</div>
        </div>
      </div>
    );
  }

  // ==========================================================================
  // DISPLAY
  // ==========================================================================

  const typeLabel = electionTypeLabel(election.electionType);

  const createdByName = election.createdByName?.trim() || "—";

  const updatedByName = election.updatedByName?.trim() || "—";

  const spareBallots =
    election.ballotSparePercent == null
      ? "Not set"
      : `${election.ballotSparePercent}%`;

  const lifecycle = election.accessStatus ?? "DRAFT";

  const normalUpdateAllowed =
    lifecycle === "DRAFT" || lifecycle === "AVAILABLE";

  const deleteAllowed = lifecycle === "DRAFT";

  const activateAllowed = lifecycle !== "ARCHIVED" && lifecycle !== "CANCELLED";

  // ==========================================================================
  // VALIDATION
  // ==========================================================================

  const nameError = touched && !normalizeName(electionName);

  const yearError = touched && !parseYear(year);

  const spareError =
    ballotSparePercent !== "" &&
    (!Number.isFinite(Number(ballotSparePercent)) ||
      Number(ballotSparePercent) < 0 ||
      Number(ballotSparePercent) > 100);

  // ==========================================================================
  // RENDER
  // ==========================================================================

  return (
    <div className="app-detail">
      <div className="flex min-w-0 flex-col gap-3">
        {/* ================================================================
            HEADER
        ================================================================ */}

        <section className="rounded-xl border border-slate-200 bg-white p-3 sm:p-4">
          <div className="flex min-w-0 items-start gap-2.5">
            <button
              type="button"
              onClick={() => navigate("/elections")}
              className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-slate-700 transition hover:bg-slate-50"
              aria-label="Back to elections"
            >
              <ArrowLeft size={18} />
            </button>

            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <h1 className="min-w-0 text-xl font-bold text-slate-900 sm:text-2xl lg:text-3xl">
                  {election.electionName}
                </h1>

                <span
                  className={
                    election.isActive
                      ? "inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700"
                      : "inline-flex shrink-0 items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600"
                  }
                >
                  {election.isActive && <CheckCircle2 size={13} />}

                  {election.isActive ? "Active" : "Inactive"}
                </span>

                <span
                  className={`inline-flex shrink-0 items-center rounded-full border px-2.5 py-1 text-xs font-bold ${lifecycleBadgeClass(
                    lifecycle,
                  )}`}
                >
                  {lifecycleLabel(lifecycle)}
                </span>
              </div>

              <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-slate-600 lg:text-base">
                <span className="font-semibold text-slate-800">
                  {election.year}
                </span>

                <span className="text-slate-300">•</span>

                <span>{typeLabel}</span>
              </div>
            </div>
          </div>
        </section>

        {/* ================================================================
            ACTION BAR
        ================================================================ */}

        <section className="rounded-xl border border-slate-200 bg-white p-3">
          <div className="flex min-w-0 flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <div className="text-sm font-bold text-slate-900 lg:text-base">
                Election Actions
              </div>

              <div className="mt-0.5 text-xs text-slate-500">
                Workspace and record-management actions.
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center sm:justify-end">
              {/* WORKSPACE */}

              <button
                type="button"
                onClick={() => navigate(`/elections/${electionId}/overview`)}
                className="col-span-2 inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg bg-blue-700 px-3 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-blue-800 sm:col-span-1"
              >
                <ExternalLink size={16} />
                Open Workspace
              </button>

              {/* REFRESH */}

              <button
                type="button"
                onClick={refreshElection}
                disabled={electionQuery.isFetching}
                className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
              >
                <RefreshCw
                  size={16}
                  className={electionQuery.isFetching ? "animate-spin" : ""}
                />
                Refresh
              </button>

              {/* EDIT */}

              {canManageElection && (
                <button
                  type="button"
                  onClick={beginEdit}
                  disabled={editing || !normalUpdateAllowed}
                  title={
                    normalUpdateAllowed
                      ? "Edit election information"
                      : "Archived or cancelled elections cannot be changed through normal edit"
                  }
                  className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-emerald-700 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Edit3 size={16} />
                  Edit
                </button>
              )}

              {/* ACTIVATE / DEACTIVATE */}

              {canManageElection && (
                <button
                  type="button"
                  onClick={() => activeMutation.mutate()}
                  disabled={
                    activeMutation.isPending ||
                    editing ||
                    (!election.isActive && !activateAllowed)
                  }
                  className={
                    election.isActive
                      ? "inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-bold text-amber-800 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-40"
                      : "inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-40"
                  }
                >
                  {activeMutation.isPending ? (
                    <RefreshCw size={16} className="animate-spin" />
                  ) : election.isActive ? (
                    <PowerOff size={16} />
                  ) : (
                    <Power size={16} />
                  )}

                  {election.isActive ? "Deactivate" : "Activate"}
                </button>
              )}

              {/* DELETE */}

              {canManageElection && (
                <button
                  type="button"
                  onClick={deleteCurrentElection}
                  disabled={
                    deleteMutation.isPending || editing || !deleteAllowed
                  }
                  title={
                    deleteAllowed
                      ? "Delete Draft election"
                      : "Only Draft elections may be physically deleted"
                  }
                  className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm font-bold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {deleteMutation.isPending ? (
                    <RefreshCw size={16} className="animate-spin" />
                  ) : (
                    <Trash2 size={16} />
                  )}
                  Delete
                </button>
              )}
            </div>
          </div>

          {activeMutation.isError && (
            <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">
              {friendlyError(activeMutation.error)}
            </div>
          )}

          {deleteMutation.isError && (
            <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">
              {friendlyError(deleteMutation.error)}
            </div>
          )}
        </section>

        {/* ================================================================
            ELECTION LIFECYCLE
        ================================================================ */}

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="flex min-w-0 flex-col gap-2 border-b border-slate-200 px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 sm:text-lg">
                  Election Lifecycle
                </h2>

                <span
                  className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-bold ${lifecycleBadgeClass(
                    lifecycle,
                  )}`}
                >
                  {lifecycleLabel(lifecycle)}
                </span>

                {election.archiveDue && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-800">
                    <Clock3 size={13} />
                    Archive Due
                  </span>
                )}
              </div>

              <p className="mt-1 text-xs leading-5 text-slate-500 sm:text-sm">
                Lifecycle controls when the election is released to eligible
                tenant organizations. Official NEC result publication remains
                separate.
              </p>
            </div>

            {canManageElection && (
              <button
                type="button"
                onClick={() => navigate(`/elections/${electionId}/lifecycle`)}
                disabled={editing}
                className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg border border-blue-300 bg-blue-50 px-3 py-2 text-sm font-bold text-blue-700 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Clock3 size={16} />
                {lifecycle === "ARCHIVED"
                  ? "View Lifecycle"
                  : "Manage Lifecycle"}
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-x-4 gap-y-4 p-3 sm:p-4 lg:grid-cols-4">
            <LifecycleValue
              label="Available At"
              value={formatDateTime(election.availableAt)}
            />

            <LifecycleValue
              label="Operational Start"
              value={formatDateTime(election.startAt)}
            />

            <LifecycleValue
              label="Operational End"
              value={formatDateTime(election.endAt)}
            />

            <LifecycleValue
              label="Available Until"
              value={formatDateTime(election.availableUntil)}
            />

            {election.archivedAt && (
              <LifecycleValue
                label="Archived At"
                value={formatDateTime(election.archivedAt)}
              />
            )}

            {election.archivedReason && (
              <div className="col-span-2 lg:col-span-3">
                <LifecycleValue
                  label={
                    lifecycle === "CANCELLED"
                      ? "Cancellation Reason"
                      : "Archive Reason"
                  }
                  value={election.archivedReason}
                />
              </div>
            )}
          </div>
        </section>

        {/* ================================================================
            EDIT WORKSPACE
            WHEN EDITING, READ-ONLY SUMMARY/DETAILS ARE HIDDEN
        ================================================================ */}

        {editing ? (
          <section className="overflow-hidden rounded-xl border border-blue-200 bg-white">
            {/* EDIT HEADER */}

            <div className="border-b border-blue-100 bg-blue-50/60 px-3 py-3 sm:px-4 lg:px-5">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
                  <Edit3 size={17} />
                </div>

                <div>
                  <h2 className="text-base font-bold text-slate-900 sm:text-lg lg:text-xl">
                    Edit Election
                  </h2>

                  <p className="mt-0.5 text-xs text-slate-500 sm:text-sm">
                    Update election information and ballot policy.
                  </p>
                </div>
              </div>
            </div>

            {/* ============================================================
                DESKTOP EDIT
            ============================================================ */}

            <div className="hidden grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)] divide-x divide-slate-200 lg:grid">
              {/* LEFT */}

              <div className="p-4 lg:p-5">
                <div className="mb-4 text-sm font-bold uppercase tracking-wide text-slate-500">
                  Election Information
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* NAME */}

                  <div className="col-span-2">
                    <FieldLabel label="Election Name" />

                    <input
                      value={electionName}
                      onChange={(event) => {
                        setElectionName(event.target.value);

                        setTouched(true);
                      }}
                      className={
                        nameError
                          ? "w-full rounded-lg border border-red-300 bg-red-50 px-3 py-2.5 text-base text-red-900 outline-none focus:ring-2 focus:ring-red-200"
                          : "w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-base text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      }
                    />

                    {nameError && (
                      <FieldError>Election name is required.</FieldError>
                    )}
                  </div>

                  {/* YEAR */}

                  <div>
                    <FieldLabel label="Election Year" />

                    <input
                      type="number"
                      min={1900}
                      value={year}
                      onChange={(event) => {
                        setYear(event.target.value);

                        setTouched(true);
                      }}
                      className={
                        yearError
                          ? "w-full rounded-lg border border-red-300 bg-red-50 px-3 py-2.5 text-base text-red-900 outline-none focus:ring-2 focus:ring-red-200"
                          : "w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-base text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      }
                    />

                    {yearError && (
                      <FieldError>A valid year is required.</FieldError>
                    )}
                  </div>

                  {/* TYPE */}

                  <div>
                    <FieldLabel label="Election Type" />

                    <select
                      value={electionType}
                      onChange={(event) => {
                        setElectionType(event.target.value as ElectionType);

                        setTouched(true);
                      }}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-base text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    >
                      {ELECTION_TYPE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <ActiveEditRow
                  active={active}
                  setActive={(value) => {
                    setActive(value);

                    setTouched(true);
                  }}
                />
              </div>

              {/* RIGHT */}

              <div className="bg-blue-50/30 p-4 lg:p-5">
                <div className="mb-4 flex items-center gap-2">
                  <Settings2 size={17} className="text-blue-700" />

                  <span className="text-sm font-bold uppercase tracking-wide text-slate-500">
                    Ballot Policy
                  </span>
                </div>

                <BallotPolicyEditor
                  ballotSparePercent={ballotSparePercent}
                  setBallotSparePercent={setBallotSparePercent}
                  spareError={spareError}
                  enforceBallotsGteRegistered={enforceBallotsGteRegistered}
                  setEnforceBallotsGteRegistered={
                    setEnforceBallotsGteRegistered
                  }
                  onTouched={() => setTouched(true)}
                />

                <EditPreview
                  active={active}
                  type={electionTypeLabel(electionType)}
                  spare={ballotSparePercent}
                  enforced={enforceBallotsGteRegistered}
                />
              </div>
            </div>

            {/* ============================================================
                MOBILE / TABLET EDIT
            ============================================================ */}

            <div className="lg:hidden">
              {/* ELECTION FIELDS */}

              <div className="p-3 sm:p-4">
                <div className="grid grid-cols-2 gap-3">
                  {/* NAME */}

                  <div className="col-span-2">
                    <FieldLabel label="Election Name" />

                    <input
                      value={electionName}
                      onChange={(event) => {
                        setElectionName(event.target.value);

                        setTouched(true);
                      }}
                      className={
                        nameError
                          ? "w-full rounded-lg border border-red-300 bg-red-50 px-3 py-2.5 text-base text-red-900 outline-none focus:ring-2 focus:ring-red-200"
                          : "w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-base text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      }
                    />

                    {nameError && (
                      <FieldError>Election name is required.</FieldError>
                    )}
                  </div>

                  {/* YEAR */}

                  <div>
                    <FieldLabel label="Year" />

                    <input
                      type="number"
                      min={1900}
                      value={year}
                      onChange={(event) => {
                        setYear(event.target.value);

                        setTouched(true);
                      }}
                      className={
                        yearError
                          ? "w-full rounded-lg border border-red-300 bg-red-50 px-3 py-2.5 text-base text-red-900 outline-none"
                          : "w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-base text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      }
                    />

                    {yearError && <FieldError>Invalid year.</FieldError>}
                  </div>

                  {/* TYPE */}

                  <div>
                    <FieldLabel label="Type" />

                    <select
                      value={electionType}
                      onChange={(event) => {
                        setElectionType(event.target.value as ElectionType);

                        setTouched(true);
                      }}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-base text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    >
                      {ELECTION_TYPE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <ActiveEditRow
                  active={active}
                  setActive={(value) => {
                    setActive(value);

                    setTouched(true);
                  }}
                  compact
                />
              </div>

              {/* DIVIDER */}

              <div className="border-t border-slate-200" />

              {/* BALLOT POLICY */}

              <div className="bg-blue-50/30 p-3 sm:p-4">
                <div className="mb-3 flex items-center gap-2">
                  <Settings2 size={16} className="text-blue-700" />

                  <div className="text-sm font-bold text-slate-900">
                    Ballot Policy
                  </div>
                </div>

                <BallotPolicyEditor
                  ballotSparePercent={ballotSparePercent}
                  setBallotSparePercent={setBallotSparePercent}
                  spareError={spareError}
                  enforceBallotsGteRegistered={enforceBallotsGteRegistered}
                  setEnforceBallotsGteRegistered={
                    setEnforceBallotsGteRegistered
                  }
                  onTouched={() => setTouched(true)}
                  compact
                />

                <EditPreview
                  active={active}
                  type={electionTypeLabel(electionType)}
                  spare={ballotSparePercent}
                  enforced={enforceBallotsGteRegistered}
                  compact
                />
              </div>
            </div>

            {/* ============================================================
                UPDATE ERROR
            ============================================================ */}

            {updateMutation.isError && (
              <div className="mx-3 mb-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700 sm:mx-4 lg:mx-5">
                {friendlySaveError(updateMutation.error)}
              </div>
            )}

            {/* ============================================================
                FORM ACTIONS
            ============================================================ */}

            <div className="border-t border-slate-200 bg-slate-50/70 p-3 sm:p-4">
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
                <button
                  type="button"
                  onClick={cancelEdit}
                  disabled={updateMutation.isPending}
                  className="min-h-11 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 sm:min-w-28"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={saveChanges}
                  disabled={updateMutation.isPending}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700 disabled:bg-slate-300 sm:min-w-40"
                >
                  {updateMutation.isPending ? (
                    <>
                      <RefreshCw size={15} className="animate-spin" />
                      Saving…
                    </>
                  ) : (
                    <>
                      <Save size={16} />
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            </div>
          </section>
        ) : (
          <>
            {/* ============================================================
                READ-ONLY SUMMARY
            ============================================================ */}

            <section className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
              <SummaryCard
                label="Year"
                value={String(election.year)}
                icon={<CalendarDays size={17} />}
              />

              <SummaryCard
                label="Election Type"
                value={typeLabel}
                icon={<Vote size={17} />}
              />

              <SummaryCard
                label="Spare Ballots"
                value={spareBallots}
                icon={<Settings2 size={17} />}
              />

              <SummaryCard
                label="Ballot Rule"
                value={
                  election.enforceBallotsGteRegistered === false
                    ? "Off"
                    : "Enforced"
                }
                positive={election.enforceBallotsGteRegistered !== false}
              />
            </section>

            {/* ============================================================
                MOBILE DETAILS
            ============================================================ */}

            <section className="rounded-xl border border-slate-200 bg-white md:hidden">
              <div className="p-3">
                <div className="mb-3 text-base font-bold text-slate-900">
                  Basic Details
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <CompactField label="Year" value={String(election.year)} />

                  <CompactField label="Type" value={typeLabel} />

                  <CompactField label="Spare Ballots" value={spareBallots} />

                  <CompactField
                    label="Rule"
                    value={
                      election.enforceBallotsGteRegistered === false
                        ? "Off"
                        : "Enforced"
                    }
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={() => setMobileDetailsExpanded((current) => !current)}
                className="flex min-h-11 w-full items-center justify-center gap-2 border-t border-slate-200 px-3 py-2 text-sm font-bold text-blue-700 hover:bg-slate-50"
              >
                {mobileDetailsExpanded
                  ? "Hide Full Details"
                  : "View Full Details"}

                {mobileDetailsExpanded ? (
                  <ChevronUp size={17} />
                ) : (
                  <ChevronDown size={17} />
                )}
              </button>

              {mobileDetailsExpanded && (
                <div className="border-t border-slate-200 p-3">
                  <div className="grid grid-cols-1 gap-3">
                    <MobileDetailGroup title="Election Information">
                      <CompactField
                        label="Election Name"
                        value={election.electionName}
                      />

                      <CompactField
                        label="Year"
                        value={String(election.year)}
                      />

                      <CompactField label="Election Type" value={typeLabel} />

                      <CompactField
                        label="Status"
                        value={election.isActive ? "Active" : "Inactive"}
                      />
                    </MobileDetailGroup>

                    <MobileDetailGroup title="Ballot Policy">
                      <CompactField
                        label="Spare Ballots"
                        value={spareBallots}
                      />

                      <CompactField
                        label="Ballot Rule"
                        value={
                          election.enforceBallotsGteRegistered === false
                            ? "Off"
                            : "Enforced"
                        }
                      />
                    </MobileDetailGroup>

                    <MobileDetailGroup title="Record History">
                      <CompactField
                        label="Date Created"
                        value={formatDateTime(election.dateCreated)}
                      />

                      <CompactField label="Created By" value={createdByName} />

                      <CompactField
                        label="Date Updated"
                        value={formatDateTime(election.dateUpdated)}
                      />

                      <CompactField label="Updated By" value={updatedByName} />
                    </MobileDetailGroup>
                  </div>
                </div>
              )}
            </section>

            {/* ============================================================
                DESKTOP DETAILS
            ============================================================ */}

            <section className="hidden grid-cols-[1fr_0.95fr] gap-3 md:grid">
              {/* ELECTION INFORMATION */}

              <div className="rounded-xl border border-slate-200 bg-white p-4 lg:p-5">
                <SectionHeader
                  icon={<Vote size={17} />}
                  title="Election Information"
                  subtitle="Election master record"
                />

                <div className="grid grid-cols-2 gap-x-5 gap-y-5">
                  <div className="col-span-2">
                    <DetailField
                      label="Election Name"
                      value={election.electionName}
                    />
                  </div>

                  <DetailField
                    label="Election Year"
                    value={String(election.year)}
                  />

                  <DetailField label="Election Type" value={typeLabel} />

                  <DetailField
                    label="Status"
                    value={election.isActive ? "Active" : "Inactive"}
                    positive={election.isActive}
                  />

                  <DetailField label="Spare Ballots" value={spareBallots} />

                  <div className="col-span-2">
                    <DetailField
                      label="Ballot Allocation Rule"
                      value={
                        election.enforceBallotsGteRegistered === false
                          ? "Not Enforced"
                          : "Enforced — ballots issued must be at least registered voters"
                      }
                      positive={election.enforceBallotsGteRegistered !== false}
                    />
                  </div>
                </div>
              </div>

              {/* RECORD DETAILS */}

              <div className="rounded-xl border border-slate-200 bg-white p-4 lg:p-5">
                <SectionHeader
                  icon={<CalendarDays size={17} />}
                  title="Record Details"
                  subtitle="Creation and update history"
                />

                <div className="grid grid-cols-2 gap-x-5 gap-y-5">
                  <DetailField
                    label="Date Created"
                    value={formatDateTime(election.dateCreated)}
                  />

                  <DetailField
                    label="Created By"
                    value={createdByName}
                    icon={<UserRound size={13} />}
                  />

                  <DetailField
                    label="Date Updated"
                    value={formatDateTime(election.dateUpdated)}
                  />

                  <DetailField
                    label="Updated By"
                    value={updatedByName}
                    icon={<UserRound size={13} />}
                  />
                </div>
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// LIFECYCLE VALUE
// ============================================================================

function LifecycleValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <div className="text-[10px] font-bold uppercase tracking-[0.07em] text-slate-400 lg:text-[11px]">
        {label}
      </div>

      <div
        className="mt-1 break-words text-sm font-bold leading-5 text-slate-900 lg:text-base lg:leading-6"
        title={value}
      >
        {value}
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
// FIELD ERROR
// ============================================================================

function FieldError({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-1 text-xs font-semibold text-red-600">{children}</div>
  );
}

// ============================================================================
// ACTIVE EDIT ROW
// ============================================================================

function ActiveEditRow({
  active,
  setActive,
  compact = false,
}: {
  active: boolean;

  setActive: (value: boolean) => void;

  compact?: boolean;
}) {
  return (
    <label
      className={
        compact
          ? "mt-3 flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5"
          : "mt-4 flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3"
      }
    >
      <input
        type="checkbox"
        checked={active}
        onChange={(event) => setActive(event.target.checked)}
        className="h-4 w-4 shrink-0 accent-blue-600"
      />

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-bold text-slate-900">
            Technical Active State
          </span>

          {active && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-700">
              <CheckCircle2 size={12} />
              Active
            </span>
          )}
        </div>

        {!compact && (
          <div className="mt-0.5 text-xs text-slate-500">
            Technical enable/disable state only. Election lifecycle and tenant
            release are managed separately.
          </div>
        )}
      </div>
    </label>
  );
}

// ============================================================================
// BALLOT POLICY EDITOR
// ============================================================================

function BallotPolicyEditor({
  ballotSparePercent,
  setBallotSparePercent,
  spareError,
  enforceBallotsGteRegistered,
  setEnforceBallotsGteRegistered,
  onTouched,
  compact = false,
}: {
  ballotSparePercent: number | "";

  setBallotSparePercent: (value: number | "") => void;

  spareError: boolean;

  enforceBallotsGteRegistered: boolean;

  setEnforceBallotsGteRegistered: (value: boolean) => void;

  onTouched: () => void;

  compact?: boolean;
}) {
  return (
    <div
      className={
        compact
          ? "grid grid-cols-1 gap-3 sm:grid-cols-2"
          : "grid grid-cols-1 gap-4"
      }
    >
      {/* SPARE */}

      <div>
        <FieldLabel label="Spare Ballots Percent" />

        <div className="relative">
          <input
            type="number"
            min={0}
            max={100}
            value={ballotSparePercent}
            onChange={(event) => {
              onTouched();

              const value = event.target.value;

              if (value === "") {
                setBallotSparePercent("");

                return;
              }

              const parsed = Number(value);

              if (Number.isFinite(parsed)) {
                setBallotSparePercent(parsed);
              }
            }}
            className={
              spareError
                ? "w-full rounded-lg border border-red-300 bg-red-50 px-3 py-2.5 pr-9 text-base text-red-900 outline-none"
                : "w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 pr-9 text-base text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            }
          />

          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
            %
          </span>
        </div>

        {spareError && <FieldError>Must be between 0 and 100.</FieldError>}
      </div>

      {/* RULE */}

      <div>
        <FieldLabel label="Ballot Allocation Rule" />

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => {
              setEnforceBallotsGteRegistered(true);

              onTouched();
            }}
            className={
              enforceBallotsGteRegistered
                ? "min-h-11 rounded-lg border border-emerald-300 bg-emerald-50 px-3 text-sm font-bold text-emerald-700"
                : "min-h-11 rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-600"
            }
          >
            Enforce
          </button>

          <button
            type="button"
            onClick={() => {
              setEnforceBallotsGteRegistered(false);

              onTouched();
            }}
            className={
              !enforceBallotsGteRegistered
                ? "min-h-11 rounded-lg border border-amber-300 bg-amber-50 px-3 text-sm font-bold text-amber-700"
                : "min-h-11 rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-600"
            }
          >
            Off
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// EDIT PREVIEW
// ============================================================================

function EditPreview({
  active,
  type,
  spare,
  enforced,
  compact = false,
}: {
  active: boolean;

  type: string;

  spare: number | "";

  enforced: boolean;

  compact?: boolean;
}) {
  if (compact) {
    return (
      <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg bg-white px-3 py-2 text-xs text-slate-600">
        <span>
          Spare:{" "}
          <strong className="text-slate-900">
            {spare === "" ? "Not set" : `${spare}%`}
          </strong>
        </span>

        <span className="text-slate-300">•</span>

        <span>
          Rule:{" "}
          <strong className={enforced ? "text-emerald-700" : "text-amber-700"}>
            {enforced ? "Enforced" : "Off"}
          </strong>
        </span>

        <span className="text-slate-300">•</span>

        <span>{active ? "Active" : "Inactive"}</span>
      </div>
    );
  }

  return (
    <div className="mt-4 rounded-lg border border-blue-100 bg-white/80 p-3">
      <div className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
        Current Edit
      </div>

      <div className="mt-2 grid grid-cols-2 gap-2">
        <MiniPreview label="Type" value={type} />

        <MiniPreview
          label="Spare"
          value={spare === "" ? "Not set" : `${spare}%`}
        />

        <MiniPreview
          label="Status"
          value={active ? "Active" : "Inactive"}
          positive={active}
        />

        <MiniPreview
          label="Rule"
          value={enforced ? "Enforced" : "Off"}
          positive={enforced}
        />
      </div>
    </div>
  );
}

// ============================================================================
// MINI PREVIEW
// ============================================================================

function MiniPreview({
  label,
  value,
  positive = false,
}: {
  label: string;

  value: string;

  positive?: boolean;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-2.5">
      <div className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
        {label}
      </div>

      <div
        className={
          positive
            ? "mt-0.5 truncate text-sm font-bold text-emerald-700"
            : "mt-0.5 truncate text-sm font-bold text-slate-900"
        }
      >
        {value}
      </div>
    </div>
  );
}

// ============================================================================
// SUMMARY CARD
// ============================================================================

function SummaryCard({
  label,
  value,
  icon,
  positive,
}: {
  label: string;

  value: string;

  icon?: React.ReactNode;

  positive?: boolean;
}) {
  return (
    <div className="min-w-0 rounded-xl border border-slate-200 bg-white p-3 md:p-4">
      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.06em] text-slate-400 lg:text-xs">
        {icon}

        {label}
      </div>

      <div
        className={
          positive
            ? "mt-1.5 truncate text-base font-extrabold text-emerald-700 lg:text-lg"
            : "mt-1.5 truncate text-base font-extrabold text-slate-900 lg:text-lg"
        }
        title={value}
      >
        {value}
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
    <div className="mb-4 flex items-center gap-2 border-b border-slate-100 pb-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
        {icon}
      </div>

      <div>
        <div className="text-base font-bold text-slate-900 lg:text-lg">
          {title}
        </div>

        <div className="mt-0.5 text-xs text-slate-500">{subtitle}</div>
      </div>
    </div>
  );
}

// ============================================================================
// DESKTOP DETAIL FIELD
// ============================================================================

function DetailField({
  label,
  value,
  icon,
  positive,
}: {
  label: string;

  value: string;

  icon?: React.ReactNode;

  positive?: boolean;
}) {
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.07em] text-slate-400 lg:text-[11px]">
        {icon}

        {label}
      </div>

      <div
        className={
          positive
            ? "mt-1.5 break-words text-sm font-bold leading-5 text-emerald-700 lg:text-base lg:leading-6"
            : "mt-1.5 break-words text-sm font-bold leading-5 text-slate-900 lg:text-base lg:leading-6"
        }
      >
        {value}
      </div>
    </div>
  );
}

// ============================================================================
// MOBILE DETAIL FIELD
// ============================================================================

function CompactField({
  label,
  value,
}: {
  label: string;

  value: string;
}) {
  return (
    <div className="min-w-0">
      <div className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
        {label}
      </div>

      <div className="mt-0.5 break-words text-sm font-semibold text-slate-800">
        {value}
      </div>
    </div>
  );
}

// ============================================================================
// MOBILE DETAIL GROUP
// ============================================================================

function MobileDetailGroup({
  title,
  children,
}: {
  title: string;

  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-slate-200 bg-slate-50 p-3">
      <div className="mb-3 text-sm font-bold text-slate-900">{title}</div>

      <div className="grid grid-cols-2 gap-x-3 gap-y-3">{children}</div>
    </section>
  );
}

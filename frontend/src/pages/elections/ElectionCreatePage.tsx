// src/pages/elections/ElectionCreatePage.tsx

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Save,
  Settings2,
  Vote,
} from "lucide-react";

import { useAuthStore } from "../../shared/store/authStore";

import {
  createElection,
  type ElectionType,
} from "../../shared/services/electionService";

// ============================================================================
// ELECTION TYPES
// ============================================================================

const ELECTION_TYPE_OPTIONS: {
  value: ElectionType;
  label: string;
}[] = [
  { value: "PRESIDENTIAL", label: "Presidential" },
  { value: "LEGISLATIVE", label: "Legislative" },
  { value: "SENATORIAL", label: "Senatorial" },
  { value: "REPRESENTATIVE", label: "Representative" },
  { value: "REFERENDUM", label: "Referendum" },
  { value: "PRESIDENTIAL_GENERAL", label: "Presidential General" },
  { value: "BY_ELECTION", label: "By-Election" },
  { value: "LOCAL", label: "Local" },
];

// ============================================================================
// HELPERS
// ============================================================================

function normalizeName(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function toIntOrUndef(value: string): number | undefined {
  const trimmed = value.trim();

  if (!trimmed) {
    return undefined;
  }

  const parsed = Number(trimmed);

  return Number.isFinite(parsed) ? parsed : undefined;
}

function friendlySaveError(error: any) {
  const message =
    error?.response?.data?.message ??
    error?.response?.data?.error ??
    error?.message ??
    "Failed to create election.";

  if (/duplicate|unique|already exists|constraint/i.test(message)) {
    return "Election already exists with the same name and year. Please choose a different name or year.";
  }

  return message;
}

function electionTypeLabel(type: ElectionType) {
  return (
    ELECTION_TYPE_OPTIONS.find((option) => option.value === type)?.label ??
    String(type ?? "—")
  );
}

// ============================================================================
// PAGE
// ============================================================================

export default function ElectionCreatePage() {
  const navigate = useNavigate();

  const queryClient = useQueryClient();

  // ==========================================================================
  // ACCESS
  // ==========================================================================

  const dashboardMode = useAuthStore((state) => state.dashboardMode);

  const canEdit = dashboardMode === "NEC" || dashboardMode === "SYSTEM";

  // ==========================================================================
  // FORM STATE
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

  const [touched, setTouched] = useState(false);

  // ==========================================================================
  // VALIDATION
  // ==========================================================================

  const normalizedName = normalizeName(electionName);

  const parsedYear = toIntOrUndef(year);

  const nameError = touched && !normalizedName;

  const yearError = touched && !parsedYear;

  const spareError =
    ballotSparePercent !== "" &&
    (!Number.isFinite(Number(ballotSparePercent)) ||
      Number(ballotSparePercent) < 0 ||
      Number(ballotSparePercent) > 100);

  // ==========================================================================
  // CREATE MUTATION
  // ==========================================================================

  const createMutation = useMutation({
    mutationFn: async () => {
      const name = normalizeName(electionName);

      const parsedElectionYear = toIntOrUndef(year);

      if (!name) {
        throw new Error("Election name is required.");
      }

      if (!parsedElectionYear) {
        throw new Error("Year is required.");
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

      return createElection({
        electionName: name,

        year: parsedElectionYear,

        electionType,

        isActive: !!active,

        ballotSparePercent: spare,

        enforceBallotsGteRegistered,
      } as any);
    },

    onSuccess: async (created) => {
      await queryClient.invalidateQueries({
        queryKey: ["elections"],
      });

      if (created?.electionId) {
        navigate(`/elections/${created.electionId}`, {
          replace: true,
        });

        return;
      }

      navigate("/elections", {
        replace: true,
      });
    },
  });

  // ==========================================================================
  // SAVE
  // ==========================================================================

  const saveElection = () => {
    setTouched(true);

    if (!canEdit) {
      return;
    }

    if (!normalizedName || !parsedYear || spareError) {
      return;
    }

    createMutation.mutate();
  };

  // ==========================================================================
  // READ-ONLY GUARD
  // ==========================================================================

  if (!canEdit) {
    return (
      <div className="app-form">
        <div className="flex flex-col gap-3">
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
            <div className="flex items-start gap-3">
              <AlertCircle
                size={20}
                className="mt-0.5 shrink-0 text-amber-700"
              />

              <div>
                <div className="text-base font-bold text-amber-900">
                  Read-only access
                </div>

                <div className="mt-1 text-sm leading-6 text-amber-800">
                  Only NEC or SYSTEM users can create elections.
                </div>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => navigate("/elections")}
            className="inline-flex min-h-10 w-fit items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            <ArrowLeft size={17} />
            Back to Elections
          </button>
        </div>
      </div>
    );
  }

  // ==========================================================================
  // RENDER
  // ==========================================================================

  return (
    <div className="app-form">
      <div className="flex min-w-0 flex-col gap-3">
        {/* ================================================================
            HEADER
        ================================================================ */}

        <section className="rounded-xl border border-slate-200 bg-white p-3 sm:p-4">
          <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex min-w-0 items-start gap-2.5">
              <button
                type="button"
                onClick={() => navigate("/elections")}
                className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-slate-700 transition hover:bg-slate-50"
                aria-label="Back to elections"
              >
                <ArrowLeft size={18} />
              </button>

              <div className="flex min-w-0 items-start gap-2.5">
                <div className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700 sm:flex">
                  <Vote size={18} />
                </div>

                <div className="min-w-0">
                  <h1 className="text-xl font-bold text-slate-900 sm:text-2xl lg:text-3xl">
                    Create Election
                  </h1>

                  <p className="mt-0.5 text-sm text-slate-500 lg:text-base">
                    Create an official election and configure its initial ballot
                    policy.
                  </p>
                </div>
              </div>
            </div>

            {/* MOBILE/HEADER SUMMARY */}

            <div className="flex flex-wrap items-center gap-1.5">
              <SummaryChip
                label="Status"
                value={active ? "Active" : "Inactive"}
                tone={active ? "green" : "slate"}
              />

              <SummaryChip
                label="Type"
                value={electionTypeLabel(electionType)}
                tone="blue"
              />

              <SummaryChip
                label="Spare"
                value={
                  ballotSparePercent === ""
                    ? "Not set"
                    : `${ballotSparePercent}%`
                }
              />
            </div>
          </div>
        </section>

        {/* ================================================================
            DESKTOP FORM
        ================================================================ */}

        <div className="hidden grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)] gap-4 xl:grid">
          {/* ELECTION INFORMATION */}

          <section className="rounded-xl border border-slate-200 bg-white">
            <div className="border-b border-slate-100 px-4 py-3 lg:px-5">
              <h2 className="text-lg font-bold text-slate-900 lg:text-xl">
                Election Information
              </h2>

              <p className="mt-0.5 text-sm text-slate-500 lg:text-base">
                Enter the election's official name, year, type, and initial
                status.
              </p>
            </div>

            <div className="p-4 lg:p-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <FieldLabel label="Election Name" required />

                  <input
                    value={electionName}
                    onChange={(event) => setElectionName(event.target.value)}
                    onBlur={() => setTouched(true)}
                    placeholder="e.g., 2029 Presidential and General Election"
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

                <div>
                  <FieldLabel label="Election Year" required />

                  <input
                    type="number"
                    min={1900}
                    value={year}
                    onChange={(event) => setYear(event.target.value)}
                    onBlur={() => setTouched(true)}
                    placeholder="e.g., 2029"
                    className={
                      yearError
                        ? "w-full rounded-lg border border-red-300 bg-red-50 px-3 py-2.5 text-base text-red-900 outline-none focus:ring-2 focus:ring-red-200"
                        : "w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-base text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    }
                  />

                  {yearError && (
                    <FieldError>A valid election year is required.</FieldError>
                  )}
                </div>

                <div>
                  <FieldLabel label="Election Type" required />

                  <select
                    value={electionType}
                    onChange={(event) =>
                      setElectionType(event.target.value as ElectionType)
                    }
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

              <ActiveElectionRow active={active} setActive={setActive} />
            </div>
          </section>

          {/* BALLOT POLICY */}

          <section className="rounded-xl border border-blue-200 bg-blue-50/40">
            <div className="border-b border-blue-100 px-4 py-3 lg:px-5">
              <div className="flex items-start gap-2.5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
                  <Settings2 size={18} />
                </div>

                <div>
                  <h2 className="text-lg font-bold text-slate-900 lg:text-xl">
                    Ballot Policy
                  </h2>

                  <p className="mt-0.5 text-sm text-slate-600 lg:text-base">
                    Configure spare ballots and the allocation rule.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4 lg:p-5">
              <BallotPolicyFields
                ballotSparePercent={ballotSparePercent}
                setBallotSparePercent={setBallotSparePercent}
                spareError={spareError}
                enforceBallotsGteRegistered={enforceBallotsGteRegistered}
                setEnforceBallotsGteRegistered={setEnforceBallotsGteRegistered}
              />

              <PolicyPreview
                spare={ballotSparePercent}
                enforced={enforceBallotsGteRegistered}
                active={active}
                type={electionTypeLabel(electionType)}
                full
              />
            </div>
          </section>
        </div>

        {/* ================================================================
            MOBILE / TABLET COMPACT FORM
        ================================================================ */}

        <section className="rounded-xl border border-slate-200 bg-white xl:hidden">
          {/* ELECTION INFORMATION */}

          <div className="p-3 sm:p-4">
            <div className="mb-3">
              <h2 className="text-base font-bold text-slate-900 sm:text-lg">
                Election Information
              </h2>

              <p className="mt-0.5 text-xs text-slate-500 sm:text-sm">
                Basic election setup.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {/* NAME */}

              <div className="sm:col-span-2">
                <FieldLabel label="Election Name" required />

                <input
                  value={electionName}
                  onChange={(event) => setElectionName(event.target.value)}
                  onBlur={() => setTouched(true)}
                  placeholder="e.g., 2029 Presidential and General Election"
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
                <FieldLabel label="Election Year" required />

                <input
                  type="number"
                  min={1900}
                  value={year}
                  onChange={(event) => setYear(event.target.value)}
                  onBlur={() => setTouched(true)}
                  placeholder="e.g., 2029"
                  className={
                    yearError
                      ? "w-full rounded-lg border border-red-300 bg-red-50 px-3 py-2.5 text-base text-red-900 outline-none focus:ring-2 focus:ring-red-200"
                      : "w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-base text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  }
                />

                {yearError && (
                  <FieldError>A valid election year is required.</FieldError>
                )}
              </div>

              {/* TYPE */}

              <div>
                <FieldLabel label="Election Type" required />

                <select
                  value={electionType}
                  onChange={(event) =>
                    setElectionType(event.target.value as ElectionType)
                  }
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

            <ActiveElectionRow active={active} setActive={setActive} compact />
          </div>

          {/* DIVIDER */}

          <div className="border-t border-slate-200" />

          {/* BALLOT POLICY */}

          <div className="p-3 sm:p-4">
            <div className="mb-3 flex items-center gap-2">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
                <Settings2 size={16} />
              </div>

              <div>
                <h2 className="text-base font-bold text-slate-900 sm:text-lg">
                  Ballot Policy
                </h2>

                <p className="text-xs text-slate-500 sm:text-sm">
                  Spare ballots and allocation rule.
                </p>
              </div>
            </div>

            <BallotPolicyFields
              ballotSparePercent={ballotSparePercent}
              setBallotSparePercent={setBallotSparePercent}
              spareError={spareError}
              enforceBallotsGteRegistered={enforceBallotsGteRegistered}
              setEnforceBallotsGteRegistered={setEnforceBallotsGteRegistered}
              compact
            />

            <PolicyPreview
              spare={ballotSparePercent}
              enforced={enforceBallotsGteRegistered}
              active={active}
              type={electionTypeLabel(electionType)}
            />
          </div>

          {/* ERROR */}

          {createMutation.isError && (
            <div className="mx-3 mb-3 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700 sm:mx-4">
              <AlertCircle size={18} className="mt-0.5 shrink-0" />

              <span>{friendlySaveError(createMutation.error)}</span>
            </div>
          )}

          {/* ACTIONS ATTACHED TO FORM */}

          <div className="border-t border-slate-200 bg-slate-50/70 p-3 sm:p-4">
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => navigate("/elections")}
                disabled={createMutation.isPending}
                className="min-h-11 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 sm:min-w-28"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={saveElection}
                disabled={createMutation.isPending}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700 disabled:bg-slate-300 sm:min-w-40"
              >
                {createMutation.isPending ? (
                  <>
                    <RefreshSpinner />
                    Creating…
                  </>
                ) : (
                  <>
                    <Save size={17} />
                    Create Election
                  </>
                )}
              </button>
            </div>
          </div>
        </section>

        {/* ================================================================
            DESKTOP ERROR
        ================================================================ */}

        {createMutation.isError && (
          <div className="hidden items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700 xl:flex">
            <AlertCircle size={18} className="mt-0.5 shrink-0" />

            <span>{friendlySaveError(createMutation.error)}</span>
          </div>
        )}

        {/* ================================================================
            DESKTOP ACTIONS
        ================================================================ */}

        <section className="hidden rounded-xl border border-slate-200 bg-white p-3 xl:flex xl:items-center xl:justify-between">
          <div className="text-sm text-slate-500">
            Review the information above, then create the election.
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigate("/elections")}
              disabled={createMutation.isPending}
              className="min-h-11 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={saveElection}
              disabled={createMutation.isPending}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700 disabled:bg-slate-300"
            >
              {createMutation.isPending ? (
                <>
                  <RefreshSpinner />
                  Creating…
                </>
              ) : (
                <>
                  <Save size={17} />
                  Create Election
                </>
              )}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

// ============================================================================
// FIELD LABEL
// ============================================================================

function FieldLabel({
  label,
  required = false,
}: {
  label: string;
  required?: boolean;
}) {
  return (
    <label className="mb-1.5 block text-sm font-bold text-slate-700">
      {label}

      {required && <span className="ml-1 text-red-600">*</span>}
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
// ACTIVE ELECTION ROW
// ============================================================================

function ActiveElectionRow({
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
          : "mt-4 flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 sm:items-center"
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
            Active Election
          </span>

          {active && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-700">
              <CheckCircle2 size={12} />
              Active
            </span>
          )}
        </div>

        {!compact && (
          <p className="mt-0.5 text-xs leading-5 text-slate-500 sm:text-sm">
            Controls whether the election is immediately active in the system.
          </p>
        )}
      </div>
    </label>
  );
}

// ============================================================================
// BALLOT POLICY FIELDS
// ============================================================================

function BallotPolicyFields({
  ballotSparePercent,
  setBallotSparePercent,
  spareError,
  enforceBallotsGteRegistered,
  setEnforceBallotsGteRegistered,
  compact = false,
}: {
  ballotSparePercent: number | "";
  setBallotSparePercent: (value: number | "") => void;
  spareError: boolean;
  enforceBallotsGteRegistered: boolean;
  setEnforceBallotsGteRegistered: (value: boolean) => void;
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
            placeholder="e.g., 20"
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

        {spareError ? (
          <FieldError>Spare percent must be between 0 and 100.</FieldError>
        ) : (
          !compact && (
            <p className="mt-1 text-xs text-slate-500">
              Optional. Leave empty if NEC has not configured a spare cap.
            </p>
          )
        )}
      </div>

      {/* RULE */}

      <div>
        <FieldLabel label="Ballot Allocation Rule" />

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setEnforceBallotsGteRegistered(true)}
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
            onClick={() => setEnforceBallotsGteRegistered(false)}
            className={
              !enforceBallotsGteRegistered
                ? "min-h-11 rounded-lg border border-amber-300 bg-amber-50 px-3 text-sm font-bold text-amber-700"
                : "min-h-11 rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-600"
            }
          >
            Off
          </button>
        </div>

        {!compact && (
          <p className="mt-1 text-xs leading-5 text-slate-500">
            {enforceBallotsGteRegistered
              ? "Ballots issued must be at least equal to registered voters."
              : "The minimum registered-voter ballot rule will not be enforced."}
          </p>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// POLICY PREVIEW
// ============================================================================

function PolicyPreview({
  spare,
  enforced,
  active,
  type,
  full = false,
}: {
  spare: number | "";
  enforced: boolean;
  active: boolean;
  type: string;
  full?: boolean;
}) {
  if (!full) {
    return (
      <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
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
    <div className="mt-4 rounded-lg border border-blue-100 bg-white/70 p-3">
      <div className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
        Initial Policy
      </div>

      <div className="mt-2 grid grid-cols-2 gap-2">
        <SummaryBlock
          label="Spare"
          value={spare === "" ? "Not set" : `${spare}%`}
        />

        <SummaryBlock
          label="Rule"
          value={enforced ? "Enforced" : "Off"}
          positive={enforced}
        />

        <SummaryBlock
          label="Status"
          value={active ? "Active" : "Inactive"}
          positive={active}
        />

        <SummaryBlock label="Type" value={type} />
      </div>
    </div>
  );
}

// ============================================================================
// SUMMARY CHIP
// ============================================================================

function SummaryChip({
  label,
  value,
  tone = "slate",
}: {
  label: string;
  value: string;
  tone?: "slate" | "blue" | "green";
}) {
  const style =
    tone === "green"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : tone === "blue"
        ? "border-blue-200 bg-blue-50 text-blue-700"
        : "border-slate-200 bg-slate-50 text-slate-700";

  return (
    <span
      className={`
        inline-flex
        items-center
        gap-1
        rounded-full
        border
        px-2.5
        py-1
        text-xs
        font-semibold
        ${style}
      `}
    >
      <span className="text-slate-400">{label}:</span>

      <span className="font-bold">{value}</span>
    </span>
  );
}

// ============================================================================
// SUMMARY BLOCK
// ============================================================================

function SummaryBlock({
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
// LOADING
// ============================================================================

function RefreshSpinner() {
  return (
    <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
  );
}

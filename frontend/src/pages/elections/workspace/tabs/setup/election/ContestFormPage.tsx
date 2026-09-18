// src/pages/elections/workspace/tabs/setup/election/ContestFormPage.tsx

import { useEffect, useMemo, useState } from "react";

import { useLocation, useNavigate, useParams } from "react-router-dom";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  RefreshCw,
  Save,
} from "lucide-react";

import { useAuthStore } from "../../../../../../shared/store/authStore";

import {
  createContest,
  listContestsByElection,
  updateContest,
} from "../../../../../../shared/services/contestService";

import {
  fetchCounties,
  type CountyDto,
} from "../../../../../../shared/services/countyService";

import {
  fetchDistricts,
  type DistrictDto,
} from "../../../../../../shared/services/districtService";

import type {
  ContestCategory,
  ContestDto,
  ContestScopeType,
  ContestStatus,
  ContestVoteMethod,
} from "../../../../../../auth/contestTypes";

// ============================================================================
// ENUMS
// ============================================================================

const VOTE_METHODS: ContestVoteMethod[] = [
  "SINGLE_CHOICE",
  "MULTI_CHOICE",
  "RANKED",
];

const CATEGORIES: ContestCategory[] = [
  "PRESIDENT",
  "SENATE",
  "REPRESENTATIVE",
  "REFERENDUM",
  "OTHER",
];

const SCOPES: ContestScopeType[] = ["NATIONAL", "COUNTY", "DISTRICT"];

const STATUSES: ContestStatus[] = ["DRAFT", "PUBLISHED", "LOCKED", "ARCHIVED"];

// ============================================================================
// HELPERS
// ============================================================================

function safeStr(value: unknown) {
  return typeof value === "string" ? value : value == null ? "" : String(value);
}

function normalizeName(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function boolVal(value: unknown, fallback = false) {
  return value == null ? fallback : Boolean(value);
}

function friendlyError(error: any) {
  return (
    error?.response?.data?.message ??
    error?.response?.data?.error ??
    error?.message ??
    "Failed to save contest."
  );
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function ContestFormPage() {
  const { electionId } = useParams<{
    electionId: string;
  }>();

  const location = useLocation();

  const navigate = useNavigate();

  const queryClient = useQueryClient();

  // ==========================================================================
  // CONTEST ID FROM MANUAL SETUP ROUTE
  // ==========================================================================

  const contestId = useMemo(() => {
    const match = location.pathname.match(
      /\/setup\/contests\/([^/]+)\/edit\/?$/,
    );

    return match?.[1] ? decodeURIComponent(match[1]) : null;
  }, [location.pathname]);

  const isEdit = Boolean(contestId);

  // ==========================================================================
  // ACCESS
  // ==========================================================================

  const dashboardMode = useAuthStore((state) => state.dashboardMode);

  const isSystemAdmin = useAuthStore((state) => state.isSystemAdmin());

  const canEdit =
    dashboardMode === "NEC" || dashboardMode === "SYSTEM" || isSystemAdmin;

  // ==========================================================================
  // FORM
  // ==========================================================================

  const [contestName, setContestName] = useState("");

  const [category, setCategory] = useState<ContestCategory>("OTHER");

  const [scopeType, setScopeType] = useState<ContestScopeType>("NATIONAL");

  const [countyId, setCountyId] = useState("");

  const [districtId, setDistrictId] = useState("");

  const [voteMethod, setVoteMethod] =
    useState<ContestVoteMethod>("SINGLE_CHOICE");

  const [seats, setSeats] = useState<number>(1);

  const [maxSelections, setMaxSelections] = useState<number>(1);

  const [status, setStatus] = useState<ContestStatus>("DRAFT");

  const [description, setDescription] = useState("");

  const [isActive, setIsActive] = useState(true);

  const [touched, setTouched] = useState(false);

  // ==========================================================================
  // CURRENT CONTEST
  // ==========================================================================

  const contestsQuery = useQuery({
    enabled: Boolean(electionId && isEdit),

    queryKey: ["contests-by-election", electionId, "edit"],

    queryFn: () => listContestsByElection(electionId!),

    staleTime: 10_000,

    retry: 1,
  });

  const contest = useMemo<ContestDto | null>(() => {
    if (!contestId) {
      return null;
    }

    return (
      contestsQuery.data?.find((item) => item.contestId === contestId) ?? null
    );
  }, [contestsQuery.data, contestId]);

  // ==========================================================================
  // COUNTIES
  // ==========================================================================

  const countiesQuery = useQuery({
    queryKey: ["counties", "all-active-for-contest"],

    queryFn: () =>
      fetchCounties({
        page: 0,

        size: 200,

        q: "",
      }),

    staleTime: 60_000,

    retry: 1,
  });

  const counties: CountyDto[] = useMemo(
    () => countiesQuery.data?.items ?? [],

    [countiesQuery.data],
  );

  // ==========================================================================
  // DISTRICTS
  // ==========================================================================

  const districtsQuery = useQuery({
    enabled: scopeType === "DISTRICT" && Boolean(countyId),

    queryKey: ["districts", "by-county-for-contest", countyId],

    queryFn: () =>
      fetchDistricts({
        page: 0,

        size: 500,

        q: "",

        countyId: countyId || undefined,
      }),

    staleTime: 60_000,

    retry: 1,
  });

  const districts: DistrictDto[] = useMemo(
    () => districtsQuery.data?.items ?? [],

    [districtsQuery.data],
  );

  // ==========================================================================
  // PREFILL EDIT
  // ==========================================================================

  useEffect(() => {
    if (!isEdit || !contest) {
      return;
    }

    setContestName(safeStr(contest.contestName));

    setCategory(contest.category ?? "OTHER");

    setScopeType(contest.scopeType ?? "NATIONAL");

    setCountyId(safeStr(contest.countyId));

    setDistrictId(safeStr(contest.districtId));

    setVoteMethod(contest.voteMethod ?? "SINGLE_CHOICE");

    setSeats(Number(contest.seats ?? 1));

    setMaxSelections(Number(contest.maxSelections ?? contest.seats ?? 1));

    setStatus(contest.status ?? "DRAFT");

    setDescription(safeStr(contest.description));

    setIsActive(boolVal(contest.isActive, true));

    setTouched(false);
  }, [isEdit, contest]);

  // ==========================================================================
  // SCOPE DEPENDENCIES
  // ==========================================================================

  useEffect(() => {
    if (scopeType === "NATIONAL") {
      setCountyId("");

      setDistrictId("");
    }

    if (scopeType === "COUNTY") {
      setDistrictId("");
    }
  }, [scopeType]);

  // ==========================================================================
  // VALIDATION
  // ==========================================================================

  const normalizedName = normalizeName(contestName);

  const validScope =
    scopeType === "NATIONAL" ||
    (scopeType === "COUNTY" && Boolean(countyId)) ||
    (scopeType === "DISTRICT" && Boolean(countyId && districtId));

  const validSelections =
    Number(maxSelections) >= Number(seats) && Number(seats) >= 1;

  const formValid = Boolean(normalizedName && validScope && validSelections);

  // ==========================================================================
  // PAYLOAD
  // ==========================================================================

  const buildPayload = () => {
    const normalizedSeats = Math.max(1, Number(seats || 1));

    const normalizedMax = Math.max(
      normalizedSeats,
      Number(maxSelections || normalizedSeats),
    );

    return {
      electionId: electionId!,

      contestName: normalizedName,

      category,

      scopeType,

      countyId:
        scopeType === "COUNTY" || scopeType === "DISTRICT"
          ? countyId || null
          : null,

      districtId: scopeType === "DISTRICT" ? districtId || null : null,

      voteMethod,

      seats: normalizedSeats,

      maxSelections: normalizedMax,

      description: description.trim() || null,

      status,

      isActive,
    };
  };

  // ==========================================================================
  // SAVE
  // ==========================================================================

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!electionId) {
        throw new Error("Missing election ID.");
      }

      if (!formValid) {
        throw new Error("Complete the required contest information.");
      }

      const payload = buildPayload();

      if (isEdit) {
        if (!contestId) {
          throw new Error("Missing contest ID.");
        }

        return updateContest(contestId, payload);
      }

      return createContest(payload);
    },

    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["contests-by-election", electionId],
      });

      goBack();
    },
  });

  const saving = saveMutation.isPending;

  // ==========================================================================
  // NAVIGATION
  // ==========================================================================

  function goBack() {
    if (!electionId) {
      return;
    }

    navigate(`/elections/${electionId}/setup/contests`);
  }

  // ==========================================================================
  // LOADING
  // ==========================================================================

  if (isEdit && contestsQuery.isLoading) {
    return (
      <div className="app-form">
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
          <RefreshCw size={20} className="mx-auto animate-spin text-blue-600" />

          <div className="mt-2">Loading contest...</div>
        </div>
      </div>
    );
  }

  if (isEdit && !contestsQuery.isLoading && !contest) {
    return (
      <div className="app-form">
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
          Contest not found.
        </div>
      </div>
    );
  }

  // ==========================================================================
  // RENDER
  // ==========================================================================

  return (
    <div className="w-full">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-3">
        {/* ==================================================================
            HEADER
        ================================================================== */}

        <section className="rounded-2xl border border-slate-200 bg-white px-3 py-3 sm:px-4">
          <div className="flex items-start gap-3">
            <button
              type="button"
              onClick={goBack}
              disabled={saving}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
            >
              <ArrowLeft size={17} />
            </button>

            <div className="min-w-0 flex-1">
              <h1 className="text-lg font-bold text-slate-900 sm:text-2xl">
                {isEdit ? "Edit Contest" : "Create Contest"}
              </h1>

              <p className="mt-1 text-xs text-slate-500 sm:text-sm">
                {isEdit
                  ? "Update the contest configuration for this election."
                  : "Create a new contest for this election."}
              </p>
            </div>
          </div>
        </section>

        {/* ==================================================================
            FORM
        ================================================================== */}

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="p-3 sm:p-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {/* CONTEST NAME */}

              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-bold text-slate-700">
                  Contest Name <span className="text-red-600">*</span>
                </label>

                <input
                  value={contestName}
                  onChange={(event) => {
                    setContestName(event.target.value);

                    setTouched(true);
                  }}
                  placeholder="e.g., Presidential Election"
                  className="min-h-11 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />

                {touched && !normalizedName && (
                  <div className="mt-1 text-xs font-semibold text-red-600">
                    Contest name is required.
                  </div>
                )}
              </div>

              {/* CATEGORY */}

              <FieldLabel label="Category">
                <select
                  value={category}
                  onChange={(event) =>
                    setCategory(event.target.value as ContestCategory)
                  }
                  className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm"
                >
                  {CATEGORIES.map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </FieldLabel>

              {/* VOTE METHOD */}

              <FieldLabel label="Vote Method">
                <select
                  value={voteMethod}
                  onChange={(event) =>
                    setVoteMethod(event.target.value as ContestVoteMethod)
                  }
                  className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm"
                >
                  {VOTE_METHODS.map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </FieldLabel>

              {/* SCOPE */}

              <FieldLabel label="Scope">
                <select
                  value={scopeType}
                  onChange={(event) => {
                    setScopeType(event.target.value as ContestScopeType);

                    setTouched(true);
                  }}
                  className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm"
                >
                  {SCOPES.map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </FieldLabel>

              {/* STATUS */}

              <FieldLabel label="Status">
                <select
                  value={status}
                  onChange={(event) =>
                    setStatus(event.target.value as ContestStatus)
                  }
                  className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm"
                >
                  {STATUSES.map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </FieldLabel>

              {/* COUNTY */}

              {(scopeType === "COUNTY" || scopeType === "DISTRICT") && (
                <FieldLabel label="County" required>
                  <select
                    value={countyId}
                    onChange={(event) => {
                      setCountyId(event.target.value);

                      setDistrictId("");

                      setTouched(true);
                    }}
                    className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm"
                  >
                    <option value="">
                      {countiesQuery.isLoading
                        ? "Loading counties..."
                        : "Select County"}
                    </option>

                    {counties.map((county) => (
                      <option key={county.countyId} value={county.countyId}>
                        {county.countyName}
                      </option>
                    ))}
                  </select>
                </FieldLabel>
              )}

              {/* DISTRICT */}

              {scopeType === "DISTRICT" && (
                <FieldLabel label="District" required>
                  <select
                    value={districtId}
                    onChange={(event) => {
                      setDistrictId(event.target.value);

                      setTouched(true);
                    }}
                    disabled={!countyId}
                    className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm disabled:bg-slate-50 disabled:opacity-60"
                  >
                    <option value="">
                      {!countyId
                        ? "Select county first"
                        : districtsQuery.isLoading
                          ? "Loading districts..."
                          : "Select District"}
                    </option>

                    {districts.map((district) => (
                      <option
                        key={district.districtId}
                        value={district.districtId}
                      >
                        {district.districtName}
                      </option>
                    ))}
                  </select>
                </FieldLabel>
              )}

              {/* SEATS */}

              <FieldLabel label="Seats">
                <input
                  type="number"
                  min={1}
                  value={seats}
                  onChange={(event) =>
                    setSeats(Math.max(1, Number(event.target.value || 1)))
                  }
                  className="min-h-11 w-full rounded-xl border border-slate-300 px-3 text-sm"
                />
              </FieldLabel>

              {/* MAX */}

              <FieldLabel label="Max Selections">
                <input
                  type="number"
                  min={1}
                  value={maxSelections}
                  onChange={(event) =>
                    setMaxSelections(
                      Math.max(1, Number(event.target.value || 1)),
                    )
                  }
                  className="min-h-11 w-full rounded-xl border border-slate-300 px-3 text-sm"
                />

                {!validSelections && (
                  <div className="mt-1 text-[10px] font-semibold text-red-600">
                    Max selections must be at least the number of seats.
                  </div>
                )}
              </FieldLabel>

              {/* ACTIVE */}

              <div className="sm:col-span-2">
                <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border border-slate-300 bg-slate-50 px-3">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(event) => setIsActive(event.target.checked)}
                    className="h-4 w-4 accent-blue-600"
                  />

                  <span className="text-sm font-semibold text-slate-700">
                    Active contest
                  </span>
                </label>
              </div>

              {/* DESCRIPTION */}

              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-bold text-slate-700">
                  Description
                </label>

                <textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  rows={4}
                  placeholder="Describe this contest..."
                  className="w-full resize-none rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </div>
          </div>

          {/* ERROR */}

          {saveMutation.isError && (
            <div className="border-t border-slate-200 px-3 py-3 sm:px-4">
              <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700">
                <AlertCircle size={16} />

                {friendlyError(saveMutation.error)}
              </div>
            </div>
          )}

          {/* ACTIONS */}

          <div className="flex flex-col-reverse gap-2 border-t border-slate-200 bg-slate-50 px-3 py-3 sm:flex-row sm:justify-end sm:px-4">
            <button
              type="button"
              onClick={goBack}
              disabled={saving}
              className="min-h-11 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700"
            >
              Cancel
            </button>

            <button
              type="button"
              disabled={!canEdit || !formValid || saving}
              onClick={() => {
                setTouched(true);

                if (canEdit && formValid && !saving) {
                  saveMutation.mutate();
                }
              }}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-bold text-white disabled:bg-slate-300"
            >
              {saving ? (
                <RefreshCw size={15} className="animate-spin" />
              ) : (
                <Save size={15} />
              )}

              {saving
                ? isEdit
                  ? "Updating..."
                  : "Creating..."
                : isEdit
                  ? "Update Contest"
                  : "Create Contest"}
            </button>
          </div>
        </section>

        {formValid && (
          <div className="flex items-center gap-1.5 px-1 text-xs font-medium text-emerald-700">
            <CheckCircle2 size={13} />
            Required contest information is complete.
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// FIELD
// ============================================================================

function FieldLabel({
  label,
  required = false,
  children,
}: {
  label: string;

  required?: boolean;

  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-bold text-slate-700">
        {label}

        {required && <span className="text-red-600"> *</span>}
      </label>

      {children}
    </div>
  );
}

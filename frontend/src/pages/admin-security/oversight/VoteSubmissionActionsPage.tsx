import { useEffect, useMemo, useState, type ReactNode } from "react";

import { useQueries, useQuery } from "@tanstack/react-query";

import { useNavigate, useSearchParams } from "react-router-dom";

import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  FilePenLine,
  Flag,
  FlagOff,
  History,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  XCircle,
} from "lucide-react";

import { AdminShell, Card } from "../shared/admin-ui";

import {
  countVoteSubmissionActions,
  countVoteSubmissionActionsByType,
  searchVoteSubmissionActions,
  type VoteSubmissionActionDto,
  type VoteSubmissionActionType,
} from "../../../shared/services/voteSubmissionActionService";

import { fetchCounties } from "../../../shared/services/countyService";
import { fetchDistrictsByCounty } from "../../../shared/services/districtService";
import { fetchPollingCenters } from "../../../shared/services/pollingCenterService";
import { fetchPollingPlaces } from "../../../shared/services/pollingPlaceService";

import { useAuthStore } from "../../../shared/store/authStore";

// ============================================================================
// HELPERS
// ============================================================================

function clean(value: unknown) {
  return value == null ? "" : String(value).trim();
}

function formatShortDate(value?: string | null) {
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
    year: "2-digit",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function friendlyError(error: any) {
  return (
    clean(error?.response?.data?.message) ||
    clean(error?.response?.data?.error) ||
    clean(error?.message) ||
    "Unable to load submission actions."
  );
}

function actionLabel(actionType: VoteSubmissionActionType) {
  switch (actionType) {
    case "EDIT":
      return "Edited";

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

    case "RESUBMIT":
      return "Resubmitted";

    case "REOPEN":
      return "Reopened";

    case "DELETE":
      return "Deleted";

    default:
      return actionType;
  }
}

function actionIcon(actionType: VoteSubmissionActionType) {
  switch (actionType) {
    case "EDIT":
      return <FilePenLine size={12} />;

    case "VERIFY":
      return <CheckCircle2 size={12} />;

    case "REJECT":
      return <XCircle size={12} />;

    case "FLAG":
      return <Flag size={12} />;

    case "UNFLAG":
      return <FlagOff size={12} />;

    case "AMEND":
      return <FilePenLine size={12} />;

    case "RESUBMIT":
      return <FilePenLine size={12} />;

    case "REOPEN":
      return <History size={12} />;

    case "DELETE":
      return <Trash2 size={12} />;

    default:
      return <History size={12} />;
  }
}

function actionClass(actionType: VoteSubmissionActionType) {
  switch (actionType) {
    case "EDIT":
      return "border-indigo-200 bg-indigo-50 text-indigo-700";

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

    case "RESUBMIT":
      return "border-violet-200 bg-violet-50 text-violet-700";

    case "REOPEN":
      return "border-cyan-200 bg-cyan-50 text-cyan-700";

    case "DELETE":
      return "border-red-200 bg-red-50 text-red-700";

    default:
      return "border-slate-200 bg-slate-50 text-slate-700";
  }
}

function statusText(value?: string | null) {
  return clean(value) || "—";
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

  if (label) {
    return label;
  }

  return code || "—";
}

function mobilePlaceDisplay(action: VoteSubmissionActionDto) {
  const number = formatPlaceNumber(action.placeNumber);

  if (number) {
    return `Place #${number}`;
  }

  return clean(action.placeCode) || clean(action.placeLabel) || "—";
}

function geographyPrimary(action: VoteSubmissionActionDto) {
  const county = clean(action.countyName);

  const district = clean(action.districtName);

  if (county && district) {
    return `${county} County • ${district}`;
  }

  return county || district || "—";
}

const ACTION_OPTIONS: Array<{
  value: "" | VoteSubmissionActionType;
  label: string;
}> = [
  {
    value: "",
    label: "All Actions",
  },
  {
    value: "EDIT",
    label: "Edited",
  },
  {
    value: "VERIFY",
    label: "Verified",
  },
  {
    value: "REJECT",
    label: "Rejected",
  },
  {
    value: "FLAG",
    label: "Flagged",
  },
  {
    value: "UNFLAG",
    label: "Unflagged",
  },
  {
    value: "AMEND",
    label: "Amended",
  },
  {
    value: "RESUBMIT",
    label: "Resubmitted",
  },
  {
    value: "REOPEN",
    label: "Reopened",
  },
  {
    value: "DELETE",
    label: "Deleted",
  },
];

// ============================================================================
// PAGE
// ============================================================================

export default function VoteSubmissionActionsPage() {
  const navigate = useNavigate();

  const [searchParams] = useSearchParams();

  const dashboardMode = useAuthStore((state: any) => state.dashboardMode);

  const currentOrgId = String(
    useAuthStore((state: any) => state.currentOrgId ?? "") ?? "",
  ).trim();

  const deepLinkedSubmissionId = clean(searchParams.get("submissionId"));

  // ==========================================================================
  // FILTERS
  // ==========================================================================

  const [actionType, setActionType] = useState<"" | VoteSubmissionActionType>(
    "",
  );

  const [textFilter, setTextFilter] = useState("");

  const [countyId, setCountyId] = useState("");

  const [districtId, setDistrictId] = useState("");

  const [centerId, setCenterId] = useState("");

  const [placeId, setPlaceId] = useState("");

  // ==========================================================================
  // GEOGRAPHIC LOOKUPS
  // ==========================================================================

  const countiesQ = useQuery({
    queryKey: ["counties", "submission-actions"],

    queryFn: async () =>
      (
        await fetchCounties({
          page: 0,
          size: 500,
        })
      ).items,

    staleTime: 60_000,

    retry: 1,
  });

  const districtsQ = useQuery({
    enabled: Boolean(countyId),

    queryKey: ["districts", "submission-actions", countyId],

    queryFn: () => fetchDistrictsByCounty(countyId),

    staleTime: 60_000,

    retry: 1,
  });

  const centersQ = useQuery({
    enabled: Boolean(countyId || districtId),

    queryKey: ["centers", "submission-actions", countyId, districtId],

    queryFn: async () =>
      (
        await fetchPollingCenters({
          page: 0,
          size: 500,
          countyId: countyId || undefined,
          districtId: districtId || undefined,
        })
      ).items,

    staleTime: 60_000,

    retry: 1,
  });

  const placesQ = useQuery({
    enabled: Boolean(centerId),

    queryKey: ["places", "submission-actions", centerId],

    queryFn: async () =>
      (
        await fetchPollingPlaces({
          page: 0,
          size: 2000,
          centerId,
        })
      ).items,

    staleTime: 60_000,

    retry: 1,
  });

  // ==========================================================================
  // CASCADING GEOGRAPHY
  // ==========================================================================

  useEffect(() => {
    setDistrictId("");
    setCenterId("");
    setPlaceId("");
    setPage(0);
  }, [countyId]);

  useEffect(() => {
    setCenterId("");
    setPlaceId("");
    setPage(0);
  }, [districtId]);

  useEffect(() => {
    setPlaceId("");
    setPage(0);
  }, [centerId]);

  // ==========================================================================
  // PAGINATION
  // ==========================================================================

  const [page, setPage] = useState(0);

  const [size, setSize] = useState(25);

  // ==========================================================================
  // ORGANIZATION
  // ==========================================================================

  const effectiveOrgId =
    dashboardMode === "SYSTEM"
      ? currentOrgId || undefined
      : currentOrgId || undefined;

  // ==========================================================================
  // QUERY
  // ==========================================================================

  const actionsQuery = useQuery({
    queryKey: [
      "vote-submission-actions",
      "oversight",
      effectiveOrgId,
      deepLinkedSubmissionId,
      actionType,
      page,
      size,
    ],

    queryFn: () =>
      searchVoteSubmissionActions({
        orgId: effectiveOrgId,

        submissionId: deepLinkedSubmissionId || undefined,

        actionType,

        page,

        size,
      }),

    staleTime: 0,

    retry: 1,
  });

  const result = actionsQuery.data;

  const allActions = result?.content ?? [];

  // ==========================================================================
  // ACTION COUNTS
  //
  // For each submission, keep both:
  // 1. the count of this specific action type
  // 2. the total count of all actions on the submission
  //
  // Example:
  // FLAG = 3
  // total submission actions = 8
  // display = 3 / 8
  // ==========================================================================

  const actionCountKeys = useMemo(() => {
    const seen = new Set<string>();

    const keys: Array<{
      key: string;
      submissionId: string;
      actionType: VoteSubmissionActionType;
    }> = [];

    for (const action of allActions) {
      const submissionId = clean(action.submissionId);

      const currentActionType = action.actionType;

      if (!submissionId || !currentActionType) {
        continue;
      }

      const key = `${submissionId}:${currentActionType}`;

      if (seen.has(key)) {
        continue;
      }

      seen.add(key);

      keys.push({
        key,
        submissionId,
        actionType: currentActionType,
      });
    }

    return keys;
  }, [allActions]);

  const submissionIds = useMemo(
    () =>
      Array.from(
        new Set(
          allActions
            .map((action) => clean(action.submissionId))
            .filter(Boolean),
        ),
      ),
    [allActions],
  );

  const actionTypeCountQueries = useQueries({
    queries: actionCountKeys.map(({ submissionId, actionType }) => ({
      queryKey: [
        "vote-submission-action-count-by-type",
        submissionId,
        actionType,
      ],

      queryFn: () => countVoteSubmissionActionsByType(submissionId, actionType),

      staleTime: 30_000,

      retry: 1,
    })),
  });

  const submissionCountQueries = useQueries({
    queries: submissionIds.map((submissionId) => ({
      queryKey: ["vote-submission-action-count", submissionId],

      queryFn: () => countVoteSubmissionActions(submissionId),

      staleTime: 30_000,

      retry: 1,
    })),
  });

  const actionCountByKey = useMemo(() => {
    const counts = new Map<string, number>();

    actionCountKeys.forEach((item, index) => {
      const value = actionTypeCountQueries[index]?.data;

      if (Number.isFinite(Number(value))) {
        counts.set(item.key, Number(value));
      }
    });

    return counts;
  }, [actionCountKeys, actionTypeCountQueries]);

  const submissionCountById = useMemo(() => {
    const counts = new Map<string, number>();

    submissionIds.forEach((submissionId, index) => {
      const value = submissionCountQueries[index]?.data;

      if (Number.isFinite(Number(value))) {
        counts.set(submissionId, Number(value));
      }
    });

    return counts;
  }, [submissionIds, submissionCountQueries]);

  function getActionTypeCount(action: VoteSubmissionActionDto) {
    const submissionId = clean(action.submissionId);

    if (!submissionId) {
      return null;
    }

    const key = `${submissionId}:${action.actionType}`;

    return actionCountByKey.get(key) ?? null;
  }

  function getSubmissionCount(action: VoteSubmissionActionDto) {
    const submissionId = clean(action.submissionId);

    if (!submissionId) {
      return null;
    }

    return submissionCountById.get(submissionId) ?? null;
  }

  // ==========================================================================
  // LOCAL SEARCH + GEOGRAPHIC FILTERS
  // ==========================================================================

  const actions = useMemo(() => {
    const q = textFilter.trim().toLowerCase();

    return allActions.filter((action) => {
      if (countyId && clean(action.countyId) !== countyId) {
        return false;
      }

      if (districtId && clean(action.districtId) !== districtId) {
        return false;
      }

      if (centerId && clean(action.centerId) !== centerId) {
        return false;
      }

      if (placeId && clean(action.placeId) !== placeId) {
        return false;
      }

      if (!q) {
        return true;
      }

      const haystack = [
        action.actorName,
        action.actionType,
        action.statusBefore,
        action.statusAfter,
        action.reason,
        action.comments,
        action.electionName,
        action.contestName,
        action.countyName,
        action.districtName,
        action.centerName,
        action.centerCode,
        action.placeLabel,
        action.placeCode,
        action.placeNumber,
        action.submissionId,
        action.actionId,
      ]
        .map((value) => clean(value).toLowerCase())
        .join(" ");

      return haystack.includes(q);
    });
  }, [allActions, textFilter, countyId, districtId, centerId, placeId]);

  const totalElements = Number(result?.totalElements ?? 0);

  const totalPages = Number(result?.totalPages ?? 0);

  const hasGeoFilter = Boolean(countyId || districtId || centerId || placeId);

  function clearGeoFilters() {
    setCountyId("");
    setDistrictId("");
    setCenterId("");
    setPlaceId("");
    setPage(0);
  }

  // ==========================================================================
  // OPEN DETAIL
  // ==========================================================================

  function openFullRecord(actionId: string) {
    navigate(`/admin-security/submission-actions/${actionId}`);
  }

  // ==========================================================================
  // RENDER
  // ==========================================================================

  return (
    <AdminShell
      title="Submission Actions"
      subtitle="Certified vote-submission activity with election, geographic and reviewer context."
      right={
        <button
          type="button"
          onClick={() => actionsQuery.refetch()}
          disabled={actionsQuery.isFetching}
          className="inline-flex h-9 items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw
            size={13}
            className={actionsQuery.isFetching ? "animate-spin" : ""}
          />
          Refresh
        </button>
      }
    >
      <Card
        title="Action Records"
        right={
          <span className="text-xs font-bold text-slate-500">
            {hasGeoFilter
              ? `${actions.length.toLocaleString()} shown • ${totalElements.toLocaleString()} total`
              : `${totalElements.toLocaleString()} records`}
          </span>
        }
      >
        {/* ================================================================ */}
        {/* FILTERS */}
        {/* ================================================================ */}

        <div className="border-b border-slate-200 pb-2.5">
          {/* ============================================================= */}
          {/* SEARCH */}
          {/* ============================================================= */}

          <label className="block">
            <span className="mb-1 block text-[8px] font-bold uppercase tracking-wide text-slate-400 sm:text-[9px]">
              Search Current Page
            </span>

            <div className="relative">
              <Search
                size={13}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                type="text"
                value={textFilter}
                onChange={(event) => setTextFilter(event.target.value)}
                placeholder="Election, county, district, place, actor..."
                className="h-9 w-full rounded-md border border-slate-300 bg-white pl-8 pr-2.5 text-[11px] outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-100 sm:text-xs"
              />
            </div>
          </label>

          {/* ============================================================= */}
          {/* GEOGRAPHY */}
          {/* ============================================================= */}

          <div className="mt-2 grid grid-cols-2 gap-2 lg:grid-cols-4">
            <FilterSelect
              label="County"
              value={countyId}
              onChange={(value) => {
                setCountyId(value);

                setPage(0);
              }}
              options={(countiesQ.data ?? []).map((item: any) => ({
                value: String(item.countyId),

                label: String(item.countyName ?? "County"),
              }))}
              placeholder="All Counties"
            />

            <FilterSelect
              label="District"
              value={districtId}
              onChange={(value) => {
                setDistrictId(value);

                setPage(0);
              }}
              disabled={!countyId}
              options={(districtsQ.data ?? []).map((item: any) => ({
                value: String(item.districtId),

                label: String(item.districtName ?? "District"),
              }))}
              placeholder="All Districts"
            />

            <FilterSelect
              label="Polling Center"
              value={centerId}
              onChange={(value) => {
                setCenterId(value);

                setPage(0);
              }}
              disabled={!countyId && !districtId}
              options={(centersQ.data ?? []).map((item: any) => ({
                value: String(item.centerId),

                label: String(item.centerName ?? "Polling Center"),
              }))}
              placeholder="All Centers"
            />

            <FilterSelect
              label="Polling Place"
              value={placeId}
              onChange={(value) => {
                setPlaceId(value);

                setPage(0);
              }}
              disabled={!centerId}
              options={(placesQ.data ?? []).map((item: any) => ({
                value: String(item.placeId),

                label: String(
                  item.placeLabel ??
                    (item.placeNumber != null
                      ? `Place ${item.placeNumber}`
                      : (item.code ?? "Polling Place")),
                ),
              }))}
              placeholder="All Places"
            />
          </div>

          {hasGeoFilter ? (
            <div className="mt-2 flex justify-end">
              <button
                type="button"
                onClick={clearGeoFilters}
                className="text-[9px] font-bold text-blue-700 hover:text-blue-900 sm:text-[10px]"
              >
                Clear geography filters
              </button>
            </div>
          ) : null}

          {/* ============================================================= */}
          {/* MOBILE FILTERS */}
          {/* ============================================================= */}

          <div className="mt-2 grid grid-cols-[minmax(0,1fr)_92px] gap-2 md:hidden">
            <label>
              <span className="mb-1 block text-[8px] font-bold uppercase tracking-wide text-slate-400">
                Action
              </span>

              <select
                value={actionType}
                onChange={(event) => {
                  setActionType(
                    event.target.value as "" | VoteSubmissionActionType,
                  );

                  setPage(0);
                }}
                className="h-9 w-full rounded-md border border-slate-300 bg-white px-2 text-[11px] font-semibold text-slate-700"
              >
                {ACTION_OPTIONS.map((option) => (
                  <option key={option.value || "ALL"} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span className="mb-1 block text-[8px] font-bold uppercase tracking-wide text-slate-400">
                Rows
              </span>

              <select
                value={size}
                onChange={(event) => {
                  setSize(Number(event.target.value));

                  setPage(0);
                }}
                className="h-9 w-full rounded-md border border-slate-300 bg-white px-2 text-[11px] font-semibold text-slate-700"
              >
                <option value={25}>25</option>

                <option value={50}>50</option>

                <option value={100}>100</option>
              </select>
            </label>
          </div>

          {/* ============================================================= */}
          {/* DESKTOP FILTERS */}
          {/* ============================================================= */}

          <div className="mt-2 hidden grid-cols-[180px_110px] justify-end gap-2 md:grid">
            <label>
              <span className="mb-1 block text-[9px] font-bold uppercase tracking-wide text-slate-400">
                Action Type
              </span>

              <select
                value={actionType}
                onChange={(event) => {
                  setActionType(
                    event.target.value as "" | VoteSubmissionActionType,
                  );

                  setPage(0);
                }}
                className="h-9 w-full rounded-md border border-slate-300 bg-white px-2 text-xs font-semibold text-slate-700"
              >
                {ACTION_OPTIONS.map((option) => (
                  <option key={option.value || "ALL"} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span className="mb-1 block text-[9px] font-bold uppercase tracking-wide text-slate-400">
                Per Page
              </span>

              <select
                value={size}
                onChange={(event) => {
                  setSize(Number(event.target.value));

                  setPage(0);
                }}
                className="h-9 w-full rounded-md border border-slate-300 bg-white px-2 text-xs font-semibold text-slate-700"
              >
                <option value={25}>25</option>

                <option value={50}>50</option>

                <option value={100}>100</option>
              </select>
            </label>
          </div>
        </div>

        {/* ================================================================ */}
        {/* DEEP LINK */}
        {/* ================================================================ */}

        {deepLinkedSubmissionId ? (
          <div className="mt-2 border-l-2 border-blue-500 bg-blue-50 px-2 py-1.5 text-[9px] font-semibold text-blue-800 sm:text-[10px]">
            Showing actions for one vote submission.
          </div>
        ) : null}

        {/* ================================================================ */}
        {/* LOADING */}
        {/* ================================================================ */}

        {actionsQuery.isLoading ? (
          <div className="py-10 text-center">
            <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-slate-200 border-t-blue-600" />

            <div className="mt-2 text-xs font-semibold text-slate-500">
              Loading action records...
            </div>
          </div>
        ) : null}

        {/* ================================================================ */}
        {/* ERROR */}
        {/* ================================================================ */}

        {actionsQuery.isError ? (
          <div className="mt-3 border-l-4 border-red-500 bg-red-50 px-3 py-3">
            <div className="flex items-start gap-2">
              <AlertTriangle
                size={16}
                className="mt-0.5 shrink-0 text-red-600"
              />

              <div>
                <div className="text-sm font-extrabold text-red-800">
                  Unable to load action records
                </div>

                <div className="mt-1 text-xs text-red-700">
                  {friendlyError(actionsQuery.error)}
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {/* ================================================================ */}
        {/* EMPTY */}
        {/* ================================================================ */}

        {actionsQuery.isSuccess && actions.length === 0 ? (
          <div className="py-10 text-center">
            <History size={26} className="mx-auto text-slate-400" />

            <div className="mt-2 text-sm font-bold text-slate-700">
              No action records found
            </div>

            <div className="mt-1 text-xs text-slate-500">
              No submission actions match the current filters.
            </div>
          </div>
        ) : null}

        {/* ================================================================ */}
        {/* DESKTOP TABLE */}
        {/* ================================================================ */}

        {actions.length > 0 ? (
          <div className="hidden lg:block">
            <div className="mt-3 overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full min-w-[1180px] border-collapse text-left">
                <thead className="sticky top-0 z-10 bg-slate-50">
                  <tr className="border-b border-slate-200">
                    <HeaderCell>Action</HeaderCell>

                    <HeaderCell>Election / Contest</HeaderCell>

                    <HeaderCell>Geography</HeaderCell>

                    <HeaderCell>Polling Location</HeaderCell>

                    <HeaderCell>Action By</HeaderCell>

                    <HeaderCell>Status</HeaderCell>

                    <HeaderCell>Count</HeaderCell>

                    <HeaderCell>Time</HeaderCell>

                    <HeaderCell alignRight>Record</HeaderCell>
                  </tr>
                </thead>

                <tbody>
                  {actions.map((action) => (
                    <DesktopActionRow
                      key={action.actionId}
                      action={action}
                      actionTypeCount={getActionTypeCount(action)}
                      submissionCount={getSubmissionCount(action)}
                      onOpen={() => openFullRecord(action.actionId)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}

        {/* ================================================================ */}
        {/* MOBILE / TABLET COMPACT LEDGER */}
        {/* ================================================================ */}

        {actions.length > 0 ? (
          <div className="mt-2 overflow-hidden rounded-lg border border-slate-200 bg-white lg:hidden">
            {actions.map((action, index) => (
              <MobileActionRow
                key={action.actionId}
                action={action}
                actionTypeCount={getActionTypeCount(action)}
                submissionCount={getSubmissionCount(action)}
                first={index === 0}
                onOpen={() => openFullRecord(action.actionId)}
              />
            ))}
          </div>
        ) : null}

        {/* ================================================================ */}
        {/* PAGINATION */}
        {/* ================================================================ */}

        {actionsQuery.isSuccess && totalElements > 0 ? (
          <div className="mt-2 flex items-center justify-between gap-2 border-t border-slate-200 pt-2.5">
            <div className="text-[9px] font-semibold text-slate-500 sm:text-xs">
              <strong className="text-slate-700">{page + 1}</strong>/
              <strong className="text-slate-700">
                {Math.max(totalPages, 1)}
              </strong>
              <span className="ml-1.5 text-slate-400">
                {totalElements.toLocaleString()}
              </span>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                aria-label="Previous page"
                disabled={page <= 0 || actionsQuery.isFetching}
                onClick={() => setPage((current) => Math.max(current - 1, 0))}
                className="inline-flex h-8 min-w-8 items-center justify-center rounded-md border border-slate-300 bg-white px-2 text-[9px] font-bold text-slate-700 disabled:opacity-40 sm:gap-1 sm:px-2.5 sm:text-[10px]"
              >
                <ChevronLeft size={12} />

                <span className="hidden sm:inline">Previous</span>
              </button>

              <button
                type="button"
                aria-label="Next page"
                disabled={page + 1 >= totalPages || actionsQuery.isFetching}
                onClick={() => setPage((current) => current + 1)}
                className="inline-flex h-8 min-w-8 items-center justify-center rounded-md border border-slate-300 bg-white px-2 text-[9px] font-bold text-slate-700 disabled:opacity-40 sm:gap-1 sm:px-2.5 sm:text-[10px]"
              >
                <span className="hidden sm:inline">Next</span>

                <ChevronRight size={12} />
              </button>
            </div>
          </div>
        ) : null}
      </Card>
    </AdminShell>
  );
}

// ============================================================================
// DESKTOP ACTION ROW
// ============================================================================

function DesktopActionRow({
  action,
  actionTypeCount,
  submissionCount,
  onOpen,
}: {
  action: VoteSubmissionActionDto;
  actionTypeCount: number | null;
  submissionCount: number | null;
  onOpen: () => void;
}) {
  return (
    <tr
      onDoubleClick={onOpen}
      className="border-b border-slate-100 bg-white align-top transition-colors hover:bg-slate-50"
    >
      <BodyCell>
        <div
          className={[
            "inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-extrabold uppercase tracking-wide",

            actionClass(action.actionType),
          ].join(" ")}
        >
          {actionIcon(action.actionType)}

          {actionLabel(action.actionType)}
        </div>

        {action.certificationConfirmed ? (
          <div className="mt-1 flex items-center gap-1 text-[8px] font-bold text-emerald-700">
            <ShieldCheck size={10} />
            Certified
          </div>
        ) : null}
      </BodyCell>

      <BodyCell>
        <div className="max-w-[220px] text-[12px] font-bold text-slate-900">
          {clean(action.electionName) || "—"}
        </div>

        <div className="mt-0.5 max-w-[220px] text-[11px] text-slate-500">
          {clean(action.contestName) || "—"}
        </div>
      </BodyCell>

      <BodyCell>
        <div className="text-[12px] font-semibold text-slate-800">
          {clean(action.countyName) ? `${action.countyName} County` : "—"}
        </div>

        <div className="mt-0.5 text-[12px] text-slate-500">
          {clean(action.districtName) || "—"}
        </div>
      </BodyCell>

      <BodyCell>
        <div className="max-w-[230px] text-[12px] font-semibold text-slate-800">
          {clean(action.centerName) || "—"}
        </div>

        <div className="mt-0.5 max-w-[230px] text-[10px] font-semibold text-blue-700">
          {placeDisplay(action)}
        </div>
      </BodyCell>

      <BodyCell>
        <div className="max-w-[170px] font-semibold text-slate-900">
          {clean(action.actorName) || "Unknown user"}
        </div>
      </BodyCell>

      <BodyCell>
        <div className="flex items-center gap-1 whitespace-nowrap">
          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-bold text-slate-600">
            {statusText(action.statusBefore)}
          </span>

          <span className="text-slate-400">→</span>

          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-bold text-slate-700">
            {statusText(action.statusAfter)}
          </span>
        </div>
      </BodyCell>

      {/* ================================================================ */}
      {/* ACTION TYPE COUNT / TOTAL SUBMISSION ACTION COUNT */}
      {/* ================================================================ */}

      <BodyCell>
        <div className="flex flex-col items-start">
          <span
            title="Action type count / total submission actions"
            className="inline-flex min-w-[52px] justify-center rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-extrabold text-slate-700"
          >
            {actionTypeCount ?? "—"} / {submissionCount ?? "—"}
          </span>

          <span className="mt-0.5 text-[7px] font-semibold uppercase tracking-wide text-slate-400">
            type / total
          </span>
        </div>
      </BodyCell>

      <BodyCell>
        <div className="whitespace-nowrap text-[12px] font-medium text-slate-600">
          {formatShortDate(action.actionTime ?? action.dateCreated)}
        </div>
      </BodyCell>

      <BodyCell alignRight>
        <button
          type="button"
          onClick={onOpen}
          className="inline-flex h-7 items-center gap-1 rounded-md border border-slate-300 bg-white px-2.5 text-[12px] font-bold text-slate-700 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
        >
          <ExternalLink size={11} />
          View
        </button>
      </BodyCell>
    </tr>
  );
}

// ============================================================================
// MOBILE ACTION ROW
//
// Compact mobile ledger.
// Full record belongs on SubmissionActionDetailPage.
// ============================================================================

function MobileActionRow({
  action,
  actionTypeCount,
  submissionCount,
  first,
  onOpen,
}: {
  action: VoteSubmissionActionDto;
  actionTypeCount: number | null;
  submissionCount: number | null;
  first: boolean;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className={[
        "block w-full px-2.5 py-2 text-left transition-colors hover:bg-slate-50 active:bg-slate-100",

        first ? "" : "border-t border-slate-200",
      ].join(" ")}
    >
      {/* ================================================================ */}
      {/* LINE 1 — ACTION / TIME */}
      {/* ================================================================ */}

      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5">
          <span
            className={[
              "inline-flex shrink-0 items-center gap-1 rounded-full border px-1.5 py-0.5 text-[7px] font-extrabold uppercase tracking-wide",

              actionClass(action.actionType),
            ].join(" ")}
          >
            {actionIcon(action.actionType)}

            {actionLabel(action.actionType)}
          </span>

          {action.certificationConfirmed ? (
            <ShieldCheck size={11} className="shrink-0 text-emerald-600" />
          ) : null}
        </div>

        <span className="shrink-0 text-[8px] font-medium text-slate-400">
          {formatShortDate(action.actionTime ?? action.dateCreated)}
        </span>
      </div>

      {/* ================================================================ */}
      {/* LINE 2 — ELECTION */}
      {/* ================================================================ */}

      <div className="mt-1.5 flex items-baseline gap-1.5">
        <span className="min-w-0 truncate text-[10px] font-extrabold text-slate-900">
          {clean(action.electionName) || "—"}
        </span>

        {clean(action.contestName) ? (
          <span className="shrink-0 truncate text-[8px] font-medium text-slate-400">
            • {action.contestName}
          </span>
        ) : null}
      </div>

      {/* ================================================================ */}
      {/* LINE 3 — GEO / PLACE */}
      {/* ================================================================ */}

      <div className="mt-1 flex items-center justify-between gap-2">
        <span className="min-w-0 truncate text-[9px] font-medium text-slate-600">
          {geographyPrimary(action)}
        </span>

        <span className="shrink-0 text-[9px] font-bold text-blue-700">
          {mobilePlaceDisplay(action)}
        </span>
      </div>

      {/* ================================================================ */}
      {/* LINE 4 — STATUS / COUNT / VIEW */}
      {/* ================================================================ */}

      <div className="mt-1.5 flex items-center justify-between gap-2 border-t border-slate-100 pt-1.5">
        <div className="flex min-w-0 items-center gap-2">
          <span className="text-[8px] font-bold text-slate-600">
            {statusText(action.statusBefore)}

            <span className="mx-1 text-slate-300">→</span>

            {statusText(action.statusAfter)}
          </span>

          <span
            title="Action type count / total submission actions"
            className="shrink-0 rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[7px] font-extrabold text-slate-600"
          >
            {actionTypeCount ?? "—"} / {submissionCount ?? "—"} type/total
          </span>
        </div>

        <span className="inline-flex shrink-0 items-center gap-1 text-[8px] font-extrabold text-blue-700">
          View
          <ExternalLink size={9} />
        </span>
      </div>
    </button>
  );
}

// ============================================================================
// FILTER SELECT
// ============================================================================

function FilterSelect({
  label,
  value,
  onChange,
  options,
  placeholder,
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{
    value: string;
    label: string;
  }>;
  placeholder: string;
  disabled?: boolean;
}) {
  return (
    <label>
      <span className="mb-1 block text-[8px] font-bold uppercase tracking-wide text-slate-400 sm:text-[9px]">
        {label}
      </span>

      <select
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="h-9 w-full rounded-md border border-slate-300 bg-white px-2 text-[10px] font-semibold text-slate-700 disabled:bg-slate-100 disabled:text-slate-400 sm:text-[11px]"
      >
        <option value="">{placeholder}</option>

        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

// ============================================================================
// TABLE HELPERS
// ============================================================================

function HeaderCell({
  children,
  alignRight = false,
}: {
  children: ReactNode;
  alignRight?: boolean;
}) {
  return (
    <th
      className={[
        "px-3 py-2 text-[9px] font-extrabold uppercase tracking-wide text-slate-500",

        alignRight ? "text-right" : "text-left",
      ].join(" ")}
    >
      {children}
    </th>
  );
}

function BodyCell({
  children,
  alignRight = false,
}: {
  children: ReactNode;
  alignRight?: boolean;
}) {
  return (
    <td
      className={[
        "px-3 py-2.5 text-[11px] text-slate-700",

        alignRight ? "text-right" : "text-left",
      ].join(" ")}
    >
      {children}
    </td>
  );
}

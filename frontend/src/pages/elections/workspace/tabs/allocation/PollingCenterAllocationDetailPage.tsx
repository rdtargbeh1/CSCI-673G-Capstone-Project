// src/pages/elections/workspace/tabs/allocation/PollingCenterAllocationDetailPage.tsx

import { useEffect, useMemo, useState, type ReactNode } from "react";

import { useNavigate, useParams } from "react-router-dom";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  Activity,
  AlertCircle,
  ArrowLeft,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock3,
  Database,
  Edit3,
  Loader2,
  MapPin,
  RefreshCw,
  Save,
  Trash2,
  UserRound,
  Users,
  Vote,
  X,
} from "lucide-react";

import { useAuthStore } from "../../../../../shared/store/authStore";

import {
  deleteAllocation,
  getAllocation,
  updateAllocation,
  type PollingCenterAllocationUpdateRequest,
} from "../../../../../shared/services/pollingCenterAllocationService";

// ============================================================================
// HELPERS
// ============================================================================

function safeText(value: unknown, fallback = "—") {
  if (value === null || value === undefined || value === "") {
    return fallback;
  }

  return String(value);
}

function formatNumber(value: number | null | undefined) {
  if (value === null || value === undefined) {
    return "—";
  }

  return new Intl.NumberFormat().format(value);
}

function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function friendlyError(error: any, fallback = "Something went wrong.") {
  return (
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message ||
    fallback
  );
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function PollingCenterAllocationDetailPage() {
  const { electionId, allocationId } = useParams<{
    electionId: string;
    allocationId: string;
  }>();

  const navigate = useNavigate();

  const queryClient = useQueryClient();

  // ==========================================================================
  // AUTHORIZATION
  // ==========================================================================

  const dashboardMode = useAuthStore((state) => state.dashboardMode);

  const isSystemAdmin = useAuthStore((state) => state.isSystemAdmin());

  const canEdit =
    dashboardMode === "SYSTEM" || dashboardMode === "NEC" || isSystemAdmin;

  // ==========================================================================
  // STATE
  // ==========================================================================

  const [editing, setEditing] = useState(false);

  const [registeredVoters, setRegisteredVoters] = useState("");

  const [ballotsIssued, setBallotsIssued] = useState("");

  const [confirmDelete, setConfirmDelete] = useState(false);

  const [mobileDetailsExpanded, setMobileDetailsExpanded] = useState(false);

  // ==========================================================================
  // QUERY
  // ==========================================================================

  const allocationQ = useQuery({
    enabled: Boolean(allocationId),

    queryKey: ["polling-center-allocation-detail", allocationId],

    queryFn: () => getAllocation(allocationId!),

    staleTime: 10_000,

    retry: 1,
  });

  const allocation = allocationQ.data;

  // ==========================================================================
  // SYNC EDIT VALUES
  // ==========================================================================

  useEffect(() => {
    if (!allocation) {
      return;
    }

    setRegisteredVoters(String(allocation.registeredVoters ?? 0));

    setBallotsIssued(
      allocation.ballotsIssued == null ? "" : String(allocation.ballotsIssued),
    );
  }, [allocation]);

  // ==========================================================================
  // VALIDATION
  // ==========================================================================

  const updateValidation = useMemo(() => {
    if (!editing) {
      return null;
    }

    if (registeredVoters.trim() === "") {
      return "Registered voters is required.";
    }

    const rv = Number(registeredVoters);

    if (Number.isNaN(rv) || rv < 0) {
      return "Registered voters must be zero or greater.";
    }

    if (ballotsIssued.trim() !== "") {
      const ballots = Number(ballotsIssued);

      if (Number.isNaN(ballots) || ballots < 0) {
        return "Ballots issued must be zero or greater.";
      }
    }

    return null;
  }, [editing, registeredVoters, ballotsIssued]);

  // ==========================================================================
  // UPDATE
  // ==========================================================================

  const updateM = useMutation({
    mutationFn: async (request: PollingCenterAllocationUpdateRequest) => {
      if (!allocationId) {
        throw new Error("Allocation ID is missing.");
      }

      return updateAllocation(allocationId, request);
    },

    onSuccess: async () => {
      setEditing(false);

      await queryClient.invalidateQueries({
        queryKey: ["polling-center-allocations", electionId],
      });

      await queryClient.invalidateQueries({
        queryKey: ["polling-center-allocation-detail", allocationId],
      });

      await allocationQ.refetch();
    },
  });

  // ==========================================================================
  // DELETE
  // ==========================================================================

  const deleteM = useMutation({
    mutationFn: async () => {
      if (!allocationId) {
        throw new Error("Allocation ID is missing.");
      }

      return deleteAllocation(allocationId);
    },

    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["polling-center-allocations", electionId],
      });

      navigate(`/elections/${electionId}/allocation/centers`);
    },
  });

  // ==========================================================================
  // REFRESH
  // ==========================================================================

  const refreshAllocation = async () => {
    await queryClient.invalidateQueries({
      queryKey: ["polling-center-allocation-detail", allocationId],
    });

    await queryClient.invalidateQueries({
      queryKey: ["polling-center-allocations", electionId],
    });

    await allocationQ.refetch();
  };

  // ==========================================================================
  // BEGIN EDIT
  // ==========================================================================

  const beginEdit = () => {
    if (!canEdit || !allocation) {
      return;
    }

    setRegisteredVoters(String(allocation.registeredVoters ?? 0));

    setBallotsIssued(
      allocation.ballotsIssued == null ? "" : String(allocation.ballotsIssued),
    );

    setEditing(true);
  };

  // ==========================================================================
  // SAVE
  // ==========================================================================

  const saveUpdate = () => {
    if (!canEdit || !allocation || updateValidation) {
      return;
    }

    const request: PollingCenterAllocationUpdateRequest = {
      registeredVoters: Number(registeredVoters),

      ballotsIssued:
        ballotsIssued.trim() === "" ? undefined : Number(ballotsIssued),
    };

    updateM.mutate(request);
  };

  // ==========================================================================
  // CANCEL EDIT
  // ==========================================================================

  const cancelEdit = () => {
    if (!allocation) {
      return;
    }

    setRegisteredVoters(String(allocation.registeredVoters ?? 0));

    setBallotsIssued(
      allocation.ballotsIssued == null ? "" : String(allocation.ballotsIssued),
    );

    setEditing(false);
  };

  // ==========================================================================
  // GUARD
  // ==========================================================================

  if (!electionId || !allocationId) {
    return (
      <div className="app-detail">
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <div className="flex items-start gap-3">
            <AlertCircle size={20} className="mt-0.5 shrink-0 text-red-600" />

            <div>
              <h2 className="font-bold text-red-800">Allocation unavailable</h2>

              <p className="mt-1 text-sm text-red-700">
                Required route information is missing.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================================================
  // LOADING
  // ==========================================================================

  if (allocationQ.isLoading) {
    return (
      <div className="app-detail">
        <div className="flex min-h-52 items-center justify-center rounded-xl border border-slate-200 bg-white">
          <div className="text-center">
            <Loader2 size={30} className="mx-auto animate-spin text-blue-600" />

            <p className="mt-3 text-sm font-medium text-slate-500">
              Loading allocation...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================================================
  // ERROR
  // ==========================================================================

  if (allocationQ.isError || !allocation) {
    return (
      <div className="app-detail">
        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={() =>
              navigate(`/elections/${electionId}/allocation/centers`)
            }
            className="inline-flex min-h-11 w-fit items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700"
          >
            <ArrowLeft size={18} />
            Back
          </button>

          <div className="rounded-xl border border-red-200 bg-red-50 p-4">
            <div className="flex items-start gap-3">
              <AlertCircle size={20} className="mt-0.5 shrink-0 text-red-600" />

              <div>
                <h2 className="font-bold text-red-800">
                  Unable to load allocation
                </h2>

                <p className="mt-1 text-sm text-red-700">
                  {friendlyError(allocationQ.error, "Allocation not found.")}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================================================
  // DISPLAY
  // ==========================================================================

  const active = allocation.active !== false;

  // ==========================================================================
  // RENDER
  // ==========================================================================

  return (
    <div className="app-detail">
      <div className="flex min-w-0 flex-col gap-3">
        {/* ================================================================
            HEADER
        ================================================================ */}

        <section className="rounded-xl border border-slate-200 bg-white px-3 py-3 sm:px-4">
          <div className="flex min-w-0 items-center gap-2.5">
            <button
              type="button"
              onClick={() =>
                navigate(`/elections/${electionId}/allocation/centers`)
              }
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-700 transition hover:bg-slate-50"
              aria-label="Back to polling center allocations"
            >
              <ArrowLeft size={19} />
            </button>

            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <h1 className="min-w-0 truncate text-xl font-bold text-slate-900 sm:text-2xl lg:text-[26px]">
                  {safeText(allocation.centerName)}
                </h1>

                <span
                  className={
                    active
                      ? "inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700"
                      : "inline-flex shrink-0 items-center gap-1 rounded-full bg-red-50 px-2.5 py-1 text-xs font-bold text-red-700"
                  }
                >
                  {active && <CheckCircle2 size={13} />}

                  {active ? "Allocated" : "Inactive"}
                </span>
              </div>

              <p className="mt-0.5 truncate text-sm font-medium text-slate-500">
                {safeText(allocation.centerCode)}
              </p>
            </div>
          </div>
        </section>

        {/* ================================================================
            ACTION BAR
        ================================================================ */}

        <section className="rounded-xl border border-slate-200 bg-white px-3 py-2.5">
          <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm font-bold text-slate-900">
              Allocation Actions
            </div>

            <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
              <button
                type="button"
                onClick={refreshAllocation}
                disabled={allocationQ.isFetching || editing}
                className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-40"
              >
                <RefreshCw
                  size={16}
                  className={allocationQ.isFetching ? "animate-spin" : ""}
                />
                Refresh
              </button>

              {canEdit && (
                <button
                  type="button"
                  onClick={beginEdit}
                  disabled={editing}
                  className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-3 text-sm font-bold text-white transition hover:bg-blue-700 disabled:opacity-40"
                >
                  <Edit3 size={16} />
                  Edit
                </button>
              )}

              {canEdit && (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  disabled={editing || deleteM.isPending}
                  className="col-span-2 inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg border border-red-300 bg-red-50 px-3 text-sm font-bold text-red-700 transition hover:bg-red-100 disabled:opacity-40 sm:col-span-1"
                >
                  <Trash2 size={16} />
                  Delete
                </button>
              )}
            </div>
          </div>
        </section>

        {/* ================================================================
            EDIT MODE
        ================================================================ */}

        {editing ? (
          <section className="overflow-hidden rounded-xl border border-blue-200 bg-white">
            {/* HEADER */}

            <div className="flex items-center justify-between border-b border-blue-100 bg-blue-50/60 px-3 py-2.5 sm:px-4">
              <div className="flex items-center gap-2">
                <Edit3 size={17} className="text-blue-700" />

                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Edit Allocation
                  </h2>

                  <p className="text-xs text-slate-500">
                    Update registered voters and ballots issued.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={cancelEdit}
                disabled={updateM.isPending}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                aria-label="Cancel editing"
              >
                <X size={17} />
              </button>
            </div>

            {/* COMPACT EDIT BODY */}

            <div className="mx-auto w-full max-w-3xl p-3 sm:p-4">
              {/* CONTEXT LINE */}

              <div className="mb-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500 sm:text-sm">
                <span className="font-semibold text-slate-700">
                  {safeText(allocation.countyName)}
                </span>

                <span>/</span>

                <span className="font-semibold text-slate-700">
                  {safeText(allocation.districtName)}
                </span>

                <span>/</span>

                <span className="font-semibold text-slate-700">
                  {safeText(allocation.centerName)}
                </span>

                <span className="text-slate-300">•</span>

                <span>{safeText(allocation.centerCode)}</span>
              </div>

              {/* INPUTS */}

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="registered-voters"
                    className="mb-1.5 block text-sm font-bold text-slate-700"
                  >
                    Registered Voters
                  </label>

                  <input
                    id="registered-voters"
                    type="number"
                    inputMode="numeric"
                    min={0}
                    value={registeredVoters}
                    onChange={(event) =>
                      setRegisteredVoters(event.target.value)
                    }
                    disabled={updateM.isPending}
                    className="min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-base font-semibold text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
                  />
                </div>

                <div>
                  <label
                    htmlFor="ballots-issued"
                    className="mb-1.5 block text-sm font-bold text-slate-700"
                  >
                    Ballots Issued
                  </label>

                  <input
                    id="ballots-issued"
                    type="number"
                    inputMode="numeric"
                    min={0}
                    value={ballotsIssued}
                    onChange={(event) => setBallotsIssued(event.target.value)}
                    disabled={updateM.isPending}
                    className="min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-base font-semibold text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
                  />
                </div>
              </div>

              {/* SUMMARY + ACTION */}

              <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-xs text-slate-600 sm:text-sm">
                  Registered{" "}
                  <strong className="text-slate-900">
                    {registeredVoters.trim()
                      ? formatNumber(Number(registeredVoters))
                      : "—"}
                  </strong>
                  <span className="mx-2 text-slate-300">•</span>
                  Ballots{" "}
                  <strong className="text-slate-900">
                    {ballotsIssued.trim()
                      ? formatNumber(Number(ballotsIssued))
                      : "—"}
                  </strong>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={cancelEdit}
                    disabled={updateM.isPending}
                    className="min-h-10 rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    onClick={saveUpdate}
                    disabled={
                      !canEdit || updateM.isPending || Boolean(updateValidation)
                    }
                    className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-bold text-white hover:bg-blue-700 disabled:bg-slate-300"
                  >
                    {updateM.isPending ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        Saving...
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

              {updateValidation && (
                <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800">
                  {updateValidation}
                </div>
              )}

              {updateM.isError && (
                <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
                  {friendlyError(updateM.error, "Failed to update allocation.")}
                </div>
              )}
            </div>
          </section>
        ) : (
          <>
            {/* ============================================================
                SUMMARY
            ============================================================ */}

            <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
              <div className="grid grid-cols-2 md:grid-cols-[minmax(0,1.4fr)_160px_160px]">
                {/* CENTER */}

                <div className="col-span-2 flex min-w-0 items-center gap-3 border-b border-slate-200 p-3 md:col-span-1 md:border-b-0 md:border-r">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
                    <MapPin size={20} />
                  </div>

                  <div className="min-w-0">
                    <div className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                      Polling Center
                    </div>

                    <div className="mt-0.5 truncate text-base font-bold text-slate-900 lg:text-lg">
                      {safeText(allocation.centerName)}
                    </div>

                    <div className="truncate text-xs text-slate-500">
                      {safeText(allocation.centerCode)}
                    </div>
                  </div>
                </div>

                {/* REGISTERED */}

                <CompactMetric
                  icon={<Users size={15} />}
                  label="Registered"
                  value={formatNumber(allocation.registeredVoters)}
                />

                {/* BALLOTS */}

                <CompactMetric
                  icon={<Vote size={15} />}
                  label="Ballots"
                  value={formatNumber(allocation.ballotsIssued)}
                />
              </div>
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
                  <CompactField
                    label="County"
                    value={safeText(allocation.countyName)}
                  />

                  <CompactField
                    label="District"
                    value={safeText(allocation.districtName)}
                  />

                  <CompactField
                    label="Election Year"
                    value={safeText(allocation.electionYear)}
                  />

                  <CompactField
                    label="Status"
                    value={active ? "Active" : "Inactive"}
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
                    <MobileDetailGroup
                      title="Location"
                      icon={<MapPin size={16} />}
                    >
                      <CompactField
                        label="County"
                        value={safeText(allocation.countyName)}
                      />

                      <CompactField
                        label="District"
                        value={safeText(allocation.districtName)}
                      />

                      <CompactField
                        label="Center"
                        value={safeText(allocation.centerName)}
                      />

                      <CompactField
                        label="Center Code"
                        value={safeText(allocation.centerCode)}
                      />
                    </MobileDetailGroup>

                    <MobileDetailGroup
                      title="Election"
                      icon={<CalendarDays size={16} />}
                    >
                      <CompactField
                        label="Election"
                        value={safeText(allocation.electionName)}
                      />

                      <CompactField
                        label="Election Year"
                        value={safeText(allocation.electionYear)}
                      />
                    </MobileDetailGroup>

                    <MobileDetailGroup
                      title="Record History"
                      icon={<Database size={16} />}
                    >
                      <CompactField
                        label="Status"
                        value={active ? "Active" : "Inactive"}
                      />

                      <CompactField
                        label="Date Created"
                        value={formatDateTime(allocation.dateCreated)}
                      />

                      <CompactField
                        label="Created By"
                        value={safeText(allocation.createdByName)}
                      />

                      <CompactField
                        label="Date Updated"
                        value={formatDateTime(allocation.dateUpdated)}
                      />

                      <CompactField
                        label="Updated By"
                        value={safeText(allocation.updatedByName)}
                      />
                    </MobileDetailGroup>
                  </div>
                </div>
              )}
            </section>

            {/* ============================================================
                DESKTOP COMPACT DETAILS
            ============================================================ */}

            <section className="hidden grid-cols-[1.05fr_0.95fr] gap-3 md:grid">
              {/* ==========================================================
                  ALLOCATION CONTEXT
              ========================================================== */}

              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <SectionHeading
                  icon={<MapPin size={17} />}
                  title="Allocation Context"
                  subtitle="Location and election"
                />

                {/* LOCATION */}

                <div className="grid grid-cols-2 gap-x-4 gap-y-4">
                  <DetailItem
                    label="County"
                    value={safeText(allocation.countyName)}
                  />

                  <DetailItem
                    label="District"
                    value={safeText(allocation.districtName)}
                  />

                  <DetailItem
                    label="Center"
                    value={safeText(allocation.centerName)}
                    icon={<Building2 size={12} />}
                  />

                  <DetailItem
                    label="Center Code"
                    value={safeText(allocation.centerCode)}
                    icon={<Building2 size={12} />}
                  />
                </div>

                {/* ELECTION DIVIDER */}

                <div className="my-4 border-t border-slate-100" />

                <div className="mb-3 flex items-center gap-2">
                  <CalendarDays size={15} className="text-blue-600" />

                  <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
                    Election
                  </span>
                </div>

                <div className="grid grid-cols-[minmax(0,1.5fr)_100px] gap-4">
                  <DetailItem
                    label="Election"
                    value={safeText(allocation.electionName)}
                  />

                  <DetailItem
                    label="Year"
                    value={safeText(allocation.electionYear)}
                  />
                </div>
              </div>

              {/* ==========================================================
                  RECORD DETAILS
              ========================================================== */}

              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <SectionHeading
                  icon={<Database size={17} />}
                  title="Record Details"
                  subtitle="Status and audit history"
                />

                <div className="grid grid-cols-2 gap-x-4 gap-y-4">
                  <DetailItem
                    label="Status"
                    icon={<Activity size={12} />}
                    value={<StatusBadge active={active} />}
                  />

                  <DetailItem
                    label="Date Created"
                    value={formatDateTime(allocation.dateCreated)}
                    icon={<Clock3 size={12} />}
                  />

                  <DetailItem
                    label="Created By"
                    value={safeText(allocation.createdByName)}
                    icon={<UserRound size={12} />}
                  />

                  <DetailItem
                    label="Date Updated"
                    value={formatDateTime(allocation.dateUpdated)}
                    icon={<Clock3 size={12} />}
                  />

                  <div className="col-span-2">
                    <DetailItem
                      label="Updated By"
                      value={safeText(allocation.updatedByName)}
                      icon={<UserRound size={12} />}
                    />
                  </div>
                </div>
              </div>
            </section>
          </>
        )}

        {/* ================================================================
            DELETE DIALOG
        ================================================================ */}

        {confirmDelete && (
          <div
            className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-3 backdrop-blur-sm sm:items-center"
            role="dialog"
            aria-modal="true"
            onClick={() => {
              if (!deleteM.isPending) {
                setConfirmDelete(false);
              }
            }}
          >
            <div
              className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600">
                <Trash2 size={22} />
              </div>

              <h2 className="mt-4 text-lg font-bold text-slate-900">
                Delete allocation?
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-600">
                You are about to delete the allocation for{" "}
                <strong>{safeText(allocation.centerName)}</strong>.
              </p>

              {deleteM.isError && (
                <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">
                  {friendlyError(deleteM.error, "Unable to delete allocation.")}
                </div>
              )}

              <div className="mt-5 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  disabled={deleteM.isPending}
                  className="min-h-12 rounded-lg border border-slate-300 bg-white font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={() => deleteM.mutate()}
                  disabled={deleteM.isPending}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-red-600 font-bold text-white transition hover:bg-red-700 disabled:opacity-50"
                >
                  {deleteM.isPending ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 size={18} />
                      Delete
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// COMPACT METRIC
// ============================================================================

function CompactMetric({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="border-r border-slate-200 p-3 last:border-r-0 md:p-4">
      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-400 lg:text-xs">
        {icon}

        {label}
      </div>

      <div className="mt-1 text-xl font-extrabold text-slate-900 lg:text-2xl">
        {value}
      </div>
    </div>
  );
}

// ============================================================================
// SECTION HEADING
// ============================================================================

function SectionHeading({
  icon,
  title,
  subtitle,
}: {
  icon: ReactNode;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="mb-4 flex items-start gap-2 border-b border-slate-100 pb-3">
      <div className="mt-0.5 text-blue-600">{icon}</div>

      <div>
        <h2 className="text-base font-bold text-slate-900 lg:text-lg">
          {title}
        </h2>

        {subtitle && (
          <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// DETAIL ITEM
// ============================================================================

type DetailItemProps = {
  label: string;
  value: ReactNode;
  icon?: ReactNode;
};

function DetailItem({ label, value, icon }: DetailItemProps) {
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-400 lg:text-[11px]">
        {icon}

        <span>{label}</span>
      </div>

      <div className="mt-1 min-w-0 break-words text-sm font-bold leading-5 text-slate-900 lg:text-base">
        {value}
      </div>
    </div>
  );
}

// ============================================================================
// MOBILE FIELD
// ============================================================================

function CompactField({ label, value }: { label: string; value: string }) {
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
  icon,
  children,
}: {
  title: string;
  icon?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-lg border border-slate-200 bg-slate-50 p-3">
      <div className="mb-3 flex items-center gap-2">
        {icon && <span className="text-blue-600">{icon}</span>}

        <div className="text-sm font-bold text-slate-900">{title}</div>
      </div>

      <div className="grid grid-cols-2 gap-x-3 gap-y-3">{children}</div>
    </section>
  );
}

// ============================================================================
// STATUS
// ============================================================================

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span
      className={
        active
          ? "inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-sm font-bold text-emerald-700"
          : "inline-flex items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-1 text-sm font-bold text-red-700"
      }
    >
      <span
        className={
          active
            ? "h-2 w-2 rounded-full bg-emerald-500"
            : "h-2 w-2 rounded-full bg-red-500"
        }
      />

      {active ? "Active" : "Inactive"}
    </span>
  );
}

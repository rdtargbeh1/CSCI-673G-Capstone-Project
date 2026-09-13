// src/pages/elections/workspace/tabs/allocation/PollingPlaceAllocationDetailPage.tsx

import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  AlertCircle,
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Edit3,
  MapPin,
  RefreshCw,
  Save,
  Trash2,
  UserRound,
  Users,
  Vote,
} from "lucide-react";

import { useAuthStore } from "../../../../../shared/store/authStore";

import {
  deletePlaceAllocation,
  getPlaceAllocation,
  updatePlaceAllocation,
  type PollingPlaceAllocationUpdateRequest,
} from "../../../../../shared/services/pollingPlaceAllocationService";

// ============================================================================
// HELPERS
// ============================================================================

function formatNumber(value: number | null | undefined) {
  return Number(value ?? 0).toLocaleString();
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

function placeNumberDisplay(placeNumber: number | null | undefined) {
  if (placeNumber == null) {
    return "Polling Place";
  }

  return `Polling Place #${String(placeNumber).padStart(2, "0")}`;
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function PollingPlaceAllocationDetailPage() {
  const { electionId, placeAllocationId } = useParams<{
    electionId: string;
    placeAllocationId: string;
  }>();

  const navigate = useNavigate();

  const queryClient = useQueryClient();

  // ==========================================================================
  // ACCESS
  // ==========================================================================

  const dashboardMode = useAuthStore((state) => state.dashboardMode);

  const isSystemAdmin = useAuthStore((state) => state.isSystemAdmin());

  const canEdit =
    dashboardMode === "SYSTEM" || dashboardMode === "NEC" || isSystemAdmin;

  // ==========================================================================
  // STATE
  // ==========================================================================

  const [editing, setEditing] = useState(false);

  const [mobileDetailsExpanded, setMobileDetailsExpanded] = useState(false);

  const [registeredVoters, setRegisteredVoters] = useState<number | "">("");

  const [ballotsIssued, setBallotsIssued] = useState<number | "">("");

  // ==========================================================================
  // QUERY
  // ==========================================================================

  const allocationQuery = useQuery({
    enabled: Boolean(placeAllocationId),

    queryKey: ["polling-place-allocation", placeAllocationId],

    queryFn: () => getPlaceAllocation(placeAllocationId!),

    staleTime: 10_000,

    retry: 1,
  });

  const allocation = allocationQuery.data;

  // ==========================================================================
  // SYNC EDIT VALUES
  // ==========================================================================

  useEffect(() => {
    if (!allocation) {
      return;
    }

    setRegisteredVoters(allocation.registeredVoters);

    setBallotsIssued(allocation.ballotsIssued ?? "");
  }, [allocation]);

  // ==========================================================================
  // REFRESH
  // ==========================================================================

  const refreshAllocation = async () => {
    await queryClient.invalidateQueries({
      queryKey: ["polling-place-allocation", placeAllocationId],
    });

    await queryClient.invalidateQueries({
      queryKey: ["polling-place-allocations"],
    });

    await allocationQuery.refetch();
  };

  // ==========================================================================
  // UPDATE
  // ==========================================================================

  const updateMutation = useMutation({
    mutationFn: async (request: PollingPlaceAllocationUpdateRequest) => {
      if (!placeAllocationId) {
        throw new Error("Missing allocation ID.");
      }

      return updatePlaceAllocation(placeAllocationId, request);
    },

    onSuccess: async () => {
      setEditing(false);

      await queryClient.invalidateQueries({
        queryKey: ["polling-place-allocation", placeAllocationId],
      });

      await queryClient.invalidateQueries({
        queryKey: ["polling-place-allocations"],
      });

      await allocationQuery.refetch();
    },
  });

  // ==========================================================================
  // DELETE
  // ==========================================================================

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!placeAllocationId) {
        throw new Error("Missing allocation ID.");
      }

      await deletePlaceAllocation(placeAllocationId);
    },

    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["polling-place-allocations"],
      });

      navigate(`/elections/${electionId}/allocation/places`, {
        replace: true,
      });
    },
  });

  // ==========================================================================
  // BEGIN EDIT
  // ==========================================================================

  const beginEdit = () => {
    if (!canEdit || !allocation) {
      return;
    }

    setRegisteredVoters(allocation.registeredVoters);

    setBallotsIssued(allocation.ballotsIssued ?? "");

    setEditing(true);
  };

  // ==========================================================================
  // CANCEL EDIT
  // ==========================================================================

  const cancelEdit = () => {
    if (!allocation) {
      return;
    }

    setRegisteredVoters(allocation.registeredVoters);

    setBallotsIssued(allocation.ballotsIssued ?? "");

    setEditing(false);
  };

  // ==========================================================================
  // SAVE
  // ==========================================================================

  const saveChanges = () => {
    if (!canEdit) {
      return;
    }

    if (registeredVoters === "") {
      alert("Registered voters is required.");

      return;
    }

    const registered = Number(registeredVoters);

    const ballots = ballotsIssued === "" ? undefined : Number(ballotsIssued);

    if (Number.isNaN(registered) || registered < 0) {
      alert("Registered voters must be 0 or greater.");

      return;
    }

    if (ballots != null && (Number.isNaN(ballots) || ballots < 0)) {
      alert("Ballots issued must be 0 or greater.");

      return;
    }

    updateMutation.mutate({
      registeredVoters: registered,

      ballotsIssued: ballots,
    });
  };

  // ==========================================================================
  // DELETE HANDLER
  // ==========================================================================

  const deleteAllocation = () => {
    if (!canEdit || !allocation) {
      return;
    }

    const identifier = placeNumberDisplay(allocation.placeNumber);

    const confirmed = window.confirm(
      `Delete the allocation for "${identifier}"?\n\nThis action cannot be undone.`,
    );

    if (confirmed) {
      deleteMutation.mutate();
    }
  };

  // ==========================================================================
  // ROUTE GUARD
  // ==========================================================================

  if (!electionId || !placeAllocationId) {
    return (
      <div className="app-detail">
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
          Missing polling-place allocation route information.
        </div>
      </div>
    );
  }

  // ==========================================================================
  // LOADING
  // ==========================================================================

  if (allocationQuery.isLoading) {
    return (
      <div className="app-detail">
        <div className="rounded-xl border border-slate-200 bg-white p-5 text-center text-base text-slate-600">
          Loading polling-place allocation…
        </div>
      </div>
    );
  }

  // ==========================================================================
  // ERROR
  // ==========================================================================

  if (allocationQuery.isError || !allocation) {
    return (
      <div className="app-detail">
        <div className="flex gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
          <AlertCircle size={18} className="mt-0.5 shrink-0" />

          <div>{friendlyError(allocationQuery.error)}</div>
        </div>
      </div>
    );
  }

  // ==========================================================================
  // DISPLAY VALUES
  // ==========================================================================

  const placeName = placeNumberDisplay(allocation.placeNumber);

  const placeLabel =
    allocation.placeLabel?.trim() || "No room / location label";

  /*
   * IMPORTANT:
   * User-facing audit information must display human-readable names only.
   * Do not fall back to raw user IDs.
   */
  const createdByDisplay = allocation.createdByName?.trim() || "—";

  const updatedByDisplay = allocation.updatedByName?.trim() || "—";

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

        <section className="rounded-xl border border-slate-200 bg-white p-3 sm:p-4">
          <div className="flex min-w-0 items-start gap-2.5">
            {/* BACK */}

            <button
              type="button"
              onClick={() =>
                navigate(`/elections/${electionId}/allocation/places`)
              }
              className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-slate-700 transition hover:bg-slate-50"
              aria-label="Back to polling place allocations"
            >
              <ArrowLeft size={18} />
            </button>

            {/* TITLE */}

            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900 sm:text-2xl lg:text-3xl">
                  {placeName}
                </h1>

                <span
                  className={
                    active
                      ? "inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700"
                      : "inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600"
                  }
                >
                  {active && <CheckCircle2 size={13} />}

                  {active ? "Active" : "Inactive"}
                </span>
              </div>

              <div className="mt-1 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-sm text-slate-600 lg:text-base">
                <span className="font-semibold text-slate-800">
                  {placeLabel}
                </span>

                {allocation.placeCode && (
                  <>
                    <span className="text-slate-300">•</span>

                    <span>{allocation.placeCode}</span>
                  </>
                )}
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
                Allocation Actions
              </div>

              <div className="mt-0.5 text-xs text-slate-500">
                Refresh, edit, or remove this polling-place allocation.
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center sm:justify-end">
              {/* REFRESH */}

              <button
                type="button"
                onClick={refreshAllocation}
                disabled={allocationQuery.isFetching || editing}
                className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <RefreshCw
                  size={16}
                  className={allocationQuery.isFetching ? "animate-spin" : ""}
                />
                Refresh
              </button>

              {/* EDIT */}

              {canEdit && (
                <button
                  type="button"
                  onClick={beginEdit}
                  disabled={editing}
                  className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Edit3 size={16} />
                  Edit
                </button>
              )}

              {/* DELETE */}

              {canEdit && (
                <button
                  type="button"
                  onClick={deleteAllocation}
                  disabled={editing || deleteMutation.isPending}
                  className="col-span-2 inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm font-bold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-40 sm:col-span-1"
                >
                  {deleteMutation.isPending ? (
                    <>
                      <RefreshCw size={15} className="animate-spin" />
                      Deleting…
                    </>
                  ) : (
                    <>
                      <Trash2 size={16} />
                      Delete
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

          {deleteMutation.isError && (
            <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">
              {friendlyError(deleteMutation.error)}
            </div>
          )}
        </section>

        {/* ================================================================
            EDIT MODE
        ================================================================ */}

        {editing ? (
          <section className="overflow-hidden rounded-xl border border-blue-200 bg-white">
            {/* EDIT HEADER */}

            <div className="border-b border-blue-100 bg-blue-50/60 px-3 py-3 sm:px-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
                  <Edit3 size={17} />
                </div>

                <div>
                  <div className="text-base font-bold text-slate-900 lg:text-lg">
                    Edit Allocation
                  </div>

                  <div className="mt-0.5 text-xs text-slate-500 sm:text-sm">
                    Update registered voters and ballots issued for this polling
                    place.
                  </div>
                </div>
              </div>
            </div>

            {/* CONTEXT */}

            <div className="border-b border-slate-100 px-3 py-3 sm:px-4">
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4">
                <EditContext label="Polling Place" value={placeName} />

                <EditContext label="Room / Label" value={placeLabel} />

                <EditContext
                  label="Polling Center"
                  value={allocation.centerName ?? "—"}
                />

                <EditContext
                  label="County"
                  value={allocation.countyName ?? "—"}
                />

                <EditContext
                  label="District"
                  value={allocation.districtName ?? "—"}
                />
              </div>
            </div>

            {/* INPUTS */}

            <div className="p-3 sm:p-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {/* REGISTERED */}

                <div>
                  <label className="mb-1.5 block text-sm font-bold text-slate-700">
                    Registered Voters
                  </label>

                  <input
                    type="number"
                    min={0}
                    value={registeredVoters}
                    onChange={(event) => {
                      const value = event.target.value;

                      setRegisteredVoters(value === "" ? "" : Number(value));
                    }}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-base font-semibold text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                {/* BALLOTS */}

                <div>
                  <label className="mb-1.5 block text-sm font-bold text-slate-700">
                    Ballots Issued
                  </label>

                  <input
                    type="number"
                    min={0}
                    value={ballotsIssued}
                    onChange={(event) => {
                      const value = event.target.value;

                      setBallotsIssued(value === "" ? "" : Number(value));
                    }}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-base font-semibold text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              </div>

              {/* LIVE EDIT SUMMARY */}

              <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600 sm:text-sm">
                <span>
                  Registered:{" "}
                  <strong className="text-slate-900">
                    {registeredVoters === ""
                      ? "—"
                      : formatNumber(Number(registeredVoters))}
                  </strong>
                </span>

                <span className="text-slate-300">•</span>

                <span>
                  Ballots:{" "}
                  <strong className="text-slate-900">
                    {ballotsIssued === ""
                      ? "—"
                      : formatNumber(Number(ballotsIssued))}
                  </strong>
                </span>
              </div>

              {updateMutation.isError && (
                <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">
                  {friendlyError(updateMutation.error)}
                </div>
              )}
            </div>

            {/* EDIT ACTIONS */}

            <div className="border-t border-slate-200 bg-slate-50/70 p-3 sm:p-4">
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={cancelEdit}
                  disabled={updateMutation.isPending}
                  className="min-h-11 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 sm:min-w-28"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={saveChanges}
                  disabled={updateMutation.isPending || registeredVoters === ""}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300 sm:min-w-40"
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
                PRIMARY SUMMARY
            ============================================================ */}

            <section className="grid grid-cols-2 gap-2.5 md:grid-cols-[0.8fr_0.8fr_1.4fr]">
              <SummaryCard
                icon={<Users size={17} />}
                label="Registered Voters"
                value={formatNumber(allocation.registeredVoters)}
              />

              <SummaryCard
                icon={<Vote size={17} />}
                label="Ballots Issued"
                value={formatNumber(allocation.ballotsIssued)}
              />

              <div className="col-span-2 rounded-xl border border-slate-200 bg-white p-3 md:col-span-1 md:p-4">
                <div className="text-[11px] font-bold uppercase tracking-[0.06em] text-slate-400 lg:text-xs">
                  Polling Center
                </div>

                <div
                  className="mt-1.5 truncate text-base font-bold text-slate-900 lg:text-lg"
                  title={allocation.centerName ?? ""}
                >
                  {allocation.centerName ?? "—"}
                </div>

                {(allocation.countyName || allocation.districtName) && (
                  <div className="mt-1 flex min-w-0 flex-wrap items-center gap-1.5 text-xs font-medium text-slate-500 lg:text-sm">
                    {allocation.countyName && (
                      <span>{allocation.countyName}</span>
                    )}

                    {allocation.countyName && allocation.districtName && (
                      <span className="text-slate-300">•</span>
                    )}

                    {allocation.districtName && (
                      <span>{allocation.districtName}</span>
                    )}
                  </div>
                )}
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
                  <CompactField label="Place" value={placeName} />

                  <CompactField label="Room / Label" value={placeLabel} />

                  <CompactField
                    label="Place Code"
                    value={allocation.placeCode ?? "—"}
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
                className="flex min-h-11 w-full items-center justify-center gap-2 border-t border-slate-200 px-3 py-2 text-sm font-bold text-blue-700 transition hover:bg-slate-50"
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
                    {/* ELECTION */}

                    <MobileDetailGroup title="Election">
                      <CompactField
                        label="Election"
                        value={allocation.electionName ?? "—"}
                      />

                      <CompactField
                        label="Year"
                        value={
                          allocation.year != null
                            ? String(allocation.year)
                            : "—"
                        }
                      />
                    </MobileDetailGroup>

                    {/* LOCATION */}

                    <MobileDetailGroup title="Location">
                      <CompactField
                        label="Polling Center"
                        value={allocation.centerName ?? "—"}
                      />

                      <CompactField
                        label="Center Code"
                        value={allocation.centerCode ?? "—"}
                      />

                      <CompactField
                        label="County"
                        value={allocation.countyName ?? "—"}
                      />

                      <CompactField
                        label="District"
                        value={allocation.districtName ?? "—"}
                      />

                      <CompactField label="Polling Place" value={placeName} />

                      <CompactField
                        label="Place Code"
                        value={allocation.placeCode ?? "—"}
                      />

                      <CompactField label="Room / Label" value={placeLabel} />
                    </MobileDetailGroup>

                    {/* RECORD */}

                    <MobileDetailGroup title="Record History">
                      <CompactField
                        label="Created"
                        value={formatDateTime(allocation.dateCreated)}
                      />

                      <CompactField
                        label="Created By"
                        value={createdByDisplay}
                      />

                      <CompactField
                        label="Last Updated"
                        value={formatDateTime(allocation.dateUpdated)}
                      />

                      <CompactField
                        label="Updated By"
                        value={updatedByDisplay}
                      />
                    </MobileDetailGroup>
                  </div>
                </div>
              )}
            </section>

            {/* ============================================================
                DESKTOP DETAILS
            ============================================================ */}

            <section className="hidden grid-cols-[1.05fr_0.95fr] gap-3 md:grid">
              {/* ==========================================================
                  ALLOCATION INFORMATION
              ========================================================== */}

              <div className="rounded-xl border border-slate-200 bg-white p-4 lg:p-5">
                <SectionHeader
                  icon={<MapPin size={17} />}
                  title="Allocation Information"
                  subtitle="Election and polling-location context"
                />

                <div className="grid grid-cols-2 gap-x-5 gap-y-5">
                  <DetailField
                    label="Election"
                    value={allocation.electionName ?? "—"}
                  />

                  <DetailField
                    label="Election Year"
                    value={
                      allocation.year != null ? String(allocation.year) : "—"
                    }
                  />

                  <DetailField
                    label="Polling Center"
                    value={allocation.centerName ?? "—"}
                  />

                  <DetailField
                    label="Center Code"
                    value={allocation.centerCode ?? "—"}
                  />

                  <DetailField
                    label="County"
                    value={allocation.countyName ?? "—"}
                  />

                  <DetailField
                    label="District"
                    value={allocation.districtName ?? "—"}
                  />

                  <DetailField label="Polling Place" value={placeName} />

                  <DetailField label="Room / Label" value={placeLabel} />

                  <div className="col-span-2">
                    <DetailField
                      label="Place Code"
                      value={allocation.placeCode ?? "—"}
                    />
                  </div>
                </div>
              </div>

              {/* ==========================================================
                  RECORD DETAILS
              ========================================================== */}

              <div className="rounded-xl border border-slate-200 bg-white p-4 lg:p-5">
                <SectionHeader
                  icon={<CalendarDays size={17} />}
                  title="Record Details"
                  subtitle="Status and audit history"
                />

                <div className="grid grid-cols-2 gap-x-5 gap-y-5">
                  <DetailField
                    label="Status"
                    value={active ? "Active" : "Inactive"}
                  />

                  <DetailField
                    label="Date Created"
                    value={formatDateTime(allocation.dateCreated)}
                  />

                  <DetailField
                    label="Created By"
                    value={createdByDisplay}
                    icon={<UserRound size={13} />}
                  />

                  <DetailField
                    label="Date Updated"
                    value={formatDateTime(allocation.dateUpdated)}
                  />

                  <DetailField
                    label="Updated By"
                    value={updatedByDisplay}
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
// EDIT CONTEXT
// ============================================================================

function EditContext({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <div className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
        {label}
      </div>

      <div
        className="mt-0.5 truncate text-sm font-semibold text-slate-800"
        title={value}
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
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;

  label: string;

  value: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 md:p-4">
      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.06em] text-slate-400 sm:text-[11px] lg:text-xs">
        {icon}

        {label}
      </div>

      <div className="mt-1.5 text-xl font-extrabold leading-none text-slate-900 sm:text-2xl lg:text-3xl">
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
}: {
  label: string;

  value: string;

  icon?: React.ReactNode;
}) {
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.07em] text-slate-400 lg:text-[11px]">
        {icon}

        {label}
      </div>

      <div className="mt-1.5 break-words text-sm font-bold leading-5 text-slate-900 lg:text-base lg:leading-6">
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

// src/pages/elections/workspace/tabs/setup/masters/CandidatesMasterTab.tsx

import { useEffect, useMemo, useState } from "react";

import { useNavigate, useParams } from "react-router-dom";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  AlertCircle,
  ChevronDown,
  ChevronRight,
  Filter,
  Image as ImageIcon,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  UserRound,
  X,
} from "lucide-react";

import { useAuthStore } from "../../../../../../shared/store/authStore";

import { ReadOnlyBanner, Badge } from "../../../../shared/elections-ui";

import {
  deleteCandidate,
  searchCandidates,
  type CandidateDto,
} from "../../../../../../shared/services/candidateService";

import {
  searchParties,
  type PartyDto,
} from "../../../../../../shared/services/partyService";

import {
  fetchFileBlob,
  findCurrentPhoto,
  listEntityFiles,
} from "../../../../../../shared/services/fileUploadService";

// ============================================================================
// HELPERS
// ============================================================================

function safeStr(value: unknown) {
  return typeof value === "string" ? value : value == null ? "" : String(value);
}

function formatDate(value: unknown) {
  if (!value) {
    return "—";
  }

  const date = new Date(String(value));

  if (Number.isNaN(date.getTime())) {
    return safeStr(value);
  }

  return date.toLocaleString();
}

function getActiveValue(candidate: CandidateDto) {
  const raw = candidate as any;

  return Boolean(raw?.isActive ?? raw?.active ?? false);
}

function getIndependentValue(candidate: CandidateDto) {
  const raw = candidate as any;

  return Boolean(raw?.independent ?? raw?.isIndependent ?? false);
}

function friendlyError(error: any) {
  return (
    error?.response?.data?.message ??
    error?.response?.data?.error ??
    error?.message ??
    "Something went wrong."
  );
}

const PARTY_FILTER_INDEPENDENT = "__INDEPENDENT__";

// ============================================================================
// COMPONENT
// ============================================================================

export default function CandidatesMasterTab() {
  const { electionId } = useParams<{
    electionId: string;
  }>();

  const navigate = useNavigate();

  const queryClient = useQueryClient();

  // ==========================================================================
  // ACCESS
  // ==========================================================================

  const dashboardMode = useAuthStore((state) => state.dashboardMode);

  const currentOrgId = useAuthStore((state) => state.currentOrgId);

  const isSystemAdmin = useAuthStore((state) => state.isSystemAdmin());

  const canEdit =
    dashboardMode === "NEC" || dashboardMode === "SYSTEM" || isSystemAdmin;

  // ==========================================================================
  // STATE
  // ==========================================================================

  const [page, setPage] = useState(0);

  const [search, setSearch] = useState("");

  const [position, setPosition] = useState("");

  const [partyFilter, setPartyFilter] = useState("");

  const [active, setActive] = useState<"" | "true" | "false">("");

  const [filtersOpen, setFiltersOpen] = useState(false);

  const [selectedCandidate, setSelectedCandidate] =
    useState<CandidateDto | null>(null);

  const [selectedPhotoSrc, setSelectedPhotoSrc] = useState<string | null>(null);

  const size = 20;

  // ==========================================================================
  // PARTY LOOKUP
  // ==========================================================================

  const partiesQuery = useQuery({
    queryKey: ["party-master-dropdown"],

    queryFn: () =>
      searchParties({
        page: 0,
        size: 500,
        q: undefined,
      }),

    staleTime: 60_000,

    retry: 1,
  });

  const parties: PartyDto[] = useMemo(
    () => partiesQuery.data?.items ?? [],

    [partiesQuery.data],
  );

  // ==========================================================================
  // CANDIDATE QUERY
  // ==========================================================================

  const independentForApi =
    partyFilter === PARTY_FILTER_INDEPENDENT ? true : undefined;

  const partyIdForApi =
    partyFilter === "" || partyFilter === PARTY_FILTER_INDEPENDENT
      ? undefined
      : partyFilter;

  const candidatesQuery = useQuery({
    queryKey: ["candidate-master", page, search, position, partyFilter, active],

    queryFn: () =>
      searchCandidates({
        page,
        size,

        q: search.trim() || undefined,

        position: position.trim() || undefined,

        partyId: partyIdForApi,

        active: active === "" ? undefined : active === "true",

        independent: independentForApi,
      }),

    staleTime: 10_000,

    retry: 1,
  });

  const candidates = useMemo(
    () => candidatesQuery.data?.items ?? [],

    [candidatesQuery.data],
  );

  const totalPages = Math.max(
    1,

    candidatesQuery.data?.totalPages ?? 1,
  );

  // ==========================================================================
  // SELECTED CANDIDATE FILES
  // ==========================================================================

  const selectedFilesQuery = useQuery({
    enabled: Boolean(selectedCandidate && currentOrgId),

    queryKey: [
      "file-uploads",
      "candidate",
      selectedCandidate?.candidateId,
      currentOrgId,
    ],

    queryFn: () =>
      listEntityFiles({
        orgId: currentOrgId!,

        relatedTable: "candidate",

        relatedId: selectedCandidate!.candidateId,
      }),

    staleTime: 10_000,

    retry: 1,
  });

  const selectedPhoto = useMemo(
    () =>
      findCurrentPhoto(
        selectedFilesQuery.data,

        selectedCandidate?.photoUrl ?? null,
      ),

    [selectedFilesQuery.data, selectedCandidate?.photoUrl],
  );

  // ==========================================================================
  // AUTHENTICATED PHOTO
  // ==========================================================================

  const selectedPhotoQuery = useQuery({
    enabled: Boolean(selectedPhoto?.fileId),

    queryKey: ["file-content", selectedPhoto?.fileId],

    queryFn: () => fetchFileBlob(selectedPhoto!.fileId),

    staleTime: 60_000,

    retry: 1,
  });

  useEffect(() => {
    setSelectedPhotoSrc(null);

    if (!selectedPhotoQuery.data) {
      return;
    }

    const objectUrl = URL.createObjectURL(selectedPhotoQuery.data);

    setSelectedPhotoSrc(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [selectedPhotoQuery.data]);

  // ==========================================================================
  // REFRESH
  // ==========================================================================

  const refreshNow = async () => {
    await queryClient.invalidateQueries({
      queryKey: ["candidate-master"],
    });

    await queryClient.invalidateQueries({
      queryKey: ["file-uploads", "candidate"],
    });

    await queryClient.invalidateQueries({
      queryKey: ["file-content"],
    });

    await candidatesQuery.refetch();

    if (selectedCandidate && currentOrgId) {
      await selectedFilesQuery.refetch();
    }
  };

  // ==========================================================================
  // DELETE
  // ==========================================================================

  const deleteMutation = useMutation({
    mutationFn: (candidate: CandidateDto) =>
      deleteCandidate(candidate.candidateId),

    onSuccess: async (_, deleted) => {
      if (selectedCandidate?.candidateId === deleted.candidateId) {
        setSelectedCandidate(null);
      }

      await refreshNow();
    },
  });

  // ==========================================================================
  // NAVIGATION
  // ==========================================================================

  const openCreate = () => {
    if (!electionId) {
      return;
    }

    navigate(`/elections/${electionId}/setup/master-candidates/new`);
  };

  const openEdit = (candidate: CandidateDto) => {
    if (!electionId) {
      return;
    }

    navigate(
      `/elections/${electionId}/setup/master-candidates/${candidate.candidateId}/edit`,

      {
        state: {
          candidate,
        },
      },
    );
  };

  const removeCandidate = (candidate: CandidateDto) => {
    if (!canEdit) {
      return;
    }

    const confirmed = window.confirm(
      `Delete candidate "${candidate.fullName}"?\n\nThis deletes the global Candidate Master record.`,
    );

    if (confirmed) {
      deleteMutation.mutate(candidate);
    }
  };

  // ==========================================================================
  // FILTERS
  // ==========================================================================

  const clearFilters = () => {
    setSearch("");
    setPosition("");
    setPartyFilter("");
    setActive("");
    setPage(0);
  };

  const advancedFilterCount = [position, partyFilter, active].filter(
    Boolean,
  ).length;

  // ==========================================================================
  // RENDER
  // ==========================================================================

  return (
    <div className="w-full">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-3">
        {!canEdit && (
          <ReadOnlyBanner
            reason="Global Candidate Master records are managed by NEC/System Admin."
            sources={["candidate"]}
          />
        )}

        {/* ================================================================
            HEADER
        ================================================================ */}

        <section className="rounded-2xl border border-slate-200 bg-white p-3 sm:p-4">
          <div className="grid grid-cols-[minmax(0,1fr)_104px] gap-3 sm:flex sm:items-center sm:justify-between">
            <div className="min-w-0">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-700">
                  <UserRound size={17} />
                </div>

                <div className="min-w-0">
                  <h2 className="text-base font-bold text-slate-900 sm:text-lg">
                    Candidate Master
                  </h2>

                  <p className="mt-0.5 text-xs text-slate-500">
                    Manage candidate master records and photos.
                  </p>
                </div>
              </div>

              {/* MOBILE ACTIONS */}

              <div className="mt-3 flex flex-wrap gap-2 sm:hidden">
                {canEdit ? (
                  <button
                    type="button"
                    onClick={openCreate}
                    className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-3 text-xs font-bold text-white hover:bg-blue-700"
                  >
                    <Plus size={15} />
                    Add Candidate
                  </button>
                ) : (
                  <Badge text="Read-only" />
                )}

                <button
                  type="button"
                  onClick={refreshNow}
                  disabled={candidatesQuery.isFetching}
                  className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 disabled:opacity-50"
                >
                  <RefreshCw
                    size={15}
                    className={candidatesQuery.isFetching ? "animate-spin" : ""}
                  />
                  Refresh
                </button>
              </div>
            </div>

            {/* MOBILE PHOTO PREVIEW */}

            <div className="sm:hidden">
              <div className="flex h-[92px] w-[104px] items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                {!selectedCandidate ? (
                  <div className="text-center text-slate-400">
                    <ImageIcon size={22} className="mx-auto" />

                    <div className="mt-1 text-[9px] font-semibold">
                      Select candidate
                    </div>
                  </div>
                ) : selectedFilesQuery.isLoading ||
                  selectedPhotoQuery.isLoading ? (
                  <RefreshCw
                    size={18}
                    className="animate-spin text-slate-400"
                  />
                ) : selectedPhotoQuery.isError ? (
                  <AlertCircle size={20} className="text-red-400" />
                ) : selectedPhotoSrc ? (
                  <img
                    src={selectedPhotoSrc}
                    alt={`${selectedCandidate.fullName} photo`}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="text-center text-slate-400">
                    <ImageIcon size={22} className="mx-auto" />

                    <div className="mt-1 text-[9px] font-semibold">
                      No photo
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* DESKTOP ACTIONS */}

            <div className="hidden flex-wrap gap-2 sm:flex">
              {canEdit ? (
                <button
                  type="button"
                  onClick={openCreate}
                  className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-3 text-sm font-bold text-white hover:bg-blue-700"
                >
                  <Plus size={15} />
                  Add Candidate
                </button>
              ) : (
                <Badge text="Read-only" />
              )}

              <button
                type="button"
                onClick={refreshNow}
                disabled={candidatesQuery.isFetching}
                className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 disabled:opacity-50"
              >
                <RefreshCw
                  size={15}
                  className={candidatesQuery.isFetching ? "animate-spin" : ""}
                />
                Refresh
              </button>
            </div>
          </div>
        </section>

        {/* ================================================================
            SEARCH / FILTERS
        ================================================================ */}

        <section className="rounded-2xl border border-slate-200 bg-white p-2.5">
          <div className="flex items-center gap-2">
            <div className="relative min-w-0 flex-1">
              <Search
                size={15}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);

                  setPage(0);
                }}
                placeholder="Search candidate name..."
                className="min-h-9 w-full rounded-lg border border-slate-300 py-1.5 pl-9 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <button
              type="button"
              onClick={() => setFiltersOpen((current) => !current)}
              className={[
                `
                  inline-flex
                  min-h-9
                  shrink-0
                  items-center
                  gap-1.5
                  rounded-lg
                  border
                  px-3
                  text-xs
                  font-semibold
                `,

                advancedFilterCount
                  ? `
                      border-blue-300
                      bg-blue-50
                      text-blue-700
                    `
                  : `
                      border-slate-300
                      bg-white
                      text-slate-700
                    `,
              ].join(" ")}
            >
              <Filter size={14} />

              <span className="hidden sm:inline">Filters</span>

              {advancedFilterCount > 0 && (
                <span className="rounded-full bg-blue-600 px-1.5 py-0.5 text-[9px] font-bold text-white">
                  {advancedFilterCount}
                </span>
              )}

              <ChevronDown size={13} />
            </button>

            <button
              type="button"
              onClick={clearFilters}
              className="hidden min-h-9 shrink-0 rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 sm:block"
            >
              Clear
            </button>
          </div>

          {/* ADVANCED FILTERS */}

          {filtersOpen && (
            <div className="mt-2 grid grid-cols-1 gap-2 border-t border-slate-100 pt-2 sm:grid-cols-3">
              <input
                value={position}
                onChange={(event) => {
                  setPosition(event.target.value);

                  setPage(0);
                }}
                placeholder="Position..."
                className="min-h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-blue-500"
              />

              <select
                value={partyFilter}
                onChange={(event) => {
                  setPartyFilter(event.target.value);

                  setPage(0);
                }}
                className="min-h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm"
              >
                <option value="">All parties</option>

                <option value={PARTY_FILTER_INDEPENDENT}>Independent</option>

                {parties.map((party) => (
                  <option key={party.partyId} value={party.partyId}>
                    {party.partyName} ({party.abbreviation})
                  </option>
                ))}
              </select>

              <select
                value={active}
                onChange={(event) => {
                  setActive(event.target.value as "" | "true" | "false");

                  setPage(0);
                }}
                className="min-h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm"
              >
                <option value="">All status</option>

                <option value="true">Active</option>

                <option value="false">Inactive</option>
              </select>

              <button
                type="button"
                onClick={clearFilters}
                className="min-h-10 rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 sm:hidden"
              >
                Clear Filters
              </button>
            </div>
          )}
        </section>

        {/* ================================================================
            ERROR
        ================================================================ */}

        {candidatesQuery.isError && (
          <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">
            <AlertCircle size={17} />

            {friendlyError(candidatesQuery.error)}
          </div>
        )}

        {/* ================================================================
            WORKSPACE
        ================================================================ */}

        <div className="grid items-start gap-3 xl:grid-cols-[minmax(0,1fr)_270px]">
          {/* CANDIDATE LIST */}

          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            {/* DESKTOP HEADER */}

            <div className="hidden grid-cols-[minmax(180px,1fr)_130px_minmax(150px,1fr)_80px_80px_140px_125px] gap-3 border-b border-slate-200 bg-slate-50 px-4 py-2 text-[10px] font-bold uppercase tracking-wide text-slate-500 md:grid">
              <div>Candidate</div>

              <div>Position</div>

              <div>Party</div>

              <div className="text-center">Indep.</div>

              <div className="text-center">Active</div>

              <div>Created</div>

              <div className="text-right">Actions</div>
            </div>

            {candidatesQuery.isLoading ? (
              <div className="px-4 py-10 text-center text-sm text-slate-500">
                <RefreshCw
                  size={20}
                  className="mx-auto animate-spin text-blue-600"
                />

                <div className="mt-2">Loading candidates...</div>
              </div>
            ) : candidates.length === 0 ? (
              <div className="px-4 py-10 text-center text-sm text-slate-500">
                <UserRound size={28} className="mx-auto text-slate-300" />

                <div className="mt-2 font-semibold">No candidates found.</div>
              </div>
            ) : (
              candidates.map((candidate) => {
                const selected =
                  selectedCandidate?.candidateId === candidate.candidateId;

                const deleting =
                  deleteMutation.isPending &&
                  deleteMutation.variables?.candidateId ===
                    candidate.candidateId;

                const independent = getIndependentValue(candidate);

                const activeValue = getActiveValue(candidate);

                const partyLabel = independent
                  ? "Independent"
                  : candidate.partyName
                    ? `${candidate.partyName}${
                        candidate.abbreviation
                          ? ` (${candidate.abbreviation})`
                          : ""
                      }`
                    : "—";

                return (
                  <div
                    key={candidate.candidateId}
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedCandidate(candidate)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        setSelectedCandidate(candidate);
                      }
                    }}
                    className={`cursor-pointer border-b border-slate-100 px-3 py-2.5 last:border-b-0 sm:px-4 ${
                      selected
                        ? "bg-violet-50/70 ring-1 ring-inset ring-violet-200"
                        : "hover:bg-slate-50"
                    }`}
                  >
                    {/* MOBILE */}

                    <div className="flex items-center gap-2.5 md:hidden">
                      <div className="min-w-0 flex-1">
                        <div className="flex min-w-0 items-center gap-1.5">
                          <div className="truncate text-sm font-bold text-slate-900">
                            {candidate.fullName}
                          </div>

                          {candidate.photoUrl && (
                            <ImageIcon
                              size={11}
                              className="shrink-0 text-violet-600"
                            />
                          )}
                        </div>

                        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-slate-500">
                          <span className="font-semibold text-slate-600">
                            {candidate.position || "No position"}
                          </span>

                          <span>•</span>

                          <span className="truncate">{partyLabel}</span>

                          {!activeValue && (
                            <span className="rounded bg-slate-100 px-1.5 py-0.5 font-semibold text-slate-500">
                              Inactive
                            </span>
                          )}
                        </div>
                      </div>

                      {canEdit && (
                        <div
                          className="flex shrink-0 gap-1"
                          onClick={(event) => event.stopPropagation()}
                        >
                          <button
                            type="button"
                            onClick={() => openEdit(candidate)}
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-blue-200 bg-blue-50 text-blue-700"
                            aria-label="Edit candidate"
                          >
                            <Pencil size={14} />
                          </button>

                          <button
                            type="button"
                            disabled={deleting}
                            onClick={() => removeCandidate(candidate)}
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-red-200 bg-red-50 text-red-600 disabled:opacity-50"
                            aria-label="Delete candidate"
                          >
                            {deleting ? (
                              <RefreshCw size={13} className="animate-spin" />
                            ) : (
                              <Trash2 size={14} />
                            )}
                          </button>
                        </div>
                      )}

                      <ChevronRight
                        size={16}
                        className="shrink-0 text-slate-400"
                      />
                    </div>

                    {/* DESKTOP */}

                    <div className="hidden grid-cols-[minmax(180px,1fr)_130px_minmax(150px,1fr)_80px_80px_140px_125px] items-center gap-3 md:grid">
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="truncate text-sm font-bold text-slate-900">
                          {candidate.fullName}
                        </span>

                        {candidate.photoUrl && (
                          <ImageIcon
                            size={13}
                            className="shrink-0 text-violet-600"
                          />
                        )}
                      </div>

                      <div className="truncate text-xs font-semibold text-slate-700">
                        {candidate.position || "—"}
                      </div>

                      <div className="truncate text-xs text-slate-700">
                        {partyLabel}
                      </div>

                      <div className="text-center">
                        {independent ? "✓" : "—"}
                      </div>

                      <div className="text-center">
                        <span
                          className={`inline-flex h-2.5 w-2.5 rounded-full ${
                            activeValue ? "bg-emerald-500" : "bg-slate-300"
                          }`}
                        />
                      </div>

                      <div className="text-[11px] text-slate-600">
                        {formatDate(candidate.dateCreated)}
                      </div>

                      <div
                        className="flex justify-end gap-1.5"
                        onClick={(event) => event.stopPropagation()}
                      >
                        {canEdit && (
                          <>
                            <button
                              type="button"
                              onClick={() => openEdit(candidate)}
                              className="inline-flex min-h-8 items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2 text-[11px] font-semibold text-blue-700"
                            >
                              <Pencil size={12} />
                              Edit
                            </button>

                            <button
                              type="button"
                              disabled={deleting}
                              onClick={() => removeCandidate(candidate)}
                              className="inline-flex min-h-8 items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2 text-[11px] font-semibold text-red-700 disabled:opacity-50"
                            >
                              <Trash2 size={12} />
                              Delete
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}

            {/* PAGINATION */}

            <div className="flex items-center justify-between gap-2 border-t border-slate-200 bg-slate-50 px-3 py-2.5 sm:px-4">
              <div className="text-xs font-semibold text-slate-500">
                Page <strong className="text-slate-800">{page + 1}</strong> of{" "}
                <strong className="text-slate-800">{totalPages}</strong>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={page <= 0}
                  onClick={() => setPage((current) => Math.max(0, current - 1))}
                  className="min-h-8 rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 disabled:opacity-40"
                >
                  Previous
                </button>

                <button
                  type="button"
                  disabled={page >= totalPages - 1}
                  onClick={() => setPage((current) => current + 1)}
                  className="min-h-8 rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          </section>

          {/* ==============================================================
              DESKTOP PHOTO PREVIEW
          ============================================================== */}

          <aside className="hidden xl:block">
            <section className="sticky top-3 overflow-hidden rounded-2xl border border-slate-200 bg-white">
              <div className="border-b border-slate-200 bg-slate-50 px-3 py-2.5">
                <div className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                  Candidate Photo
                </div>
              </div>

              <div className="p-3">
                <div className="flex h-64 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                  {!selectedCandidate ? (
                    <div className="text-center text-slate-400">
                      <ImageIcon size={30} className="mx-auto" />

                      <div className="mt-2 text-xs font-semibold">
                        Select a candidate
                      </div>
                    </div>
                  ) : selectedFilesQuery.isLoading ||
                    selectedPhotoQuery.isLoading ? (
                    <RefreshCw
                      size={22}
                      className="animate-spin text-slate-400"
                    />
                  ) : selectedPhotoQuery.isError ? (
                    <div className="text-center text-red-500">
                      <AlertCircle size={25} className="mx-auto" />

                      <div className="mt-2 text-xs font-semibold">
                        Unable to load photo
                      </div>
                    </div>
                  ) : selectedPhotoSrc ? (
                    <img
                      src={selectedPhotoSrc}
                      alt={`${selectedCandidate.fullName} photo`}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="text-center text-slate-400">
                      <ImageIcon size={30} className="mx-auto" />

                      <div className="mt-2 text-xs font-semibold">No photo</div>
                    </div>
                  )}
                </div>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}

// src/pages/elections/workspace/tabs/setup/masters/PartiesMasterTab.tsx

import { useEffect, useMemo, useState } from "react";

import { useNavigate, useParams } from "react-router-dom";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  AlertCircle,
  ChevronRight,
  ImageIcon,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Users,
} from "lucide-react";

import { useAuthStore } from "../../../../../../shared/store/authStore";

import { ReadOnlyBanner, Badge } from "../../../../shared/elections-ui";

import {
  deleteParty,
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

function friendlyError(error: any) {
  return (
    error?.response?.data?.message ??
    error?.response?.data?.error ??
    error?.message ??
    "Something went wrong."
  );
}

function formatDate(value: string | null | undefined) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function PartiesMasterTab() {
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
    dashboardMode === "SYSTEM" || dashboardMode === "NEC" || isSystemAdmin;

  // ==========================================================================
  // STATE
  // ==========================================================================

  const [search, setSearch] = useState("");

  const [page, setPage] = useState(0);

  const [selectedParty, setSelectedParty] = useState<PartyDto | null>(null);

  const [selectedLogoSrc, setSelectedLogoSrc] = useState<string | null>(null);

  const size = 20;

  // ==========================================================================
  // PARTY QUERY
  // ==========================================================================

  const partiesQuery = useQuery({
    queryKey: ["party-master", page, search],

    queryFn: () =>
      searchParties({
        page,

        size,

        q: search.trim() || undefined,
      }),

    staleTime: 10_000,

    retry: 1,
  });

  const parties = useMemo(
    () => partiesQuery.data?.items ?? [],

    [partiesQuery.data],
  );

  const totalPages = Math.max(
    1,

    partiesQuery.data?.totalPages ?? 1,
  );

  // ==========================================================================
  // SELECTED PARTY FILES
  // ==========================================================================

  const selectedFilesQuery = useQuery({
    enabled: Boolean(selectedParty && currentOrgId),

    queryKey: ["file-uploads", "party", selectedParty?.partyId, currentOrgId],

    queryFn: () =>
      listEntityFiles({
        orgId: currentOrgId!,

        relatedTable: "party",

        relatedId: selectedParty!.partyId,
      }),

    staleTime: 10_000,

    retry: 1,
  });

  const selectedPhoto = useMemo(
    () =>
      findCurrentPhoto(
        selectedFilesQuery.data,

        selectedParty?.logoUrl ?? null,
      ),

    [selectedFilesQuery.data, selectedParty?.logoUrl],
  );

  // ==========================================================================
  // AUTHENTICATED LOGO CONTENT
  // ==========================================================================

  const selectedLogoQuery = useQuery({
    enabled: Boolean(selectedPhoto?.fileId),

    queryKey: ["file-content", selectedPhoto?.fileId],

    queryFn: () => fetchFileBlob(selectedPhoto!.fileId),

    staleTime: 60_000,

    retry: 1,
  });

  useEffect(() => {
    setSelectedLogoSrc(null);

    if (!selectedLogoQuery.data) {
      return;
    }

    const objectUrl = URL.createObjectURL(selectedLogoQuery.data);

    setSelectedLogoSrc(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [selectedLogoQuery.data]);

  // ==========================================================================
  // REFRESH
  // ==========================================================================

  const refreshNow = async () => {
    await queryClient.invalidateQueries({
      queryKey: ["party-master"],
    });

    await queryClient.invalidateQueries({
      queryKey: ["file-uploads", "party"],
    });

    await queryClient.invalidateQueries({
      queryKey: ["file-content"],
    });

    await partiesQuery.refetch();

    if (selectedParty && currentOrgId) {
      await selectedFilesQuery.refetch();
    }
  };

  // ==========================================================================
  // DELETE
  // ==========================================================================

  const deleteMutation = useMutation({
    mutationFn: async (party: PartyDto) => deleteParty(party.partyId),

    onSuccess: async (_, deleted) => {
      if (selectedParty?.partyId === deleted.partyId) {
        setSelectedParty(null);
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

    navigate(`/elections/${electionId}/setup/master-parties/new`);
  };

  const openEdit = (party: PartyDto) => {
    if (!electionId) {
      return;
    }

    navigate(
      `/elections/${electionId}/setup/master-parties/${party.partyId}/edit`,

      {
        state: {
          party,
        },
      },
    );
  };

  const removeParty = (party: PartyDto) => {
    if (!canEdit) {
      return;
    }

    const confirmed = window.confirm(
      `Delete party "${party.partyName}" (${party.abbreviation})?\n\nThis deletes the global Party Master record.`,
    );

    if (confirmed) {
      deleteMutation.mutate(party);
    }
  };

  // ==========================================================================
  // RENDER
  // ==========================================================================

  return (
    <div className="w-full">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-3">
        {!canEdit && (
          <ReadOnlyBanner
            reason="Global Party Master records are managed by NEC/System Admin."
            sources={["party"]}
          />
        )}

        {/* ================================================================
            HEADER
        ================================================================ */}

        <section className="rounded-2xl border border-slate-200 bg-white p-3 sm:p-4">
          <div className="grid grid-cols-[minmax(0,1fr)_104px] gap-3 sm:flex sm:items-center sm:justify-between">
            {/* LEFT */}

            <div className="min-w-0">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-700">
                  <Users size={17} />
                </div>

                <div className="min-w-0">
                  <h2 className="text-base font-bold text-slate-900 sm:text-lg">
                    Party Master
                  </h2>

                  <p className="mt-0.5 text-xs text-slate-500">
                    Manage master parties and their logos.
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
                    Add Party
                  </button>
                ) : (
                  <Badge text="Read-only" />
                )}

                <button
                  type="button"
                  onClick={refreshNow}
                  disabled={partiesQuery.isFetching}
                  className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  <RefreshCw
                    size={15}
                    className={partiesQuery.isFetching ? "animate-spin" : ""}
                  />
                  Refresh
                </button>
              </div>
            </div>

            {/* ============================================================
                MOBILE LOGO PREVIEW
            ============================================================ */}

            <div className="sm:hidden">
              <div
                className={`flex h-[92px] w-[104px] items-center justify-center overflow-hidden rounded-xl border ${
                  selectedParty
                    ? "border-violet-200 bg-violet-50/30"
                    : "border-slate-200 bg-slate-50"
                }`}
              >
                {!selectedParty ? (
                  <div className="text-center text-slate-400">
                    <ImageIcon size={22} className="mx-auto" />

                    <div className="mt-1 text-[9px] font-semibold">
                      Select party
                    </div>
                  </div>
                ) : selectedFilesQuery.isLoading ||
                  selectedLogoQuery.isLoading ? (
                  <RefreshCw
                    size={18}
                    className="animate-spin text-slate-400"
                  />
                ) : selectedLogoQuery.isError ? (
                  <div className="text-center text-red-400">
                    <AlertCircle size={20} className="mx-auto" />

                    <div className="mt-1 text-[9px] font-semibold">Error</div>
                  </div>
                ) : selectedLogoSrc ? (
                  <img
                    src={selectedLogoSrc}
                    alt={`${selectedParty.partyName ?? "Party"} logo`}
                    className="h-full w-full object-contain p-2"
                  />
                ) : (
                  <div className="text-center text-slate-400">
                    <ImageIcon size={22} className="mx-auto" />

                    <div className="mt-1 text-[9px] font-semibold">No logo</div>
                  </div>
                )}
              </div>
            </div>

            {/* ============================================================
                DESKTOP ACTIONS
            ============================================================ */}

            <div className="hidden flex-wrap gap-2 sm:flex">
              {canEdit ? (
                <button
                  type="button"
                  onClick={openCreate}
                  className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-3 text-xs font-bold text-white hover:bg-blue-700 sm:text-sm"
                >
                  <Plus size={15} />
                  Add Party
                </button>
              ) : (
                <Badge text="Read-only" />
              )}

              <button
                type="button"
                onClick={refreshNow}
                disabled={partiesQuery.isFetching}
                className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                <RefreshCw
                  size={15}
                  className={partiesQuery.isFetching ? "animate-spin" : ""}
                />
                Refresh
              </button>
            </div>
          </div>
        </section>

        {/* ================================================================
            SEARCH
        ================================================================ */}

        <section className="rounded-2xl border border-slate-200 bg-white p-2.5">
          <div className="flex gap-2">
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
                placeholder="Search party name or abbreviation..."
                className="min-h-9 w-full rounded-lg border border-slate-300 py-1.5 pl-9 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <button
              type="button"
              onClick={() => {
                setSearch("");

                setPage(0);
              }}
              className="min-h-9 shrink-0 rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Clear
            </button>
          </div>
        </section>

        {/* ================================================================
            ERROR
        ================================================================ */}

        {partiesQuery.isError && (
          <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">
            <AlertCircle size={17} className="mt-0.5 shrink-0" />

            {friendlyError(partiesQuery.error)}
          </div>
        )}

        {/* ================================================================
            WORKSPACE
        ================================================================ */}

        <div className="grid items-start gap-3 xl:grid-cols-[minmax(0,1fr)_270px]">
          {/* ==============================================================
              PARTY LIST
          ============================================================== */}

          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            {/* DESKTOP HEADER */}

            <div className="hidden grid-cols-[minmax(220px,1fr)_80px_145px_145px_125px] gap-3 border-b border-slate-200 bg-slate-50 px-4 py-2 text-[10px] font-bold uppercase tracking-wide text-slate-500 md:grid">
              <div>Party</div>

              <div>Abbrev</div>

              <div>Date Created</div>

              <div>Date Updated</div>

              <div className="text-right">Actions</div>
            </div>

            {/* LOADING */}

            {partiesQuery.isLoading ? (
              <div className="px-4 py-10 text-center text-sm text-slate-500">
                <RefreshCw
                  size={20}
                  className="mx-auto animate-spin text-blue-600"
                />

                <div className="mt-2">Loading parties…</div>
              </div>
            ) : parties.length === 0 ? (
              <div className="px-4 py-10 text-center text-sm text-slate-500">
                <Users size={28} className="mx-auto text-slate-300" />

                <div className="mt-2 font-semibold">No parties found.</div>
              </div>
            ) : (
              parties.map((party) => {
                const selected = selectedParty?.partyId === party.partyId;

                const deleting =
                  deleteMutation.isPending &&
                  deleteMutation.variables?.partyId === party.partyId;

                return (
                  <div
                    key={party.partyId}
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedParty(party)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        setSelectedParty(party);
                      }
                    }}
                    className={`cursor-pointer border-b border-slate-100 px-3 py-2.5 transition last:border-b-0 sm:px-4 ${
                      selected
                        ? "bg-violet-50/70 ring-1 ring-inset ring-violet-200"
                        : "hover:bg-slate-50"
                    }`}
                  >
                    {/* ====================================================
                          MOBILE
                      ==================================================== */}

                    <div className="flex items-center gap-2.5 md:hidden">
                      <div className="min-w-0 flex-1">
                        <div className="flex min-w-0 items-center gap-1.5">
                          <div className="truncate text-sm font-bold text-slate-900">
                            {party.partyName ?? "Unnamed Party"}
                          </div>

                          {party.logoUrl && (
                            <ImageIcon
                              size={11}
                              className="shrink-0 text-violet-600"
                            />
                          )}
                        </div>

                        <div className="mt-0.5 flex min-w-0 items-center gap-2 text-[10px] text-slate-500">
                          <span className="shrink-0 font-bold text-slate-600">
                            {party.abbreviation ?? "—"}
                          </span>

                          <span className="truncate">
                            Created {formatDate(party.dateCreated)}
                          </span>
                        </div>
                      </div>

                      {canEdit && (
                        <div
                          className="flex shrink-0 gap-1"
                          onClick={(event) => event.stopPropagation()}
                        >
                          <button
                            type="button"
                            onClick={() => openEdit(party)}
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-blue-200 bg-blue-50 text-blue-700"
                            aria-label="Edit party"
                          >
                            <Pencil size={14} />
                          </button>

                          <button
                            type="button"
                            disabled={deleting}
                            onClick={() => removeParty(party)}
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-red-200 bg-red-50 text-red-600 disabled:opacity-50"
                            aria-label="Delete party"
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

                    {/* ====================================================
                          DESKTOP
                      ==================================================== */}

                    <div className="hidden grid-cols-[minmax(220px,1fr)_80px_145px_145px_125px] items-center gap-3 md:grid">
                      <div className="flex min-w-0 items-center gap-2">
                        <div className="truncate text-sm font-bold text-slate-900">
                          {party.partyName ?? "Unnamed Party"}
                        </div>

                        {party.logoUrl && (
                          <ImageIcon
                            size={13}
                            className="shrink-0 text-violet-600"
                          />
                        )}
                      </div>

                      <div className="text-xs font-semibold text-slate-700">
                        {party.abbreviation ?? "—"}
                      </div>

                      <div className="text-[11px] font-medium text-slate-600">
                        {formatDate(party.dateCreated)}
                      </div>

                      <div className="text-[11px] font-medium text-slate-600">
                        {formatDate(party.dateUpdated)}
                      </div>

                      <div
                        className="flex justify-end gap-1.5"
                        onClick={(event) => event.stopPropagation()}
                      >
                        {canEdit && (
                          <>
                            <button
                              type="button"
                              onClick={() => openEdit(party)}
                              className="inline-flex min-h-8 items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2 text-[11px] font-semibold text-blue-700 hover:bg-blue-100"
                            >
                              <Pencil size={12} />
                              Edit
                            </button>

                            <button
                              type="button"
                              onClick={() => removeParty(party)}
                              disabled={deleting}
                              className="inline-flex min-h-8 items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2 text-[11px] font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50"
                            >
                              {deleting ? (
                                <RefreshCw size={12} className="animate-spin" />
                              ) : (
                                <Trash2 size={12} />
                              )}
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

            {/* ================================================================
                PAGINATION
            ================================================================ */}

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
              DESKTOP LOGO PREVIEW
          ============================================================== */}

          <aside className="hidden xl:block">
            <section className="sticky top-3 overflow-hidden rounded-2xl border border-slate-200 bg-white">
              <div className="border-b border-slate-200 bg-slate-50 px-3 py-2.5">
                <div className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                  Party Logo
                </div>
              </div>

              <div className="p-3">
                <div className="flex h-48 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                  {!selectedParty ? (
                    <div className="text-center text-slate-400">
                      <ImageIcon size={30} className="mx-auto" />

                      <div className="mt-2 text-xs font-semibold">
                        Select a party
                      </div>
                    </div>
                  ) : selectedFilesQuery.isLoading ||
                    selectedLogoQuery.isLoading ? (
                    <RefreshCw
                      size={22}
                      className="animate-spin text-slate-400"
                    />
                  ) : selectedLogoQuery.isError ? (
                    <div className="px-3 text-center text-red-500">
                      <AlertCircle size={26} className="mx-auto" />

                      <div className="mt-2 text-xs font-semibold">
                        Unable to load logo
                      </div>
                    </div>
                  ) : selectedLogoSrc ? (
                    <img
                      src={selectedLogoSrc}
                      alt={`${selectedParty.partyName ?? "Party"} logo`}
                      className="h-full w-full object-contain p-3"
                    />
                  ) : (
                    <div className="text-center text-slate-400">
                      <ImageIcon size={30} className="mx-auto" />

                      <div className="mt-2 text-xs font-semibold">No logo</div>
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

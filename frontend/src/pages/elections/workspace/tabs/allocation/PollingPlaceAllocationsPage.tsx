// src/pages/elections/workspace/tabs/allocation/pollingPlaceAllocation.tsx

// // ✅ Updated to use YOUR existing pollingPlaceService shape (code/label/placeNumber, county/district/center filters)
// // ✅ Same UX + pattern as Center Allocation:
// // - SYSTEM + NEC + isSystemAdmin can CRUD; tenants read-only
// // - Filters: County → District → Center (dependent dropdowns)
// // - Create: County → District → Center → Place (dependent dropdowns)
// // - Create place dropdown shows CLEAN label (no long code)


import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Pencil,
  Trash2,
  RefreshCw,
  FilterX,
  Plus,
  X,
  AlertCircle,
} from "lucide-react";

import { useAuthStore } from "../../../../../shared/store/authStore";
import {
  SimpleTable,
  PlaceholderNote,
  Badge,
} from "../../../shared/elections-ui";

import {
  searchPlaceAllocations,
  createPlaceAllocation,
  updatePlaceAllocation,
  deletePlaceAllocation,
  type PollingPlaceAllocationDto,
  type PollingPlaceAllocationCreateRequest,
  type PollingPlaceAllocationUpdateRequest,
} from "../../../../../shared/services/pollingPlaceAllocationService";

import {
  fetchCounties,
  type CountyDto,
} from "../../../../../shared/services/countyService";

import {
  fetchDistricts,
  type DistrictDto,
} from "../../../../../shared/services/districtService";

import {
  fetchPollingCenters,
  type PollingCenterDto,
} from "../../../../../shared/services/pollingCenterService";

import {
  fetchPollingPlaces,
  type PollingPlaceDto,
} from "../../../../../shared/services/pollingPlaceService";

/** ============ HELPERS ============ */
function safeStr(v: any) {
  return typeof v === "string" ? v : v == null ? "" : String(v);
}

function friendlySaveError(err: any): string {
  return (
    safeStr(err?.response?.data?.message) ||
    safeStr(err?.response?.data?.error) ||
    safeStr(err?.message) ||
    "Failed to save."
  );
}

function placeDisplay(p: PollingPlaceDto) {
  const label = (p.label ?? "").trim();
  if (label) return label;
  if (p.placeNumber != null) return `Place #${p.placeNumber}`;
  const code = (p.code ?? "").trim();
  return code || p.placeId;
}

/** ============ MAIN COMPONENT ============ */
export default function PollingPlaceAllocationsPage() {
  const { electionId } = useParams<{ electionId: string }>();

  const dashboardMode = useAuthStore((s) => s.dashboardMode);
  const isSystemAdmin = useAuthStore((s) => s.isSystemAdmin());
  const canEdit =
    dashboardMode === "SYSTEM" || dashboardMode === "NEC" || isSystemAdmin;

  const qc = useQueryClient();

  const [page, setPage] = useState(0);
  const size = 20;

  /** ============ FILTERS (TABLE) ============ */
  const [fCountyId, setFCountyId] = useState("");
  const [fDistrictId, setFDistrictId] = useState("");
  const [fCenterId, setFCenterId] = useState("");

  const changeCountyFilter = (next: string) => {
    setFCountyId(next);
    setFDistrictId("");
    setFCenterId("");
    setPage(0);
  };

  const changeDistrictFilter = (next: string) => {
    setFDistrictId(next);
    setFCenterId("");
    setPage(0);
  };

  const changeCenterFilter = (next: string) => {
    setFCenterId(next);
    setPage(0);
  };

  /** ============ CREATE/EDIT MODALS ============ */
  const [openCreate, setOpenCreate] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [editing, setEditing] = useState<PollingPlaceAllocationDto | null>(
    null
  );

  // Create dropdowns: County → District → Center → Place
  const [cCountyId, setCCountyId] = useState("");
  const [cDistrictId, setCDistrictId] = useState("");
  const [cCenterId, setCCenterId] = useState("");
  const [cPlaceId, setCPlaceId] = useState("");

  const [registeredVoters, setRegisteredVoters] = useState<number | "">("");
  const [ballotsIssued, setBallotsIssued] = useState<number | "">("");

  /** ============ LOOKUP QUERIES ============ */
  const countiesQ = useQuery({
    queryKey: ["counties", "master"],
    queryFn: async () => {
      const page = await fetchCounties({ page: 0, size: 500 });
      return page.items as CountyDto[];
    },
    staleTime: 60_000,
    retry: 1,
  });

  const districtsFilterQ = useQuery({
    enabled: Boolean(fCountyId),
    queryKey: ["districts", "master", "filter", fCountyId],
    queryFn: async () => {
      const page = await fetchDistricts({
        page: 0,
        size: 2000,
        countyId: fCountyId,
      });
      return page.items as DistrictDto[];
    },
    staleTime: 60_000,
    retry: 1,
  });

  const centersFilterQ = useQuery({
    enabled: Boolean(fCountyId) && Boolean(fDistrictId),
    queryKey: ["polling-centers", "master", "filter", fCountyId, fDistrictId],
    queryFn: async () => {
      const page = await fetchPollingCenters({
        page: 0,
        size: 5000,
        countyId: fCountyId,
        districtId: fDistrictId,
      });
      return page.items as PollingCenterDto[];
    },
    staleTime: 60_000,
    retry: 1,
  });

  const districtsCreateQ = useQuery({
    enabled: openCreate && Boolean(cCountyId),
    queryKey: ["districts", "master", "create", cCountyId],
    queryFn: async () => {
      const page = await fetchDistricts({
        page: 0,
        size: 2000,
        countyId: cCountyId,
      });
      return page.items as DistrictDto[];
    },
    staleTime: 60_000,
    retry: 1,
  });

  const centersCreateQ = useQuery({
    enabled: openCreate && Boolean(cCountyId) && Boolean(cDistrictId),
    queryKey: ["polling-centers", "master", "create", cCountyId, cDistrictId],
    queryFn: async () => {
      const page = await fetchPollingCenters({
        page: 0,
        size: 5000,
        countyId: cCountyId,
        districtId: cDistrictId,
      });
      return page.items as PollingCenterDto[];
    },
    staleTime: 60_000,
    retry: 1,
  });

  const placesCreateQ = useQuery({
    enabled: openCreate && Boolean(cCenterId),
    queryKey: [
      "polling-places",
      "master",
      "create",
      cCountyId,
      cDistrictId,
      cCenterId,
    ],
    queryFn: async () => {
      const page = await fetchPollingPlaces({
        page: 0,
        size: 5000,
        countyId: cCountyId || undefined,
        districtId: cDistrictId || undefined,
        centerId: cCenterId,
        active: true,
      });
      return page.items as PollingPlaceDto[];
    },
    staleTime: 60_000,
    retry: 1,
  });

  /** ============ ALLOCATIONS QUERY ============ */
  const placeAllocQ = useQuery({
    enabled: Boolean(electionId),
    queryKey: [
      "polling-place-allocations",
      electionId,
      page,
      size,
      fCountyId,
      fDistrictId,
      fCenterId,
    ],
    queryFn: () =>
      searchPlaceAllocations({
        electionId: electionId!,
        centerId: fCenterId || undefined,
        page,
        size,
      }),
    staleTime: 10_000,
    retry: 1,
  });

  const refreshNow = async () => {
    if (!electionId) return;
    await qc.invalidateQueries({
      queryKey: ["polling-place-allocations", electionId],
    });
    await placeAllocQ.refetch();
  };

  /** ============ MUTATIONS ============ */
  const createM = useMutation({
    mutationFn: async (req: PollingPlaceAllocationCreateRequest) =>
      createPlaceAllocation(req),
    onSuccess: async () => {
      setOpenCreate(false);
      setPage(0);
      await refreshNow();
    },
  });

  const updateM = useMutation({
    mutationFn: async (payload: {
      id: string;
      req: PollingPlaceAllocationUpdateRequest;
    }) => updatePlaceAllocation(payload.id, payload.req),
    onSuccess: async () => {
      setOpenEdit(false);
      setEditing(null);
      await refreshNow();
    },
  });

  const deleteM = useMutation({
    mutationFn: async (id: string) => deletePlaceAllocation(id),
    onSuccess: refreshNow,
  });

  /** ============ STATE ============ */
  const pageData = placeAllocQ.data;
  const items = pageData?.items ?? [];
  const savingCreate = createM.isPending;
  const savingUpdate = updateM.isPending;

  /** ============ TABLE ROWS ============ */
  const rows = useMemo(() => {
    if (!items.length)
      return [["No place allocations found.", "", "", "", "", ""]];

    return items.map((p) => [
      p.centerName ?? "—",
      p.centerCode ?? "—",
      p.placeLabel ?? p.placeCode ?? p.placeId ?? "—",
      String(p.registeredVoters ?? 0),
      p.ballotsIssued != null ? String(p.ballotsIssued) : "—",
      <div key={p.placeAllocationId} className="flex flex-wrap gap-2">
        <button
          type="button"
          title={canEdit ? "Edit (SYSTEM/NEC)" : "Read-only"}
          onClick={() => {
            if (!canEdit) return;
            setEditing(p);
            setRegisteredVoters(p.registeredVoters);
            setBallotsIssued(p.ballotsIssued ?? "");
            setOpenEdit(true);
          }}
          disabled={!canEdit}
          className={`inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-blue-600 hover:bg-blue-50 transition ${
            !canEdit ? "opacity-60" : ""
          }`}
        >
          <Pencil size={18} />
        </button>

        <button
          type="button"
          title={canEdit ? "Delete (SYSTEM/NEC)" : "Read-only"}
          onClick={() => {
            if (!canEdit) return;
            const ok = window.confirm(
              `Delete place allocation "${
                p.placeLabel ?? p.placeCode ?? p.placeId
              }"? This is permanent.`
            );
            if (ok) deleteM.mutate(p.placeAllocationId);
          }}
          disabled={!canEdit || deleteM.isPending}
          className={`inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-red-600 hover:bg-red-50 transition ${
            !canEdit || deleteM.isPending ? "opacity-60" : ""
          }`}
        >
          <Trash2 size={18} />
        </button>
      </div>,
    ]);
  }, [items, canEdit, deleteM.isPending]);

  if (!electionId) {
    return (
      <div className="p-3 rounded-xl border border-slate-200 bg-white">
        <div className="font-extrabold text-slate-800">
          Polling Place Allocations
        </div>
        <div className="text-sm text-slate-600 mt-1">
          Missing <b>electionId</b> in route params.
        </div>
      </div>
    );
  }

  /** ============ RENDER ============ */
  return (
    <div className="flex flex-col gap-3">
      {/* ============ HEADER ACTIONS ============ */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div />
        <div className="flex items-center gap-2">
          {canEdit ? (
            <button
              type="button"
              onClick={() => {
                setCCountyId("");
                setCDistrictId("");
                setCCenterId("");
                setCPlaceId("");
                setRegisteredVoters("");
                setBallotsIssued("");
                setOpenCreate(true);
              }}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-600 text-white font-bold hover:bg-blue-700 transition shadow-sm"
            >
              <Plus size={16} className="text-red-500" />
              Place Allocation
            </button>
          ) : (
            <Badge text="Read-only (Tenant)" />
          )}

          <button
            type="button"
            onClick={refreshNow}
            disabled={placeAllocQ.isFetching}
            className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition ${
              placeAllocQ.isFetching ? "opacity-60" : ""
            }`}
          >
            <RefreshCw size={16} />
            Refresh
          </button>
        </div>
      </div>

      {/* ============ FILTERS CARD ============ */}
      <div className="w-full rounded-xl border border-slate-200 bg-white px-4 sm:px-6 py-4 sm:py-5">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 sm:gap-4">
          {/* County */}
          <div>
            <label className="block text-sm font-bold text-slate-900 mb-2">
              County
            </label>
            <select
              value={fCountyId}
              onChange={(e) => changeCountyFilter(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-slate-300 bg-white text-base text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
            >
              <option value="">All counties</option>
              {(countiesQ.data ?? []).map((c) => (
                <option key={c.countyId} value={c.countyId}>
                  {c.countyName}
                </option>
              ))}
            </select>
          </div>

          {/* District */}
          <div>
            <label className="block text-sm font-bold text-slate-900 mb-2">
              District
            </label>
            <select
              value={fDistrictId}
              onChange={(e) => changeDistrictFilter(e.target.value)}
              disabled={!fCountyId}
              className={`w-full px-3 py-2.5 rounded-lg border border-slate-300 bg-white text-base text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${
                !fCountyId ? "opacity-60 cursor-not-allowed" : ""
              }`}
            >
              <option value="">
                {fCountyId ? "All districts" : "Select county first"}
              </option>
              {(districtsFilterQ.data ?? []).map((d) => (
                <option key={d.districtId} value={d.districtId}>
                  {d.districtName}
                </option>
              ))}
            </select>
          </div>

          {/* Center */}
          <div>
            <label className="block text-sm font-bold text-slate-900 mb-2">
              Center
            </label>
            <select
              value={fCenterId}
              onChange={(e) => changeCenterFilter(e.target.value)}
              disabled={!fCountyId || !fDistrictId}
              className={`w-full px-3 py-2.5 rounded-lg border border-slate-300 bg-white text-base text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${
                !fCountyId || !fDistrictId ? "opacity-60 cursor-not-allowed" : ""
              }`}
            >
              <option value="">
                {fCountyId && fDistrictId
                  ? "All centers (select to filter)"
                  : "Select county + district first"}
              </option>
              {(centersFilterQ.data ?? []).map((c) => (
                <option key={c.centerId} value={c.centerId}>
                  {c.centerName}
                </option>
              ))}
            </select>
          </div>

          {/* Clear Button */}
          <div className="flex items-end">
            <button
              type="button"
              onClick={() => {
                setFCountyId("");
                setFDistrictId("");
                setFCenterId("");
                setPage(0);
              }}
              className="w-full inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-900 text-base font-semibold hover:bg-slate-50 transition"
            >
              <FilterX size={16} />
              Clear
            </button>
          </div>
        </div>
      </div>

      {/* ============ STATUS ============ */}
      {placeAllocQ.isLoading ? (
        <div className="p-3 text-slate-600">Loading place allocations…</div>
      ) : placeAllocQ.isError ? (
        <div className="p-3 rounded-lg border border-red-200 bg-red-50 text-red-700">
          {(placeAllocQ.error as any)?.message ??
            "Failed to load place allocations."}
        </div>
      ) : null}

      {/* ============ TABLE ============ */}
      <SimpleTable
        columns={[
          "Center",
          "Center Code",
          "Place",
          "Registered Voters",
          "Ballots Issued",
          "Actions",
        ]}
        rows={rows}
      />

      {/* ============ PAGINATION ============ */}
      <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
        <div className="flex gap-2 items-center">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={!pageData || page <= 0 || placeAllocQ.isFetching}
            className="px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-900 font-semibold hover:bg-slate-50 transition disabled:opacity-60"
          >
            Prev
          </button>

          <button
            type="button"
            onClick={() =>
              setPage((p) =>
                pageData && p + 1 < pageData.totalPages ? p + 1 : p
              )
            }
            disabled={
              !pageData ||
              pageData.page + 1 >= (pageData?.totalPages ?? 0) ||
              placeAllocQ.isFetching
            }
            className="px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-900 font-semibold hover:bg-slate-50 transition disabled:opacity-60"
          >
            Next
          </button>
        </div>

        <div className="text-sm text-slate-600 sm:text-right font-semibold">
          Page {pageData ? pageData.page + 1 : page + 1} /{" "}
          {pageData ? pageData.totalPages : "?"}
        </div>
      </div>

      {/* ============ NOTES ============ */}
      <div className="mt-1">
        <PlaceholderNote
          title="Notes"
          bullets={[
            "SYSTEM + NEC can create/edit/delete place allocations; tenants are read-only.",
            "Filters: County → District → Center (dependent dropdowns).",
            "Create form uses County → District → Center → Place to ensure correct linkage.",
          ]}
        />
      </div>

      {/* ============ CREATE MODAL ============ */}
      {openCreate ? (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/50 backdrop-blur-sm"
          onClick={() => {
            if (savingCreate) return;
            setOpenCreate(false);
          }}
        >
          <div
            className="w-full max-w-2xl bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[95vh] sm:max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* HEADER */}
            <div className="bg-gradient-to-r from-blue-600 via-blue-500 to-blue-400 px-4 sm:px-6 py-5 sm:py-6 border-b border-blue-600 flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
                  <Plus size={24} className="text-red-500 flex-shrink-0" />
                  Create Allocation
                </h2>
                <p className="text-xs sm:text-sm font-semibold text-blue-100 mt-1">
                  Select location, then provide voter data.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (savingCreate) return;
                  setOpenCreate(false);
                }}
                disabled={savingCreate}
                className="flex-shrink-0 h-9 w-9 flex items-center justify-center rounded-lg border-2 border-blue-300 hover:bg-blue-700 bg-blue-600 transition text-white disabled:opacity-50"
              >
                <X size={18} />
              </button>
            </div>

            {/* CONTENT */}
            <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 sm:py-5 space-y-4 sm:space-y-5">
              {/* LOCATION SECTION: County | District (top row), Center | Place (bottom row) */}
              <div className="space-y-3 bg-slate-50 p-4 rounded-lg border border-slate-200">
                <div className="text-sm font-bold text-slate-900">
                  📍 Location Selection
                </div>

                {/* Row 1: County & District */}
                <div className="grid grid-cols-2 gap-3">
                  {/* County */}
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-bold text-slate-900">
                      County <span className="text-red-600">*</span>
                    </label>
                    <select
                      value={cCountyId}
                      onChange={(e) => {
                        setCCountyId(e.target.value);
                        setCDistrictId("");
                        setCCenterId("");
                        setCPlaceId("");
                      }}
                      className="px-3 py-2 rounded-lg border border-slate-300 bg-white text-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                    >
                      <option value="">-- Select county --</option>
                      {(countiesQ.data ?? []).map((c) => (
                        <option key={c.countyId} value={c.countyId}>
                          {c.countyName}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* District */}
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-bold text-slate-900">
                      District <span className="text-red-600">*</span>
                    </label>
                    <select
                      value={cDistrictId}
                      onChange={(e) => {
                        setCDistrictId(e.target.value);
                        setCCenterId("");
                        setCPlaceId("");
                      }}
                      disabled={!cCountyId}
                      className={`px-3 py-2 rounded-lg border border-slate-300 bg-white text-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${
                        !cCountyId ? "opacity-50 cursor-not-allowed" : ""
                      }`}
                    >
                      <option value="">-- Select district --</option>
                      {(districtsCreateQ.data ?? []).map((d) => (
                        <option key={d.districtId} value={d.districtId}>
                          {d.districtName}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Row 2: Center & Place */}
                <div className="grid grid-cols-2 gap-3">
                  {/* Center */}
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-bold text-slate-900">
                      Center <span className="text-red-600">*</span>
                    </label>
                    <select
                      value={cCenterId}
                      onChange={(e) => {
                        setCCenterId(e.target.value);
                        setCPlaceId("");
                      }}
                      disabled={!cCountyId || !cDistrictId}
                      className={`px-3 py-2 rounded-lg border border-slate-300 bg-white text-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${
                        !cCountyId || !cDistrictId
                          ? "opacity-50 cursor-not-allowed"
                          : ""
                      }`}
                    >
                      <option value="">-- Select center --</option>
                      {(centersCreateQ.data ?? []).map((c) => (
                        <option key={c.centerId} value={c.centerId}>
                          {c.centerName}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Place */}
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-bold text-slate-900">
                      Place <span className="text-red-600">*</span>
                    </label>
                    <select
                      value={cPlaceId}
                      onChange={(e) => setCPlaceId(e.target.value)}
                      disabled={!cCenterId}
                      className={`px-3 py-2 rounded-lg border border-slate-300 bg-white text-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${
                        !cCenterId ? "opacity-50 cursor-not-allowed" : ""
                      }`}
                    >
                      <option value="">-- Select place --</option>
                      {(placesCreateQ.data ?? []).map((p) => (
                        <option key={p.placeId} value={p.placeId}>
                          {placeDisplay(p)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* VOTER DATA SECTION: Registered Voters & Ballots Issued */}
              <div className="space-y-3 bg-white p-4 rounded-lg border border-slate-200">
                <div className="text-sm font-bold text-slate-900">
                  👥 Voter Allocation Data
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Registered Voters */}
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-bold text-slate-900">
                      Registered Voters <span className="text-red-600">*</span>
                    </label>
                    <input
                      value={registeredVoters}
                      onChange={(e) => {
                        const v = e.target.value;
                        if (v === "") setRegisteredVoters("");
                        else {
                          const n = Number(v);
                          if (Number.isNaN(n)) return;
                          setRegisteredVoters(n);
                        }
                      }}
                      type="number"
                      min={0}
                      placeholder="e.g., 2500"
                      className="px-3 py-2.5 rounded-lg border border-slate-300 bg-white text-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                    />
                    {registeredVoters !== "" && (
                      <div className="text-xs text-slate-500">
                        {Number(registeredVoters).toLocaleString()} voters
                      </div>
                    )}
                  </div>

                  {/* Ballots Issued */}
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-bold text-slate-900">
                      Ballots Issued <span className="text-slate-400">(optional)</span>
                    </label>
                    <input
                      value={ballotsIssued}
                      onChange={(e) => {
                        const v = e.target.value;
                        if (v === "") setBallotsIssued("");
                        else {
                          const n = Number(v);
                          if (Number.isNaN(n)) return;
                          setBallotsIssued(n);
                        }
                      }}
                      type="number"
                      min={0}
                      placeholder="e.g., 2400"
                      className="px-3 py-2.5 rounded-lg border border-slate-300 bg-white text-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                    />
                    {ballotsIssued !== "" && registeredVoters !== "" && (
                      <div className={`text-xs font-semibold ${
                        Number(ballotsIssued) > Number(registeredVoters)
                          ? "text-red-600"
                          : "text-blue-600"
                      }`}>
                        {Number(ballotsIssued) > Number(registeredVoters)
                          ? `⚠️ Ballots > voters`
                          : `✓ ${(Number(registeredVoters) - Number(ballotsIssued)).toLocaleString()} unused`}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Error Message */}
              {createM.isError && (
                <div className="flex gap-3 rounded-lg bg-red-50 border border-red-200 p-3">
                  <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={18} />
                  <div className="text-sm text-red-700 font-semibold">
                    {friendlySaveError(createM.error)}
                  </div>
                </div>
              )}
            </div>

            {/* FOOTER */}
            <div className="border-t border-slate-200 bg-slate-50 px-4 sm:px-6 py-3 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-3">
              <button
                type="button"
                onClick={() => {
                  if (savingCreate) return;
                  setOpenCreate(false);
                }}
                disabled={savingCreate}
                className="px-4 h-9 rounded-lg border border-slate-300 bg-white text-slate-900 text-sm font-semibold hover:bg-slate-50 transition disabled:opacity-50 sm:min-w-fit"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={
                  !canEdit ||
                  savingCreate ||
                  !cCountyId ||
                  !cDistrictId ||
                  !cCenterId ||
                  !cPlaceId ||
                  registeredVoters === ""
                }
                onClick={() => {
                  if (!canEdit) return;
                  if (!cCountyId) return alert("County is required.");
                  if (!cDistrictId) return alert("District is required.");
                  if (!cCenterId) return alert("Center is required.");
                  if (!cPlaceId) return alert("Place is required.");
                  if (registeredVoters === "" || registeredVoters == null) {
                    return alert("Registered voters is required.");
                  }

                  const req: PollingPlaceAllocationCreateRequest = {
                    electionId: electionId!,
                    placeId: cPlaceId,
                    registeredVoters: Number(registeredVoters),
                    ballotsIssued:
                      ballotsIssued === ""
                        ? undefined
                        : Number(ballotsIssued),
                  };

                  createM.mutate(req);
                }}
                className={`px-4 h-9 rounded-lg text-base font-semibold text-white transition flex items-center justify-center gap-2 sm:min-w-fit ${
                  !canEdit ||
                  savingCreate ||
                  !cCountyId ||
                  !cDistrictId ||
                  !cCenterId ||
                  !cPlaceId ||
                  registeredVoters === ""
                    ? "bg-slate-300 cursor-not-allowed opacity-60"
                    : "bg-blue-600 hover:bg-blue-700 shadow-sm"
                }`}
              >
                {savingCreate ? (
                  <>
                    <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span className="hidden sm:inline">Creating…</span>
                  </>
                ) : (
                  <>
                    <Plus size={16} className="text-red-500" />
                    <span className="hidden sm:inline">Create</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* ============ EDIT MODAL ============ */}
      {openEdit && editing ? (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/50 backdrop-blur-sm"
          onClick={() => {
            if (savingUpdate) return;
            setOpenEdit(false);
            setEditing(null);
          }}
        >
          <div
            className="w-full max-w-lg bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[95vh] sm:max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* HEADER */}
            <div className="bg-gradient-to-r from-blue-600 via-blue-500 to-blue-400 px-4 sm:px-8 py-6 sm:py-8 border-b border-blue-600 flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <h2 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-2">
                  <Pencil size={28} className="text-white" />
                  Edit Allocation
                </h2>
                <p className="text-sm sm:text-base font-semibold text-blue-100 mt-2">
                  Update registered voters and ballots issued.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (savingUpdate) return;
                  setOpenEdit(false);
                  setEditing(null);
                }}
                disabled={savingUpdate}
                className="flex-shrink-0 h-10 w-10 flex items-center justify-center rounded-lg border-2 border-blue-300 hover:bg-blue-700 bg-blue-600 transition text-white disabled:opacity-50"
              >
                <X size={20} />
              </button>
            </div>

            {/* CONTENT */}
            <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-6 sm:py-7 space-y-5 sm:space-y-6">
              {/* Display Info */}
              <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 sm:p-4">
                <p className="text-sm text-slate-600">
                  <strong className="font-bold">Center:</strong> {editing.centerName}
                </p>
                <p className="text-sm text-slate-600 mt-1">
                  <strong className="font-bold">Place:</strong>{" "}
                  {editing.placeLabel ?? editing.placeCode ?? editing.placeId}
                </p>
              </div>

              {/* Registered Voters */}
              <div>
                <label className="block text-base font-bold text-slate-900 mb-2 sm:mb-3">
                  Registered Voters <span className="text-red-600">*</span>
                </label>
                <input
                  value={registeredVoters}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v === "") setRegisteredVoters("");
                    else {
                      const n = Number(v);
                      if (Number.isNaN(n)) return;
                      setRegisteredVoters(n);
                    }
                  }}
                  type="number"
                  min={0}
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg border border-slate-300 bg-white text-base text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                />
              </div>

              {/* Ballots Issued */}
              <div>
                <label className="block text-base font-bold text-slate-900 mb-2 sm:mb-3">
                  Ballots Issued <span className="text-slate-400">(optional)</span>
                </label>
                <input
                  value={ballotsIssued}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v === "") setBallotsIssued("");
                    else {
                      const n = Number(v);
                      if (Number.isNaN(n)) return;
                      setBallotsIssued(n);
                    }
                  }}
                  type="number"
                  min={0}
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg border border-slate-300 bg-white text-base text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                />
              </div>

              {/* Error */}
              {updateM.isError && (
                <div className="flex gap-3 rounded-lg bg-red-50 border border-red-200 p-3 sm:p-4">
                  <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
                  <div className="text-sm text-red-700 font-semibold">
                    {friendlySaveError(updateM.error)}
                  </div>
                </div>
              )}
            </div>

            {/* FOOTER */}
            <div className="border-t border-slate-200 bg-slate-50 px-4 sm:px-8 py-4 sm:py-5 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-3">
              <button
                type="button"
                onClick={() => {
                  setOpenEdit(false);
                  setEditing(null);
                }}
                disabled={savingUpdate}
                className="px-4 sm:px-6 h-10 rounded-lg border border-slate-300 bg-white text-slate-900 text-base font-semibold hover:bg-slate-50 transition disabled:opacity-50 sm:min-w-fit"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={!canEdit || savingUpdate}
                onClick={() => {
                  if (!canEdit || !editing) return;

                  const req: PollingPlaceAllocationUpdateRequest = {
                    registeredVoters:
                      registeredVoters === ""
                        ? undefined
                        : Number(registeredVoters),
                    ballotsIssued:
                      ballotsIssued === ""
                        ? undefined
                        : Number(ballotsIssued),
                  };

                  updateM.mutate({ id: editing.placeAllocationId, req });
                }}
                className={`px-4 sm:px-6 h-10 rounded-lg text-base font-semibold text-white transition flex items-center justify-center gap-2 sm:min-w-fit ${
                  !canEdit || savingUpdate
                    ? "bg-slate-300 cursor-not-allowed opacity-60"
                    : "bg-blue-600 hover:bg-blue-700 shadow-sm"
                }`}
              >
                {savingUpdate ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span className="hidden sm:inline">Saving…</span>
                  </>
                ) : (
                  <>
                    <Pencil size={18} />
                    <span className="hidden sm:inline">Update</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}



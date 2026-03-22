
// src/pages/elections/workspace/tabs/allocation/pollingCenterAllocation.tsx


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
  fetchAllocations,
  createAllocation,
  updateAllocation,
  deleteAllocation,
  type PollingCenterAllocationDto,
  type PollingCenterAllocationCreateRequest,
  type PollingCenterAllocationUpdateRequest,
} from "../../../../../shared/services/pollingCenterAllocationService";

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

/** ============ MAIN COMPONENT ============ */
export default function PollingCenterAllocationsPage() {
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

  /** ============ ALLOCATIONS QUERY ============ */
  const allocationsQ = useQuery({
    enabled: Boolean(electionId),
    queryKey: [
      "polling-center-allocations",
      electionId,
      page,
      size,
      fCountyId,
      fDistrictId,
      fCenterId,
    ],
    queryFn: () =>
      fetchAllocations({
        electionId: electionId!,
        countyId: fCountyId || undefined,
        districtId: fDistrictId || undefined,
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
      queryKey: ["polling-center-allocations", electionId],
    });
    await allocationsQ.refetch();
  };

  /** ============ MUTATIONS ============ */
  const createM = useMutation({
    mutationFn: async (req: PollingCenterAllocationCreateRequest) =>
      createAllocation(req),
    onSuccess: async () => {
      setOpenCreate(false);
      setPage(0);
      await refreshNow();
    },
  });

  const updateM = useMutation({
    mutationFn: async (payload: {
      id: string;
      req: PollingCenterAllocationUpdateRequest;
    }) => updateAllocation(payload.id, payload.req),
    onSuccess: async () => {
      setOpenEdit(false);
      setEditing(null);
      await refreshNow();
    },
  });

  const deleteM = useMutation({
    mutationFn: async (id: string) => deleteAllocation(id),
    onSuccess: refreshNow,
  });

  /** ============ CREATE/EDIT MODALS ============ */
  const [openCreate, setOpenCreate] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [editing, setEditing] = useState<PollingCenterAllocationDto | null>(
    null
  );

  // Create fields
  const [cCountyId, setCCountyId] = useState("");
  const [cDistrictId, setCDistrictId] = useState("");
  const [cCenterId, setCCenterId] = useState("");
  const [registeredVoters, setRegisteredVoters] = useState<number | "">("");
  const [ballotsIssued, setBallotsIssued] = useState<number | "">("");

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

  /** ============ STATE ============ */
  const pageData = allocationsQ.data;
  const savingCreate = createM.isPending;
  const savingUpdate = updateM.isPending;

  /** ============ TABLE ROWS ============ */
  const rows = useMemo(() => {
    const items = pageData?.items ?? [];
    if (!items.length) return [["No allocations found.", "", "", "", "", ""]];

    return items.map((a) => [
      a.countyName ?? "—",
      a.districtName ?? "—",
      `${a.centerCode ?? ""} ${a.centerName ?? ""}`.trim() || "—",
      String(a.registeredVoters ?? 0),
      a.ballotsIssued != null ? String(a.ballotsIssued) : "—",

      // Actions
      <div key={a.allocationId} className="flex flex-wrap gap-2">
        <button
          type="button"
          title={canEdit ? "Edit (SYSTEM/NEC)" : "Read-only"}
          onClick={() => {
            setEditing(a);
            setRegisteredVoters(a.registeredVoters);
            setBallotsIssued(a.ballotsIssued ?? "");
            setOpenEdit(true);
          }}
          disabled={!canEdit}
          className={`inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-green-600 hover:bg-green-50 transition ${
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
              `Delete allocation for ${a.centerName}? This is permanent.`
            );
            if (ok) deleteM.mutate(a.allocationId);
          }}
          disabled={!canEdit || deleteM.isPending}
          className={`inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-red-700 hover:bg-red-50 transition ${
            !canEdit || deleteM.isPending ? "opacity-60" : ""
          }`}
        >
          <Trash2 size={18} />
        </button>
      </div>,
    ]);
  }, [pageData, canEdit, deleteM.isPending]);

  if (!electionId) {
    return (
      <div className="p-3 rounded-xl border border-slate-200 bg-white">
        <div className="font-extrabold text-slate-800">
          Polling Center Allocations
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
                setRegisteredVoters("");
                setBallotsIssued("");
                setOpenCreate(true);
              }}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-600 text-white font-bold hover:bg-blue-700 transition shadow-sm"
            >
              <Plus size={16} className="text-red-500" />
              Center Allocation
            </button>
          ) : (
            <Badge text="Read-only (Tenant)" />
          )}

          <button
            type="button"
            onClick={refreshNow}
            disabled={allocationsQ.isFetching}
            className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition ${
              allocationsQ.isFetching ? "opacity-60" : ""
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
            {countiesQ.isLoading ? (
              <div className="px-3 py-2.5 rounded-lg border border-slate-300 bg-slate-50 text-slate-600 text-base">
                Loading…
              </div>
            ) : countiesQ.isError ? (
              <div className="px-3 py-2.5 rounded-lg border border-red-200 bg-red-50 text-red-700 text-sm">
                {(countiesQ.error as any)?.message ?? "Failed to load"}
              </div>
            ) : (
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
            )}
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
                  ? "All centers"
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
      {allocationsQ.isLoading ? (
        <div className="p-3 text-slate-600">Loading allocations…</div>
      ) : allocationsQ.isError ? (
        <div className="p-3 rounded-lg border border-red-200 bg-red-50 text-red-700">
          {(allocationsQ.error as any)?.message ??
            "Failed to load allocations."}
        </div>
      ) : null}

      {/* ============ TABLE ============ */}
      <SimpleTable
        columns={[
          "County",
          "District",
          "Center",
          "Registered Voters",
          "Ballots Issued",
          "Actions",
        ]}
        rows={
          rows.length ? rows : [["No allocations found.", "", "", "", "", ""]]
        }
      />

      {/* ============ PAGINATION ============ */}
      <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
        <div className="flex gap-2 items-center">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={!pageData || page <= 0 || allocationsQ.isFetching}
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
              allocationsQ.isFetching
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
            "SYSTEM + NEC can create/edit/delete center allocations; tenants are read-only.",
            "Filters: County → District → Center (dependent dropdowns).",
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
            className="w-full max-w-4xl bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[95vh] sm:max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* HEADER */}
            <div className="bg-gradient-to-r from-blue-600 via-blue-500 to-blue-400 px-4 sm:px-8 py-6 sm:py-8 border-b border-blue-600 flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <h2 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-2">
                  <Plus size={28} className="text-red-500" />
                  Create Allocation
                </h2>
                <p className="text-sm sm:text-base font-semibold text-blue-100 mt-2">
                  Select County → District → Center, then provide voter data.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (savingCreate) return;
                  setOpenCreate(false);
                }}
                disabled={savingCreate}
                className="flex-shrink-0 h-10 w-10 flex items-center justify-center rounded-lg border-2 border-blue-300 hover:bg-blue-700 bg-blue-600 transition text-white disabled:opacity-50"
              >
                <X size={20} />
              </button>
            </div>

            {/* CONTENT */}
            <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-6 sm:py-7 space-y-5 sm:space-y-6">
              {/* County, District, Center */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
                <div>
                  <label className="block text-base font-bold text-slate-900 mb-2 sm:mb-3">
                    County <span className="text-red-600">*</span>
                  </label>
                  <select
                    value={cCountyId}
                    onChange={(e) => {
                      setCCountyId(e.target.value);
                      setCDistrictId("");
                      setCCenterId("");
                    }}
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg border border-slate-300 bg-white text-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                  >
                    <option value="">-- Select county --</option>
                    {(countiesQ.data ?? []).map((c) => (
                      <option key={c.countyId} value={c.countyId}>
                        {c.countyName}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-base font-bold text-slate-900 mb-2 sm:mb-3">
                    District <span className="text-red-600">*</span>
                  </label>
                  <select
                    value={cDistrictId}
                    onChange={(e) => {
                      setCDistrictId(e.target.value);
                      setCCenterId("");
                    }}
                    disabled={!cCountyId}
                    className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg border border-slate-300 bg-white text-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${
                      !cCountyId ? "opacity-60 cursor-not-allowed" : ""
                    }`}
                  >
                    <option value="">
                      {cCountyId
                        ? "-- Select district --"
                        : "Select county first"}
                    </option>
                    {(districtsCreateQ.data ?? []).map((d) => (
                      <option key={d.districtId} value={d.districtId}>
                        {d.districtName}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-base font-bold text-slate-900 mb-2 sm:mb-3">
                    Center <span className="text-red-600">*</span>
                  </label>
                  <select
                    value={cCenterId}
                    onChange={(e) => setCCenterId(e.target.value)}
                    disabled={!cCountyId || !cDistrictId}
                    className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg border border-slate-300 bg-white text-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${
                      !cCountyId || !cDistrictId
                        ? "opacity-60 cursor-not-allowed"
                        : ""
                    }`}
                  >
                    <option value="">
                      {cCountyId && cDistrictId
                        ? "-- Select center --"
                        : "Select county + district first"}
                    </option>
                    {(centersCreateQ.data ?? []).map((c) => (
                      <option key={c.centerId} value={c.centerId}>
                        {c.centerName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Registered Voters & Ballots Issued */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
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
                    placeholder="e.g., 5000"
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg border border-slate-300 bg-white text-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                  />
                </div>

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
                    placeholder="e.g., 4800"
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg border border-slate-300 bg-white text-base lg-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                  />
                </div>
              </div>

              {/* Error */}
              {createM.isError && (
                <div className="flex gap-3 rounded-lg bg-red-50 border border-red-200 p-3 sm:p-4">
                  <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
                  <div className="text-sm text-red-700 font-semibold">
                    {friendlySaveError(createM.error)}
                  </div>
                </div>
              )}
            </div>

            {/* FOOTER */}
            <div className="border-t border-slate-200 bg-slate-50 px-4 sm:px-8 py-4 sm:py-5 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-3">
              <button
                type="button"
                onClick={() => {
                  if (savingCreate) return;
                  setOpenCreate(false);
                }}
                disabled={savingCreate}
                className="px-4 sm:px-6 h-10 rounded-lg border border-slate-300 bg-white text-slate-900 text-base font-semibold hover:bg-slate-50 transition disabled:opacity-50 sm:min-w-fit"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={!canEdit || savingCreate || !cCountyId || !cDistrictId || !cCenterId || registeredVoters === ""}
                onClick={() => {
                  if (!canEdit) return;
                  if (!cCountyId) return alert("County is required.");
                  if (!cDistrictId) return alert("District is required.");
                  if (!cCenterId) return alert("Center is required.");
                  if (registeredVoters === "" || registeredVoters == null) {
                    return alert("Registered voters is required.");
                  }

                  const req: PollingCenterAllocationCreateRequest = {
                    electionId: electionId!,
                    centerId: cCenterId,
                    registeredVoters: Number(registeredVoters),
                    ballotsIssued:
                      ballotsIssued === ""
                        ? undefined
                        : Number(ballotsIssued),
                  };

                  createM.mutate(req);
                }}
                className={`px-4 sm:px-6 h-10 rounded-lg text-base font-semibold text-white transition flex items-center justify-center gap-2 sm:min-w-fit ${
                  !canEdit ||
                  savingCreate ||
                  !cCountyId ||
                  !cDistrictId ||
                  !cCenterId ||
                  registeredVoters === ""
                    ? "bg-slate-300 cursor-not-allowed opacity-60"
                    : "bg-blue-600 hover:bg-blue-800 shadow-sm"
                }`}
              >
                {savingCreate ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span className="hidden sm:inline">Saving…</span>
                  </>
                ) : (
                  <>
                    <Plus size={18} className="text-white-500" />
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
            className="w-full max-w-xl bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[95vh] sm:max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* HEADER */}
            <div className="bg-gradient-to-r from-blue-600 via-blue-500 to-blue-400 px-4 sm:px-8 py-6 sm:py-8 border-b border-blue-600 flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <h2 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-2">
                  <Pencil size={28} className="text-white" />
                  Edit Allocation
                </h2>
                <p className="text-sm sm:text-base font-semibold text-green-100 mt-2">
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
                <p className="text-base text-slate-600">
                  <strong className="font-bold">Center:</strong> {editing.centerName}
                </p>
                <p className="text-sm text-slate-600 mt-1">
                  <strong className="font-bold">District:</strong> {editing.districtName}
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
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg border border-slate-300 bg-white text-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-green-500 transition"
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
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg border border-slate-300 bg-white text-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-green-500 transition"
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

                  const req: PollingCenterAllocationUpdateRequest = {
                    registeredVoters:
                      registeredVoters === ""
                        ? undefined
                        : Number(registeredVoters),
                    ballotsIssued:
                      ballotsIssued === ""
                        ? undefined
                        : Number(ballotsIssued),
                  };

                  updateM.mutate({ id: editing.allocationId, req });
                }}
                className={`px-4 sm:px-6 h-10 rounded-lg text-base font-semibold text-white transition flex items-center justify-center gap-2 sm:min-w-fit ${
                  !canEdit || savingUpdate
                    ? "bg-slate-300 cursor-not-allowed opacity-60"
                    : "bg-blue-600 hover:bg-blue-800 shadow-sm"
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


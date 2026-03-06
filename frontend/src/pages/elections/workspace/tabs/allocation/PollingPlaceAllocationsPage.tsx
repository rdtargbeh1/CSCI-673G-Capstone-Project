// src/pages/elections/workspace/tabs/allocation/pollingPlaceAllocation.tsx
// ✅ Updated to use YOUR existing pollingPlaceService shape (code/label/placeNumber, county/district/center filters)
// ✅ Same UX + pattern as Center Allocation:
// - SYSTEM + NEC + isSystemAdmin can CRUD; tenants read-only
// - Filters: County → District → Center (dependent dropdowns)
// - Create: County → District → Center → Place (dependent dropdowns)
// - Create place dropdown shows CLEAN label (no long code)

import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Pencil, Trash2, RefreshCw, FilterX, Plus } from "lucide-react";

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

/** ---------------- helpers ---------------- */
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

// ✅ clean place display (avoid long codes)
function placeDisplay(p: PollingPlaceDto) {
  // prefer label if present; else "Place #N"; else fallback to code
  const label = (p.label ?? "").trim();
  if (label) return label;
  if (p.placeNumber != null) return `Place #${p.placeNumber}`;
  const code = (p.code ?? "").trim();
  return code || p.placeId;
}

export default function PollingPlaceAllocationsPage() {
  const { electionId } = useParams<{ electionId: string }>();

  const dashboardMode = useAuthStore((s) => s.dashboardMode);
  const isSystemAdmin = useAuthStore((s) => s.isSystemAdmin());
  const canEdit =
    dashboardMode === "SYSTEM" || dashboardMode === "NEC" || isSystemAdmin;

  const qc = useQueryClient();

  const [page, setPage] = useState(0);
  const size = 20;

  // ---------------- Filters (table) ----------------
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

  // ---------------- Create/Edit modals ----------------
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

  // ---------------- Lookup queries ----------------
  const countiesQ = useQuery({
    queryKey: ["counties", "master"],
    queryFn: async () => {
      const page = await fetchCounties({ page: 0, size: 500 });
      return page.items as CountyDto[];
    },
    staleTime: 60_000,
    retry: 1,
  });

  // Filter: districts by county
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

  // Filter: centers by county + district
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

  // Create: districts by county
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

  // Create: centers by county + district
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

  // Create: places by county/district/center (YOUR SERVICE SUPPORTS ALL)
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

  // ---------------- Allocations query ----------------
  // Backend supports electionId + centerId (+ placeId). We pass centerId from filters.
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

  // ---------------- mutations ----------------
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

  // ---------------- rows ----------------
  const pageData = placeAllocQ.data;
  const items = pageData?.items ?? [];

  const rows = useMemo(() => {
    if (!items.length)
      return [["No place allocations found.", "", "", "", "", ""]];

    return items.map((p) => [
      p.centerName ?? "—",
      p.centerCode ?? "—",
      // clean place label: label || code || placeId
      p.placeLabel ?? p.placeCode ?? p.placeId ?? "—",
      String(p.registeredVoters ?? 0),
      p.ballotsIssued != null ? String(p.ballotsIssued) : "—",
      <div style={{ display: "flex", gap: 6 }} key={p.placeAllocationId}>
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
          className={`px-2 py-1 rounded border bg-white text-green-600 ${
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
          className={`px-2 py-1 rounded border bg-white text-red-700 ${
            !canEdit || deleteM.isPending ? "opacity-60" : ""
          }`}
        >
          <Trash2 size={18} />
        </button>
      </div>,
    ]);
  }, [items, canEdit, deleteM.isPending]);

  return (
    <div className="flex flex-col gap-2">
      {/* Header actions */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 6,
        }}
      >
        <div />
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
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
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded border bg-blue-600 text-white font-bold"
            >
              <Plus size={18} />
             Place Allocation
            </button>
          ) : (
            <Badge text="Read-only (Tenant)" />
          )}

          <button
            type="button"
            onClick={refreshNow}
            disabled={placeAllocQ.isFetching}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded border bg-blue-100 ${
              placeAllocQ.isFetching ? "opacity-60" : ""
            }`}
          >
            <RefreshCw size={16} />
            Refresh
          </button>
        </div>
      </div>

      {/* Filters card */}
      <div className="w-full rounded-xl border border-slate-200 bg-white p-2">
        <div className="grid md:grid-cols-4 gap-2">
          {/* County Filter */}
          <div className="grid gap-1">
            <div className="text-base font-extrabold text-slate-600">
              County
            </div>
            <select
              value={fCountyId}
              onChange={(e) => changeCountyFilter(e.target.value)}
              className="px-3 py-2 rounded-lg border border-slate-200 outline-none bg-white text-base"
            >
              <option value="">All counties</option>
              {(countiesQ.data ?? []).map((c) => (
                <option key={c.countyId} value={c.countyId}>
                  {c.countyName}
                </option>
              ))}
            </select>
          </div>

          {/* District Filter */}
          <div className="grid gap-1">
            <div className="text-base font-extrabold text-slate-600">
              District
            </div>
            <select
              value={fDistrictId}
              onChange={(e) => changeDistrictFilter(e.target.value)}
              disabled={!fCountyId}
              className={`px-3 py-2 rounded-lg border border-slate-200 outline-none bg-white text-base ${
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

          {/* Center Filter */}
          <div className="grid gap-1">
            <div className="text-base font-extrabold text-slate-600">
              Center
            </div>
            <select
              value={fCenterId}
              onChange={(e) => changeCenterFilter(e.target.value)}
              disabled={!fCountyId || !fDistrictId}
              className={`px-3 py-2 rounded-lg border border-slate-200 outline-none bg-white text-base ${
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

          {/* Clear Button - Next to Center */}
          <div className="flex items-end">
            <button
              type="button"
              className="w-full inline-flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-lg border border-slate-200 bg-white text-base font-medium hover:bg-slate-50 transition"
              onClick={() => {
                setFCountyId("");
                setFDistrictId("");
                setFCenterId("");
                setPage(0);
              }}
              title="Clear all filters"
            >
              <FilterX size={16} />
              Clear
            </button>
          </div>
        </div>
      </div>

      {/* Load / Error */}
      {placeAllocQ.isLoading ? (
        <div style={{ padding: 6, color: "#475569" }}>
          Loading place allocations…
        </div>
      ) : placeAllocQ.isError ? (
        <div
          style={{
            padding: 6,
            borderRadius: 6,
            border: "1px solid #fecaca",
            background: "#fff1f2",
            color: "#991b1b",
          }}
        >
          {(placeAllocQ.error as any)?.message ??
            "Failed to load place allocations."}
        </div>
      ) : null}

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

      {/* Pagination */}
      <div
        style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 8 }}
      >
        <button
          type="button"
          onClick={() => setPage((p) => Math.max(0, p - 1))}
          disabled={!pageData || page <= 0 || placeAllocQ.isFetching}
          className="px-3 py-1 rounded border bg-white"
        >
          Prev
        </button>
        <div style={{ fontSize: 13, color: "#374151" }}>
          Page {pageData ? pageData.page + 1 : page + 1} /{" "}
          {pageData ? pageData.totalPages : "?"}
        </div>
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
          className="px-3 py-1 rounded border bg-white"
        >
          Next
        </button>
      </div>

      <div style={{ marginTop: 8 }}>
        <PlaceholderNote
          title="Notes"
          bullets={[
            "Read-only (Tenant View): Place allocations are official (NEC managed). Tenants view allocations to validate submission totals and detect anomalies (votes > ballots issued). Data sources: polling_place_allocation, polling_place.",
            "SYSTEM + NEC can create/edit/delete place allocations; tenants are read-only.",
            "Filters: County → District → Center (dependent dropdowns).",
            "Create form uses County → District → Center → Place to ensure correct linkage.",
          ]}
        />
      </div>

      {/* ---------------- Create Modal ---------------- */}
      {openCreate ? (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50"
          onClick={() => {
            if (createM.isPending) return;
            setOpenCreate(false);
          }}
        >
          <div
            className="w-full max-w-[1100px] bg-white rounded-2xl border border-slate-200 p-4 mx-auto shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center gap-3">
              <div>
                <div className="font-extrabold text-xl">
                  Create Polling Place Allocation
                </div>
                <div className="text-sm text-slate-500 mt-0.5">
                  Select County → District → Center → Place, then provide
                  registered voters and optional ballots issued.
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpenCreate(false)}
                disabled={createM.isPending}
                className={`px-3 py-2 rounded-lg border border-slate-200 bg-white ${
                  createM.isPending ? "opacity-60" : ""
                }`}
              >
                Close
              </button>
            </div>

            <div className="grid gap-3 mt-3">
              <div className="grid md:grid-cols-4 gap-2">
                {/* County */}
                <div className="grid gap-1">
                  <div className="text-base font-extrabold text-slate-600">
                    County <span className="text-red-600">*</span>
                  </div>
                  <select
                    value={cCountyId}
                    onChange={(e) => {
                      const next = e.target.value;
                      setCCountyId(next);
                      setCDistrictId("");
                      setCCenterId("");
                      setCPlaceId("");
                    }}
                    className="px-3 py-2 rounded-lg border border-slate-200 outline-none bg-white"
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
                <div className="grid gap-1">
                  <div className="text-base font-extrabold text-slate-600">
                    District <span className="text-red-600">*</span>
                  </div>
                  <select
                    value={cDistrictId}
                    onChange={(e) => {
                      const next = e.target.value;
                      setCDistrictId(next);
                      setCCenterId("");
                      setCPlaceId("");
                    }}
                    disabled={!cCountyId}
                    className={`px-3 py-2 rounded-lg border border-slate-200 outline-none bg-white ${
                      !cCountyId ? "opacity-60" : ""
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

                {/* Center */}
                <div className="grid gap-1">
                  <div className="text-base font-extrabold text-slate-600">
                    Center <span className="text-red-600">*</span>
                  </div>
                  <select
                    value={cCenterId}
                    onChange={(e) => {
                      const next = e.target.value;
                      setCCenterId(next);
                      setCPlaceId("");
                    }}
                    disabled={!cCountyId || !cDistrictId}
                    className={`px-3 py-2 rounded-lg border border-slate-200 outline-none bg-white ${
                      !cCountyId || !cDistrictId ? "opacity-60" : ""
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

                {/* Place (clean label only) */}
                <div className="grid gap-1">
                  <div className="text-base font-extrabold text-slate-600">
                    Place <span className="text-red-600">*</span>
                  </div>
                  <select
                    value={cPlaceId}
                    onChange={(e) => setCPlaceId(e.target.value)}
                    disabled={!cCenterId}
                    className={`px-3 py-2 rounded-lg border border-slate-200 outline-none bg-white ${
                      !cCenterId ? "opacity-60" : ""
                    }`}
                  >
                    <option value="">
                      {cCenterId ? "-- Select place --" : "Select center first"}
                    </option>
                    {(placesCreateQ.data ?? []).map((p) => (
                      <option key={p.placeId} value={p.placeId}>
                        {placeDisplay(p)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-2">
                <div className="grid gap-1">
                  <div className="text-base font-extrabold text-slate-600">
                    Registered Voters <span className="text-red-600">*</span>
                  </div>
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
                    className="px-3 py-2 rounded-lg border border-slate-200 outline-none"
                  />
                </div>

                <div className="grid gap-1">
                  <div className="text-base font-extrabold text-slate-600">
                    Ballots Issued (optional)
                  </div>
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
                    className="px-3 py-2 rounded-lg border border-slate-200 outline-none"
                  />
                </div>
              </div>

              {createM.isError ? (
                <div className="p-2 rounded-lg border border-red-200 bg-red-50 text-red-700 text-sm font-bold">
                  {friendlySaveError(createM.error)}
                </div>
              ) : null}

              <div className="flex justify-end gap-2 mt-1">
                <button
                  type="button"
                  onClick={() => setOpenCreate(false)}
                  disabled={createM.isPending}
                  className={`px-3 py-2 rounded-lg border border-slate-200 bg-white ${
                    createM.isPending ? "opacity-60" : ""
                  }`}
                >
                  Cancel
                </button>

                <button
                  type="button"
                  disabled={!canEdit || createM.isPending}
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
                  className={`px-3 py-2 rounded-lg border border-slate-200 bg-white font-extrabold ${
                    !canEdit || createM.isPending ? "opacity-60" : ""
                  }`}
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* ---------------- Edit Modal ---------------- */}
      {openEdit && editing ? (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40"
          onClick={() => {
            if (updateM.isPending) return;
            setOpenEdit(false);
            setEditing(null);
          }}
        >
          <div
            className="w-full max-w-[720px] bg-white rounded-2xl border border-slate-200 p-4 mx-auto shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center">
              <div>
                <div className="font-extrabold text-xl">
                  Edit Polling Place Allocation
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  placeAllocationId: {editing.placeAllocationId}
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setOpenEdit(false);
                  setEditing(null);
                }}
                disabled={updateM.isPending}
                className={`px-3 py-2 rounded-lg border border-slate-200 bg-white ${
                  updateM.isPending ? "opacity-60" : ""
                }`}
              >
                Close
              </button>
            </div>

            <div className="grid gap-2 mt-3">
              <div className="text-base font-extrabold text-slate-600">
                Registered Voters
              </div>
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
                className="px-3 py-2 rounded-lg border border-slate-200 outline-none"
              />

              <div className="text-base font-extrabold text-slate-600">
                Ballots Issued
              </div>
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
                className="px-3 py-2 rounded-lg border border-slate-200 outline-none"
              />

              {updateM.isError ? (
                <div className="p-2 rounded-lg border border-red-200 bg-red-50 text-red-700 text-sm font-bold">
                  {friendlySaveError(updateM.error)}
                </div>
              ) : null}

              <div className="flex justify-end gap-2 mt-1">
                <button
                  type="button"
                  onClick={() => {
                    setOpenEdit(false);
                    setEditing(null);
                  }}
                  disabled={updateM.isPending}
                  className={`px-3 py-2 rounded-lg border border-slate-200 bg-white ${
                    updateM.isPending ? "opacity-60" : ""
                  }`}
                >
                  Cancel
                </button>

                <button
                  type="button"
                  disabled={!canEdit || updateM.isPending}
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
                  className={`px-3 py-2 rounded-lg border border-slate-200 bg-white font-extrabold ${
                    !canEdit || updateM.isPending ? "opacity-60" : ""
                  }`}
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

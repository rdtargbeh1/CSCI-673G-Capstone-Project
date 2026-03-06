// pollingCenterAllocation.tsx
// ✅ Final update:
// - Removed the "Read-only (Tenant View)..." note section completely (no banner + no notes bullet)

import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Pencil, Trash2, RefreshCw, FilterX } from "lucide-react";

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

export default function PollingCenterAllocationsPage() {
  const { electionId } = useParams<{ electionId: string }>();

  const dashboardMode = useAuthStore((s) => s.dashboardMode);
  const isSystemAdmin = useAuthStore((s) => s.isSystemAdmin());

  // ✅ SYSTEM + NEC (and system admin helper) can CRUD
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

  // ---------------- Allocations query ----------------
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

  // ---------------- mutations ----------------
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

  // ---------------- Create/Edit modals ----------------
  const [openCreate, setOpenCreate] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [editing, setEditing] = useState<PollingCenterAllocationDto | null>(
    null
  );

  // Create fields (dropdowns)
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

  const pageData = allocationsQ.data;

  const rows = useMemo(() => {
    const items = pageData?.items ?? [];
    if (!items.length) return [["No allocations found.", "", "", "", "", ""]];

    return items.map((a) => [
      a.countyName ?? "—",
      a.districtName ?? "—",
      `${a.centerCode ?? ""} ${a.centerName ?? ""}`.trim() || "—",
      String(a.registeredVoters ?? 0),
      a.ballotsIssued != null ? String(a.ballotsIssued) : "—",

      // Edit btn
      <div style={{ display: "flex", gap: 6 }} key={a.allocationId}>
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
          className={`px-2 py-1 rounded border bg-white text-green-600  ${
            !canEdit ? "opacity-60" : ""
          }`}
        >
          <Pencil size={18} />
        </button>
        
        {/*  delete btn */}
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
          className={`px-2 py-1 rounded border bg-white text-red-700 ${
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

  return (
    <div className="flex flex-col gap-1.5">
      {/* Header actions (tight) */}
      <div className="flex items-center justify-between">
        <div />
        <div className="flex items-center gap-2 text-xl">
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
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded border bg-blue-600 text-white font-bold"
            >
              + Center Allocation
            </button>
          ) : (
            <Badge text="Read-only (Tenant)" />
          )}

          <button
            type="button"
            onClick={refreshNow}
            disabled={allocationsQ.isFetching}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded border bg-blue-100 ${
              allocationsQ.isFetching ? "opacity-60" : ""
            }`}
          >
            <RefreshCw size={16} />
            Refresh
          </button>
        </div>
      </div>

      {/* Filters card (reduced padding + less whitespace) */}
      <div className="w-full rounded-xl border border-slate-200 bg-white px-2 py-1.5">
        {/* <div className="flex items-center justify-between gap-2">
          <div className="text-sm font-extrabold text-slate-600">
            Filters
          </div>
        </div> */}

        <div className="grid md:grid-cols-4 gap-2 mt-1">
          <div className="grid gap-1">
            <div className="text-sm font-extrabold text-slate-600">
              County
            </div>
            {countiesQ.isLoading ? (
              <div className="px-3 py-2 rounded-lg border border-slate-200 text-slate-600">
                Loading counties…
              </div>
            ) : countiesQ.isError ? (
              <div className="px-3 py-2 rounded-lg border border-red-200 bg-red-50 text-red-700">
                {(countiesQ.error as any)?.message ??
                  "Failed to load counties."}
              </div>
            ) : (
              <select
                value={fCountyId}
                onChange={(e) => changeCountyFilter(e.target.value)}
                className="px-3 py-2 rounded-lg border border-slate-200 outline-none bg-white"
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

          <div className="grid gap-1">
            <div className="text-sm font-extrabold text-slate-600">
              District
            </div>
            <select
              value={fDistrictId}
              onChange={(e) => changeDistrictFilter(e.target.value)}
              disabled={!fCountyId}
              className={`px-3 py-2 rounded-lg border border-slate-200 outline-none bg-white ${
                !fCountyId ? "opacity-60" : ""
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

          <div className="grid gap-1">
            <div className="text-sm font-extrabold text-slate-600">
              Center
            </div>
            <select
              value={fCenterId}
              onChange={(e) => changeCenterFilter(e.target.value)}
              disabled={!fCountyId || !fDistrictId}
              className={`px-3 py-2 rounded-lg border border-slate-200 outline-none bg-white ${
                !fCountyId || !fDistrictId ? "opacity-60" : ""
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

          {/* ✅ FIXED: Clear button on the same line, no label */}
          <div className="flex items-end">
            <button
              type="button"
              className="w-full inline-flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg border border-slate-200 bg-white text-sm font-medium hover:bg-slate-50"
              onClick={() => {
                setFCountyId("");
                setFDistrictId("");
                setFCenterId("");
                setPage(0);
              }}
            >
              <FilterX size={18} />
              Clear
            </button>
          </div>
        </div>
      </div>
    

      {allocationsQ.isLoading ? (
        <div style={{ padding: 4, color: "#475569" }}>
          Loading center allocations…
        </div>
      ) : allocationsQ.isError ? (
        <div
          style={{
            padding: 6,
            borderRadius: 6,
            border: "1px solid #fecaca",
            background: "#fff1f2",
            color: "#991b1b",
          }}
        >
          {(allocationsQ.error as any)?.message ??
            "Failed to load allocations."}
        </div>
      ) : null}

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

      {/* Pagination (tight) */}
      <div
        style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 4 }}
      >
        <button
          type="button"
          onClick={() => setPage((p) => Math.max(0, p - 1))}
          disabled={!pageData || page <= 0 || allocationsQ.isFetching}
          className="px-3 py-1 rounded border bg-white text-base"
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
            allocationsQ.isFetching
          }
          className="px-3 py-1 rounded border bg-white text-base"
        >
          Next
        </button>
      </div>

      {/* Notes (kept, but removed the tenant read-only + data sources bullet entirely) */}
      <div className="mt-1">
        <PlaceholderNote
          title="Notes"
          bullets={[
            "SYSTEM + NEC can create/edit/delete center allocations; tenants are read-only.",
            "Filters: County → District → Center (dependent dropdowns).",
          ]}
        />
      </div>

      {/* ---------------- Create Modal ---------------- */}
      {openCreate ? (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40"
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
                  Create Polling Center Allocation
                </div>
                <div className="text-sm text-slate-500 mt-0.5">
                  Select County → District → Center, then provide registered
                  voters and optional ballots issued.
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
              <div className="grid md:grid-cols-3 gap-2">
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

                {/* ✅ dropdown shows centerName only */}
                <div className="grid gap-1">
                  <div className="text-base font-extrabold text-slate-600">
                    Center <span className="text-red-600">*</span>
                  </div>
                  <select
                    value={cCenterId}
                    onChange={(e) => setCCenterId(e.target.value)}
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
                  Edit Polling Center Allocation
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  allocationId: {editing.allocationId}
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

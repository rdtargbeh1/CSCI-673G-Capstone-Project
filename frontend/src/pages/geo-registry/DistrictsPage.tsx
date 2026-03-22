
// src/pages/geo-registry/DistrictsPage.tsx

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, RefreshCw, Search, Trash2, X, AlertCircle, ChevronDown } from "lucide-react";

import { useAuthStore } from "../../shared/store/authStore";

import {
  fetchCounties,
  type CountyDto,
} from "../../shared/services/countyService";

import {
  createDistrict,
  deleteDistrict,
  fetchDistricts,
  updateDistrict,
  type DistrictDto,
} from "../../shared/services/districtService";

import {
  Badge,
  Card,
  Note,
  PageShell,
  Table,
} from "./shared/geo-ui";

/** ---------------- helpers ---------------- */
function safeStr(v: any) {
  return typeof v === "string" ? v : v == null ? "" : String(v);
}
function normalizeName(v: string) {
  return v.trim().replace(/\s+/g, " ");
}

export default function DistrictsPage() {
  const qc = useQueryClient();

  const dashboardMode = useAuthStore((s) => s.dashboardMode);
  const canEdit = dashboardMode === "NEC" || dashboardMode === "SYSTEM";

  // filters/paging
  const [q, setQ] = useState("");
  const [countyFilter, setCountyFilter] = useState<string>("");
  const [page, setPage] = useState(0);
  const size = 20;

  // modal state
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<DistrictDto | null>(null);

  // form fields
  const [districtName, setDistrictName] = useState("");
  const [countyId, setCountyId] = useState("");

  /** Counties lookup (for filter + create/edit) */
  const countiesQ = useQuery({
    queryKey: ["counties-lookup", "districts"],
    queryFn: async () => {
      const res = await fetchCounties({ page: 0, size: 200, q: undefined });
      return (res.items ?? []) as CountyDto[];
    },
    staleTime: 1000 * 60 * 10,
    retry: 1,
  });

  const countyOptions = useMemo(() => {
    return (countiesQ.data ?? []).map((c) => ({
      value: c.countyId,
      label: safeStr(c.countyName) || "—",
    }));
  }, [countiesQ.data]);

  /** District list */
  const districtsQ = useQuery({
    queryKey: ["districts", page, q, countyFilter],
    queryFn: () =>
      fetchDistricts({
        page,
        size,
        q: q.trim() || undefined,
        countyId: countyFilter.trim() || undefined,
      }),
    staleTime: 10_000,
    retry: 1,
  });

  const rows = useMemo(() => districtsQ.data?.items ?? [], [districtsQ.data]);
  const totalPages = Math.max(1, districtsQ.data?.totalPages ?? 1);

  const refreshNow = async () => {
    await qc.invalidateQueries({ queryKey: ["districts"] });
    await districtsQ.refetch();
  };

  const createM = useMutation({
    mutationFn: async () => {
      const name = normalizeName(districtName);
      const cid = safeStr(countyId).trim();
      if (!name) throw new Error("District name is required.");
      if (!cid) throw new Error("County is required.");
      return createDistrict({ districtName: name, countyId: cid });
    },
    onSuccess: async () => {
      setOpen(false);
      setEditing(null);
      setDistrictName("");
      setCountyId("");
      await refreshNow();
    },
  });

  const updateM = useMutation({
    mutationFn: async () => {
      if (!editing) throw new Error("No district selected.");
      const name = normalizeName(districtName);
      const cid = safeStr(countyId).trim();
      if (!name) throw new Error("District name is required.");
      if (!cid) throw new Error("County is required.");
      return updateDistrict(editing.districtId, {
        districtName: name,
        countyId: cid,
      });
    },
    onSuccess: async () => {
      setOpen(false);
      setEditing(null);
      setDistrictName("");
      setCountyId("");
      await refreshNow();
    },
  });

  const deleteM = useMutation({
    mutationFn: async (districtId: string) => {
      await deleteDistrict(districtId);
    },
    onSuccess: refreshNow,
  });

  const saving = createM.isPending || updateM.isPending;
  const error = createM.error || updateM.error;

  const openCreate = () => {
    setEditing(null);
    setDistrictName("");
    setCountyId("");
    setOpen(true);
  };

  const openEdit = (d: DistrictDto) => {
    setEditing(d);
    setDistrictName(safeStr(d.districtName));
    setCountyId(safeStr(d.countyId));
    setOpen(true);
  };

  const save = () => {
    if (!canEdit) return;
    if (!normalizeName(districtName)) return;
    if (!safeStr(countyId).trim()) return;
    
    if (editing) updateM.mutate();
    else createM.mutate();
  };

  return (
    <PageShell
      title="Geography • Districts"
      subtitle="Districts roll up under counties and support election reporting and operations."
      right={
        <div className="flex items-center gap-2">
          <Badge>
            {canEdit ? "Editable (NEC/SYSTEM)" : "Read-only (Tenant)"}
          </Badge>

          <button
            type="button"
            onClick={refreshNow}
            disabled={districtsQ.isFetching}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-base font-semibold hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw size={16} />
            Refresh
          </button>

          <button
            type="button"
            onClick={openCreate}
            disabled={!canEdit}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-[#0000CD] text-white px-3 py-2 text-base font-semibold hover:bg-blue-700 disabled:opacity-50"
            title={canEdit ? "Add District" : "NEC/SYSTEM only"}
          >
            <Plus size={16} />
            Add District
          </button>
        </div>
      }
    >
      <Card title="Districts">
        {/* ✅ CONDENSED FILTERS */}
        <div className="flex items-end gap-2 mb-4">
          {/* Search */}
          <div className="relative w-80">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              size={16}
            />
            <input
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(0);
              }}
              placeholder="Search district…"
              className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-base outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* County Filter */}
          <div className="relative w-80">
            <select
              value={countyFilter}
              onChange={(e) => {
                setCountyFilter(e.target.value);
                setPage(0);
              }}
              disabled={countiesQ.isLoading || countiesQ.isError}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 pr-10 text-base outline-none focus:ring-2 focus:ring-blue-500 appearance-none disabled:bg-slate-50"
            >
              <option value="">
                {countiesQ.isLoading ? "Loading…" : "All counties"}
              </option>
              {countyOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>

          {/* Clear */}
          <button
            type="button"
            onClick={() => {
              setQ("");
              setCountyFilter("");
              setPage(0);
            }}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-base font-semibold hover:bg-slate-50 whitespace-nowrap"
          >
            Clear All
          </button>
        </div>

        {/* Status */}
        <div className="mt-3">
          {districtsQ.isLoading ? (
            <div className="text-sm text-slate-600">Loading districts…</div>
          ) : districtsQ.isError ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {(districtsQ.error as any)?.message ??
                "Failed to load districts."}
            </div>
          ) : null}
        </div>

        {/* Table */}
        <div className="mt-3">
          <Table
            columns={["County", "District", "Actions"]}
            rows={
              rows.length === 0 && !districtsQ.isLoading
                ? [
                    [
                      <span key="empty" className="text-slate-600">
                        No districts found.
                      </span>,
                      "",
                      "",
                    ],
                  ]
                : rows.map((d) => [
                    <span
                      key={`${d.districtId}-county`}
                      className="text-slate-800"
                    >
                      {safeStr(d.countyName) || "—"}
                    </span>,
                    <span
                      key={`${d.districtId}-name`}
                      className="font-semibold text-slate-900"
                    >
                      {safeStr(d.districtName) || "—"}
                    </span>,
                    <div
                      key={`${d.districtId}-actions`}
                      className="flex items-center gap-2"
                    >
                      <button
                        type="button"
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-base text-green-600 font-semibold hover:bg-slate-50 disabled:opacity-50"
                        disabled={!canEdit}
                        title={canEdit ? "Edit" : "NEC/SYSTEM only"}
                        onClick={() => openEdit(d)}
                      >
                        <Pencil size={16} />
                      </button>

                      <button
                        type="button"
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-base font-semibold hover:bg-slate-50 disabled:opacity-50"
                        disabled={!canEdit || deleteM.isPending}
                        title={canEdit ? "Delete" : "NEC/SYSTEM only"}
                        onClick={() => {
                          const ok = window.confirm(
                            `Delete district "${safeStr(d.districtName)}"?`
                          );
                          if (ok) deleteM.mutate(d.districtId);
                        }}
                      >
                        <Trash2 size={16} className="text-red-600" />
                      </button>
                    </div>,
                  ])
            }
          />
        </div>

        {/* Pagination */}
        <div className="mt-3 flex items-center justify-between">
          <div className="text-sm text-slate-600">
            Page <span className="font-bold">{page + 1}</span> of{" "}
            <span className="font-bold">{totalPages}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50"
              disabled={page <= 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
            >
              Prev
            </button>
            <button
              type="button"
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50"
              disabled={page >= totalPages - 1}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </button>
          </div>
        </div>

        {/* Notes */}
        <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
          <Note
            title="Access rules"
            bullets={[
              "NEC_ADMIN and SYSTEM_ADMIN can create/edit/delete districts.",
              "Tenants can view districts read-only.",
              "Districts must belong to a county.",
            ]}
          />
          <Note
            title="API mapping"
            bullets={[
              "GET /api/districts?q=&countyId=&page=&size=",
              "GET /api/districts/by-county/{countyId}",
              "POST /api/districts",
              "PUT /api/districts/{id}",
              "DELETE /api/districts/{id}",
            ]}
          />
        </div>
      </Card>

      {/* ✅ Enhanced Modal - Create/Edit Form */}
      {open && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => !saving && setOpen(false)}
        >
          <div
            className="w-full max-w-120 bg-white rounded-2xl shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* ✅ HEADER */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-6 text-white flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <h2 className="text-2xl font-bold tracking-tight">
                  {editing ? "Edit District" : "Add District"}
                </h2>
                <p className="text-blue-100 mt-1 text-sm">
                  {editing
                    ? "Update district master data."
                    : "Create a new district."}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={saving}
                className="flex-shrink-0 h-10 w-10 rounded-lg bg-white/20 hover:bg-white/30 transition flex items-center justify-center text-white disabled:opacity-50"
                aria-label="Close"
              >
                <X size={22} />
              </button>
            </div>

            {/* ✅ CONTENT */}
            <div className="px-8 py-6 space-y-4">
              {/* County Dropdown */}
              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wide block mb-2">
                  County *
                </label>
                <div className="relative">
                  <select
                    value={countyId}
                    onChange={(e) => setCountyId(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !saving && countyId && normalizeName(districtName)) {
                        save();
                      }
                    }}
                    disabled={saving || countiesQ.isLoading || countiesQ.isError}
                    className="w-full px-4 py-3 rounded-xl border border-slate-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none disabled:bg-slate-100 disabled:text-slate-500 pr-10"
                  >
                    <option value="">
                      {countiesQ.isLoading
                        ? "Loading counties…"
                        : "-- Select County --"}
                    </option>
                    {countyOptions.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {/* District Name Input */}
              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wide block mb-2">
                  District Name *
                </label>
                <input
                  value={districtName}
                  onChange={(e) => setDistrictName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !saving) {
                      save();
                    }
                  }}
                  disabled={saving}
                  type="text"
                  placeholder="e.g., District 1"
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-slate-100 disabled:text-slate-500"
                />
              </div>

              {/* Error Message */}
              {error && (
                <div className="rounded-xl bg-red-50 border border-red-200 p-4 flex gap-3">
                  <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
                  <div>
                    <div className="text-sm font-bold text-red-900">Error</div>
                    <div className="text-sm text-red-800 mt-1">
                      {(error as any)?.message ?? "Failed to save district."}
                    </div>
                  </div>
                </div>
              )}

              {/* Info Message */}
              <div className="rounded-xl bg-blue-50 border border-blue-200 p-3">
                <p className="text-xs text-blue-700">
                  💡 <span className="font-semibold">Tip:</span> Select a county first, then enter the district name. Press Enter to save.
                </p>
              </div>
            </div>

            {/* ✅ FOOTER */}
            <div className="border-t border-slate-200 bg-white px-8 py-4 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={saving}
                className="px-6 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-700 font-semibold hover:bg-slate-50 transition disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={saving || !normalizeName(districtName) || !safeStr(countyId).trim() || !canEdit}
                onClick={save}
                className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold transition disabled:opacity-50 shadow-md"
              >
                {saving ? "Saving…" : editing ? "Update District" : "Create District"}
              </button>
            </div>
          </div>
        </div>
      )}
    </PageShell>
  );
}




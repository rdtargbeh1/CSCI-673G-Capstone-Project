
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, RefreshCw, Search, Trash2, X, AlertCircle } from "lucide-react";

import { useAuthStore } from "../../shared/store/authStore";
import {
  createCounty,
  deleteCounty,
  fetchCounties,
  updateCounty,
  type CountyDto,
} from "../../shared/services/countyService";

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

export default function CountiesPage() {
  const qc = useQueryClient();

  const dashboardMode = useAuthStore((s) => s.dashboardMode);
  const canEdit = dashboardMode === "NEC" || dashboardMode === "SYSTEM";

  const [q, setQ] = useState("");
  const [page, setPage] = useState(0);
  const size = 20;

  // modal state
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CountyDto | null>(null);
  const [name, setName] = useState("");

  const countiesQ = useQuery({
    queryKey: ["counties", page, q],
    queryFn: () =>
      fetchCounties({
        page,
        size,
        q: q.trim() || undefined,
      }),
    staleTime: 10_000,
    retry: 1,
  });

  const rows = useMemo(() => countiesQ.data?.items ?? [], [countiesQ.data]);
  const totalPages = Math.max(1, countiesQ.data?.totalPages ?? 1);

  const refreshNow = async () => {
    await qc.invalidateQueries({ queryKey: ["counties"] });
    await countiesQ.refetch();
  };

  const createM = useMutation({
    mutationFn: async () => {
      const countyName = normalizeName(name);
      if (!countyName) throw new Error("County name is required.");
      return createCounty({ countyName });
    },
    onSuccess: async () => {
      setOpen(false);
      setEditing(null);
      setName("");
      await refreshNow();
    },
  });

  const updateM = useMutation({
    mutationFn: async () => {
      if (!editing) throw new Error("No county selected.");
      const countyName = normalizeName(name);
      if (!countyName) throw new Error("County name is required.");
      return updateCounty(editing.countyId, { countyName });
    },
    onSuccess: async () => {
      setOpen(false);
      setEditing(null);
      setName("");
      await refreshNow();
    },
  });

  const deleteM = useMutation({
    mutationFn: async (countyId: string) => {
      await deleteCounty(countyId);
    },
    onSuccess: refreshNow,
  });

  const openCreate = () => {
    setEditing(null);
    setName("");
    setOpen(true);
  };

  const openEdit = (c: CountyDto) => {
    setEditing(c);
    setName(safeStr(c.countyName));
    setOpen(true);
  };

  const save = () => {
    if (!canEdit) return;
    if (editing) updateM.mutate();
    else createM.mutate();
  };

  const saving = createM.isPending || updateM.isPending;
  const error = createM.error || updateM.error;

  return (
    <PageShell
      title="Geography • Counties"
      subtitle="Global master data used across allocations, submissions, and results drilldowns."
      right={
        <div className="flex items-center gap-2">
          <Badge>
            {canEdit ? "Editable (NEC/SYSTEM)" : "Read-only (Tenant)"}
          </Badge>

          <button
            type="button"
            onClick={refreshNow}
            disabled={countiesQ.isFetching}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-blue-100 px-3 py-2 text-base font-semibold hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw size={16} />
            Refresh
          </button>

          <button
            type="button"
            onClick={openCreate}
            disabled={!canEdit}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-[#0000CD] text-white px-3 py-2 text-lg font-semibold hover:bg-blue-700 disabled:opacity-50"
            title={canEdit ? "Add County" : "NEC/SYSTEM only"}
          >
            <Plus size={16} />
            Add County
          </button>
        </div>
      }
    >
      <Card title="Counties">
        {/* Filters */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex w-full items-center gap-2 sm:max-w-xl">
            <div className="relative w-full">
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
                placeholder="Search counties…"
                className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-base outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <button
              type="button"
              onClick={() => {
                setQ("");
                setPage(0);
              }}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-base font-semibold hover:bg-slate-50"
            >
              Clear
            </button>
          </div>
        </div>

        {/* Status */}
        <div className="mt-3">
          {countiesQ.isLoading ? (
            <div className="text-sm text-slate-600">Loading counties…</div>
          ) : countiesQ.isError ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {(countiesQ.error as any)?.message ?? "Failed to load counties."}
            </div>
          ) : null}
        </div>

        {/* Table */}
        <div className="mt-3">
          <Table
            columns={["County", "Actions"]}
            rows={
              rows.length === 0 && !countiesQ.isLoading
                ? [
                    [
                      <span key="empty" className="text-slate-600">
                        No counties found.
                      </span>,
                      "",
                    ],
                  ]
                : rows.map((c) => [
                    <div
                      key={c.countyId}
                      className="font-semibold text-slate-900"
                    >
                      {safeStr(c.countyName) || "—"}
                    </div>,
                    <div
                      key={`${c.countyId}-actions`}
                      className="flex items-center gap-2"
                    >
                      <button
                        type="button"
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white text-green-600 px-3 py-2 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50"
                        disabled={!canEdit}
                        title={canEdit ? "Edit" : "NEC/SYSTEM only"}
                        onClick={() => openEdit(c)}
                      >
                        <Pencil size={16} />
                      </button>

                      <button
                        type="button"
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50"
                        disabled={!canEdit || deleteM.isPending}
                        title={canEdit ? "Delete" : "NEC/SYSTEM only"}
                        onClick={() => {
                          const ok = window.confirm(
                            `Delete county "${safeStr(c.countyName)}"?`
                          );
                          if (ok) deleteM.mutate(c.countyId);
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
              "NEC_ADMIN and SYSTEM_ADMIN can create/edit/delete counties.",
              "Tenants can view counties read-only.",
              "Counties drive district/polling center drilldowns everywhere.",
            ]}
          />
          <Note
            title="API mapping"
            bullets={[
              "GET /api/counties?q=&page=&size=",
              "POST /api/counties",
              "PUT /api/counties/{countyId}",
              "DELETE /api/counties/{countyId}",
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
                  {editing ? "Edit County" : "Add County"}
                </h2>
                <p className="text-blue-100 mt-1 text-sm">
                  {editing
                    ? "Update county master data."
                    : "Create a new county."}
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
              {/* County Name Input */}
              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wide block mb-2">
                  County Name *
                </label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !saving) {
                      save();
                    }
                  }}
                  disabled={saving}
                  type="text"
                  placeholder="e.g., Montserrado"
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
                      {(error as any)?.message ?? "Failed to save county."}
                    </div>
                  </div>
                </div>
              )}

              {/* Info Message */}
              <div className="rounded-xl bg-blue-50 border border-blue-200 p-3">
                <p className="text-xs text-blue-700">
                  💡 <span className="font-semibold">Tip:</span> County names are global master data. Press Enter to save or click the Save button.
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
                disabled={saving || !normalizeName(name) || !canEdit}
                onClick={save}
                className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold transition disabled:opacity-50 shadow-md"
              >
                {saving ? "Saving…" : editing ? "Update County" : "Create County"}
              </button>
            </div>
          </div>
        </div>
      )}
    </PageShell>
  );
}

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, RefreshCw, Search, Trash2 } from "lucide-react";

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
  Modal,
  TextField,
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
  const [touched, setTouched] = useState(false);
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
      setTouched(false);
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
      setTouched(false);
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
    setTouched(false);
    setOpen(true);
  };

  const openEdit = (c: CountyDto) => {
    setEditing(c);
    setName(safeStr(c.countyName));
    setTouched(false);
    setOpen(true);
  };

  const save = () => {
    setTouched(true);
    if (!canEdit) return;
    if (editing) updateM.mutate();
    else createM.mutate();
  };

  const saving = createM.isPending || updateM.isPending;

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
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-[#0000CD] text-white px-3 py-2 text-lg font-semibold hover:bg-slate-500 disabled:opacity-50"
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
                className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-base outline-none focus:ring-2 focus:ring-(--org-primary)"
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

        {/* Table (using your geo-ui Table) */}
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
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white text-[#008000] px-3 py-2 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50"
                        disabled={!canEdit}
                        title={canEdit ? "Edit" : "NEC/SYSTEM only"}
                        onClick={() => openEdit(c)}
                      >
                        <Pencil size={20} />
                        {/* Edit */}
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
                        <Trash2 size={20} className="text-red-600" />
                        {/* Delete */}
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

      {/* Modal */}
      <Modal
        open={open}
        onClose={() => {
          if (saving) return;
          setOpen(false);
        }}
        title={editing ? "Edit County" : "Add County"}
        subtitle={
          editing ? "Update county master data." : "Create a new county."
        }
        footer={
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-base font-semibold hover:bg-slate-50 disabled:opacity-50"
              onClick={() => setOpen(false)}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="button"
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-base font-semibold hover:bg-slate-50 disabled:opacity-50"
              onClick={save}
              disabled={!canEdit || saving}
              title={canEdit ? "Save" : "NEC/SYSTEM only"}
            >
              Save
            </button>
          </div>
        }
      >
        <div className="grid grid-cols-1 gap-3">
          <TextField
            label="County Name"
            value={name}
            onChange={setName}
            required
            placeholder="e.g., Montserrado"
            error={touched && !normalizeName(name) ? "Required" : ""}
            onBlur={() => setTouched(true)}
          />

          {createM.isError || updateM.isError ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-base text-red-700">
              {(createM.error as any)?.message ??
                (updateM.error as any)?.message ??
                "Failed to save county."}
            </div>
          ) : null}
        </div>
      </Modal>
    </PageShell>
  );
}

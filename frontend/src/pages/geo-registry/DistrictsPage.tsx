// src/pages/geo-registry/DistrictsPage.tsx

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, RefreshCw, Search, Trash2 } from "lucide-react";

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
  const [touched, setTouched] = useState(false);

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
      setTouched(false);
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
      setTouched(false);
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

  const openCreate = () => {
    setEditing(null);
    setDistrictName("");
    setCountyId(""); // must pick
    setTouched(false);
    setOpen(true);
  };

  const openEdit = (d: DistrictDto) => {
    setEditing(d);
    setDistrictName(safeStr(d.districtName));
    setCountyId(safeStr(d.countyId));
    setTouched(false);
    setOpen(true);
  };

  const save = () => {
    setTouched(true);
    if (!canEdit) return;
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
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw size={16} />
            Refresh
          </button>

          <button
            type="button"
            onClick={openCreate}
            disabled={!canEdit}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50"
            title={canEdit ? "Add District" : "NEC/SYSTEM only"}
          >
            <Plus size={16} />
            Add District
          </button>
        </div>
      }
    >
      <Card title="Districts">
        {/* Filters */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex w-full flex-wrap items-center gap-2 sm:max-w-4xl">
            <div className="relative w-full sm:max-w-xl">
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
                placeholder="Search districts…"
                className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-(--org-primary)"
              />
            </div>

            <select
              value={countyFilter}
              onChange={(e) => {
                setCountyFilter(e.target.value);
                setPage(0);
              }}
              disabled={countiesQ.isLoading || countiesQ.isError}
              className="w-full sm:w-72 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-(--org-primary) disabled:bg-slate-50"
            >
              <option value="">
                {countiesQ.isLoading ? "Loading counties…" : "All counties"}
              </option>
              {countyOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => {
                setQ("");
                setCountyFilter("");
                setPage(0);
              }}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold hover:bg-slate-50"
            >
              Clear
            </button>
          </div>
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
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50"
                        disabled={!canEdit}
                        title={canEdit ? "Edit" : "NEC/SYSTEM only"}
                        onClick={() => openEdit(d)}
                      >
                        <Pencil size={16} />
                        {/* Edit */}
                      </button>

                      <button
                        type="button"
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50"
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
                        {/* Delete */}
                      </button>
                    </div>,
                  ])
            }
          />
        </div>

        {/* Pagination */}
        <div className="mt-3 flex items-center justify-between">
          <div className="text-xs text-slate-600">
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

      {/* Modal */}
      <Modal
        open={open}
        onClose={() => {
          if (saving) return;
          setOpen(false);
        }}
        title={editing ? "Edit District" : "Add District"}
        subtitle={
          editing ? "Update district master data." : "Create a new district."
        }
        footer={
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50"
              onClick={() => setOpen(false)}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="button"
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50"
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
          <label className="block">
            <div className="mb-1 text-[11px] font-semibold text-slate-600">
              County <span className="text-red-600">*</span>
            </div>
            <select
              value={countyId}
              onChange={(e) => setCountyId(e.target.value)}
              disabled={!canEdit || countiesQ.isLoading || countiesQ.isError}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-(--org-primary) disabled:bg-slate-50"
            >
              <option value="">
                {countiesQ.isLoading
                  ? "Loading counties…"
                  : "— Select County —"}
              </option>
              {countyOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>

            {touched && !safeStr(countyId).trim() ? (
              <div className="mt-1 text-[11px] font-semibold text-red-600">
                Required
              </div>
            ) : null}
          </label>

          <TextField
            label="District Name"
            value={districtName}
            onChange={setDistrictName}
            required
            placeholder="e.g., District 1"
            error={touched && !normalizeName(districtName) ? "Required" : ""}
            onBlur={() => setTouched(true)}
          />

          {createM.isError || updateM.isError ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {(createM.error as any)?.message ??
                (updateM.error as any)?.message ??
                "Failed to save district."}
            </div>
          ) : null}
        </div>
      </Modal>
    </PageShell>
  );
}

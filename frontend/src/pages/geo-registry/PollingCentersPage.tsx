

// src/pages/geo-registry/PollingCentersPage.tsx

import React, { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, RefreshCw, Search, Trash2, X, AlertCircle, ChevronDown } from "lucide-react";

import { useAuthStore } from "../../shared/store/authStore";
import {
  fetchCounties,
  type CountyDto,
} from "../../shared/services/countyService";
import {
  fetchDistricts,
  type DistrictDto,
} from "../../shared/services/districtService";

import {
  createPollingCenter,
  deletePollingCenter,
  fetchPollingCenters,
  updatePollingCenter,
  type PollingCenterDto,
} from "../../shared/services/pollingCenterService";

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
function fmtDate(v?: string | null) {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v);
  return d.toLocaleString();
}

type FilterMode = "CENTER" | "COUNTY" | "DISTRICT";

export default function PollingCentersPage() {
  const qc = useQueryClient();

  const dashboardMode = useAuthStore((s) => s.dashboardMode);
  const canEdit = dashboardMode === "SYSTEM" || dashboardMode === "NEC";

  const size = 20;
  const [page, setPage] = useState(0);

  const [mode, setMode] = useState<FilterMode>("CENTER");
  const [qCenter, setQCenter] = useState("");
  const [countyId, setCountyId] = useState("");
  const [districtId, setDistrictId] = useState("");

  const [districtClickWarn, setDistrictClickWarn] = useState(false);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<PollingCenterDto | null>(null);

  const [centerName, setCenterName] = useState("");
  const [formCountyId, setFormCountyId] = useState("");
  const [formDistrictId, setFormDistrictId] = useState("");

  const countiesQ = useQuery({
    queryKey: ["counties-lookup", "polling-centers"],
    queryFn: async () => {
      const res = await fetchCounties({ page: 0, size: 250, q: undefined });
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

  const districtsByCountyQ = useQuery({
    queryKey: [
      "districts-filter",
      "by-county-required",
      countyId || "no-county",
    ],
    queryFn: async () => {
      const res = await fetchDistricts({
        page: 0,
        size: 800,
        q: undefined,
        countyId: countyId || undefined,
      });
      return (res.items ?? []) as DistrictDto[];
    },
    enabled: !!countyId,
    staleTime: 1000 * 60 * 10,
    retry: 1,
  });

  const districtOptions = useMemo(() => {
    return (districtsByCountyQ.data ?? []).map((d) => ({
      value: d.districtId,
      label: safeStr(d.districtName) || "—",
    }));
  }, [districtsByCountyQ.data]);

  React.useEffect(() => {
    setDistrictId("");
  }, [countyId]);

  const districtsForModalQ = useQuery({
    queryKey: ["districts-modal", formCountyId || "no-county"],
    queryFn: async () => {
      const res = await fetchDistricts({
        page: 0,
        size: 800,
        q: undefined,
        countyId: formCountyId || undefined,
      });
      return (res.items ?? []) as DistrictDto[];
    },
    enabled: open && !!formCountyId,
    staleTime: 1000 * 60 * 10,
    retry: 1,
  });

  const modalDistrictOptions = useMemo(() => {
    return (districtsForModalQ.data ?? []).map((d) => ({
      value: d.districtId,
      label: safeStr(d.districtName) || "—",
    }));
  }, [districtsForModalQ.data]);

  const effectiveParams = useMemo(() => {
    if (mode === "CENTER") {
      return {
        q: qCenter.trim() || undefined,
        countyId: undefined,
        districtId: undefined,
      };
    }
    if (mode === "COUNTY") {
      return {
        q: undefined,
        countyId: countyId.trim() || undefined,
        districtId: undefined,
      };
    }
    return {
      q: undefined,
      countyId: countyId.trim() || undefined,
      districtId: districtId.trim() || undefined,
    };
  }, [mode, qCenter, countyId, districtId]);

  const centersQ = useQuery({
    queryKey: [
      "polling-centers",
      page,
      mode,
      effectiveParams.q,
      effectiveParams.countyId,
      effectiveParams.districtId,
    ],
    queryFn: () =>
      fetchPollingCenters({
        page,
        size,
        q: effectiveParams.q,
        countyId: effectiveParams.countyId,
        districtId: effectiveParams.districtId,
      }),
    staleTime: 10_000,
    retry: 1,
  });

  const centers = useMemo(() => centersQ.data?.items ?? [], [centersQ.data]);
  const totalPages = Math.max(1, centersQ.data?.totalPages ?? 1);

  const refreshNow = async () => {
    await qc.invalidateQueries({ queryKey: ["polling-centers"] });
    await centersQ.refetch();
  };

  const createM = useMutation({
    mutationFn: async () => {
      const name = normalizeName(centerName);
      const did = safeStr(formDistrictId).trim();
      if (!name) throw new Error("Center name is required.");
      if (!did) throw new Error("District is required.");
      return createPollingCenter({ centerName: name, districtId: did });
    },
    onSuccess: async () => {
      setOpen(false);
      setEditing(null);
      setCenterName("");
      setFormCountyId("");
      setFormDistrictId("");
      await refreshNow();
    },
  });

  const updateM = useMutation({
    mutationFn: async () => {
      if (!editing) throw new Error("No center selected.");
      const name = normalizeName(centerName);
      const did = safeStr(formDistrictId).trim();
      if (!name) throw new Error("Center name is required.");
      if (!did) throw new Error("District is required.");
      return updatePollingCenter(editing.centerId, {
        centerName: name,
        districtId: did,
      });
    },
    onSuccess: async () => {
      setOpen(false);
      setEditing(null);
      setCenterName("");
      setFormCountyId("");
      setFormDistrictId("");
      await refreshNow();
    },
  });

  const deleteM = useMutation({
    mutationFn: async (id: string) => deletePollingCenter(id),
    onSuccess: refreshNow,
  });

  const saving = createM.isPending || updateM.isPending;
  const error = createM.error || updateM.error;

  const openCreate = () => {
    setEditing(null);
    setCenterName("");
    setFormCountyId("");
    setFormDistrictId("");
    setOpen(true);
  };

  const openEdit = (c: PollingCenterDto) => {
    setEditing(c);
    setCenterName(safeStr(c.centerName));
    setFormCountyId(safeStr(c.countyId));
    setFormDistrictId(safeStr(c.districtId));
    setOpen(true);
  };

  const save = () => {
    if (!canEdit) return;
    if (!normalizeName(centerName)) return;
    if (!safeStr(formDistrictId).trim()) return;
    if (editing) updateM.mutate();
    else createM.mutate();
  };

  const setModeAndReset = (next: FilterMode) => {
    setMode(next);
    setPage(0);

    if (next === "CENTER") {
      setCountyId("");
      setDistrictId("");
    } else if (next === "COUNTY") {
      setQCenter("");
      setDistrictId("");
    } else {
      setQCenter("");
      setDistrictId("");
    }
  };

  const tableColumns =
    mode === "DISTRICT"
      ? ["District", "Code", "Center", "Created", "Actions"]
      : ["County", "District", "Code", "Center", "Created", "Actions"];

  const districtDisabled = !countyId;
  const districtDropdownLoading = !!countyId && districtsByCountyQ.isLoading;
  const districtDropdownError = !!countyId && districtsByCountyQ.isError;

  const warnDistrictNeedsCounty = () => {
    if (!countyId) {
      setDistrictClickWarn(true);
      window.setTimeout(() => setDistrictClickWarn(false), 2000);
    }
  };

  return (
    <PageShell
      title="Geography • Polling Centers"
      subtitle="Global centers used by allocations, submissions, and official geo reporting."
      right={
        <div className="flex items-center gap-2">
          <Badge>
            {canEdit ? "Editable (NEC/SYSTEM)" : "Read-only (Tenant)"}
          </Badge>

          <button
            type="button"
            onClick={refreshNow}
            disabled={centersQ.isFetching}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-blue-100 px-3 py-2 text-base font-semibold hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw size={16} />
            Refresh
          </button>

          <button
            type="button"
            onClick={openCreate}
            disabled={!canEdit}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-[#0000CD] text-white px-3 py-2 text-base font-semibold hover:bg-blue-700 disabled:opacity-50"
            title={canEdit ? "Add Center" : "NEC/SYSTEM only"}
          >
            <Plus size={16} />
            Add Center
          </button>
        </div>
      }
    >
      <Card title="Polling Centers">
        {/* ✅ CONDENSED FILTERS */}
        <div className="flex items-end gap-2 mb-4">
          {/* Search */}
          <div className="relative w-80">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              size={16}
            />
            <input
              value={qCenter}
              onChange={(e) => {
                setQCenter(e.target.value);
                setPage(0);
                setMode("CENTER");
              }}
              placeholder="Search center…"
              className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-base outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* County Filter */}
          <div className="relative w-80">
            <select
              value={countyId}
              onChange={(e) => {
                setMode("COUNTY");
                setCountyId(e.target.value);
                setDistrictId("");
                setPage(0);
              }}
              disabled={countiesQ.isLoading || countiesQ.isError}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 pr-10 text-base outline-none focus:ring-2 focus:ring-blue-500 appearance-none disabled:bg-slate-50"
            >
              <option value="">
                {countiesQ.isLoading ? "Loading…" : "County"}
              </option>
              {countyOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>

          {/* District Filter */}
          <div
            className="relative w-80"
            onMouseDown={warnDistrictNeedsCounty}
            onTouchStart={warnDistrictNeedsCounty}
          >
            {districtClickWarn ? (
              <div className="pointer-events-none absolute -top-8 left-0 z-10 rounded-xl border border-amber-200 bg-amber-50 px-3 py-1 text-base font-semibold text-amber-800 shadow-sm whitespace-nowrap">
                Select a county first.
              </div>
            ) : null}

            <select
              value={districtId}
              onChange={(e) => {
                setMode("DISTRICT");
                setDistrictId(e.target.value);
                setPage(0);
              }}
              disabled={
                districtDisabled ||
                districtDropdownLoading ||
                districtDropdownError
              }
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 pr-10 text-base outline-none focus:ring-2 focus:ring-blue-500 appearance-none disabled:bg-slate-50"
              title={
                districtDisabled ? "Select county first" : "Select district"
              }
            >
              <option value="">
                {districtDisabled
                  ? "Select county…"
                  : districtDropdownLoading
                  ? "Loading…"
                  : "District"}
              </option>

              {districtOptions.map((o) => (
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
              setMode("CENTER");
              setQCenter("");
              setCountyId("");
              setDistrictId("");
              setPage(0);
            }}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-base font-semibold hover:bg-slate-50 whitespace-nowrap"
          >
            Clear All
          </button>
        </div>

        {/* Status */}
        <div className="mt-3">
          {centersQ.isLoading ? (
            <div className="text-sm text-slate-600">
              Loading polling centers…
            </div>
          ) : centersQ.isError ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {(centersQ.error as any)?.message ??
                "Failed to load polling centers."}
            </div>
          ) : null}
        </div>

        {/* Table */}
        <div className="mt-3">
          <Table
            columns={tableColumns}
            rows={
              centers.length === 0 && !centersQ.isLoading
                ? [
                    [
                      <span key="empty" className="text-slate-600">
                        No polling centers found.
                      </span>,
                      "",
                      "",
                      "",
                      "",
                    ],
                  ]
                : centers.map((c) => {
                    const county = safeStr(c.countyName) || "—";
                    const district = safeStr(c.districtName) || "—";
                    const code = safeStr(c.code) || "—";
                    const name = safeStr(c.centerName) || "—";
                    const created = fmtDate(c.createdAt);

                    const actions = (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-green-600 text-base font-semibold hover:bg-slate-50 disabled:opacity-50"
                          disabled={!canEdit}
                          onClick={() => openEdit(c)}
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          type="button"
                          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-base font-semibold hover:bg-slate-50 disabled:opacity-50"
                          disabled={!canEdit || deleteM.isPending}
                          onClick={() => {
                            const ok = window.confirm(
                              `Delete polling center "${name}"?`
                            );
                            if (ok) deleteM.mutate(c.centerId);
                          }}
                        >
                          <Trash2 size={16} className="text-red-600" />
                        </button>
                      </div>
                    );

                    if (mode === "DISTRICT")
                      return [district, code, name, created, actions];
                    return [county, district, code, name, created, actions];
                  })
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

        <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
          <Note
            title="Filter rules"
            bullets={[
              "By Center: shows County + District + Center.",
              "By County: filter centers by selected county.",
              "By District: County must be selected first (district list is county-scoped).",
            ]}
          />
          <Note
            title="API mapping"
            bullets={[
              "GET /api/polling-centers?q=&countyId=&districtId=&page=&size=",
              "POST /api/polling-centers",
              "PUT /api/polling-centers/{id}",
              "DELETE /api/polling-centers/{id}",
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
                  {editing ? "Edit Polling Center" : "Add Polling Center"}
                </h2>
                <p className="text-blue-100 mt-1 text-sm">
                  {editing
                    ? "Update polling center master data."
                    : "Create a new polling center."}
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
                    value={formCountyId}
                    onChange={(e) => {
                      setFormCountyId(e.target.value);
                      setFormDistrictId("");
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !saving && formDistrictId && normalizeName(centerName)) {
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

              {/* District Dropdown */}
              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wide block mb-2">
                  District *
                </label>
                <div className="relative">
                  <select
                    value={formDistrictId}
                    onChange={(e) => setFormDistrictId(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !saving) {
                        save();
                      }
                    }}
                    disabled={
                      saving ||
                      !formCountyId ||
                      districtsForModalQ.isLoading ||
                      districtsForModalQ.isError
                    }
                    className="w-full px-4 py-3 rounded-xl border border-slate-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none disabled:bg-slate-100 disabled:text-slate-500 pr-10"
                    title={
                      !formCountyId ? "Select a county first" : "Select district"
                    }
                  >
                    <option value="">
                      {!formCountyId
                        ? "Select county first…"
                        : districtsForModalQ.isLoading
                        ? "Loading districts…"
                        : "-- Select District --"}
                    </option>
                    {modalDistrictOptions.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {/* Center Name Input */}
              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wide block mb-2">
                  Center Name *
                </label>
                <input
                  value={centerName}
                  onChange={(e) => setCenterName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !saving) {
                      save();
                    }
                  }}
                  disabled={saving}
                  type="text"
                  placeholder="e.g., Paynesville City Hall"
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
                      {(error as any)?.message ?? "Failed to save polling center."}
                    </div>
                  </div>
                </div>
              )}

              {/* Info Message */}
              <div className="rounded-xl bg-blue-50 border border-blue-200 p-3">
                <p className="text-xs text-blue-700">
                  💡 <span className="font-semibold">Tip:</span> Select county first, then district, then enter center name. Press Enter to save.
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
                disabled={saving || !normalizeName(centerName) || !safeStr(formDistrictId).trim() || !canEdit}
                onClick={save}
                className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold transition disabled:opacity-50 shadow-md"
              >
                {saving ? "Saving…" : editing ? "Update Center" : "Create Center"}
              </button>
            </div>
          </div>
        </div>
      )}
    </PageShell>
  );
}
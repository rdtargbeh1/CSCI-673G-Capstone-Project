
// src/pages/geo-registry/PollingCentersPage.tsx

import React, { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, RefreshCw, Search, Trash2 } from "lucide-react";

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
function fmtDate(v?: string | null) {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v);
  return d.toLocaleString();
}

type FilterMode = "CENTER" | "COUNTY" | "DISTRICT";

export default function PollingCentersPage() {
  const qc = useQueryClient();

  // Dashboard switch on who can edit
  const dashboardMode = useAuthStore((s) => s.dashboardMode);
  const canEdit = dashboardMode === "SYSTEM" || dashboardMode === "NEC";

  const size = 20;
  const [page, setPage] = useState(0);

  /** 3 filter boxes */
  const [mode, setMode] = useState<FilterMode>("CENTER");
  const [qCenter, setQCenter] = useState("");
  const [countyId, setCountyId] = useState("");
  const [districtId, setDistrictId] = useState("");

  /** ✅ NEW: click-only tooltip state (no layout space) */
  const [districtClickWarn, setDistrictClickWarn] = useState(false);

  /** modal */
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<PollingCenterDto | null>(null);
  const [touched, setTouched] = useState(false);

  /** form fields */
  const [centerName, setCenterName] = useState("");
  const [formCountyId, setFormCountyId] = useState("");
  const [formDistrictId, setFormDistrictId] = useState("");

  /** Counties lookup */
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

  /** ✅ District dropdown is COUNTY-SCOPED and requires county */
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

  /** ✅ When county changes, clear district */
  React.useEffect(() => {
    setDistrictId("");
  }, [countyId]);

  /** District lookup for MODAL (filtered by selected county in modal) */
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

  /** Effective query params based on mode */
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
    // ✅ DISTRICT mode: county is required, include it for safety
    return {
      q: undefined,
      countyId: countyId.trim() || undefined,
      districtId: districtId.trim() || undefined,
    };
  }, [mode, qCenter, countyId, districtId]);

  /** Centers query */
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

  /** CRUD */
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
      setTouched(false);
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
      setTouched(false);
      await refreshNow();
    },
  });

  const deleteM = useMutation({
    mutationFn: async (id: string) => deletePollingCenter(id),
    onSuccess: refreshNow,
  });

  const saving = createM.isPending || updateM.isPending;

  /** Modal open helpers */
  const openCreate = () => {
    setEditing(null);
    setCenterName("");
    setFormCountyId("");
    setFormDistrictId("");
    setTouched(false);
    setOpen(true);
  };

  const openEdit = (c: PollingCenterDto) => {
    setEditing(c);
    setCenterName(safeStr(c.centerName));
    setFormCountyId(safeStr(c.countyId));
    setFormDistrictId(safeStr(c.districtId));
    setTouched(false);
    setOpen(true);
  };

  const save = () => {
    setTouched(true);
    if (!canEdit) return;
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
      // DISTRICT: county must be selected first (we keep county)
      setQCenter("");
      setDistrictId("");
    }
  };

  /** Table columns change based on filter mode */
  const tableColumns =
    mode === "DISTRICT"
      ? ["District", "Code", "Center", "Created", "Actions"]
      : ["County", "District", "Code", "Center", "Created", "Actions"];

  const districtDisabled = !countyId;
  const districtDropdownLoading = !!countyId && districtsByCountyQ.isLoading;
  const districtDropdownError = !!countyId && districtsByCountyQ.isError;

  /** ✅ NEW: show tooltip ONLY when user clicks District while disabled */
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
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-[#0000CD] text-white px-3 py-2 text-lg font-semibold hover:bg-slate-500 disabled:opacity-50"
            title={canEdit ? "Add Center" : "NEC/SYSTEM only"}
          >
            <Plus size={18} />
            Add Center
          </button>
        </div>
      }
    >
      <Card title="Polling Centers">
        {/* ✅ CONDENSED FILTERS ON LEFT - NO LABELS */}
        <div className="flex items-end gap-2 mb-4">
          {/* Filter 1: Search */}
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
              className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-base outline-none focus:ring-2 focus:ring-(--org-primary)"
            />
          </div>

          {/* Filter 2: County */}
          <select
            value={countyId}
            onChange={(e) => {
              setMode("COUNTY");
              setCountyId(e.target.value);
              setDistrictId("");
              setPage(0);
            }}
            disabled={countiesQ.isLoading || countiesQ.isError}
            className="w-80 rounded-xl border border-slate-200 bg-white px-3 py-2 text-base outline-none focus:ring-2 focus:ring-(--org-primary) disabled:bg-slate-50"
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

          {/* Filter 3: District */}
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
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-base outline-none focus:ring-2 focus:ring-(--org-primary) disabled:bg-slate-50"
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
                          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-[#008000] text-base font-semibold hover:bg-slate-50 disabled:opacity-50"
                          disabled={!canEdit}
                          onClick={() => openEdit(c)}
                        >
                          <Pencil size={20} />
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
                          <Trash2 size={20} className="text-red-600" />
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

      {/* Modal (unchanged) */}
      <Modal
        open={open}
        onClose={() => {
          if (saving) return;
          setOpen(false);
        }}
        title={editing ? "Edit Polling Center" : "Add Polling Center"}
        subtitle={
          editing
            ? "Update polling center master data."
            : "Create a new polling center."
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
          <label className="block">
            <div className="mb-1 text-base font-semibold text-slate-600">
              County <span className="text-red-600">*</span>
            </div>
            <select
              value={formCountyId}
              onChange={(e) => {
                setFormCountyId(e.target.value);
                setFormDistrictId("");
                setTouched(true);
              }}
              disabled={!canEdit || countiesQ.isLoading || countiesQ.isError}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-base outline-none focus:ring-2 focus:ring-(--org-primary) disabled:bg-slate-50"
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
          </label>

          <label className="block">
            <div className="mb-1 text-base font-semibold text-slate-600">
              District <span className="text-red-600">*</span>
            </div>
            <select
              value={formDistrictId}
              onChange={(e) => {
                setFormDistrictId(e.target.value);
                setTouched(true);
              }}
              disabled={
                !canEdit ||
                !formCountyId ||
                districtsForModalQ.isLoading ||
                districtsForModalQ.isError
              }
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-base outline-none focus:ring-2 focus:ring-(--org-primary) disabled:bg-slate-50"
              title={
                !formCountyId ? "Select a county first" : "Select district"
              }
            >
              <option value="">
                {!formCountyId
                  ? "Select county first…"
                  : districtsForModalQ.isLoading
                  ? "Loading districts…"
                  : "— Select District —"}
              </option>
              {modalDistrictOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>

          <TextField
            label="Center Name"
            value={centerName}
            onChange={setCenterName}
            required
            placeholder="e.g., Paynesville City Hall"
            error={touched && !normalizeName(centerName) ? "Required" : ""}
            onBlur={() => setTouched(true)}
          />

          {createM.isError || updateM.isError ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-base text-red-700">
              {(createM.error as any)?.message ??
                (updateM.error as any)?.message ??
                "Failed to save polling center."}
            </div>
          ) : null}
        </div>
      </Modal>
    </PageShell>
  );
}


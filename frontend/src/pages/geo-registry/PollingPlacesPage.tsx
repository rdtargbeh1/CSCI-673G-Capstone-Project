// src/pages/geo-registry/PollingPlacesPage.tsx
// ✅ ONLY CHANGE: add inline alerts when user clicks District without County,
//   and Center without District (County->District->Center). No logic changed.

import React, { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Power,
  PowerOff,
} from "lucide-react";

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
  fetchPollingCenters,
  type PollingCenterDto,
} from "../../shared/services/pollingCenterService";

import {
  createPollingPlace,
  deletePollingPlace,
  fetchPollingPlaces,
  setPollingPlaceActive,
  updatePollingPlace,
  type PollingPlaceDto,
} from "../../shared/services/pollingPlaceService";

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

/** ✅ NEW: friendly error message for duplicate label (unique per center after normalization) */
function friendlyPollingPlaceSaveError(err: any): string {
  const msg =
    safeStr(err?.response?.data?.message) ||
    safeStr(err?.response?.data?.error) ||
    safeStr(err?.message) ||
    "Failed to save polling place.";

  const isDup =
    safeStr(err?.response?.data?.code) === "23505" ||
    safeStr(err?.code) === "23505" ||
    /duplicate|unique|already exists|constraint/i.test(msg);

  const mentionsLabelNorm =
    /uq_place_center_label_norm/i.test(msg) ||
    /center.*label/i.test(msg) ||
    /label.*center/i.test(msg);

  if (isDup && mentionsLabelNorm) {
    return 'This label already exists in the selected center (e.g., "Room 01" and "Room 1" are treated as the same place). Please choose a different label.';
  }

  return msg;
}

type FilterMode = "PLACE" | "COUNTY" | "DISTRICT" | "CENTER";

export default function PollingPlacesPage() {
  const qc = useQueryClient();

  // Who can Edit Dashboard
  const dashboardMode = useAuthStore((s) => s.dashboardMode);
  const canEdit = dashboardMode === "NEC" || dashboardMode === "SYSTEM";

  const size = 20;
  const [page, setPage] = useState(0);

  /** 4 filters */
  const [mode, setMode] = useState<FilterMode>("PLACE");
  const [qPlace, setQPlace] = useState("");
  const [countyId, setCountyId] = useState("");
  const [districtId, setDistrictId] = useState("");
  const [centerId, setCenterId] = useState("");

  /** ✅ NEW: Active filter (applies to any mode) */
  const [activeFilter, setActiveFilter] = useState<"" | "true" | "false">("");

  /** ✅ NEW: inline alerts (user interaction) */
  const [districtPrereqAlert, setDistrictPrereqAlert] = useState(false);
  const [centerPrereqAlert, setCenterPrereqAlert] = useState(false);

  /** modal */
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<PollingPlaceDto | null>(null);
  const [touched, setTouched] = useState(false);

  /** form fields */
  const [formCountyId, setFormCountyId] = useState("");
  const [formDistrictId, setFormDistrictId] = useState("");
  const [formCenterId, setFormCenterId] = useState("");
  const [label, setLabel] = useState("");

  /** Counties lookup */
  const countiesQ = useQuery({
    queryKey: ["counties-lookup", "polling-places"],
    queryFn: async () => {
      const res = await fetchCounties({ page: 0, size: 250, q: undefined });
      return (res.items ?? []) as CountyDto[];
    },
    staleTime: 1000 * 60 * 10,
    retry: 1,
  });

  const countyOptions = useMemo(() => {
    return (countiesQ.data ?? []).map((c) => ({
      value: safeStr(c.countyId),
      label: safeStr(c.countyName) || "—",
    }));
  }, [countiesQ.data]);

  /**
   * FILTER RULES:
   * - District dropdown requires County (county-scoped)
   * - Center dropdown requires County and District (further scoped)
   */

  /** District lookup (FILTERED by county) */
  const districtsByCountyQ = useQuery({
    queryKey: ["districts-places-filter", "by-county", countyId || "no-county"],
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
      value: safeStr(d.districtId),
      label: safeStr(d.districtName) || "—",
    }));
  }, [districtsByCountyQ.data]);

  /** Centers lookup (FILTERED by district; also respects county indirectly via district list) */
  const centersByDistrictQ = useQuery({
    queryKey: [
      "centers-places-filter",
      "by-district",
      districtId || "no-district",
    ],
    queryFn: async () => {
      const res = await fetchPollingCenters({
        page: 0,
        size: 800,
        q: undefined,
        countyId: undefined,
        districtId: districtId || undefined,
      });
      return (res.items ?? []) as PollingCenterDto[];
    },
    enabled: !!districtId,
    staleTime: 1000 * 60 * 10,
    retry: 1,
  });

  const centerOptions = useMemo(() => {
    return (centersByDistrictQ.data ?? []).map((c) => ({
      value: safeStr(c.centerId),
      label: `${safeStr(c.centerName) || "—"}${
        c.code ? ` • ${safeStr(c.code)}` : ""
      }`,
    }));
  }, [centersByDistrictQ.data]);

  /** keep district/center consistent when county changes */
  React.useEffect(() => {
    if (!countyId) {
      setDistrictId("");
      setCenterId("");
      return;
    }

    // if currently selected district not in county list, clear it
    if (districtId) {
      const ok = (districtsByCountyQ.data ?? []).some(
        (d) => safeStr(d.districtId) === safeStr(districtId)
      );
      if (!ok) setDistrictId("");
    }
    // center depends on district; will be cleared by district effect below if needed
  }, [countyId, districtId, districtsByCountyQ.data]);

  /** keep center consistent when district changes */
  React.useEffect(() => {
    if (!districtId) {
      setCenterId("");
      return;
    }
    if (centerId) {
      const ok = (centersByDistrictQ.data ?? []).some(
        (c) => safeStr(c.centerId) === safeStr(centerId)
      );
      if (!ok) setCenterId("");
    }
  }, [districtId, centerId, centersByDistrictQ.data]);

  /** ✅ NEW: clear alerts automatically when prerequisites become valid */
  React.useEffect(() => {
    if (countyId) setDistrictPrereqAlert(false);
  }, [countyId]);

  React.useEffect(() => {
    if (countyId && districtId) setCenterPrereqAlert(false);
  }, [countyId, districtId]);

  /** --- modal cascading (county -> district -> center) --- */
  const districtsForModalQ = useQuery({
    queryKey: ["districts-places-modal", formCountyId || "no-county"],
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
      value: safeStr(d.districtId),
      label: safeStr(d.districtName) || "—",
    }));
  }, [districtsForModalQ.data]);

  const centersForModalQ = useQuery({
    queryKey: ["centers-places-modal", formDistrictId || "no-district"],
    queryFn: async () => {
      const res = await fetchPollingCenters({
        page: 0,
        size: 800,
        q: undefined,
        countyId: undefined,
        districtId: formDistrictId || undefined,
      });
      return (res.items ?? []) as PollingCenterDto[];
    },
    enabled: open && !!formDistrictId,
    staleTime: 1000 * 60 * 10,
    retry: 1,
  });

  const modalCenterOptions = useMemo(() => {
    return (centersForModalQ.data ?? []).map((c) => ({
      value: safeStr(c.centerId),
      label: `${safeStr(c.centerName) || "—"}${
        c.code ? ` • ${safeStr(c.code)}` : ""
      }`,
    }));
  }, [centersForModalQ.data]);

  /** ✅ NEW: active boolean from dropdown */
  const activeBool: boolean | undefined =
    activeFilter === "" ? undefined : activeFilter === "true";

  /** Effective query params based on mode */
  const effectiveParams = useMemo(() => {
    if (mode === "PLACE") {
      return {
        q: qPlace.trim() || undefined,
        countyId: undefined,
        districtId: undefined,
        centerId: undefined,
        active: activeBool,
      };
    }
    if (mode === "COUNTY") {
      return {
        q: undefined,
        countyId: countyId || undefined,
        districtId: undefined,
        centerId: undefined,
        active: activeBool,
      };
    }
    if (mode === "DISTRICT") {
      return {
        q: undefined,
        countyId: undefined,
        districtId: districtId || undefined,
        centerId: undefined,
        active: activeBool,
      };
    }
    // CENTER
    return {
      q: undefined,
      countyId: undefined,
      districtId: undefined,
      centerId: centerId || undefined,
      active: activeBool,
    };
  }, [mode, qPlace, countyId, districtId, centerId, activeBool]);

  /** Polling places query */
  const placesQ = useQuery({
    queryKey: [
      "polling-places",
      page,
      mode,
      effectiveParams.q,
      effectiveParams.countyId,
      effectiveParams.districtId,
      effectiveParams.centerId,
      effectiveParams.active,
    ],
    queryFn: () =>
      fetchPollingPlaces({
        page,
        size,
        q: effectiveParams.q,
        countyId: effectiveParams.countyId,
        districtId: effectiveParams.districtId,
        centerId: effectiveParams.centerId,
        active: effectiveParams.active,
      }),
    staleTime: 10_000,
    retry: 1,
  });

  const places = useMemo(() => placesQ.data?.items ?? [], [placesQ.data]);
  const totalPages = Math.max(1, placesQ.data?.totalPages ?? 1);

  const refreshNow = async () => {
    await qc.invalidateQueries({ queryKey: ["polling-places"] });
    await placesQ.refetch();
  };

  /** CRUD */
  const createM = useMutation({
    mutationFn: async () => {
      const cid = safeStr(formCenterId).trim();
      if (!cid) throw new Error("Center is required.");
      return createPollingPlace({
        centerId: cid,
        label: normalizeName(label) || undefined,
      });
    },
    onSuccess: async () => {
      setOpen(false);
      setEditing(null);
      setFormCountyId("");
      setFormDistrictId("");
      setFormCenterId("");
      setLabel("");
      setTouched(false);
      await refreshNow();
    },
  });

  const updateM = useMutation({
    mutationFn: async () => {
      if (!editing) throw new Error("No place selected.");
      // ✅ only label is editable
      return updatePollingPlace(editing.placeId, {
        label: normalizeName(label) || "",
      });
    },
    onSuccess: async () => {
      setOpen(false);
      setEditing(null);
      setFormCountyId("");
      setFormDistrictId("");
      setFormCenterId("");
      setLabel("");
      setTouched(false);
      await refreshNow();
    },
  });

  const setActiveM = useMutation({
    mutationFn: async (p: PollingPlaceDto) => {
      return setPollingPlaceActive(p.placeId, !p.active);
    },
    onSuccess: refreshNow,
  });

  const deleteM = useMutation({
    mutationFn: async (id: string) => deletePollingPlace(id),
    onSuccess: refreshNow,
  });

  const saving = createM.isPending || updateM.isPending;

  /** Modal open helpers */
  const openCreate = () => {
    setEditing(null);
    setFormCountyId("");
    setFormDistrictId("");
    setFormCenterId("");
    setLabel("");
    setTouched(false);
    setOpen(true);
  };

  const openEdit = (p: PollingPlaceDto) => {
    setEditing(p);
    setFormCountyId(safeStr(p.countyId));
    setFormDistrictId(safeStr(p.districtId));
    setFormCenterId(safeStr(p.centerId));
    setLabel(safeStr(p.label));
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

    if (next === "PLACE") {
      setCountyId("");
      setDistrictId("");
      setCenterId("");
    } else if (next === "COUNTY") {
      setQPlace("");
      setDistrictId("");
      setCenterId("");
    } else if (next === "DISTRICT") {
      setQPlace("");
      // district depends on county; keep countyId (don’t clear)
      setCenterId("");
    } else {
      // CENTER
      setQPlace("");
      // center depends on district+county; keep those
    }
  };

  /** Table columns */
  const tableColumns = [
    "County",
    "District",
    "Center",
    "Place #",
    "Place Code",
    "Label",
    "Active",
    "Actions",
  ];

  const districtDisabled = !countyId;
  const centerDisabled = !countyId || !districtId;

  return (
    <PageShell
      title="Geography • Polling Places"
      subtitle="Places under centers. Allocation and submissions can be place-scoped."
      right={
        <div className="flex items-center gap-2">
          <Badge>
            {canEdit ? "Editable (NEC/SYSTEM)" : "Read-only (Tenant)"}
          </Badge>

          <button
            type="button"
            onClick={refreshNow}
            disabled={placesQ.isFetching}
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
            title={canEdit ? "Add Place" : "NEC/SYSTEM only"}
          >
            <Plus size={16} />
            Add Place
          </button>
        </div>
      }
    >
      <Card title="Polling Places">
        {/* 4 filters */}
        <div className="grid grid-cols-1 gap-2 lg:grid-cols-4">
          {/* 1) Search place */}
          <div className="rounded-2xl border border-slate-200 bg-white p-3">
            <div className="mb-2 flex items-center justify-between">
              <div className="text-xs font-extrabold text-slate-700">
                Search Place
              </div>
              <button
                type="button"
                onClick={() => setModeAndReset("PLACE")}
                className={[
                  "rounded-xl border px-2 py-1 text-xs font-bold",
                  mode === "PLACE"
                    ? "border-slate-200 bg-slate-100"
                    : "border-slate-200 bg-white hover:bg-slate-50",
                ].join(" ")}
              >
                Use
              </button>
            </div>

            <div className="relative">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                size={16}
              />
              <input
                value={qPlace}
                onChange={(e) => {
                  setQPlace(e.target.value);
                  setPage(0);
                  setMode("PLACE");
                }}
                placeholder="Search code, label, center…"
                className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-(--org-primary)"
              />
            </div>
          </div>

          {/* 2) County */}
          <div className="rounded-2xl border border-slate-200 bg-white p-3">
            <div className="mb-2 flex items-center justify-between">
              <div className="text-xs font-extrabold text-slate-700">
                By County
              </div>
              <button
                type="button"
                onClick={() => setModeAndReset("COUNTY")}
                className={[
                  "rounded-xl border px-2 py-1 text-xs font-bold",
                  mode === "COUNTY"
                    ? "border-slate-200 bg-slate-100"
                    : "border-slate-200 bg-white hover:bg-slate-50",
                ].join(" ")}
              >
                Use
              </button>
            </div>

            <select
              value={countyId}
              onChange={(e) => {
                setMode("COUNTY");
                setCountyId(e.target.value);

                // clear inline alerts when user complies
                setDistrictPrereqAlert(false);
                setCenterPrereqAlert(false);

                setDistrictId("");
                setCenterId("");
                setPage(0);
              }}
              disabled={countiesQ.isLoading || countiesQ.isError}
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
          </div>

          {/* 3) District (requires county) */}
          <div className="rounded-2xl border border-slate-200 bg-white p-3">
            <div className="mb-2 flex items-center justify-between">
              <div className="text-xs font-extrabold text-slate-700">
                By District
              </div>
              <button
                type="button"
                onClick={() => setModeAndReset("DISTRICT")}
                className={[
                  "rounded-xl border px-2 py-1 text-xs font-bold",
                  mode === "DISTRICT"
                    ? "border-slate-200 bg-slate-100"
                    : "border-slate-200 bg-white hover:bg-slate-50",
                ].join(" ")}
              >
                Use
              </button>
            </div>

            {/* ✅ wrapper to detect click even if select is disabled */}
            <div
              className="relative"
              onMouseDown={() => {
                if (!countyId) setDistrictPrereqAlert(true);
              }}
              onTouchStart={() => {
                if (!countyId) setDistrictPrereqAlert(true);
              }}
            >
              <select
                value={districtId}
                onChange={(e) => {
                  setMode("DISTRICT");
                  setDistrictId(e.target.value);
                  setCenterId("");

                  // clear center alert since district is now chosen
                  setCenterPrereqAlert(false);

                  setPage(0);
                }}
                disabled={districtDisabled || districtsByCountyQ.isError}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-(--org-primary) disabled:bg-slate-50"
                title={
                  districtDisabled ? "Select county first" : "Select district"
                }
              >
                <option value="">
                  {!countyId
                    ? "Select county first…"
                    : districtsByCountyQ.isLoading
                    ? "Loading districts…"
                    : "— Select District —"}
                </option>

                {districtOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>

            {/* ✅ inline alert */}
            {districtPrereqAlert && !countyId ? (
              <div className="mt-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
                Please select a <b>County</b> first before choosing a{" "}
                <b>District</b>.
              </div>
            ) : null}
          </div>

          {/* 4) Center (requires county + district) */}
          <div className="rounded-2xl border border-slate-200 bg-white p-3">
            <div className="mb-2 flex items-center justify-between">
              <div className="text-xs font-extrabold text-slate-700">
                By Center
              </div>
              <button
                type="button"
                onClick={() => setModeAndReset("CENTER")}
                className={[
                  "rounded-xl border px-2 py-1 text-xs font-bold",
                  mode === "CENTER"
                    ? "border-slate-200 bg-slate-100"
                    : "border-slate-200 bg-white hover:bg-slate-50",
                ].join(" ")}
              >
                Use
              </button>
            </div>

            {/* ✅ wrapper to detect click even if select is disabled */}
            <div
              className="relative"
              onMouseDown={() => {
                if (!districtId) setCenterPrereqAlert(true);
              }}
              onTouchStart={() => {
                if (!districtId) setCenterPrereqAlert(true);
              }}
            >
              <select
                value={centerId}
                onChange={(e) => {
                  setMode("CENTER");
                  setCenterId(e.target.value);
                  setPage(0);
                }}
                disabled={centerDisabled || centersByDistrictQ.isError}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-(--org-primary) disabled:bg-slate-50"
                title={
                  centerDisabled
                    ? "Select county + district first"
                    : "Select center"
                }
              >
                <option value="">
                  {!districtId
                    ? "Select district first…"
                    : centersByDistrictQ.isLoading
                    ? "Loading centers…"
                    : "— Select Center —"}
                </option>

                {centerOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>

            {/* ✅ inline alert */}
            {centerPrereqAlert && (!countyId || !districtId) ? (
              <div className="mt-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
                Please select a <b>County</b> first, then a <b>District</b>,
                before choosing a <b>Center</b>.
              </div>
            ) : null}
          </div>
        </div>

        {/* Clear all + ✅ NEW Active filter */}
        <div className="mt-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="text-xs font-extrabold text-slate-700">
              Active Filter
            </div>
            <select
              value={activeFilter}
              onChange={(e) => {
                setActiveFilter(e.target.value as any);
                setPage(0);
              }}
              className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-(--org-primary)"
              title="Filter by active status"
            >
              <option value="">All</option>
              <option value="true">Active only</option>
              <option value="false">Inactive only</option>
            </select>
          </div>

          <button
            type="button"
            onClick={() => {
              setMode("PLACE");
              setQPlace("");
              setCountyId("");
              setDistrictId("");
              setCenterId("");
              setActiveFilter("");

              // ✅ clear alerts too
              setDistrictPrereqAlert(false);
              setCenterPrereqAlert(false);

              setPage(0);
            }}
            className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold hover:bg-slate-50"
          >
            Clear All
          </button>
        </div>

        {/* Status */}
        <div className="mt-3">
          {placesQ.isLoading ? (
            <div className="text-sm text-slate-600">
              Loading polling places…
            </div>
          ) : placesQ.isError ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {(placesQ.error as any)?.message ??
                "Failed to load polling places."}
            </div>
          ) : null}
        </div>

        {/* Table */}
        <div className="mt-3">
          <Table
            columns={tableColumns}
            rows={
              places.length === 0 && !placesQ.isLoading
                ? [
                    [
                      <span key="empty" className="text-slate-600">
                        No polling places found.
                      </span>,
                      "",
                      "",
                      "",
                      "",
                      "",
                      "",
                      "",
                    ],
                  ]
                : places.map((p) => {
                    const county = safeStr(p.countyName) || "—";
                    const district = safeStr(p.districtName) || "—";
                    const center = `${safeStr(p.centerName) || "—"}${
                      p.centerCode ? ` • ${safeStr(p.centerCode)}` : ""
                    }`;
                    const placeNo = String(p.placeNumber ?? "—");
                    const placeCode = safeStr(p.code) || "—";
                    const placeLabel = safeStr(p.label) || "—";
                    const active = !!p.active;

                    const actions = (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50"
                          disabled={!canEdit || setActiveM.isPending}
                          title={
                            canEdit
                              ? active
                                ? "Deactivate"
                                : "Activate"
                              : "NEC/SYSTEM only"
                          }
                          onClick={() => setActiveM.mutate(p)}
                        >
                          {active ? (
                            <PowerOff size={16} className="text-amber-600" />
                          ) : (
                            <Power size={16} className="text-emerald-600" />
                          )}
                        </button>

                        <button
                          type="button"
                          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50"
                          disabled={!canEdit}
                          onClick={() => openEdit(p)}
                        >
                          <Pencil size={16} />
                        </button>

                        <button
                          type="button"
                          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50"
                          disabled={!canEdit || deleteM.isPending}
                          onClick={() => {
                            const ok = window.confirm(
                              `Hard delete polling place "${placeCode}"?\nThis is permanent.`
                            );
                            if (ok) deleteM.mutate(p.placeId);
                          }}
                        >
                          <Trash2 size={16} className="text-red-600" />
                        </button>
                      </div>
                    );

                    return [
                      county,
                      district,
                      center,
                      placeNo,
                      placeCode,
                      placeLabel,
                      active ? (
                        <span className="font-semibold text-emerald-700">
                          Yes
                        </span>
                      ) : (
                        <span className="font-semibold text-slate-500">No</span>
                      ),
                      actions,
                    ];
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
              "Search Place: search by place code/label/center name.",
              "County must be selected first to unlock District filter.",
              "District must be selected to unlock Center filter.",
              "Center filter lists places only for that center.",
              "Active Filter applies to any filter mode.",
            ]}
          />
          <Note
            title="API mapping"
            bullets={[
              "GET /api/polling-places?q=&countyId=&districtId=&centerId=&active=&page=&size=",
              "POST /api/polling-places",
              "PUT /api/polling-places/{id} (label only)",
              "PUT /api/polling-places/{id}/active?active=true|false",
              "DELETE /api/polling-places/{id} (hard delete)",
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
        title={editing ? "Edit Polling Place" : "Add Polling Place"}
        subtitle={
          editing
            ? "Only label can be updated. Location fields are read-only."
            : "Create a new polling place under a center."
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
          {/* County */}
          <label className="block">
            <div className="mb-1 text-[11px] font-semibold text-slate-600">
              County <span className="text-red-600">*</span>
            </div>

            <select
              value={formCountyId}
              onChange={(e) => {
                setFormCountyId(e.target.value);
                setFormDistrictId("");
                setFormCenterId("");
                setTouched(true);
              }}
              disabled={
                !canEdit ||
                countiesQ.isLoading ||
                countiesQ.isError ||
                !!editing // readonly on edit
              }
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
          </label>

          {/* District */}
          <label className="block">
            <div className="mb-1 text-[11px] font-semibold text-slate-600">
              District <span className="text-red-600">*</span>
            </div>

            <select
              value={formDistrictId}
              onChange={(e) => {
                setFormDistrictId(e.target.value);
                setFormCenterId("");
                setTouched(true);
              }}
              disabled={
                !canEdit ||
                !formCountyId ||
                districtsForModalQ.isLoading ||
                districtsForModalQ.isError ||
                !!editing // readonly on edit
              }
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-(--org-primary) disabled:bg-slate-50"
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

          {/* Center */}
          <label className="block">
            <div className="mb-1 text-[11px] font-semibold text-slate-600">
              Center <span className="text-red-600">*</span>
            </div>

            <select
              value={formCenterId}
              onChange={(e) => {
                setFormCenterId(e.target.value);
                setTouched(true);
              }}
              disabled={
                !canEdit ||
                !formDistrictId ||
                centersForModalQ.isLoading ||
                centersForModalQ.isError ||
                !!editing // readonly on edit
              }
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-(--org-primary) disabled:bg-slate-50"
              title={
                !formDistrictId ? "Select district first" : "Select center"
              }
            >
              <option value="">
                {!formDistrictId
                  ? "Select district first…"
                  : centersForModalQ.isLoading
                  ? "Loading centers…"
                  : "— Select Center —"}
              </option>
              {modalCenterOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>

          {/* Label (editable even on edit) */}
          <TextField
            label="Label (optional)"
            value={label}
            onChange={setLabel}
            required={false}
            placeholder='e.g., "Room 1", "Hall A"'
            error={""}
            onBlur={() => setTouched(true)}
          />

          {!editing && touched && !safeStr(formCenterId).trim() ? (
            <div className="text-[11px] font-semibold text-red-600">
              Center is required.
            </div>
          ) : null}

          {createM.isError || updateM.isError ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {createM.isError
                ? friendlyPollingPlaceSaveError(createM.error)
                : friendlyPollingPlaceSaveError(updateM.error)}
            </div>
          ) : null}
        </div>
      </Modal>
    </PageShell>
  );
}

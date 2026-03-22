

// src/pages/geo-registry/PollingPlacesPage.tsx

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
  X,
  AlertCircle,
  ChevronDown,
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
} from "./shared/geo-ui";

/** ---------------- helpers ---------------- */
function safeStr(v: any) {
  return typeof v === "string" ? v : v == null ? "" : String(v);
}
function normalizeName(v: string) {
  return v.trim().replace(/\s+/g, " ");
}

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

  const dashboardMode = useAuthStore((s) => s.dashboardMode);
  const canEdit = dashboardMode === "NEC" || dashboardMode === "SYSTEM";

  const size = 20;
  const [page, setPage] = useState(0);

  const [mode, setMode] = useState<FilterMode>("PLACE");
  const [qPlace, setQPlace] = useState("");
  const [countyId, setCountyId] = useState("");
  const [districtId, setDistrictId] = useState("");
  const [centerId, setCenterId] = useState("");

  const [activeFilter, setActiveFilter] = useState<"" | "true" | "false">("");

  const [districtPrereqAlert, setDistrictPrereqAlert] = useState(false);
  const [centerPrereqAlert, setCenterPrereqAlert] = useState(false);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<PollingPlaceDto | null>(null);

  const [formCountyId, setFormCountyId] = useState("");
  const [formDistrictId, setFormDistrictId] = useState("");
  const [formCenterId, setFormCenterId] = useState("");
  const [label, setLabel] = useState("");

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

  const centersByDistrictQ = useQuery({
    queryKey: ["centers-places-filter", "by-district", districtId || "no-district"],
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
      label: `${safeStr(c.centerName) || "—"}${c.code ? ` • ${safeStr(c.code)}` : ""}`,
    }));
  }, [centersByDistrictQ.data]);

  React.useEffect(() => {
    if (!countyId) {
      setDistrictId("");
      setCenterId("");
      return;
    }

    if (districtId) {
      const ok = (districtsByCountyQ.data ?? []).some(
        (d) => safeStr(d.districtId) === safeStr(districtId)
      );
      if (!ok) setDistrictId("");
    }
  }, [countyId, districtId, districtsByCountyQ.data]);

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

  React.useEffect(() => {
    if (countyId) setDistrictPrereqAlert(false);
  }, [countyId]);

  React.useEffect(() => {
    if (countyId && districtId) setCenterPrereqAlert(false);
  }, [countyId, districtId]);

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
      label: `${safeStr(c.centerName) || "—"}${c.code ? ` • ${safeStr(c.code)}` : ""}`,
    }));
  }, [centersForModalQ.data]);

  const activeBool: boolean | undefined =
    activeFilter === "" ? undefined : activeFilter === "true";

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
    return {
      q: undefined,
      countyId: undefined,
      districtId: undefined,
      centerId: centerId || undefined,
      active: activeBool,
    };
  }, [mode, qPlace, countyId, districtId, centerId, activeBool]);

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
      await refreshNow();
    },
  });

  const updateM = useMutation({
    mutationFn: async () => {
      if (!editing) throw new Error("No place selected.");
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
  const error = createM.error || updateM.error;

  const openCreate = () => {
    setEditing(null);
    setFormCountyId("");
    setFormDistrictId("");
    setFormCenterId("");
    setLabel("");
    setOpen(true);
  };

  const openEdit = (p: PollingPlaceDto) => {
    setEditing(p);
    setFormCountyId(safeStr(p.countyId));
    setFormDistrictId(safeStr(p.districtId));
    setFormCenterId(safeStr(p.centerId));
    setLabel(safeStr(p.label));
    setOpen(true);
  };

  const save = () => {
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
      setCenterId("");
    } else {
      setQPlace("");
    }
  };

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
            title={canEdit ? "Add Place" : "NEC/SYSTEM only"}
          >
            <Plus size={16} />
            Add Place
          </button>
        </div>
      }
    >
      <Card title="Polling Places">
        {/* ✅ CONDENSED FILTERS */}
        <div className="flex items-end gap-2 mb-4 flex-wrap">
          {/* Search */}
          <div className="relative w-72">
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
              placeholder="Search place…"
              className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-base outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* County */}
          <div className="relative w-72">
            <select
              value={countyId}
              onChange={(e) => {
                setMode("COUNTY");
                setCountyId(e.target.value);
                setDistrictPrereqAlert(false);
                setCenterPrereqAlert(false);
                setDistrictId("");
                setCenterId("");
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

          {/* District */}
          <div
            className="relative w-72"
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
                setCenterPrereqAlert(false);
                setPage(0);
              }}
              disabled={districtDisabled || districtsByCountyQ.isError}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 pr-10 text-base outline-none focus:ring-2 focus:ring-blue-500 appearance-none disabled:bg-slate-50"
              title={districtDisabled ? "Select county first" : "Select district"}
            >
              <option value="">
                {!countyId
                  ? "Select county…"
                  : districtsByCountyQ.isLoading
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

          {/* Center */}
          <div
            className="relative w-72"
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
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 pr-10 text-base outline-none focus:ring-2 focus:ring-blue-500 appearance-none disabled:bg-slate-50"
              title={centerDisabled ? "Select county + district first" : "Select center"}
            >
              <option value="">
                {!districtId
                  ? "Select district…"
                  : centersByDistrictQ.isLoading
                  ? "Loading…"
                  : "Center"}
              </option>

              {centerOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>

          {/* Active Filter */}
          <div className="relative w-40">
            <select
              value={activeFilter}
              onChange={(e) => {
                setActiveFilter(e.target.value as any);
                setPage(0);
              }}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 pr-10 text-base outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
              title="Filter by active status"
            >
              <option value="">All</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
            <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>

          {/* Clear All */}
          <button
            type="button"
            onClick={() => {
              setMode("PLACE");
              setQPlace("");
              setCountyId("");
              setDistrictId("");
              setCenterId("");
              setActiveFilter("");
              setDistrictPrereqAlert(false);
              setCenterPrereqAlert(false);
              setPage(0);
            }}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-base font-semibold hover:bg-slate-50 whitespace-nowrap"
          >
            Clear All
          </button>
        </div>

        {/* ✅ Prerequisites alerts */}
        {districtPrereqAlert && !countyId ? (
          <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800">
            Please select a <b>County</b> first before choosing a <b>District</b>.
          </div>
        ) : null}

        {centerPrereqAlert && (!countyId || !districtId) ? (
          <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800">
            Please select a <b>County</b> first, then a <b>District</b>, before choosing a <b>Center</b>.
          </div>
        ) : null}

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
                          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-base font-semibold hover:bg-slate-50 disabled:opacity-50"
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
                            <PowerOff size={16} className="text-red-600" />
                          ) : (
                            <Power size={16} className="text-blue-600" />
                          )}
                        </button>

                        <button
                          type="button"
                          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 text-green-600 bg-white px-3 py-1.5 text-base font-semibold hover:bg-slate-50 disabled:opacity-50"
                          disabled={!canEdit}
                          onClick={() => openEdit(p)}
                        >
                          <Pencil size={16} />
                        </button>

                        <button
                          type="button"
                          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-base font-semibold hover:bg-slate-50 disabled:opacity-50"
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

      {/* ✅ Enhanced Modal - Create/Edit Form */}
      {open && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => !saving && setOpen(false)}
        >
          <div
            className="w-full max-w-130 bg-white rounded-2xl shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* ✅ HEADER */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-6 text-white flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <h2 className="text-2xl font-bold tracking-tight">
                  {editing ? "Edit Polling Place" : "Add Polling Place"}
                </h2>
                <p className="text-blue-100 mt-1 text-sm">
                  {editing
                    ? "Only label can be updated. Location fields are read-only."
                    : "Create a new polling place under a center."}
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
                <label className="text-sm font-bold text-slate-700 uppercase tracking-wide block mb-2">
                  County *
                </label>
                <div className="relative">
                  <select
                    value={formCountyId}
                    onChange={(e) => {
                      setFormCountyId(e.target.value);
                      setFormDistrictId("");
                      setFormCenterId("");
                    }}
                    disabled={
                      saving ||
                      countiesQ.isLoading ||
                      countiesQ.isError ||
                      !!editing
                    }
                    className="w-full px-4 py-3 rounded-xl border border-slate-300 bg-white text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none disabled:bg-slate-100 disabled:text-slate-500 pr-10"
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
                <label className="text-sm font-bold text-slate-700 uppercase tracking-wide block mb-2">
                  District *
                </label>
                <div className="relative">
                  <select
                    value={formDistrictId}
                    onChange={(e) => {
                      setFormDistrictId(e.target.value);
                      setFormCenterId("");
                    }}
                    disabled={
                      saving ||
                      !formCountyId ||
                      districtsForModalQ.isLoading ||
                      districtsForModalQ.isError ||
                      !!editing
                    }
                    className="w-full px-4 py-3 rounded-xl border border-slate-300 bg-white text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none disabled:bg-slate-100 disabled:text-slate-500 pr-10"
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

              {/* Center Dropdown */}
              <div>
                <label className="text-sm font-bold text-slate-700 uppercase tracking-wide block mb-2">
                  Center *
                </label>
                <div className="relative">
                  <select
                    value={formCenterId}
                    onChange={(e) => setFormCenterId(e.target.value)}
                    disabled={
                      saving ||
                      !formDistrictId ||
                      centersForModalQ.isLoading ||
                      centersForModalQ.isError ||
                      !!editing
                    }
                    className="w-full px-4 py-3 rounded-xl border border-slate-300 bg-white text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none disabled:bg-slate-100 disabled:text-slate-500 pr-10"
                    title={
                      !formDistrictId ? "Select district first" : "Select center"
                    }
                  >
                    <option value="">
                      {!formDistrictId
                        ? "Select district first…"
                        : centersForModalQ.isLoading
                        ? "Loading centers…"
                        : "-- Select Center --"}
                    </option>
                    {modalCenterOptions.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {/* Label Input */}
              <div>
                <label className="text-sm font-bold text-slate-700 uppercase tracking-wide block mb-2">
                  Label (Optional)
                </label>
                <input
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !saving) {
                      save();
                    }
                  }}
                  disabled={saving}
                  type="text"
                  placeholder='e.g., "Room 1", "Hall A"'
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 bg-white text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-slate-100 disabled:text-slate-500"
                />
              </div>

              {/* Error Message */}
              {error && (
                <div className="rounded-xl bg-red-50 border border-red-200 p-4 flex gap-3">
                  <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
                  <div>
                    <div className="text-sm font-bold text-red-900">Error</div>
                    <div className="text-sm text-red-800 mt-1">
                      {friendlyPollingPlaceSaveError(error)}
                    </div>
                  </div>
                </div>
              )}

              {/* Info Message */}
              <div className="rounded-xl bg-blue-50 border border-blue-200 p-3">
                <p className="text-xs text-blue-700">
                  💡 <span className="font-semibold">Tip:</span> Select county → district → center, then optionally add a label. Press Enter to save.
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
                disabled={saving || !safeStr(formCenterId).trim() || !canEdit}
                onClick={save}
                className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold transition disabled:opacity-50 shadow-md"
              >
                {saving ? "Saving…" : editing ? "Update Place" : "Create Place"}
              </button>
            </div>
          </div>
        </div>
      )}
    </PageShell>
  );
}




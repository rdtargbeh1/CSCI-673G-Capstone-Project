// ✅ FILE: src/pages/operations/observer-reports/ObserverReportFormModal.tsx
//
// ✅ MOBILE-FIRST UX (iPhone-sized) + Better visual polish
// - ✅ Modal becomes bottom-sheet on small screens, centered dialog on >= sm
// - ✅ Sticky footer on mobile so Save button NEVER hides
// - ✅ Internal scroll area for body (prevents footer disappearing)
// - ✅ Inputs: bigger tap targets, cleaner spacing, better focus
// - ✅ Segmented Open/Resolved optimized for thumb reach
// - ✅ File picker + URL + textarea look cleaner on mobile
//
// ❗No business logic changes (same state + same submit payloads)

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  X,
  UploadCloud,
  MapPin,
  RefreshCw,
  Link as LinkIcon,
} from "lucide-react";

import type { CountyDto } from "../../shared/services/countyService";
import type { DistrictDto } from "../../shared/services/districtService";
import type { PollingCenterDto } from "../../shared/services/pollingCenterService";
import type { UserDto } from "../../auth/userTypes";

import type {
  ObserverReportDto,
  ObserverReportCreateRequest,
  ObserverReportUpdateRequest,
  ReportType,
} from "../../shared/services/observerReportService";

function safeStr(v: any) {
  return typeof v === "string" ? v : v == null ? "" : String(v);
}
function friendlyError(err: any): string {
  return (
    safeStr(err?.response?.data?.message) ||
    safeStr(err?.response?.data?.error) ||
    safeStr(err?.message) ||
    "Request failed."
  );
}

const REPORT_TYPES: ReportType[] = [
  "VIOLENCE",
  "INTIMIDATION",
  "EQUIPMENT_ISSUE",
  "LATE_OPENING",
  "QUEUE_ISSUE",
  "OTHER",
];

type GeoStatus = "idle" | "loading" | "ok" | "error" | "unsupported";

export default function ObserverReportFormModal(props: {
  open: boolean;
  mode: "create" | "edit";
  busy?: boolean;

  canSubmit: boolean;

  effectiveOrgId?: string;
  me?: UserDto | null;

  counties: CountyDto[];
  districts: DistrictDto[];
  centers: PollingCenterDto[];

  initial?: ObserverReportDto | null;
  onClose: () => void;

  onSubmitCreate: (
    req: ObserverReportCreateRequest,
    files: File[]
  ) => Promise<void>;
  onSubmitUpdate: (
    reportId: string,
    req: ObserverReportUpdateRequest,
    files: File[]
  ) => Promise<void>;

  error?: any;
}) {
  const open = props.open;
  const submitDisabled = !props.canSubmit || Boolean(props.busy);

  const [type, setType] = useState<ReportType>("OTHER");
  const [description, setDescription] = useState<string>("");
  const [mediaUrl, setMediaUrl] = useState<string>("");

  const [countyId, setCountyId] = useState<string>("");
  const [districtId, setDistrictId] = useState<string>("");
  const [centerId, setCenterId] = useState<string>("");

  // ✅ Resolved radio
  const [resolved, setResolved] = useState<boolean>(false);

  // GPS (auto)
  const [latitude, setLatitude] = useState<string>("");
  const [longitude, setLongitude] = useState<string>("");
  const [geoStatus, setGeoStatus] = useState<GeoStatus>("idle");
  const [geoError, setGeoError] = useState<string>("");

  const [files, setFiles] = useState<File[]>([]);

  const requestGeo = useCallback(() => {
    setGeoError("");

    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setGeoStatus("unsupported");
      setGeoError("Geolocation is not supported in this browser.");
      return;
    }

    setGeoStatus("loading");

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setLatitude(Number.isFinite(lat) ? lat.toFixed(6) : "");
        setLongitude(Number.isFinite(lng) ? lng.toFixed(6) : "");
        setGeoStatus("ok");
      },
      (err) => {
        setLatitude("");
        setLongitude("");
        setGeoStatus("error");
        setGeoError(
          err?.message || "Unable to fetch location (check permissions)."
        );
      },
      { enableHighAccuracy: true, timeout: 12_000, maximumAge: 30_000 }
    );
  }, []);

  // Init on open
  useEffect(() => {
    if (!open) return;

    if (props.mode === "edit" && props.initial) {
      const r: any = props.initial;

      setType((r.type as ReportType) ?? "OTHER");
      setDescription(String(r.description ?? ""));
      setMediaUrl(String(r.mediaUrl ?? ""));

      setCountyId(String(r.countyId ?? ""));
      setDistrictId(String(r.districtId ?? ""));
      setCenterId(String(r.centerId ?? ""));

      setResolved(Boolean(r.resolved));

      setLatitude(r.latitude == null ? "" : String(r.latitude));
      setLongitude(r.longitude == null ? "" : String(r.longitude));

      if (r.latitude != null && r.longitude != null) setGeoStatus("ok");
      else setGeoStatus("idle");

      setGeoError("");
      setFiles([]);
    } else {
      setType("OTHER");
      setDescription("");
      setMediaUrl("");

      setCountyId("");
      setDistrictId("");
      setCenterId("");

      setResolved(false);

      setLatitude("");
      setLongitude("");
      setGeoStatus("idle");
      setGeoError("");

      setFiles([]);

      requestGeo();
    }
  }, [open, props.mode, props.initial, requestGeo]);

  // Districts by county
  const districtsFiltered = useMemo(() => {
    if (!countyId) return props.districts;
    return props.districts.filter(
      (d) => String(d.countyId ?? "") === String(countyId)
    );
  }, [props.districts, countyId]);

  // Centers by district if present, else by county
  const centersFiltered = useMemo(() => {
    const centersAny: any[] = props.centers as any[];
    const hasDistrictOnCenter = centersAny.some((c) => c?.districtId != null);

    if (hasDistrictOnCenter && districtId) {
      return centersAny.filter(
        (c) => String(c.districtId ?? "") === String(districtId)
      );
    }
    if (countyId) {
      return centersAny.filter(
        (c) => String(c.countyId ?? "") === String(countyId)
      );
    }
    return centersAny;
  }, [props.centers, countyId, districtId]);

  // district -> set county + clear center
  useEffect(() => {
    if (!districtId) return;
    const d = props.districts.find(
      (x) => String(x.districtId) === String(districtId)
    );
    if (!d) return;

    if (d.countyId && String(d.countyId) !== String(countyId)) {
      setCountyId(String(d.countyId));
    }
    setCenterId("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [districtId]);

  // center -> set county + district (if center has districtId)
  useEffect(() => {
    if (!centerId) return;
    const centersAny: any[] = props.centers as any[];
    const c = centersAny.find((x) => String(x.centerId) === String(centerId));
    if (!c) return;

    if (c.countyId && String(c.countyId) !== String(countyId))
      setCountyId(String(c.countyId));
    if (c.districtId && String(c.districtId) !== String(districtId))
      setDistrictId(String(c.districtId));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [centerId]);

  if (!open) return null;

  const title =
    props.mode === "create" ? "New Observer Report" : "Edit Observer Report";

  const locationText =
    geoStatus === "loading"
      ? "Fetching location…"
      : geoStatus === "ok" && latitude && longitude
      ? `Lat ${latitude}, Lng ${longitude}`
      : geoStatus === "unsupported"
      ? "Location not supported"
      : geoStatus === "error"
      ? geoError || "Location not available"
      : "Location not captured (optional)";

  const locationPillClass =
    geoStatus === "ok"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : geoStatus === "loading"
      ? "bg-slate-50 text-slate-700 border-slate-200"
      : geoStatus === "error"
      ? "bg-rose-50 text-rose-700 border-rose-200"
      : "bg-white text-slate-700 border-slate-200";

  const inputBase =
    "w-full rounded-2xl border border-slate-200 bg-white px-4 text-[15px] text-slate-900 " +
    "shadow-sm shadow-slate-100/80 placeholder:text-slate-400 " +
    "focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-300 " +
    "disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed";

  const selectBase = inputBase + " h-12 pr-10 font-semibold";
  const textareaBase =
    "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[15px] leading-relaxed " +
    "shadow-sm shadow-slate-100/80 placeholder:text-slate-400 " +
    "focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-300 " +
    "disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed";

  const btnBase =
    "inline-flex items-center justify-center gap-2 rounded-2xl px-4 h-11 text-sm font-extrabold " +
    "transition active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed";

  const ghostBtn =
    btnBase +
    " border border-slate-200 bg-white text-slate-800 hover:bg-slate-50";
  const primaryBtn =
    btnBase +
    " border border-blue-700 bg-blue-600 text-white hover:bg-blue-700";

  const pillBtn =
    "inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white " +
    "h-10 px-3 text-sm font-extrabold text-slate-800 hover:bg-slate-50 " +
    "transition disabled:opacity-60 disabled:cursor-not-allowed";

  const closeOnBackdrop = () => {
    if (props.busy) return;
    props.onClose();
  };

  const saveLabel = props.mode === "create" ? "Create Report" : "Save Changes";

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-[2px]"
      onClick={closeOnBackdrop}
    >
      {/* Bottom-sheet on mobile, centered modal on >= sm */}
      <div
        className={[
          "fixed inset-x-0 bottom-0",
          "sm:static sm:inset-auto sm:flex sm:min-h-screen sm:items-center sm:justify-center",
          "p-0 sm:p-6",
        ].join(" ")}
      >
        <div
          className={[
            "w-full",
            "sm:max-w-3xl",
            "bg-white",
            "rounded-t-3xl sm:rounded-3xl",
            "border border-slate-200",
            "shadow-[0_20px_80px_-20px_rgba(0,0,0,0.35)]",
            "overflow-hidden",
            "flex flex-col",
            // ✅ mobile height that keeps footer visible
            "max-h-[92vh] sm:max-h-[88vh]",
          ].join(" ")}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-5 sm:px-6 py-4 border-b border-slate-200 bg-white">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">
                  {title}
                </div>
                <div className="text-sm text-slate-500 mt-1">
                  Capture incident details and optional evidence.
                </div>
              </div>

              <button
                type="button"
                onClick={props.onClose}
                disabled={Boolean(props.busy)}
                className={ghostBtn + " h-11 px-3"}
                aria-label="Close"
              >
                <X size={16} />
                <span className="hidden sm:inline">Close</span>
              </button>
            </div>

            {/* Top controls row: Location + Retry (mobile-first) */}
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-2">
                <MapPin size={16} className="text-slate-600" />
                <span
                  className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-extrabold ${locationPillClass}`}
                >
                  {locationText}
                </span>

                <button
                  type="button"
                  onClick={requestGeo}
                  disabled={submitDisabled || geoStatus === "loading"}
                  className={pillBtn}
                  title="Retry location"
                >
                  <RefreshCw size={16} />
                  Retry
                </button>
              </div>

              {/* Resolved segmented control */}
              <div className="flex items-center justify-start sm:justify-end">
                <div className="inline-flex w-full sm:w-auto rounded-2xl border border-slate-200 bg-slate-50 p-1 shadow-sm">
                  <label
                    className={[
                      "flex-1 sm:flex-none text-center",
                      "px-4 py-2.5 rounded-xl text-sm font-extrabold cursor-pointer select-none transition",
                      !resolved
                        ? "bg-slate-900 text-white shadow-sm"
                        : "text-slate-700 hover:bg-white",
                      submitDisabled ? "opacity-60 cursor-not-allowed" : "",
                    ].join(" ")}
                  >
                    <input
                      type="radio"
                      name="resolved"
                      className="hidden"
                      checked={!resolved}
                      onChange={() => setResolved(false)}
                      disabled={submitDisabled}
                    />
                    Open
                  </label>

                  <label
                    className={[
                      "flex-1 sm:flex-none text-center",
                      "px-4 py-2.5 rounded-xl text-sm font-extrabold cursor-pointer select-none transition",
                      resolved
                        ? "bg-emerald-600 text-white shadow-sm"
                        : "text-slate-700 hover:bg-white",
                      submitDisabled ? "opacity-60 cursor-not-allowed" : "",
                    ].join(" ")}
                  >
                    <input
                      type="radio"
                      name="resolved"
                      className="hidden"
                      checked={resolved}
                      onChange={() => setResolved(true)}
                      disabled={submitDisabled}
                    />
                    Resolved
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* ✅ Scrollable body (footer never hides) */}
          <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-5">
            {!props.canSubmit ? (
              <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900">
                <div className="text-sm font-extrabold">View only</div>
                <div className="text-xs mt-1 text-amber-800/90">
                  Only SYSTEM/NEC admins can create/update/delete reports.
                </div>
              </div>
            ) : null}

            {/* Mobile-first single column; becomes 3 cols on md */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Field label="Report Type *">
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as ReportType)}
                  className={selectBase}
                  disabled={submitDisabled}
                >
                  {REPORT_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="County (optional)">
                <select
                  value={countyId}
                  onChange={(e) => {
                    setCountyId(e.target.value);
                    setDistrictId("");
                    setCenterId("");
                  }}
                  className={selectBase}
                  disabled={submitDisabled}
                >
                  <option value="">—</option>
                  {props.counties.map((c) => (
                    <option key={c.countyId} value={c.countyId}>
                      {c.countyName}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="District (optional)">
                <select
                  value={districtId}
                  onChange={(e) => setDistrictId(e.target.value)}
                  className={selectBase}
                  disabled={submitDisabled}
                >
                  <option value="">—</option>
                  {districtsFiltered.map((d) => (
                    <option key={d.districtId} value={d.districtId}>
                      {d.districtName}
                    </option>
                  ))}
                </select>
              </Field>

              <div className="md:col-span-3">
                <Field label="Center (optional)">
                  <select
                    value={centerId}
                    onChange={(e) => setCenterId(e.target.value)}
                    className={selectBase}
                    disabled={submitDisabled}
                  >
                    <option value="">—</option>
                    {centersFiltered.map((c: any) => (
                      <option key={c.centerId} value={c.centerId}>
                        {c.centerCode ? `${c.centerCode} • ` : ""}
                        {c.centerName}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>

              <div className="md:col-span-3">
                <Field label="Description *">
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    disabled={submitDisabled}
                    rows={7}
                    className={textareaBase}
                    placeholder="Describe what happened (who/what/when). Keep it factual and clear..."
                  />
                </Field>
              </div>

              <div className="md:col-span-2">
                <Field label="Media URL (optional)">
                  <div className="relative">
                    <div className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                      <LinkIcon size={16} />
                    </div>
                    <input
                      value={mediaUrl}
                      onChange={(e) => setMediaUrl(e.target.value)}
                      disabled={submitDisabled}
                      className={inputBase + " h-12 pl-11"}
                      placeholder="https://…"
                    />
                  </div>
                </Field>
              </div>

              <div className="md:col-span-1">
                <Field label="Evidence files (optional)">
                  <label
                    className={[
                      "h-12 w-full rounded-2xl border border-slate-200 bg-white",
                      "px-4 text-sm font-extrabold text-slate-800",
                      "inline-flex items-center justify-center gap-2 cursor-pointer",
                      "shadow-sm shadow-slate-100/80",
                      "transition hover:bg-slate-50 active:scale-[0.99]",
                      submitDisabled
                        ? "opacity-60 cursor-not-allowed hover:bg-white active:scale-100"
                        : "",
                    ].join(" ")}
                  >
                    <UploadCloud size={18} />
                    Choose files
                    <input
                      type="file"
                      multiple
                      disabled={submitDisabled}
                      className="hidden"
                      onChange={(e) =>
                        setFiles(Array.from(e.target.files ?? []))
                      }
                    />
                  </label>
                </Field>
              </div>

              {files.length ? (
                <div className="md:col-span-3">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <div className="text-xs font-extrabold text-slate-700">
                      Selected files
                    </div>
                    <div className="mt-2 space-y-1 text-xs text-slate-700">
                      {files.slice(0, 4).map((f) => (
                        <div
                          key={f.name}
                          className="flex items-center justify-between gap-3"
                        >
                          <div className="truncate">• {f.name}</div>
                          <div className="shrink-0 text-slate-500">
                            {Math.round(f.size / 1024)} KB
                          </div>
                        </div>
                      ))}
                      {files.length > 4 ? (
                        <div className="text-slate-500">
                          +{files.length - 4} more…
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              ) : null}
            </div>

            {props.error ? (
              <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-rose-800">
                <div className="text-sm font-extrabold">
                  Request violates a data constraint
                </div>
                <div className="text-xs mt-1">{friendlyError(props.error)}</div>
              </div>
            ) : null}

            <div className="mt-4 text-xs text-slate-500 sm:hidden">
              * Required fields. Location is optional and captured
              automatically.
            </div>
          </div>

          {/* ✅ Sticky footer (mobile first) */}
          <div className="border-t border-slate-200 bg-white px-5 sm:px-6 py-4 sticky bottom-0">
            <div className="hidden sm:block text-xs text-slate-500 mb-3">
              * Required fields. Location is optional and captured
              automatically.
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={props.onClose}
                disabled={Boolean(props.busy)}
                className={ghostBtn}
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={submitDisabled || !type || !description.trim()}
                onClick={async () => {
                  if (!props.canSubmit) return;

                  const latNum = latitude.trim() ? Number(latitude) : undefined;
                  const lngNum = longitude.trim()
                    ? Number(longitude)
                    : undefined;

                  if (props.mode === "create") {
                    if (!props.effectiveOrgId || !props.me?.userId) {
                      alert("Missing orgId or observerId (me).");
                      return;
                    }

                    const req: ObserverReportCreateRequest = {
                      orgId: props.effectiveOrgId,
                      observerId: props.me.userId,
                      countyId: countyId || undefined,
                      districtId: districtId || undefined,
                      centerId: centerId || undefined,
                      type,
                      description: description.trim(),
                      mediaUrl: mediaUrl.trim() ? mediaUrl.trim() : undefined,
                      latitude: latNum,
                      longitude: lngNum,
                      resolved,
                    } as any;

                    await props.onSubmitCreate(req, files);
                  } else {
                    const id = props.initial?.reportId;
                    if (!id) return;

                    const req: ObserverReportUpdateRequest = {
                      countyId: countyId ? countyId : null,
                      districtId: districtId ? districtId : null,
                      centerId: centerId ? centerId : null,
                      type: type || null,
                      description: description.trim()
                        ? description.trim()
                        : null,
                      mediaUrl: mediaUrl.trim() ? mediaUrl.trim() : null,
                      latitude: latitude.trim() ? Number(latitude) : null,
                      longitude: longitude.trim() ? Number(longitude) : null,
                      resolved,
                    };

                    await props.onSubmitUpdate(id, req, files);
                  }
                }}
                className={[
                  primaryBtn,
                  // ✅ Mobile: make Save full-width for thumb reach
                  "w-full sm:w-auto",
                ].join(" ")}
              >
                {props.mode === "create" ? "Create Report" : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field(props: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[12px] font-extrabold text-slate-700 mb-2 tracking-wide">
        {props.label}
      </div>
      {props.children}
    </div>
  );
}

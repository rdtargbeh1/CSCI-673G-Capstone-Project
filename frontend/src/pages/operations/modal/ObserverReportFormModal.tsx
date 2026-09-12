

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  X,
  UploadCloud,
  MapPin,
  RefreshCw,
  Link as LinkIcon,
  ChevronDown,
  AlertCircle,
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
  onSubmitCreate: (req: ObserverReportCreateRequest, files: File[]) => Promise<void>;
  onSubmitUpdate: (reportId: string, req: ObserverReportUpdateRequest, files: File[]) => Promise<void>;
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
        setGeoError(err?.message || "Unable to fetch location (check permissions).");
      },
      { enableHighAccuracy: true, timeout: 12_000, maximumAge: 30_000 }
    );
  }, []);

  useEffect(() => {
    if (!open) return;

    if (props.mode === "edit" && props.initial) {
      const r: any = props.initial;
      
      const prefillCountyId = String(r.countyId ?? "");
      const prefillDistrictId = String(r.districtId ?? "");
      const prefillCenterId = String(r.centerId ?? "");

      setType((r.type as ReportType) ?? "OTHER");
      setDescription(String(r.description ?? ""));
      setMediaUrl(String(r.mediaUrl ?? ""));
      setCountyId(prefillCountyId);
      setDistrictId(prefillDistrictId);
      setCenterId(prefillCenterId);
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
      setLatitude("");
      setLongitude("");
      setGeoStatus("idle");
      setGeoError("");
      setFiles([]);
      requestGeo();
    }
  }, [open, props.mode, props.initial, requestGeo]);

  const districtsFiltered = useMemo(() => {
    if (!countyId) return props.districts;
    return props.districts.filter((d) => String(d.countyId ?? "") === String(countyId));
  }, [props.districts, countyId]);

  const centersFiltered = useMemo(() => {
    const centersAny: any[] = props.centers as any[];
    const hasDistrictOnCenter = centersAny.some((c) => c?.districtId != null);

    if (hasDistrictOnCenter && districtId) {
      return centersAny.filter((c) => String(c.districtId ?? "") === String(districtId));
    }
    if (countyId) {
      return centersAny.filter((c) => String(c.countyId ?? "") === String(countyId));
    }
    return centersAny;
  }, [props.centers, countyId, districtId]);

  const handleCountyChange = (newCountyId: string) => {
    setCountyId(newCountyId);
    if (props.mode === "create" || (props.mode === "edit" && countyId !== "")) {
      setDistrictId("");
      setCenterId("");
    }
  };

  useEffect(() => {
    if (!centerId) return;
    const centersAny: any[] = props.centers as any[];
    const selectedCenter = centersAny.find((x) => String(x.centerId) === String(centerId));
    
    if (!selectedCenter) return;

    if (selectedCenter.countyId && String(selectedCenter.countyId) !== String(countyId)) {
      setCountyId(String(selectedCenter.countyId));
    }

    if (selectedCenter.districtId && String(selectedCenter.districtId) !== String(districtId)) {
      setDistrictId(String(selectedCenter.districtId));
    }
  }, [centerId, props.centers, countyId, districtId]);

  if (!open) return null;

  const title = props.mode === "create" ? "New Observer Report" : "Edit Observer Report";
  const subtitle = props.mode === "create" ? "Document an incident observed during polling" : "Update incident information";

  const locationText =
    geoStatus === "loading"
      ? "Fetching location…"
      : geoStatus === "ok" && latitude && longitude
      ? `${latitude}, ${longitude}`
      : geoStatus === "error"
      ? "Location unavailable"
      : "Location not captured";

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={() => !props.busy && props.onClose()}
    >
      <div
        className="w-full max-w-5xl bg-white rounded-2xl shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
        style={{ maxHeight: "calc(100vh - 2rem)", height: "auto" }}
      >
        {/* ✅ HEADER */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-5 text-white flex items-start justify-between gap-4 flex-shrink-0">
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
            <p className="text-blue-100 mt-0.5 text-sm">{subtitle}</p>
          </div>
          <button
            type="button"
            onClick={props.onClose}
            disabled={Boolean(props.busy)}
            className="flex-shrink-0 h-10 w-10 rounded-lg bg-white/20 hover:bg-white/30 transition flex items-center justify-center text-white disabled:opacity-50"
            aria-label="Close"
          >
            <X size={22} />
          </button>
        </div>

        {/* ✅ CONTENT */}
        <div className="px-8 py-5 space-y-4 overflow-y-auto flex-1">
          
          {/* Location Bar */}
          {(geoStatus === "ok" || geoStatus === "error" || geoStatus === "loading") && (
            <div className={`rounded-lg p-3 flex items-center justify-between text-sm ${
              geoStatus === "ok" 
                ? "bg-emerald-50 border border-emerald-200" 
                : geoStatus === "loading"
                ? "bg-blue-50 border border-blue-200"
                : "bg-red-50 border border-red-200"
            }`}>
              <div className={`flex items-center gap-2 font-semibold ${
                geoStatus === "ok"
                  ? "text-emerald-700"
                  : geoStatus === "loading"
                  ? "text-blue-700"
                  : "text-red-700"
              }`}>
                <MapPin size={16} />
                <span>📍 {locationText}</span>
              </div>
              <button
                type="button"
                onClick={requestGeo}
                disabled={submitDisabled || geoStatus === "loading"}
                className="text-xs font-bold px-2.5 py-1 rounded-lg bg-white hover:bg-slate-50 transition disabled:opacity-50 border border-slate-300"
              >
                <RefreshCw size={12} className="inline mr-1" />
                Retry
              </button>
            </div>
          )}

          {!props.canSubmit && (
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 flex gap-2">
              <AlertCircle className="text-amber-600 flex-shrink-0 mt-0.5" size={16} />
              <div className="text-xs">
                <div className="font-bold text-amber-900">View Only Mode</div>
                <div className="text-amber-800 mt-0.5">Only SYSTEM/NEC admins can create/update reports.</div>
              </div>
            </div>
          )}

          {props.error && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-3 flex gap-2">
              <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={16} />
              <div>
                <div className="text-xs font-bold text-red-900">Error</div>
                <div className="text-xs text-red-800 mt-0.5">{friendlyError(props.error)}</div>
              </div>
            </div>
          )}

          {/* ✅ TWO COLUMN LAYOUT - COMPACT */}
          <div className="grid grid-cols-2 gap-4">
            
            {/* LEFT COLUMN */}
            <div className="space-y-3">
              
              {/* Report Type */}
              <div>
                <label className="text-sm font-bold text-slate-700 uppercase tracking-wide block mb-1">Report Type *</label>
                <div className="relative">
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as ReportType)}
                    disabled={submitDisabled}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-base font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none disabled:bg-slate-100 disabled:text-slate-500 pr-8"
                  >
                    <option value="">--Select type--</option>
                    {REPORT_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {/* County */}
              <div>
                <label className="text-sm font-bold text-slate-700 uppercase tracking-wide block mb-1">County</label>
                <div className="relative">
                  <select
                    value={countyId}
                    onChange={(e) => handleCountyChange(e.target.value)}
                    disabled={submitDisabled}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-base font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none disabled:bg-slate-100 disabled:text-slate-500 pr-8"
                  >
                    <option value="">--Select county--</option>
                    {props.counties.map((c) => (
                      <option key={c.countyId} value={c.countyId}>
                        {c.countyName}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {/* District */}
              <div>
                <label className="text-sm font-bold text-slate-700 uppercase tracking-wide block mb-1">District</label>
                <div className="relative">
                  <select
                    value={districtId}
                    onChange={(e) => setDistrictId(e.target.value)}
                    disabled={submitDisabled}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-base font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none disabled:bg-slate-100 disabled:text-slate-500 pr-8"
                  >
                    <option value="">--Select district--</option>
                    {districtsFiltered.map((d) => (
                      <option key={d.districtId} value={d.districtId}>
                        {d.districtName}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {/* Center */}
              <div>
                <label className="text-sm font-bold text-slate-700 uppercase tracking-wide block mb-1">Center</label>
                <div className="relative">
                  <select
                    value={centerId}
                    onChange={(e) => setCenterId(e.target.value)}
                    disabled={submitDisabled}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-base font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none disabled:bg-slate-100 disabled:text-slate-500 pr-8"
                  >
                    <option value="">--Select center--</option>
                    {centersFiltered.map((c: any) => (
                      <option key={c.centerId} value={c.centerId}>
                        {c.centerCode ? `${c.centerCode} • ` : ""}
                        {c.centerName}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {/* Media URL */}
              <div>
                <label className="text-sm font-bold text-slate-700 uppercase tracking-wide block mb-1">Media URL</label>
                <div className="relative">
                  <LinkIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    value={mediaUrl}
                    onChange={(e) => setMediaUrl(e.target.value)}
                    disabled={submitDisabled}
                    type="url"
                    className="w-full px-3 py-2 pl-9 rounded-lg border border-slate-300 bg-white text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-slate-100 disabled:text-slate-500"
                    placeholder="https://…"
                  />
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN - DESCRIPTION */}
            <div className="flex flex-col space-y-3">
              <div>
                <label className="text-sm font-bold text-slate-700 uppercase tracking-wide block mb-1">Description *</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={submitDisabled}
                  rows={6}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-slate-100 disabled:text-slate-500 resize-none"
                  placeholder="Describe what happened (who/what/when). Keep it factual and clear..."
                />
              </div>

              {/* Evidence Files */}
              <div>
                <label className="text-sm font-bold text-slate-700 uppercase tracking-wide block mb-1">Evidence Files</label>
                <label className="w-full px-3 py-3 rounded-lg border-2 border-dashed border-blue-300 bg-blue-50 hover:bg-blue-100 hover:border-blue-400 transition cursor-pointer flex flex-col items-center justify-center gap-1.5 font-semibold text-blue-700 disabled:opacity-50">
                  <UploadCloud size={18} />
                  <span className="text-sm">Choose files</span>
                  <input
                    type="file"
                    multiple
                    disabled={submitDisabled}
                    className="hidden"
                    onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
                  />
                </label>
              </div>

              {/* Selected Files */}
              {files.length > 0 && (
                <div className="rounded-lg bg-slate-100 border border-slate-300 p-2 max-h-[80px] overflow-y-auto">
                  <div className="text-sm font-bold text-slate-900 mb-1">📎 {files.length} File(s)</div>
                  <div className="space-y-0.5">
                    {files.map((f) => (
                      <div key={f.name} className="flex items-center justify-between textsm text-slate-700">
                        <span className="truncate">• {f.name}</span>
                        <span className="text-slate-500 flex-shrink-0">{Math.round(f.size / 1024)} KB</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ✅ FOOTER */}
        <div className="border-t border-slate-200 bg-white px-8 py-3 flex items-center justify-end gap-2 flex-shrink-0">
          <button
            type="button"
            onClick={props.onClose}
            disabled={Boolean(props.busy)}
            className="px-5 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 text-base font-semibold hover:bg-slate-50 transition disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={submitDisabled || !type || !description.trim()}
            onClick={async () => {
              if (!props.canSubmit) return;
              const latNum = latitude.trim() ? Number(latitude) : undefined;
              const lngNum = longitude.trim() ? Number(longitude) : undefined;

              if (props.mode === "create") {
                if (!props.effectiveOrgId || !props.me?.userId) {
                  alert("Missing orgId or observerId.");
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
                  description: description.trim() ? description.trim() : null,
                  mediaUrl: mediaUrl.trim() ? mediaUrl.trim() : null,
                  latitude: latitude.trim() ? Number(latitude) : null,
                  longitude: longitude.trim() ? Number(longitude) : null,
                };
                await props.onSubmitUpdate(id, req, files);
              }
            }}
            className="px-6 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition disabled:opacity-50 shadow-md"
          >
            {props.mode === "create" ? "📝 Create Report" : "💾 Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}


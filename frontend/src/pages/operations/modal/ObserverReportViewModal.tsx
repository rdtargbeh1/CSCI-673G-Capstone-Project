
// ✅ FILE: src/pages/operations/ObserverReportViewModal.tsx


import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getObserverReport } from "../../../shared/services/observerReportService";
import { fetchUserById } from "../../../shared/services/userService";
import { useAuthStore } from "../../../shared/store/authStore";
import type { ObserverReportDto } from "../../../shared/services/observerReportService";
import type { UserDto } from "../../../auth/userTypes";

/* ================= HELPERS ================= */

function friendlyError(err: any): string {
  const v = (x: any) => (typeof x === "string" ? x : x == null ? "" : String(x));
  return v(err?.response?.data?.message) || v(err?.message) || "Request failed.";
}

function fullName(u: any) {
  return `${u?.firstName ?? ""} ${u?.lastName ?? ""}`.trim() || u?.userName || "—";
}

function reporterFullName(r: any) {
  return `${r?.observerFirstName ?? ""} ${r?.observerLastName ?? ""}`.trim() ||
    r?.observerName ||
    "—";
}

function formatDate(d?: string | null) {
  return d ? new Date(d).toLocaleString() : "—";
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-base sm-semibold px-2 py-1 rounded-md bg-slate-100 text-slate-700">
      {children}
    </span>
  );
}

function StatusBadge({ resolved }: { resolved?: boolean | null }) {
  return resolved ? (
    <span className="text-base font-semibold text-emerald-600">Resolved</span>
  ) : (
    <span className="text-base font-semibold text-red-600">Open</span>
  );
}

function Card({ title, children }: any) {
  return (
    <div className="border rounded-lg p-4 bg-white">
      <div className="text-base font-semibold text-slate-800 mb-3">{title}</div>
      {children}
    </div>
  );
}

function Field({ label, value }: any) {
  return (
    <div>
      <div className="text-sm text-slate-500">{label}</div>
      <div className="text-base font-medium text-slate-900">{value || "—"}</div>
    </div>
  );
}

/* ================= COMPONENT ================= */

export default function ObserverReportViewModal({
  open,
  reportId,
  onClose,
  effectiveOrgId,
}: any) {
  const [tab, setTab] = useState<"details" | "verification" | "resolution">("details");

  const orgId = effectiveOrgId || useAuthStore((s) => s.currentOrgId);

  const { data, isLoading, isError, error } = useQuery<ObserverReportDto>({
    enabled: open && !!reportId,
    queryKey: ["observer-report", reportId],
    queryFn: () => getObserverReport(reportId),
  });

  const verifiedQ = useQuery<UserDto>({
    enabled: !!data?.verifiedBy,
    queryKey: ["user", data?.verifiedBy],
    queryFn: () => fetchUserById(orgId, data!.verifiedBy!),
  });

  const resolvedQ = useQuery<UserDto>({
    enabled: !!data?.resolvedBy,
    queryKey: ["user", data?.resolvedBy],
    queryFn: () => fetchUserById(orgId, data!.resolvedBy!),
  });

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-4xl rounded-xl shadow-lg flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ================= HEADER ================= */}
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">
              Observer Report
            </h2>
            <div className="text-xs text-slate-500 mt-1">
              ID: {reportId?.slice(0, 10)}
            </div>
          </div>

          <button onClick={onClose} className="text-base text-slate-600 bg-red-500 text-white ">
            ✕
          </button>
        </div>

        {/* ================= STATUS BAR ================= */}
        {data && (
          <div className="px-6 py-3 border-b flex flex-wrap gap-2">
            <Badge>
              <StatusBadge resolved={data.resolved} />
            </Badge>
            <Badge>{data.verificationStatus || "PENDING"}</Badge>
            <Badge>{data.visibility || "PRIVATE"}</Badge>
            <span className="text-sm text-slate-600 ml-auto">
              {formatDate(data.timestamp)}
            </span>
          </div>
        )}

        {/* ================= TABS ================= */}
        <div className="flex border-b px-6">
          {["details", "verification", "resolution"].map((t) => (
            <button
              key={t}
              onClick={() => setTab(t as any)}
              className={`px-4 py-3 text-base bg-red-00 font-medium border-b-2 ${
                tab === t
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-slate-700"
              }`}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {/* ================= BODY ================= */}
        <div className="p-6 overflow-y-auto flex-1">
          {isLoading ? (
            <div className="text-sm text-slate-500">Loading...</div>
          ) : isError ? (
            <div className="text-red-600 text-sm">
              {friendlyError(error)}
            </div>
          ) : !data ? (
            <div>No data</div>
          ) : (
            <>
              {/* ================= DETAILS ================= */}
              {tab === "details" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card title="Report Info">
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Type" value={data.type} />
                      <Field label="Status" value={<StatusBadge resolved={data.resolved} />} />
                      <Field label="Reporter" value={reporterFullName(data)} />
                      <Field label="Tenant" value={data.orgName} />
                    </div>
                  </Card>

                  <Card title="Location">
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="County" value={data.countyName} />
                      <Field label="District" value={data.districtName} />
                      <Field label="Center Code" value={data.centerCode} />
                      <Field label="Center Name" value={data.centerName} />
                    </div>
                  </Card>

                  <Card title="Description">
                    <div className="text-base text-slate-700 whitespace-pre-wrap">
                      {data.description}
                    </div>
                  </Card>

                  {data.mediaUrl && (
                    <Card title="Media">
                      <a
                        href={data.mediaUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-600 text-sm underline break-all"
                      >
                        {data.mediaUrl}
                      </a>
                    </Card>
                  )}
                </div>
              )}

              {/* ================= VERIFICATION ================= */}
              {tab === "verification" && (
                <div className="space-y-4">
                  <Card title="Verification">
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Status" value={data.verificationStatus} />
                      <Field label="Visibility" value={data.visibility} />
                      <Field
                        label="Verified By"
                        value={
                          verifiedQ.data
                            ? fullName(verifiedQ.data)
                            : "—"
                        }
                      />
                      <Field label="Verified At" value={formatDate(data.verifiedAt)} />
                    </div>
                  </Card>

                  <Card title="Verification Note">
                    <div className="text-base whitespace-pre-wrap">
                      {data.verificationNote || "—"}
                    </div>
                  </Card>
                </div>
              )}

              {/* ================= RESOLUTION ================= */}
              {tab === "resolution" && (
                <div className="space-y-4">
                  <Card title="Resolution">
                    <div className="grid grid-cols-2 gap-3">
                      <Field
                        label="Resolved By"
                        value={
                          resolvedQ.data
                            ? fullName(resolvedQ.data)
                            : "—"
                        }
                      />
                      <Field label="Resolved At" value={formatDate(data.resolvedAt)} />
                    </div>
                  </Card>

                  <Card title="Resolution Note">
                    <div className="text-base whitespace-pre-wrap">
                      {data.resolvedNote || "—"}
                    </div>
                  </Card>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}


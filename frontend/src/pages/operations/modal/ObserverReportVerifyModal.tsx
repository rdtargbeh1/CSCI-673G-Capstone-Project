


// // ✅ FILE: src/pages/operations/ObserverReportVerifyModal.tsx





import { useEffect, useMemo, useState } from "react";
import { X, AlertCircle, CheckCircle2, XCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { fetchUserById, fetchMe } from "../../../shared/services/userService";
import { useAuthStore } from "../../../shared/store/authStore";
import type { ObserverReportVerificationRequest } from "../../../shared/services/observerReportService";
import type { UserDto } from "../../../auth/userTypes";

type Props = {
  open: boolean;
  reportId: string;
  busy?: boolean;
  onClose: () => void;
  onSubmit: (req: ObserverReportVerificationRequest) => Promise<void>;
  error?: any;
  reportData?: any;
};

function friendlyError(err: any): string {
  const v = (x: any) => (typeof x === "string" ? x : x == null ? "" : String(x));
  return v(err?.response?.data?.message) || v(err?.response?.data?.error) || v(err?.message) || "Request failed.";
}

function getUserFullName(user: UserDto | any): string {
  if (!user) return "—";
  const firstName = String(user.firstName ?? "").trim();
  const lastName = String(user.lastName ?? "").trim();
  const fullName = `${firstName} ${lastName}`.trim();
  return fullName || String(user.userName ?? user.email ?? "—");
}

function getUserRole(user: UserDto | any): string {
  if (!user) return "—";
  return String((user as any)?.roleName ?? (user as any)?.role?.roleName ?? "—");
}

function getReportOrgId(reportData: any): string {
  return String(
    reportData?.organizationId ??
      reportData?.organization?.orgId ??
      reportData?.orgId ??
      ""
  );
}

type Status =
  | "INTERNAL_VERIFIED"
  | "UNDER_INVESTIGATION"
  | "NEC_VERIFIED"
  | "REJECTED"
  | "PENDING";

type Visibility = "PRIVATE" | "SHARED" | "PUBLIC";

export default function ObserverReportVerifyModal({
  open,
  busy = false,
  onClose,
  onSubmit,
  error,
  reportData,
}: Props) {
  const currentOrgId = useAuthStore((s) => s.currentOrgId);
  const dashboardMode = useAuthStore((s) => s.dashboardMode);

  const isNecDashboard = dashboardMode === "NEC";

  const reportOrgId = useMemo(() => getReportOrgId(reportData), [reportData]);
  const isOwnerOrg =
    Boolean(currentOrgId) && Boolean(reportOrgId) && currentOrgId === reportOrgId;

  const isNecAuthorityOnOtherTenant = isNecDashboard && !isOwnerOrg;

  const [status, setStatus] = useState<Status>("INTERNAL_VERIFIED");
  const [visibility, setVisibility] = useState<Visibility>("PRIVATE");
  const [note, setNote] = useState("");
  const [isCritical, setIsCritical] = useState(false);

  const isResolved = reportData?.isResolved === true;

  const isLocked =
    reportData?.verificationStatus === "INTERNAL_VERIFIED" ||
    reportData?.verificationStatus === "NEC_VERIFIED";

  const currentUserQ = useQuery<UserDto>({
    enabled: open && !!currentOrgId,
    queryKey: ["users", "me", currentOrgId],
    queryFn: async () => fetchMe(currentOrgId!),
    staleTime: 60_000,
    retry: 1,
  });

  const currentUser = currentUserQ.data;

  const verifiedByUserId = reportData?.verifiedBy;
  const shouldFetchVerifiedBy = !!(open && verifiedByUserId && currentOrgId);

  const verifiedByUserQ = useQuery<UserDto>({
    enabled: shouldFetchVerifiedBy,
    queryKey: ["users", "verified-by", verifiedByUserId, currentOrgId],
    queryFn: async () => fetchUserById(currentOrgId, verifiedByUserId),
    staleTime: 60_000,
    retry: 1,
  });

  useEffect(() => {
    if (!open) return;

    setNote("");
    setIsCritical(false);

    const existingVisibility = String(reportData?.visibility ?? "").toUpperCase() as Visibility;

    if (isNecAuthorityOnOtherTenant) {
      setStatus("NEC_VERIFIED");
      setVisibility(existingVisibility === "PUBLIC" ? "PUBLIC" : "SHARED");
    } else {
      setStatus("INTERNAL_VERIFIED");
      setVisibility("PRIVATE");
    }
  }, [open, isNecAuthorityOnOtherTenant, reportData?.visibility]);

  if (!open) return null;

  const submitDisabled = busy || isResolved || isLocked;

  const noteRequired =
    (isNecAuthorityOnOtherTenant && status === "REJECTED" && !note.trim()) ||
    (!isNecAuthorityOnOtherTenant &&
      (status === "REJECTED" || status === "UNDER_INVESTIGATION") &&
      !note.trim());

  const currentUserName = getUserFullName(currentUser);
  const currentUserRole = getUserRole(currentUser);

  const headerSubtitle = isNecAuthorityOnOtherTenant
    ? "NEC Authority Review (Other Tenant)"
    : isNecDashboard
    ? "Tenant Verification (NEC Org)"
    : "Tenant Verification";

  const primaryButtonLabel = isNecAuthorityOnOtherTenant
    ? status === "REJECTED"
      ? "Reject"
      : "Mark NEC Verified"
    : status === "INTERNAL_VERIFIED"
    ? "Handle Internally"
    : status === "REJECTED"
    ? "Reject"
    : status === "UNDER_INVESTIGATION"
    ? "Escalate to NEC"
    : status === "NEC_VERIFIED"
    ? "Mark NEC Verified"
    : "Submit";

  const showInternal = !isNecAuthorityOnOtherTenant;
  const showInvestigate = !isNecAuthorityOnOtherTenant;
  const showNecVerified = isNecAuthorityOnOtherTenant || isNecDashboard;

  const safeStatusForSubmit: Status = isNecAuthorityOnOtherTenant
    ? status === "REJECTED"
      ? "REJECTED"
      : "NEC_VERIFIED"
    : status;

  const visibilityForSubmit: Visibility | undefined = isNecAuthorityOnOtherTenant
    ? visibility
    : safeStatusForSubmit === "INTERNAL_VERIFIED"
    ? "PRIVATE"
    : safeStatusForSubmit === "UNDER_INVESTIGATION"
    ? "SHARED"
    : safeStatusForSubmit === "NEC_VERIFIED"
    ? visibility
    : undefined;

  const isCriticalForSubmit =
    !isNecAuthorityOnOtherTenant && safeStatusForSubmit === "UNDER_INVESTIGATION"
      ? isCritical
      : undefined;

  const necVisibilityOptions: Visibility[] = ["SHARED", "PUBLIC"];

  const verifiedAt = reportData?.verifiedAt
    ? new Date(reportData.verifiedAt).toLocaleString()
    : null;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "INTERNAL_VERIFIED":
        return {
          icon: <CheckCircle2 size={20} className="text-emerald-600" />,
          color: "emerald",
          label: "✓ Internally Verified",
        };
      case "NEC_VERIFIED":
        return {
          icon: <CheckCircle2 size={20} className="text-emerald-600" />,
          color: "emerald",
          label: "✅ NEC Verified",
        };
      case "REJECTED":
        return {
          icon: <XCircle size={20} className="text-rose-600" />,
          color: "rose",
          label: "✕ Rejected",
        };
      case "UNDER_INVESTIGATION":
        return {
          icon: <AlertCircle size={20} className="text-yellow-600" />,
          color: "yellow",
          label: "🔍 Under Investigation",
        };
      default:
        return {
          icon: <AlertCircle size={20} className="text-slate-600" />,
          color: "slate",
          label: "⏳ " + status,
        };
    }
  };

  const statusBadge = getStatusBadge(reportData?.verificationStatus || "PENDING");

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER */}
        <div className="bg-gradient-to-r from-blue-50 to-white px-9 py-6 border-b border-slate-200 relative">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-5 right-5 h-9 w-9 flex items-center justify-center rounded-lg border bg-red-500 text-white font-bold border-slate-300 hover:bg-slate-500 transition text-slate-600"
            aria-label="Close"
          >
            <X size={24} />
          </button>

          <h2 className="text-3xl font-bold text-slate-900">🔍 Verify Report</h2>

          <p className="text-sm font-semibold text-slate-600 mt-2">{headerSubtitle}</p>

          <p className="text-base text-slate-600 mt-3">
            Verifying as:
            <span className="font-semibold text-lg text-blue-700 ml-2">
              {currentUserQ.isLoading ? "Loading…" : currentUserName}
            </span>
            <span className="text-base font-semibold text-slate-500 ml-2 bg-slate-200 px-3 py-1 rounded-full">
              {currentUserRole}
            </span>
          </p>
        </div>

        {/* CONTENT */}
        <div className="flex-1 overflow-y-auto px-8 py-7 space-y-7">
          {isResolved && (
            <div className="flex gap-4 rounded-lg bg-red-50 border border-red-200 p-5">
              <AlertCircle className="text-red-600 flex-shrink-0 mt-1" size={22} />
              <div>
                <div className="text-base font-bold text-red-900">Report Already Resolved</div>
                <div className="text-sm text-red-800 mt-1">Cannot verify a resolved report.</div>
              </div>
            </div>
          )}

          {isLocked && !isResolved && (
            <div className="rounded-lg border-2 p-5 bg-emerald-50 border-emerald-200">
              <div className="flex items-start gap-4">
                {statusBadge.icon}
                <div className="flex-1 min-w-0">
                  <div className="text-base font-bold text-slate-900 mb-4">
                    {statusBadge.label}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <div className="text-xs font-semibold text-slate-600 mb-1">Verified By</div>
                      <div className="text-sm font-bold text-slate-900">
                        {verifiedByUserQ.isLoading
                          ? "Loading…"
                          : verifiedByUserQ.data
                          ? getUserFullName(verifiedByUserQ.data)
                          : "—"}
                      </div>
                    </div>

                    {verifiedAt && (
                      <div>
                        <div className="text-xs font-semibold text-slate-600 mb-1">Verified At</div>
                        <div className="text-sm font-bold text-slate-900">{verifiedAt}</div>
                      </div>
                    )}

                    {reportData?.isCritical !== undefined && (
                      <div>
                        <div className="text-xs font-semibold text-slate-600 mb-1">Critical</div>
                        <div className="text-sm font-bold text-slate-900">
                          {reportData.isCritical ? "🔴 Yes" : "⚪ No"}
                        </div>
                      </div>
                    )}

                    {reportData?.visibility && (
                      <div>
                        <div className="text-xs font-semibold text-slate-600 mb-1">Visibility</div>
                        <div className="text-sm font-bold text-slate-900">
                          {reportData.visibility === "PUBLIC"
                            ? "🌍 Public"
                            : reportData.visibility === "SHARED"
                            ? "👥 Shared"
                            : "🔒 Private"}
                        </div>
                      </div>
                    )}
                  </div>

                  {reportData?.verificationNote && (
                    <div className="mt-4 pt-4 border-t border-slate-300">
                      <div className="text-xs font-semibold text-slate-600 mb-2">Verification Notes</div>
                      <div className="text-sm text-slate-800 italic bg-white p-3 rounded border border-slate-200">
                        "{reportData.verificationNote}"
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {isLocked && !isResolved && (
            <div className="flex gap-4 rounded-lg bg-amber-50 border border-amber-200 p-5">
              <AlertCircle className="text-amber-600 flex-shrink-0 mt-1" size={22} />
              <div>
                <div className="text-base font-bold text-amber-900">Report is Locked</div>
                <div className="text-sm text-amber-800 mt-1">
                  No further changes can be made to verification status. You can only resolve this report.
                </div>
              </div>
            </div>
          )}

          {!isLocked && reportData?.verificationStatus && (
            <div className="bg-blue-50 rounded-lg border border-blue-200 p-5">
              <div className="text-sm font-bold text-blue-900 uppercase mb-4">📋 Current Status</div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div>
                  <div className="text-xs text-blue-700 font-semibold mb-1">Status</div>
                  <div className="text-base font-bold text-slate-900">
                    {String(reportData.verificationStatus ?? "—")}
                  </div>
                </div>

                {reportData?.isCritical !== undefined && (
                  <div>
                    <div className="text-xs text-blue-700 font-semibold mb-1">Critical</div>
                    <div className="text-base font-bold text-slate-900">
                      {reportData.isCritical ? "🔴 Yes" : "⚪ No"}
                    </div>
                  </div>
                )}

                {reportData.verifiedBy && (
                  <div>
                    <div className="text-xs text-blue-700 font-semibold mb-1">Verified By</div>
                    <div className="text-base font-bold text-slate-900">
                      {verifiedByUserQ.isLoading
                        ? "Loading…"
                        : verifiedByUserQ.data
                        ? getUserFullName(verifiedByUserQ.data)
                        : "—"}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {!isLocked && (
            <div>
              <div className="flex items-center gap-3 mb-3">
                <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-300 text-sm font-bold text-slate-800">
                  1
                </span>
                <h3 className="text-lg font-bold text-slate-900">Make Your Decision</h3>
              </div>

              <div className={`grid gap-6 ${isNecAuthorityOnOtherTenant ? "grid-cols-2" : "grid-cols-4"}`}>
                {showInternal && (
                  <button
                    type="button"
                    onClick={() => setStatus("INTERNAL_VERIFIED")}
                    disabled={submitDisabled}
                    className={`py-2 px-3 rounded-lg border-2 font-semibold text-base transition flex flex-col items-center gap-2 ${
                      status === "INTERNAL_VERIFIED"
                        ? "border-emerald-600 bg-emerald-50 text-emerald-900"
                        : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                    } ${submitDisabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                  >
                    <span className="text-2xl">✓</span>
                    <span>Internal</span>
                  </button>
                )}

                {showNecVerified && (
                  <button
                    type="button"
                    onClick={() => setStatus("NEC_VERIFIED")}
                    disabled={submitDisabled}
                    className={`py-4 px-3 rounded-lg border-2 font-semibold text-base transition flex flex-col items-center gap-2 ${
                      status === "NEC_VERIFIED"
                        ? "border-emerald-600 bg-emerald-50 text-emerald-900"
                        : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                    } ${submitDisabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                    title="Final NEC verification"
                  >
                    <span className="text-2xl">✅</span>
                    <span>NEC Verified</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setStatus("REJECTED")}
                  disabled={submitDisabled}
                  className={`py-4 px-3 rounded-lg border-2 font-semibold text-base transition flex flex-col items-center gap-2 ${
                    status === "REJECTED"
                      ? "border-rose-600 bg-rose-50 text-rose-900"
                      : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                  } ${submitDisabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                >
                  <span className="text-2xl">✕</span>
                  <span>Reject</span>
                </button>

                {showInvestigate && (
                  <button
                    type="button"
                    onClick={() => setStatus("UNDER_INVESTIGATION")}
                    disabled={submitDisabled}
                    className={`py-4 px-3 rounded-lg border-2 font-semibold text-base transition flex flex-col items-center gap-2 ${
                      status === "UNDER_INVESTIGATION"
                        ? "border-yellow-600 bg-yellow-50 text-yellow-900"
                        : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                    } ${submitDisabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                  >
                    <span className="text-2xl">🔍</span>
                    <span>Investigate</span>
                  </button>
                )}
              </div>

              {isNecAuthorityOnOtherTenant && (
                <div className="mt-3 text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-lg p-3">
                  NEC authority review: you may only set <strong>NEC_VERIFIED</strong> or <strong>REJECTED</strong>.
                  Investigation and internal verification are disabled for other tenants.
                </div>
              )}
            </div>
          )}

          {!isLocked && !isNecAuthorityOnOtherTenant && status === "UNDER_INVESTIGATION" && (
            <div>
              <div className="flex items-center gap-3 mb-4">
                <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-yellow-300 text-sm font-bold text-yellow-900">
                  2
                </span>
                <h3 className="text-lg font-bold text-slate-900">Mark as Critical</h3>
              </div>

              <label className="flex items-center gap-3 p-4 rounded-lg border-2 border-slate-200 hover:border-yellow-300 cursor-pointer transition">
                <input
                  type="checkbox"
                  checked={isCritical}
                  onChange={(e) => setIsCritical(e.target.checked)}
                  disabled={submitDisabled}
                  className="w-5 h-5 rounded cursor-pointer"
                />
                <div>
                  <div className="font-semibold text-slate-900">This is a critical incident</div>
                  <div className="text-sm text-slate-600">Mark for high-priority NEC investigation</div>
                </div>
              </label>
            </div>
          )}

          {!isLocked && (
            <div>
              <div className="flex items-center gap-3 mb-4">
                <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-300 text-sm font-bold text-slate-800">
                  3
                </span>
                <h3 className="text-lg font-bold text-slate-900">Visibility</h3>
              </div>

              {isNecAuthorityOnOtherTenant ? (
                <div className="space-y-2">
                  <div className="text-sm text-slate-700">
                    Choose how this verified report is shared going forward (default: <strong>SHARED</strong>).
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {necVisibilityOptions.map((v) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => setVisibility(v)}
                        disabled={submitDisabled}
                        className={`h-10 px-4 rounded-lg border text-sm font-bold ${
                          visibility === v
                            ? "border-blue-600 bg-blue-50 text-blue-900"
                            : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                        } ${submitDisabled ? "opacity-50 cursor-not-allowed" : ""}`}
                      >
                        {v === "SHARED" ? "👥 SHARED (NEC keeps access)" : "🌍 PUBLIC"}
                      </button>
                    ))}
                  </div>

                  <div className="text-xs text-slate-500">
                    PRIVATE is disabled here to prevent the report disappearing from NEC records.
                  </div>
                </div>
              ) : (
                <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                  {status === "INTERNAL_VERIFIED" && (
                    <p className="text-sm text-slate-700">
                      Internal verification always stays <strong>PRIVATE</strong>.
                    </p>
                  )}
                  {status === "UNDER_INVESTIGATION" && (
                    <p className="text-sm text-slate-700">
                      Escalation to NEC sets visibility to <strong>SHARED</strong>.
                    </p>
                  )}
                  {status === "NEC_VERIFIED" && (
                    <div className="space-y-2">
                      <p className="text-sm text-slate-700">
                        Choose whether this NEC verified report is <strong>SHARED</strong> or <strong>PUBLIC</strong>.
                      </p>

                      <div className="flex flex-wrap gap-2">
                        {(["SHARED", "PUBLIC"] as Visibility[]).map((v) => (
                          <button
                            key={v}
                            type="button"
                            onClick={() => setVisibility(v)}
                            disabled={submitDisabled}
                            className={`h-10 px-4 rounded-lg border text-sm font-bold ${
                              visibility === v
                                ? "border-blue-600 bg-blue-50 text-blue-900"
                                : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                            } ${submitDisabled ? "opacity-50 cursor-not-allowed" : ""}`}
                          >
                            {v === "SHARED" ? "👥 SHARED" : "🌍 PUBLIC"}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {!isLocked && (
            <div>
              <div className="flex items-center gap-3 mb-4">
                <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-300 text-sm font-bold text-slate-800">
                  4
                </span>
                <h3 className="text-lg font-bold text-slate-900">
                  Notes
                  {((isNecAuthorityOnOtherTenant && status === "REJECTED") ||
                    (!isNecAuthorityOnOtherTenant &&
                      (status === "REJECTED" || status === "UNDER_INVESTIGATION"))) && (
                    <span className="text-red-600 ml-2">*</span>
                  )}
                </h3>
              </div>

              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                disabled={submitDisabled}
                rows={4}
                placeholder={
                  status === "REJECTED"
                    ? "Explain why you're rejecting this report..."
                    : status === "UNDER_INVESTIGATION"
                    ? "What aspects need further investigation?"
                    : "Add any findings or recommendations..."
                }
                className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-base text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50 resize-none"
              />

              {noteRequired && (
                <div className="text-sm text-red-600 mt-2 flex items-center gap-2">
                  <AlertCircle size={16} /> This field is required
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="flex gap-3 rounded-lg bg-red-50 border border-red-200 p-4">
              <AlertCircle className="text-red-600 flex-shrink-0" size={20} />
              <div className="text-sm text-red-700">{friendlyError(error)}</div>
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="border-t border-slate-200 bg-slate-50 px-8 py-5 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-6 h-10 rounded-lg border border-slate-300 bg-white text-slate-900 text-base font-semibold hover:bg-slate-50 transition"
          >
            {isLocked ? "Close" : "Cancel"}
          </button>

          {!isLocked && (
            <button
              type="button"
              disabled={submitDisabled || noteRequired}
              onClick={async () => {
                await onSubmit({
                  status: safeStatusForSubmit as any,
                  visibility: visibilityForSubmit as any,
                  note: note.trim() || undefined,
                  isCritical: isCriticalForSubmit as any,
                });
              }}
              className={`px-6 h-10 rounded-lg text-base font-semibold text-white transition disabled:opacity-50 flex items-center gap-2 ${
                safeStatusForSubmit === "REJECTED"
                  ? "bg-rose-600 hover:bg-rose-700"
                  : safeStatusForSubmit === "UNDER_INVESTIGATION"
                  ? "bg-yellow-600 hover:bg-yellow-700"
                  : "bg-emerald-600 hover:bg-emerald-700"
              }`}
            >
              <span className="text-lg">
                {safeStatusForSubmit === "REJECTED"
                  ? "✕"
                  : safeStatusForSubmit === "UNDER_INVESTIGATION"
                  ? "🔍"
                  : "✅"}
              </span>
              {primaryButtonLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}



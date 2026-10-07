


import { useEffect, useState } from "react";
import { X, AlertCircle, CheckCircle2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { fetchUserById, fetchMe } from "../../../shared/services/userService";
import { useAuthStore } from "../../../shared/store/authStore";
import type { ObserverReportResolveRequest } from "../../../shared/services/observerReportService";
import type { UserDto } from "../../../auth/userTypes";

type Props = {
  open: boolean;
  reportId: string;
  busy?: boolean;
  readOnly?: boolean;
  onClose: () => void;
  onSubmit: (req: ObserverReportResolveRequest) => Promise<void>;
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

export default function ObserverReportResolveModal({
  open,
  busy = false,
  readOnly = false,
  onClose,
  onSubmit,
  error,
  reportData,
}: Props) {
  const currentOrgId = useAuthStore((s) => s.currentOrgId);

  const [note, setNote] = useState("");
  
  const resolved = reportData?.resolved === true;

  const currentUserQ = useQuery<UserDto>({
    enabled: open && !!currentOrgId,
    queryKey: ["users", "me", currentOrgId],
    queryFn: async () => fetchMe(currentOrgId!),
    staleTime: 60_000,
    retry: 1,
  });

  const currentUser = currentUserQ.data;

  const resolvedByUserId = reportData?.resolvedBy;
  const shouldFetchResolvedBy = !!(open && resolvedByUserId && currentOrgId);

  const resolvedByUserQ = useQuery<UserDto>({
    enabled: shouldFetchResolvedBy,
    queryKey: ["users", "resolved-by", resolvedByUserId, currentOrgId],
    queryFn: async () => fetchUserById(currentOrgId, resolvedByUserId),
    staleTime: 60_000,
    retry: 1,
  });

  useEffect(() => {
    if (open) {
      setNote("");
    }
  }, [open]);

  if (!open) return null;

  const submitDisabled = busy || resolved || readOnly;
  const noteRequired = !resolved && !note.trim();

  const currentUserName = getUserFullName(currentUser);
  const currentUserRole = getUserRole(currentUser);

  const resolvedAt = reportData?.resolvedAt
    ? new Date(reportData.resolvedAt).toLocaleString()
    : null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER */}
        <div className="bg-gradient-to-r from-emerald-50 to-white px-8 py-6 border-b border-slate-200 relative">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-5 right-5 h-9 w-9 flex items-center justify-center rounded-lg border border-slate-300 hover:bg-slate-100 transition text-slate-600"
            aria-label="Close"
          >
            <X size={20} />
          </button>

          <h2 className="text-3xl font-bold text-slate-900">✓ Mark as Resolved</h2>

          <p className="text-sm font-semibold text-slate-600 mt-2">
            {resolved ? "Resolution Details (Read-Only)" : "Case Resolution"}
          </p>

          <p className="text-base text-slate-600 mt-3">
            {resolved ? "Report resolved by:" : "Resolving as:"}
            <span className="font-semibold text-emerald-700 ml-2">
              {resolved
                ? resolvedByUserQ.isLoading
                  ? "Loading…"
                  : resolvedByUserQ.data
                  ? getUserFullName(resolvedByUserQ.data)
                  : "—"
                : currentUserQ.isLoading
                ? "Loading…"
                : currentUserName}
            </span>
            <span className="text-sm font-semibold text-slate-500 ml-2 bg-slate-200 px-3 py-1 rounded-full">
              {resolved
                ? resolvedByUserQ.data
                  ? getUserRole(resolvedByUserQ.data)
                  : "—"
                : currentUserRole}
            </span>
          </p>
        </div>

        {/* CONTENT */}
        <div className="flex-1 overflow-y-auto px-8 py-7 space-y-7">
          {resolved && (
            <div className="rounded-lg border-2 border-emerald-200 bg-emerald-50 p-5">
              <div className="flex items-start gap-4">
                <CheckCircle2 size={24} className="text-emerald-600 flex-shrink-0 mt-1" />
                <div className="flex-1 min-w-0">
                  <div className="text-base font-bold text-slate-900 mb-4">
                    ✓ Report Resolved
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <div className="text-xs font-semibold text-slate-600 mb-1">Resolved By</div>
                      <div className="text-sm font-bold text-slate-900">
                        {resolvedByUserQ.isLoading
                          ? "Loading…"
                          : resolvedByUserQ.data
                          ? getUserFullName(resolvedByUserQ.data)
                          : "—"}
                      </div>
                    </div>

                    {resolvedAt && (
                      <div>
                        <div className="text-xs font-semibold text-slate-600 mb-1">Resolved At</div>
                        <div className="text-sm font-bold text-slate-900">{resolvedAt}</div>
                      </div>
                    )}
                  </div>

                  {reportData?.resolvedNote && (
                    <div className="mt-4 pt-4 border-t border-emerald-300">
                      <div className="text-xs font-semibold text-slate-600 mb-2">Resolution Notes</div>
                      <div className="text-sm text-slate-800 italic bg-white p-3 rounded border border-slate-200">
                        "{reportData.resolvedNote}"
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {reportData?.verificationStatus && (
            <div className="bg-blue-50 rounded-lg border border-blue-200 p-5">
              <div className="text-sm font-bold text-blue-900 uppercase mb-4">📋 Report Status</div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div>
                  <div className="text-xs text-blue-700 font-semibold mb-1">Verification</div>
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

                <div>
                  <div className="text-xs text-blue-700 font-semibold mb-1">Status</div>
                  <div className="text-base font-bold text-slate-900">
                    {resolved ? "✓ Resolved" : "⏳ Open"}
                  </div>
                </div>
              </div>
            </div>
          )}

          {!resolved && (
            <div>
              <div className="flex items-center gap-3 mb-4">
                <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-emerald-300 text-sm font-bold text-emerald-900">
                  1
                </span>
                <h3 className="text-lg font-bold text-slate-900">Resolution Notes</h3>
                <span className="text-red-600 ml-2">*</span>
              </div>

              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                disabled={submitDisabled}
                rows={5}
                placeholder="Describe how this report was resolved, what actions were taken, and any outcomes..."
                className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-base text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-slate-50 resize-none"
              />

              {noteRequired && (
                <div className="text-sm text-red-600 mt-2 flex items-center gap-2">
                  <AlertCircle size={16} /> Resolution notes are required
                </div>
              )}

              <div className="text-xs text-slate-600 mt-2">
                Document what was done to resolve this case for the record.
              </div>
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
            {resolved ? "Close" : "Cancel"}
          </button>

          {!resolved && (
            <button
              type="button"
              disabled={submitDisabled || noteRequired}
              onClick={async () => {
                await onSubmit({
                  note: note.trim(),
                });
              }}
              className={`px-6 h-10 rounded-lg text-base font-semibold text-white transition disabled:opacity-50 flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700`}
            >
              <span className="text-lg">✓</span>
              Mark as Resolved
            </button>
          )}
        </div>
      </div>
    </div>
  );
}


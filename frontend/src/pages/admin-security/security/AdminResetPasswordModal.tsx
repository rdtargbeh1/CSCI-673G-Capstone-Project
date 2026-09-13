
import React, { useEffect, useMemo, useState } from "react";
import { X, AlertCircle, Eye, EyeOff, Copy, Check, RefreshCw } from "lucide-react";

function safeStr(v: any) {
  return typeof v === "string" ? v : v == null ? "" : String(v);
}

function fullName(u: any) {
  const n = `${safeStr(u?.firstName)} ${safeStr(u?.lastName)}`.trim();
  return n || safeStr(u?.userName) || safeStr(u?.email) || "—";
}

function generateTempPassword(len = 14) {
  const chars =
    "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*";
  let out = "";
  const arr = new Uint32Array(len);
  crypto.getRandomValues(arr);
  for (let i = 0; i < len; i++) out += chars[arr[i] % chars.length];
  return out;
}

function ModalShell({
  open,
  title,
  subtitle,
  children,
  onClose,
}: {
  open: boolean;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
        <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden flex flex-col max-h-[95vh] sm:max-h-[90vh]">
          {/* HEADER */}
          <div className="bg-gradient-to-r from-red-600 via-red-500 to-red-400 px-4 sm:px-6 py-5 sm:py-6 border-b border-red-600 flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
                🔐 {title}
              </h2>
              {subtitle && (
                <p className="text-xs sm:text-sm font-semibold text-red-100 mt-1">
                  {subtitle}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex-shrink-0 h-9 w-9 rounded-lg border-2 border-red-300 hover:bg-red-700 bg-red-600 transition text-white flex items-center justify-center"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>

          {/* CONTENT */}
          <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 sm:py-5">
            {children}
          </div>
        </div>
      </div>
    </>
  );
}

export default function AdminResetPasswordModal(props: {
  open: boolean;
  user: any | null;
  disabledReason?: string;
  isSaving?: boolean;
  errorText?: string;
  onClose: () => void;
  onSubmit: (newPassword: string, sendEmail: boolean) => void;
}) {
  const { open, user, onClose, onSubmit, isSaving, errorText, disabledReason } =
    props;

  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [confirmAck, setConfirmAck] = useState(false);
  const [copied, setCopied] = useState(false);
  const [sendEmail, setSendEmail] = useState(true);

  useEffect(() => {
    if (open) {
      setNewPassword("");
      setConfirm("");
      setShow(false);
      setConfirmAck(false);
      setCopied(false);
      setSendEmail(true);
    }
  }, [open]);

  const identity = useMemo(() => {
    if (!user) return null;
    return {
      name: fullName(user),
      userName: safeStr(user?.userName),
      email: safeStr(user?.email),
      role: safeStr(user?.roleName ?? "—"),
    };
  }, [user]);

  const validationError = useMemo(() => {
    if (!newPassword.trim()) return "Password is required.";
    if (newPassword.trim().length < 8) return "Minimum 8 characters.";
    if (newPassword !== confirm) return "Passwords do not match.";
    return "";
  }, [newPassword, confirm]);

  const isDisabled =
    !!disabledReason || !!validationError || !confirmAck || !!isSaving;

  async function copyPw() {
    try {
      await navigator.clipboard.writeText(newPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      // ignore
    }
  }

  return (
    <ModalShell
      open={open}
      onClose={() => {
        if (isSaving) return;
        onClose();
      }}
      title="Reset Password"
      subtitle="Admin action — set a temporary password for this user."
    >
      {!user ? (
        <div className="text-base text-slate-600">No user selected.</div>
      ) : (
        <div className="space-y-4">
          {/* User Identity Card */}
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div className="text-sm font-bold text-slate-600 uppercase tracking-wide mb-3">
              👤 User Information
            </div>
            <div className="space-y-2">
              <div>
                <div className="text-base font-bold text-slate-900">
                  {identity?.name}
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-slate-600">
                <div>
                  <span className="font-semibold text-slate-900">Username:</span>{" "}
                  @{identity?.userName || "—"}
                </div>
                <div>
                  <span className="font-semibold text-slate-900">Role:</span>{" "}
                  {identity?.role || "—"}
                </div>
                <div className="sm:col-span-2">
                  <span className="font-semibold text-slate-900">Email:</span>{" "}
                  {identity?.email || "—"}
                </div>
              </div>
            </div>
          </div>

          {/* Disabled Reason */}
          {disabledReason && (
            <div className="flex gap-3 rounded-lg bg-amber-50 border border-amber-200 p-3">
              <AlertCircle className="text-amber-600 flex-shrink-0 mt-0.5" size={18} />
              <div className="text-sm text-amber-800 font-semibold">
                {disabledReason}
              </div>
            </div>
          )}

          {/* Error Message */}
          {errorText && (
            <div className="flex gap-3 rounded-lg bg-red-50 border border-red-200 p-3">
              <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={18} />
              <div className="text-sm text-red-700 font-semibold">
                {errorText}
              </div>
            </div>
          )}

          {/* Password Section */}
          <div className="space-y-3 bg-white p-4 rounded-lg border border-slate-200">
            <div className="text-sm font-bold text-slate-900 uppercase tracking-wide">
              🔑 Set Temporary Password
            </div>

            {/* Generate & Copy Buttons */}
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={() => {
                  const pw = generateTempPassword();
                  setNewPassword(pw);
                  setConfirm(pw);
                  setCopied(false);
                }}
                disabled={!!disabledReason || !!isSaving}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RefreshCw size={16} />
                Generate Password
              </button>

              <button
                type="button"
                onClick={copyPw}
                disabled={!newPassword.trim()}
                className={`flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition ${
                  copied
                    ? "bg-green-100 text-green-700 border border-green-200"
                    : "bg-slate-100 text-slate-900 border border-slate-200 hover:bg-slate-50"
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {copied ? (
                  <>
                    <Check size={16} />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy size={16} />
                    Copy
                  </>
                )}
              </button>
            </div>

            {/* Password Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-semibold text-slate-900 mb-2">
                  New Password <span className="text-red-600">*</span>
                </label>
                <div className="relative">
                  <input
                    type={show ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter or generate password"
                    autoComplete="new-password"
                    disabled={!!disabledReason || !!isSaving}
                    className={`w-full rounded-lg border px-3 py-2.5 pr-10 text-base outline-none transition ${
                      validationError
                        ? "border-red-300 bg-red-50 text-red-900 placeholder:text-red-400 focus:ring-2 focus:ring-red-400"
                        : "border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500"
                    } ${!!disabledReason || !!isSaving ? "bg-slate-50 cursor-not-allowed opacity-60" : ""}`}
                  />
                </div>
                <div className="mt-1 text-xs text-slate-500 font-semibold">
                  Min 8 characters
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-900 mb-2">
                  Confirm Password <span className="text-red-600">*</span>
                </label>
                <div className="relative">
                  <input
                    type={show ? "text" : "password"}
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder="Confirm password"
                    autoComplete="new-password"
                    disabled={!!disabledReason || !!isSaving}
                    className={`w-full rounded-lg border px-3 py-2.5 pr-10 text-base outline-none transition ${
                      validationError
                        ? "border-red-300 bg-red-50 text-red-900 placeholder:text-red-400 focus:ring-2 focus:ring-red-400"
                        : "border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500"
                    } ${!!disabledReason || !!isSaving ? "bg-slate-50 cursor-not-allowed opacity-60" : ""}`}
                  />
                  <button
                    type="button"
                    onClick={() => setShow((s) => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
                    tabIndex={-1}
                  >
                    {show ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {validationError && (
                  <div className="mt-1 flex items-center gap-1 text-xs text-red-600 font-semibold">
                    <AlertCircle size={12} />
                    {validationError}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Email Notification Section */}
          <div className="space-y-3 bg-white p-4 rounded-lg border border-slate-200">
            <div className="text-sm font-bold text-slate-900 uppercase tracking-wide">
              📧 Email Notification
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 cursor-pointer">
                <input
                  type="radio"
                  name="sendEmail"
                  checked={sendEmail}
                  onChange={() => setSendEmail(true)}
                  disabled={!!disabledReason || !!isSaving || !identity?.email}
                  className="h-4 w-4 accent-blue-600"
                />
                <span className="text-sm text-slate-900 font-semibold">
                  Send password to{" "}
                  <span className="font-mono text-blue-600">{identity?.email || "—"}</span>
                </span>
              </label>

              <label className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 cursor-pointer">
                <input
                  type="radio"
                  name="sendEmail"
                  checked={!sendEmail}
                  onChange={() => setSendEmail(false)}
                  disabled={!!disabledReason || !!isSaving}
                  className="h-4 w-4 accent-blue-600"
                />
                <span className="text-sm text-slate-900 font-semibold">
                  Do not send email
                </span>
              </label>
            </div>

            {!identity?.email && (
              <div className="flex gap-2 rounded-lg bg-amber-50 border border-amber-200 p-2.5 text-xs text-amber-800">
                <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
                <span className="font-semibold">
                  No email address found for this user. Email sending is unavailable.
                </span>
              </div>
            )}
          </div>

          {/* Confirmation Checkbox */}
          <label className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 cursor-pointer transition">
            <input
              type="checkbox"
              checked={confirmAck}
              onChange={(e) => setConfirmAck(e.target.checked)}
              disabled={!!disabledReason || !!isSaving}
              className="h-4 w-4 accent-red-600"
            />
            <span className="text-sm text-slate-900 font-semibold">
              I confirm resetting the password for this user.
            </span>
          </label>

          {/* Actions */}
          <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-3 border-t border-slate-200 pt-4">
            <button
              type="button"
              onClick={() => {
                if (isSaving) return;
                onClose();
              }}
              className="px-4 h-10 rounded-lg border border-slate-300 bg-white text-slate-900 text-sm font-semibold hover:bg-slate-50 transition disabled:opacity-50 sm:min-w-fit"
            >
              Cancel
            </button>

            <button
              type="button"
              disabled={isDisabled}
              onClick={() => onSubmit(newPassword.trim(), sendEmail)}
              className={`px-4 h-10 rounded-lg text-sm font-semibold text-white transition flex items-center justify-center gap-2 sm:min-w-fit ${
                isDisabled
                  ? "bg-slate-300 cursor-not-allowed opacity-60"
                  : "bg-red-600 hover:bg-red-700 shadow-sm"
              }`}
              title={disabledReason || ""}
            >
              {isSaving ? (
                <>
                  <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span className="hidden sm:inline">Resetting…</span>
                </>
              ) : (
                <>
                  <RefreshCw size={16} />
                  <span className="hidden sm:inline">Reset Password</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </ModalShell>
  );
}



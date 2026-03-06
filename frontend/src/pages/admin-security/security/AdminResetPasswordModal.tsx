

import React, { useEffect, useMemo, useState } from "react";

function safeStr(v: any) {
  return typeof v === "string" ? v : v == null ? "" : String(v);
}

function fullName(u: any) {
  const n = `${safeStr(u?.firstName)} ${safeStr(u?.lastName)}`.trim();
  return n || safeStr(u?.userName) || safeStr(u?.email) || "—";
}

function generateTempPassword(len = 14) {
  // strong enough for a temp password; avoids ambiguous chars
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
      <div className="fixed inset-0 z-40 bg-black/35" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-start justify-center p-3 sm:p-6">
        <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white shadow-2xl">
          <div className="flex items-start justify-between border-b border-slate-200 px-4 py-3">
            <div>
              <div className="text-base font-extrabold text-slate-900">
                {title}
              </div>
              {subtitle ? (
                <div className="text-[11px] text-slate-500">{subtitle}</div>
              ) : null}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="h-9 w-9 rounded-xl border border-slate-200 hover:bg-slate-50"
              aria-label="Close"
            >
              ✕
            </button>
          </div>

          <div className="px-4 py-4">{children}</div>
        </div>
      </div>
    </>
  );
}

/**
 * ✅ IMPORTANT:
 * This must be a DEFAULT EXPORT because UsersPage imports it like:
 * import AdminResetPasswordModal from "./AdminResetPasswordModal";
 */
export default function AdminResetPasswordModal(props: {
  open: boolean;
  user: any | null;
  disabledReason?: string;
  isSaving?: boolean;
  errorText?: string;
  onClose: () => void;
  onSubmit: (newPassword: string) => void;
}) {
  const { open, user, onClose, onSubmit, isSaving, errorText, disabledReason } =
    props;

  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [confirmAck, setConfirmAck] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (open) {
      setNewPassword("");
      setConfirm("");
      setShow(false);
      setConfirmAck(false);
      setCopied(false);
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
        <div className="text-sm text-slate-600">No user selected.</div>
      ) : (
        <>
          {/* Identity (read-only) */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
            <div className="text-xs font-bold text-slate-900">
              {identity?.name}
            </div>
            <div className="mt-1 grid grid-cols-1 gap-1 text-[11px] text-slate-600">
              <div>
                <span className="font-semibold">Username:</span>{" "}
                @{identity?.userName || "—"}
              </div>
              <div>
                <span className="font-semibold">Email:</span>{" "}
                {identity?.email || "—"}
              </div>
              <div>
                <span className="font-semibold">Role:</span>{" "}
                {identity?.role || "—"}
              </div>
            </div>
          </div>

          {disabledReason ? (
            <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              {disabledReason}
            </div>
          ) : null}

          {errorText ? (
            <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {errorText}
            </div>
          ) : null}

          {/* Password fields */}
          <div className="mt-3 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="text-[11px] font-semibold text-slate-600">
                New temporary password <span className="text-red-600">*</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold hover:bg-slate-50"
                  onClick={() => {
                    const pw = generateTempPassword();
                    setNewPassword(pw);
                    setConfirm(pw);
                    setCopied(false);
                  }}
                  disabled={!!disabledReason || !!isSaving}
                >
                  Generate
                </button>
                <button
                  type="button"
                  className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold hover:bg-slate-50 disabled:opacity-50"
                  onClick={copyPw}
                  disabled={!newPassword.trim()}
                  title="Copy password"
                >
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="block">
                <input
                  type={show ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter temp password"
                  autoComplete="new-password"
                  className={[
                    "w-full rounded-xl border bg-white px-3 py-2 text-sm outline-none focus:ring-2",
                    validationError
                      ? "border-red-300 focus:ring-red-400"
                      : "border-slate-200 focus:ring-(--org-primary)",
                  ].join(" ")}
                  disabled={!!disabledReason || !!isSaving}
                />
                <div className="mt-1 text-[11px] text-slate-500">
                  Min 8 characters
                </div>
              </label>

              <label className="block">
                <input
                  type={show ? "text" : "password"}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Confirm password"
                  autoComplete="new-password"
                  className={[
                    "w-full rounded-xl border bg-white px-3 py-2 text-sm outline-none focus:ring-2",
                    validationError
                      ? "border-red-300 focus:ring-red-400"
                      : "border-slate-200 focus:ring-(--org-primary)",
                  ].join(" ")}
                  disabled={!!disabledReason || !!isSaving}
                />
                <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500">
                  <span>{validationError ? validationError : " "}</span>
                  <button
                    type="button"
                    onClick={() => setShow((s) => !s)}
                    className="font-semibold text-slate-700 hover:underline"
                  >
                    {show ? "Hide" : "Show"}
                  </button>
                </div>
              </label>
            </div>

            <label className="flex items-center gap-2 text-xs text-slate-700">
              <input
                type="checkbox"
                checked={confirmAck}
                onChange={(e) => setConfirmAck(e.target.checked)}
                disabled={!!disabledReason || !!isSaving}
                className="h-4 w-4 accent-(--org-primary)"
              />
              I confirm resetting password for this user.
            </label>
          </div>

          {/* Actions */}
          <div className="mt-4 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                if (isSaving) return;
                onClose();
              }}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold hover:bg-slate-50"
            >
              Cancel
            </button>

            <button
              type="button"
              disabled={isDisabled}
              onClick={() => onSubmit(newPassword.trim())}
              className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
              title={disabledReason || ""}
            >
              {isSaving ? "Resetting…" : "Reset Password"}
            </button>
          </div>
        </>
      )}
    </ModalShell>
  );
}



// src/pages/admin-security/security/shared/admin-ui.tsx

import React from "react";
import { NavLink } from "react-router-dom";
import { useAuthStore } from "../../../shared/store/authStore"; // ✅ add
// import { useAuth } from "../../../auth/useAuth";

export function AdminShell({
  title,
  subtitle,
  right,
  children,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold">{title}</h1>
          {subtitle ? (
            <p className="mt-1 text-base text-slate-600">{subtitle}</p>
          ) : null}
        </div>
        {right}
      </div>
      {children}
    </div>
  );
}

export function Tabs() {
  // ✅ read from the same source used everywhere else
  const dashboardMode = useAuthStore((s) => s.dashboardMode);

  const isSystem = dashboardMode === "SYSTEM";
  const isNecOrSystem = dashboardMode === "NEC" || dashboardMode === "SYSTEM";

  const base = "rounded-xl border px-3 py-2 text-xl font-semibold";
  const active = "bg-[#00008B] border-slate-200 text-[#EFBF04] font-extrabold";
  const idle = "bg-white border-slate-200 hover:bg-slate-50";

  return (
    <div className="flex flex-wrap gap-2">
      <span className="self-center text-xs font-bold text-slate-400">
        Tenant Admin
      </span>

      {/* ✅ Organizations tab SYSTEM ONLY */}
      {isSystem ? (
        <NavLink
          to="/admin-security/organizations"
          className={({ isActive }) => `${base} ${isActive ? active : idle}`}
        >
          Organizations
        </NavLink>
      ) : null}

      <NavLink
        to="/admin-security/memberships"
        className={({ isActive }) => `${base} ${isActive ? active : idle}`}
      >
        Memberships
      </NavLink>

      <NavLink
        to="/admin-security/org-settings"
        className={({ isActive }) => `${base} ${isActive ? active : idle}`}
      >
        Org Settings
      </NavLink>

      <span className="mx-1 self-center text-xs font-bold text-slate-400">
        | Security
      </span>

      <NavLink
        to="/admin-security/users"
        className={({ isActive }) => `${base} ${isActive ? active : idle}`}
      >
        Users
      </NavLink>

      <NavLink
        to="/admin-security/roles"
        className={({ isActive }) => `${base} ${isActive ? active : idle}`}
      >
        Roles
      </NavLink>

      <NavLink
        to="/admin-security/mfa"
        className={({ isActive }) => `${base} ${isActive ? active : idle}`}
      >
        MFA
      </NavLink>

      <NavLink
        to="/admin-security/sessions"
        className={({ isActive }) => `${base} ${isActive ? active : idle}`}
      >
        Sessions
      </NavLink>

      <NavLink
        to="/admin-security/signing-keys"
        className={({ isActive }) => `${base} ${isActive ? active : idle}`}
      >
        Signing Keys
      </NavLink>

      <span className="mx-1 self-center text-xs font-bold text-slate-400">
        | Oversight
      </span>

      <NavLink
        to="/admin-security/audit-logs"
        className={({ isActive }) => `${base} ${isActive ? active : idle}`}
      >
        Audit Logs
      </NavLink>

      <NavLink
        to="/admin-security/audit-ledger"
        className={({ isActive }) => `${base} ${isActive ? active : idle}`}
        style={!isNecOrSystem ? { display: "none" } : undefined}
      >
        Audit Ledger
      </NavLink>

      <NavLink
        to="/admin-security/file-uploads"
        className={({ isActive }) => `${base} ${isActive ? active : idle}`}
      >
        File Uploads
      </NavLink>
    </div>
  );
}

export function Card({
  title,
  right,
  children,
}: {
  title: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white">
      <div className="flex items-center justify-between gap-3 border-b border-slate-200 p-4 text-xl">
        <div className="font-extrabold">{title}</div>
        {right}
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

export function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-2 py-0.5 text-base font-semibold text-slate-700">
      {children}
    </span>
  );
}

export function Note({ title, bullets }: { title: string; bullets: string[] }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3">
      <div className="font-extrabold">{title}</div>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-base text-slate-700">
        {bullets.map((b) => (
          <li key={b}>{b}</li>
        ))}
      </ul>
    </div>
  );
}

/**
 * ✅ Table responsiveness fix:
 * - Uses min-w-max so columns don't compress into unreadable state
 * - Keeps overflow-x-auto
 * - Adds sticky header (nice on mid widths)
 * - Allows some cells to wrap (remove nowrap from td, keep header nowrap)
 */

/* -----------------------------------------------------------------------
   OPTIONAL: use these classes on badges & icon buttons to keep rows tight.

   Status badge:
   className="inline-flex items-center rounded-full bg-emerald-50 text-emerald-700
              px-1.5 py-0 text-[11px] leading-none font-semibold"

   Icon button (edit/disable):
   className="h-6 w-6 p-0 inline-flex items-center justify-center rounded-md hover:bg-slate-100"
   Icon size: 14
------------------------------------------------------------------------ */

export function Table({
  columns,
  rows,
}: {
  columns: string[];
  rows: Array<Array<string | number | React.ReactNode>>;
}) {
  const lastColIndex = columns.length - 1;

  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full border-collapse table-auto">
        <thead>
          <tr>
            {columns.map((c, idx) => (
              <th
                key={c}
                className={[
                  "border-b border-slate-200 px-2 py-2 text-left text-base font-bold text-slate-600",
                  "whitespace-nowrap",
                  idx === lastColIndex
                    ? "sticky right-0 z-10 bg-white shadow-[-10px_0_10px_-12px_rgba(0,0,0,0.25)]"
                    : "",
                ].join(" ")}
              >
                {c}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="hover:bg-slate-50">
              {r.map((cell, j) => (
                <td
                  key={j}
                  className={[
                    "border-b border-slate-100 px-2 py-2 text-base text-slate-800 align-top",
                    // ✅ Fix 620px–1585px: allow wrap/truncate instead of forcing one long line
                    "whitespace-normal wrap-break-words",
                    j === lastColIndex
                      ? "sticky right-0 z-10 bg-white shadow-[-10px_0_10px_-12px_rgba(0,0,0,0.25)]"
                      : "",
                  ].join(" ")}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* =========================================================
   ✅ NEW: Modal, TextField, SelectField
   ========================================================= */

export function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3">
        <div
          role="dialog"
          aria-modal="true"
          className="w-full max-w-4xl rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden flex flex-col max-h-[95vh] sm:max-h-[90vh]"
        >
          {/* HEADER WITH BLUE GRADIENT */}
          <div className="bg-gradient-to-r from-blue-600 via-blue-500 to-blue-400 px-4 sm:px-6 py-5 sm:py-6 border-b border-blue-600 flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="text-xl sm:text-2xl font-bold text-white">
                {title}
              </div>
              {subtitle ? (
                <div className="mt-1 text-xs sm:text-sm font-semibold text-blue-100">
                  {subtitle}
                </div>
              ) : null}
            </div>

            <button
              className="flex-shrink-0 h-9 w-9 rounded-lg border-2 border-blue-300 hover:bg-blue-700 bg-blue-600 transition text-white flex items-center justify-center disabled:opacity-50"
              onClick={onClose}
              title="Close"
              aria-label="Close dialog"
            >
              ✕
            </button>
          </div>

          {/* CONTENT */}
          <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 sm:py-5">
            {children}
          </div>

          {/* FOOTER */}
          {footer ? (
            <div className="border-t border-slate-200 bg-slate-50 px-4 sm:px-6 py-4 sm:py-5">
              {footer}
            </div>
          ) : null}
        </div>
      </div>
    </>
  );
}

export function TextField({
  label,
  value,
  onChange,
  type,
  disabled,
  placeholder,
  required,
  error,
  onBlur,
  hidePlaceholderOnFocus,
  inputMode,
  pattern,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  disabled?: boolean;
  placeholder?: string;
  required?: boolean;
  error?: string;
  onBlur?: () => void;
  hidePlaceholderOnFocus?: boolean;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  pattern?: string;
}) {
  const [focused, setFocused] = React.useState(false);

  const effectivePlaceholder =
    hidePlaceholderOnFocus && focused ? "" : placeholder;

  return (
    <label className="block">
      <div className="mb-1 flex items-center justify-between">
        <div className="text-base font-semibold text-slate-600">
          {label} {required ? <span className="text-red-600">*</span> : null}
        </div>
        {error ? (
          <div className="text-base font-semibold text-red-600">{error}</div>
        ) : null}
      </div>

      <input
        type={type ?? "text"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder={effectivePlaceholder}
        onFocus={() => setFocused(true)}
        onBlur={() => {
          setFocused(false);
          onBlur?.();
        }}
        inputMode={inputMode}
        pattern={pattern}
        className={[
          "w-full rounded-xl border bg-white px-3 py-2 text-xl outline-none focus:ring-2",
          error
            ? "border-red-300 focus:ring-red-400"
            : "border-slate-200 focus:ring-(--org-primary)",
          disabled ? "bg-slate-50" : "",
        ].join(" ")}
      />
    </label>
  );
}

export function SelectField({
  label,
  value,
  onChange,
  options,
  required,
  error,
  disabled,
  onBlur,
  helper,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: Array<{ value: string; label: string }>;
  required?: boolean;
  error?: string;
  disabled?: boolean;
  onBlur?: () => void;
  helper?: string;
}) {
  return (
    <label className="block">
      <div className="mb-1 flex items-center justify-between">
        <div className="text-base font-semibold text-slate-600">
          {label} {required ? <span className="text-red-600">*</span> : null}
        </div>
        {error ? (
          <div className="text-base font-semibold text-red-600">{error}</div>
        ) : null}
      </div>

      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        disabled={disabled}
        className={[
          "w-full rounded-xl border bg-white px-3 py-2 text-xl outline-none focus:ring-2",
          error
            ? "border-red-300 focus:ring-red-400"
            : "border-slate-200 focus:ring-(--org-primary)",
          disabled ? "bg-slate-50" : "",
        ].join(" ")}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>

      {helper ? (
        <div className="mt-1 text-sm text-slate-500">{helper}</div>
      ) : null}
    </label>
  );
}

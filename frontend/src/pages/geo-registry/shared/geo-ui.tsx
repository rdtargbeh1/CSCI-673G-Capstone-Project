// src/pages/geo-registry/shared/geo-ui.ts

import React from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../../../auth/useAuth";

export function PageShell({
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
  const { dashboardMode } = useAuth();
  const showRegistry = dashboardMode === "NEC" || dashboardMode === "SYSTEM";

  const base = "rounded-xl border px-3 py-2 text-xl font-semibold";
  const active = "bg-[#00008B] border-slate-200 text-[#EFBF04] font-extrabold";
  const idle = "bg-white border-slate-200 hover:bg-slate-50";

  return (
    <div className="flex flex-wrap gap-2">
      <NavLink
        to="/geography-registry/counties"
        className={({ isActive }) => `${base} ${isActive ? active : idle}`}
      >
        Counties
      </NavLink>
      <NavLink
        to="/geography-registry/districts"
        className={({ isActive }) => `${base} ${isActive ? active : idle}`}
      >
        Districts
      </NavLink>
      <NavLink
        to="/geography-registry/polling-centers"
        className={({ isActive }) => `${base} ${isActive ? active : idle}`}
      >
        Polling Centers
      </NavLink>
      <NavLink
        to="/geography-registry/polling-places"
        className={({ isActive }) => `${base} ${isActive ? active : idle}`}
      >
        Polling Places
      </NavLink>

      {showRegistry ? (
        <>
          <span className="mx-1 self-center text-xs font-bold text-slate-400">
            | Registry
          </span>
          <NavLink
            to="/geography-registry/import-batches"
            className={({ isActive }) => `${base} ${isActive ? active : idle}`}
          >
            Import Batches
          </NavLink>
          <NavLink
            to="/geography-registry/voter-staging"
            className={({ isActive }) => `${base} ${isActive ? active : idle}`}
          >
            Voter Staging
          </NavLink>
          <NavLink
            to="/geography-registry/voter-registry"
            className={({ isActive }) => `${base} ${isActive ? active : idle}`}
          >
            Voter Registry
          </NavLink>
          <NavLink
            to="/geography-registry/public-roll"
            className={({ isActive }) => `${base} ${isActive ? active : idle}`}
          >
            Public Roll
          </NavLink>
        </>
      ) : null}
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
      <div className="flex items-center justify-between gap-3 border-b border-slate-200 p-4">
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
 * ✅ Table responsiveness:
 * - keeps overflow-x-auto
 * - avoids compressing columns into unreadable state
 */
export function Table({
  columns,
  rows,
}: {
  columns: string[];
  rows: Array<Array<string | number | React.ReactNode>>;
}) {
  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full border-collapse table-auto">
        <thead>
          <tr>
            {columns.map((c) => (
              <th
                key={c}
                className="whitespace-nowrap border-b border-slate-200 px-2 py-1.5 text-left text-base font-extrabold text-slate-600"
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
                  className="border-b border-slate-100 px-2 py-1.5 text-base text-slate-800 align-middle"
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
   ✅ NEW: Modal, TextField, SelectField (for geo pages)
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
        className="fixed inset-0 z-40 bg-black/30"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3">
        <div
          role="dialog"
          aria-modal="true"
          className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white shadow-2xl"
        >
          <div className="border-b border-slate-200 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-lg font-extrabold text-slate-900">
                  {title}
                </div>
                {subtitle ? (
                  <div className="mt-1 text-base text-slate-600">{subtitle}</div>
                ) : null}
              </div>

              <button
                className="h-9 w-9 rounded-xl border border-slate-200 hover:bg-slate-50"
                onClick={onClose}
                title="Close"
                type="button"
              >
                ✕
              </button>
            </div>
          </div>

          <div className="p-4">{children}</div>

          {footer ? (
            <div className="border-t border-slate-200 p-4">{footer}</div>
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
          "w-full rounded-xl border bg-white px-3 py-2 text-base outline-none focus:ring-2",
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
          "w-full rounded-xl border bg-white px-3 py-2 text-base outline-none focus:ring-2",
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
        <div className="mt-1 text-base text-slate-500">{helper}</div>
      ) : null}
    </label>
  );
}

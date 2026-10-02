// src/pages/geo-registry/shared/geo-ui.ts

import React from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-extrabold text-slate-900 sm:text-2xl">
            {title}
          </h1>
          {subtitle ? (
            <p className="mt-1 text-sm text-slate-600 sm:text-base">
              {subtitle}
            </p>
          ) : null}
        </div>

        {right ? <div className="w-full sm:w-auto">{right}</div> : null}
      </div>

      {children}
    </div>
  );
}

export function Tabs() {
  const { dashboardMode } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const showRegistry = dashboardMode === "NEC" || dashboardMode === "SYSTEM";

  // ==========================================================================
  // WORKSPACE-AWARE BASE PATH
  // ==========================================================================

  const inOperations =
    location.pathname === "/operations/geography" ||
    location.pathname.startsWith("/operations/geography/");

  const geographyBase = inOperations
    ? "/operations/geography"
    : "/geography-registry";

  const geographyTabs = [
    {
      label: "Counties",
      to: `${geographyBase}/counties`,
    },
    {
      label: "Districts",
      to: `${geographyBase}/districts`,
    },
    {
      label: "Polling Centers",
      to: `${geographyBase}/polling-centers`,
    },
    {
      label: "Polling Places",
      to: `${geographyBase}/polling-places`,
    },
  ];

  const registryTabs =
    showRegistry && !inOperations
      ? [
          // Registry tabs can be enabled here when they are ready for navigation.
        ]
      : [];

  const tabs = [...geographyTabs, ...registryTabs];

  const currentTab =
    tabs.find((tab) => {
      if (tab.to === `${geographyBase}/polling-places`) {
        return location.pathname.startsWith(tab.to);
      }

      return location.pathname === tab.to;
    }) ?? geographyTabs[0];

  const base =
    "rounded-xl border px-3 py-2 text-base font-semibold transition lg:text-lg";
  const active = "border-slate-200 bg-[#00008B] font-extrabold text-[#EFBF04]";
  const idle = "border-slate-200 bg-white text-slate-800 hover:bg-slate-50";

  return (
    <>
      {/* Mobile: show only the active section and let the user switch. */}
      <div className="sm:hidden">
        <label className="sr-only" htmlFor="geo-mobile-nav">
          Geography section
        </label>

        <div className="relative">
          <select
            id="geo-mobile-nav"
            value={currentTab.to}
            onChange={(event) => navigate(event.target.value)}
            className="h-11 w-full appearance-none rounded-xl border border-slate-200 bg-[#00008B] px-4 pr-10 text-sm font-extrabold text-[#EFBF04] shadow-sm outline-none focus:ring-2 focus:ring-blue-500"
          >
            {tabs.map((tab) => (
              <option
                key={tab.to}
                value={tab.to}
                className="bg-white text-slate-900"
              >
                {tab.label}
              </option>
            ))}
          </select>

          <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[#EFBF04]">
            ▾
          </span>
        </div>
      </div>

      {/* Tablet/Desktop: keep the familiar tab navigation. */}
      <div className="hidden flex-wrap gap-2 sm:flex">
        {tabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            className={({ isActive }) =>
              `${base} ${
                isActive ||
                (tab.to === `${geographyBase}/polling-places` &&
                  location.pathname.startsWith(tab.to))
                  ? active
                  : idle
              }`
            }
          >
            {tab.label}
          </NavLink>
        ))}
      </div>
    </>
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
      <table className="w-full min-w-[900px] border-collapse table-auto">
        <thead>
          <tr>
            {columns.map((c) => (
              <th
                key={c}
                className="whitespace-nowrap border-b border-slate-200 px-3 py-2.5 text-left text-sm font-extrabold text-slate-600"
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
                  className="border-b border-slate-100 px-3 py-2.5 text-sm text-slate-800 align-middle"
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
                  <div className="mt-1 text-base text-slate-600">
                    {subtitle}
                  </div>
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

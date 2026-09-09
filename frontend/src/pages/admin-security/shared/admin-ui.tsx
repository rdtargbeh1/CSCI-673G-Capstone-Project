// src/pages/admin-security/security/shared/admin-ui.tsx

import React from "react";

import { NavLink, useLocation, useNavigate } from "react-router-dom";

import { Check, ChevronDown } from "lucide-react";

import { useAuthStore } from "../../../shared/store/authStore";

// ============================================================================
// ADMIN SHELL
// ============================================================================

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

// ============================================================================
// ADMIN / SECURITY TABS
// ============================================================================

type AdminTabGroup = "Tenant Admin" | "Security" | "Oversight";

type AdminTab = {
  label: string;
  path: string;
  group: AdminTabGroup;

  systemOnly?: boolean;

  necOrSystemOnly?: boolean;

  matchPrefixes?: string[];
};

const ADMIN_TABS: AdminTab[] = [
  // ==========================================================================
  // TENANT ADMIN
  // ==========================================================================

  {
    label: "Organizations",
    path: "/admin-security/organizations",
    group: "Tenant Admin",
    systemOnly: true,
  },

  {
    label: "Memberships",
    path: "/admin-security/memberships",
    group: "Tenant Admin",
  },

  {
    label: "Org Settings",
    path: "/admin-security/org-settings",
    group: "Tenant Admin",
  },

  // ==========================================================================
  // SECURITY
  // ==========================================================================

  {
    label: "Users",
    path: "/admin-security/users",
    group: "Security",
  },

  {
    label: "Roles",
    path: "/admin-security/roles",
    group: "Security",
  },

  {
    label: "MFA",
    path: "/admin-security/mfa",
    group: "Security",
  },

  {
    label: "Sessions",
    path: "/admin-security/sessions",
    group: "Security",
  },

  {
    label: "Signing Keys",
    path: "/admin-security/signing-keys",
    group: "Security",
  },

  // ==========================================================================
  // OVERSIGHT
  // ==========================================================================

  {
    label: "Audit Logs",
    path: "/admin-security/audit-logs",
    group: "Oversight",
  },

  {
    label: "Audit Ledger",
    path: "/admin-security/audit-ledger",
    group: "Oversight",
    necOrSystemOnly: true,
  },

  {
    label: "Submission Actions",
    path: "/admin-security/submission-actions",
    group: "Oversight",
    necOrSystemOnly: true,
    matchPrefixes: ["/admin-security/submission-actions"],
  },

  {
    label: "File Uploads",
    path: "/admin-security/file-uploads",
    group: "Oversight",
  },
];

const GROUP_ORDER: AdminTabGroup[] = ["Tenant Admin", "Security", "Oversight"];

// ============================================================================
// TABS
// ============================================================================

export function Tabs() {
  const navigate = useNavigate();

  const location = useLocation();

  const dashboardMode = useAuthStore((state) => state.dashboardMode);

  const isSystem = dashboardMode === "SYSTEM";

  const isNecOrSystem = dashboardMode === "NEC" || dashboardMode === "SYSTEM";

  const [open, setOpen] = React.useState(false);

  const containerRef = React.useRef<HTMLDivElement | null>(null);

  // ==========================================================================
  // AVAILABLE TABS
  // ==========================================================================

  const availableTabs = React.useMemo(
    () =>
      ADMIN_TABS.filter((tab) => {
        if (tab.systemOnly && !isSystem) {
          return false;
        }

        if (tab.necOrSystemOnly && !isNecOrSystem) {
          return false;
        }

        return true;
      }),
    [isSystem, isNecOrSystem],
  );

  // ==========================================================================
  // CURRENT TAB
  // ==========================================================================

  const currentTab = React.useMemo(() => {
    const pathname = location.pathname;

    const sorted = [...availableTabs].sort((a, b) => {
      const aLength = Math.max(
        a.path.length,
        ...(a.matchPrefixes ?? []).map((prefix) => prefix.length),
      );

      const bLength = Math.max(
        b.path.length,
        ...(b.matchPrefixes ?? []).map((prefix) => prefix.length),
      );

      return bLength - aLength;
    });

    return (
      sorted.find((tab) => {
        if (pathname === tab.path) {
          return true;
        }

        if (pathname.startsWith(`${tab.path}/`)) {
          return true;
        }

        return (tab.matchPrefixes ?? []).some(
          (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
        );
      }) ??
      availableTabs[0] ??
      null
    );
  }, [availableTabs, location.pathname]);

  // ==========================================================================
  // CLOSE MOBILE MENU WHEN ROUTE CHANGES
  // ==========================================================================

  React.useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  // ==========================================================================
  // CLICK OUTSIDE
  // ==========================================================================

  React.useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (!containerRef.current) {
        return;
      }

      if (!containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, []);

  // ==========================================================================
  // ESCAPE
  // ==========================================================================

  React.useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  // ==========================================================================
  // NAVIGATE
  // ==========================================================================

  function selectTab(tab: AdminTab) {
    setOpen(false);

    if (location.pathname !== tab.path) {
      navigate(tab.path);
    }
  }

  // ==========================================================================
  // ACTIVE MATCH
  // ==========================================================================

  function isTabActive(tab: AdminTab) {
    const pathname = location.pathname;

    if (pathname === tab.path) {
      return true;
    }

    if (pathname.startsWith(`${tab.path}/`)) {
      return true;
    }

    return (tab.matchPrefixes ?? []).some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
    );
  }

  if (!currentTab) {
    return null;
  }

  // ==========================================================================
  // RENDER
  // ==========================================================================

  return (
    <>
      {/* ==================================================================== */}
      {/* MOBILE / TABLET */}
      {/* SHOW CURRENT TAB ONLY */}
      {/* ==================================================================== */}

      <div ref={containerRef} className="relative w-full lg:hidden">
        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          aria-haspopup="menu"
          aria-expanded={open}
          className={[
            "flex min-h-11 w-full items-center justify-between gap-3 rounded-xl border px-3 py-2.5 text-left transition sm:w-auto sm:min-w-[220px]",

            open
              ? "border-blue-300 bg-blue-50 shadow-sm"
              : "border-slate-200 bg-white hover:bg-slate-50",
          ].join(" ")}
        >
          <div className="min-w-0">
            <div className="text-[9px] font-bold uppercase tracking-wide text-slate-400">
              {currentTab.group}
            </div>

            <div className="mt-0.5 truncate text-sm font-extrabold text-[#00008B] sm:text-base">
              {currentTab.label}
            </div>
          </div>

          <ChevronDown
            size={16}
            className={[
              "shrink-0 text-slate-500 transition-transform duration-150",

              open ? "rotate-180" : "",
            ].join(" ")}
          />
        </button>

        {/* ================================================================== */}
        {/* MOBILE SELECTOR */}
        {/* ================================================================== */}

        {open ? (
          <div
            role="menu"
            className="absolute left-0 top-full z-50 mt-1.5 w-full min-w-[250px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl sm:w-[300px]"
          >
            <div className="max-h-[70vh] overflow-y-auto p-1.5">
              {GROUP_ORDER.map((group) => {
                const groupTabs = availableTabs.filter(
                  (tab) => tab.group === group,
                );

                if (groupTabs.length === 0) {
                  return null;
                }

                return (
                  <div key={group} className="not-first:mt-1.5">
                    <div className="px-2 pb-1 pt-1.5 text-[9px] font-extrabold uppercase tracking-wider text-slate-400">
                      {group}
                    </div>

                    <div className="space-y-0.5">
                      {groupTabs.map((tab) => {
                        const active = isTabActive(tab);

                        return (
                          <button
                            key={tab.path}
                            type="button"
                            role="menuitem"
                            onClick={() => selectTab(tab)}
                            className={[
                              "flex min-h-10 w-full items-center justify-between gap-3 rounded-lg px-2.5 py-2 text-left text-sm transition",

                              active
                                ? "bg-[#00008B] font-extrabold text-[#EFBF04]"
                                : "font-semibold text-slate-700 hover:bg-slate-100",
                            ].join(" ")}
                          >
                            <span className="truncate">{tab.label}</span>

                            {active ? (
                              <Check size={14} className="shrink-0" />
                            ) : null}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>

      {/* ==================================================================== */}
      {/* DESKTOP */}
      {/* NORMAL GROUPED TAB LAYOUT */}
      {/* ==================================================================== */}

      <div className="hidden lg:block">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          {GROUP_ORDER.map((group) => {
            const groupTabs = availableTabs.filter(
              (tab) => tab.group === group,
            );

            if (groupTabs.length === 0) {
              return null;
            }

            return (
              <React.Fragment key={group}>
                {/* ======================================================== */}
                {/* GROUP LABEL */}
                {/* ======================================================== */}

                <div className="whitespace-nowrap text-sm font-bold text-slate-400">
                  | {group}
                </div>

                {/* ======================================================== */}
                {/* GROUP TABS */}
                {/* ======================================================== */}

                {groupTabs.map((tab) => {
                  const active = isTabActive(tab);

                  return (
                    <NavLink
                      key={tab.path}
                      to={tab.path}
                      className={[
                        "inline-flex min-h-10 items-center justify-center rounded-xl border px-3 py-2 text-sm font-bold transition",

                        active
                          ? "border-[#00008B] bg-[#00008B] text-[#EFBF04]"
                          : "border-slate-200 bg-white text-slate-800 hover:border-slate-300 hover:bg-slate-50",
                      ].join(" ")}
                    >
                      {tab.label}
                    </NavLink>
                  );
                })}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </>
  );
}

// ============================================================================
// CARD
// ============================================================================

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

// ============================================================================
// BADGE
// ============================================================================

export function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-2 py-0.5 text-base font-semibold text-slate-700">
      {children}
    </span>
  );
}

// ============================================================================
// NOTE
// ============================================================================

export function Note({ title, bullets }: { title: string; bullets: string[] }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3">
      <div className="font-extrabold">{title}</div>

      <ul className="mt-2 list-disc space-y-1 pl-5 text-base text-slate-700">
        {bullets.map((bullet) => (
          <li key={bullet}>{bullet}</li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Table responsiveness:
 * - Keeps columns readable.
 * - Preserves horizontal scrolling.
 * - Keeps the final column visible.
 * - Allows content cells to wrap when required.
 */

// ============================================================================
// TABLE
// ============================================================================

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
      <table className="w-full table-auto border-collapse">
        <thead>
          <tr>
            {columns.map((column, index) => (
              <th
                key={column}
                className={[
                  "whitespace-nowrap border-b border-slate-200 px-2 py-2 text-left text-base font-bold text-slate-600",

                  index === lastColIndex
                    ? "sticky right-0 z-10 bg-white shadow-[-10px_0_10px_-12px_rgba(0,0,0,0.25)]"
                    : "",
                ].join(" ")}
              >
                {column}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex} className="hover:bg-slate-50">
              {row.map((cell, cellIndex) => (
                <td
                  key={cellIndex}
                  className={[
                    "wrap-break-words whitespace-normal border-b border-slate-100 px-2 py-2 align-top text-base text-slate-800",

                    cellIndex === lastColIndex
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

// ============================================================================
// MODAL
// ============================================================================

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
  if (!open) {
    return null;
  }

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
          className="flex max-h-[95vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl sm:max-h-[90vh]"
        >
          {/* ============================================================ */}
          {/* HEADER */}
          {/* ============================================================ */}

          <div className="flex items-start justify-between gap-3 border-b border-blue-600 bg-gradient-to-r from-blue-600 via-blue-500 to-blue-400 px-4 py-5 sm:px-6 sm:py-6">
            <div className="min-w-0 flex-1">
              <div className="text-xl font-bold text-white sm:text-2xl">
                {title}
              </div>

              {subtitle ? (
                <div className="mt-1 text-xs font-semibold text-blue-100 sm:text-sm">
                  {subtitle}
                </div>
              ) : null}
            </div>

            <button
              className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border-2 border-blue-300 bg-blue-600 text-white transition hover:bg-blue-700 disabled:opacity-50"
              onClick={onClose}
              title="Close"
              aria-label="Close dialog"
              type="button"
            >
              ✕
            </button>
          </div>

          {/* ============================================================ */}
          {/* CONTENT */}
          {/* ============================================================ */}

          <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
            {children}
          </div>

          {/* ============================================================ */}
          {/* FOOTER */}
          {/* ============================================================ */}

          {footer ? (
            <div className="border-t border-slate-200 bg-slate-50 px-4 py-4 sm:px-6 sm:py-5">
              {footer}
            </div>
          ) : null}
        </div>
      </div>
    </>
  );
}

// ============================================================================
// TEXT FIELD
// ============================================================================

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
  onChange: (value: string) => void;
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
        onChange={(event) => onChange(event.target.value)}
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

// ============================================================================
// SELECT FIELD
// ============================================================================

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
  onChange: (value: string) => void;
  options: Array<{
    value: string;
    label: string;
  }>;
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
        onChange={(event) => onChange(event.target.value)}
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
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      {helper ? (
        <div className="mt-1 text-sm text-slate-500">{helper}</div>
      ) : null}
    </label>
  );
}

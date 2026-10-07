// src/app/layout/SidebarNav.tsx

import { useEffect, useMemo, useState } from "react";

import { NavLink, useLocation } from "react-router-dom";

import {
  BarChart3,
  FileBarChart,
  FileText,
  LayoutDashboard,
  MapPin,
  Shield,
  Vote,
  X,
  Zap,
} from "lucide-react";

import type { LucideIcon } from "lucide-react";

import { useAuthStore } from "../../shared/store/authStore";

import { useAccessProfile } from "../../shared/hooks/useAccessProfile";

import { useOperationalContext } from "../../shared/hooks/useOperationalContext";

import type { DashboardMode } from "../../auth/types";

// ============================================================================
// TYPES
// ============================================================================

type NavItem = {
  to: string;
  label: string;
  icon: LucideIcon;
  iconColor: string;
  end?: boolean;
  matchPrefixes?: string[];
};

// ============================================================================
// NAV STYLE
// ============================================================================

function linkClass(active: boolean) {
  return [
    `
      flex
      min-w-0
      items-center
      gap-3
      rounded-lg
      px-3
      py-2.5
      text-[17px]
      font-semibold
      transition

      lg:gap-3
      lg:px-3
      lg:py-3
      lg:text-lg

      xl:text-xl
    `,

    active
      ? `
          bg-slate-800/40
          text-green-500
        `
      : `
          text-slate-200
          hover:bg-slate-700
          hover:text-white
        `,
  ].join(" ");
}

// ============================================================================
// DASHBOARD MODE
// ============================================================================

function normalizeMode(value: unknown): DashboardMode {
  const mode = String(value ?? "")
    .trim()
    .toUpperCase();

  if (mode === "SYSTEM") {
    return "SYSTEM";
  }

  if (mode === "NEC") {
    return "NEC";
  }

  return "TENANT";
}

// ============================================================================
// ADMINISTRATIVE NAVIGATION
// ============================================================================

const administrativeNavItems: NavItem[] = [
  {
    to: "/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    iconColor: "#3b82f6",
  },

  {
    to: "/elections",
    label: "Elections",
    icon: Vote,
    iconColor: "#ef4444",
  },

  {
    to: "/operations",
    label: "Operations",
    icon: Zap,
    iconColor: "#f59e0b",
  },

  {
    to: "/geography-registry",
    label: "Geography & Registry",
    icon: MapPin,
    iconColor: "#10b981",
  },

  {
    to: "/reports",
    label: "Reports",
    icon: FileText,
    iconColor: "#8b5cf6",
  },

  {
    to: "/admin-security",
    label: "Admin & Security",
    icon: Shield,
    iconColor: "#ec4899",
  },
];

// ============================================================================
// OPERATIONAL NAVIGATION
// ============================================================================
//
// Stable Operations portal:
//
// /operations/dashboard
// /operations/geography
// /operations/personnel
// /operations/reference
// /operations/submissions
// /operations/results
// /operations/reports
//
// Election remains data context.
//
// ============================================================================

const operationalNavItems: NavItem[] = [
  {
    to: "/operations",
    end: true,

    label: "Dashboard",

    icon: LayoutDashboard,

    iconColor: "#3b82f6",

    matchPrefixes: ["/operations"],
  },

  {
    /*
     * Geography starts at Districts because the operational model exposes:
     *
     * Districts
     * Polling Centers
     * Polling Places
     *
     * County information may still appear as necessary parent context.
     */
    to: "/operations/geography",

    label: "Geography",

    icon: MapPin,

    iconColor: "#10b981",

    matchPrefixes: ["/operations/geography"],
  },

  {
    to: "/operations/reference",

    label: "Election Reference",

    icon: Vote,

    iconColor: "#ef4444",

    matchPrefixes: ["/operations/reference"],
  },

  {
    to: "/operations/submissions",

    label: "Operations",

    icon: Zap,

    iconColor: "#f59e0b",

    matchPrefixes: [
      "/operations/submissions",
      "/operations/observer-reports",
      "/operations/notifications",
      "/operations/tally-sheets",
      "/operations/submission-actions",
      "/operations/discrepancies",
    ],
  },

  {
    to: "/operations/results",

    label: "Results",

    icon: BarChart3,

    iconColor: "#8b5cf6",

    matchPrefixes: ["/operations/results"],
  },

  {
    to: "/operations/reports",

    label: "Reports",

    icon: FileBarChart,

    iconColor: "#ec4899",

    matchPrefixes: ["/operations/reports"],
  },
];

// ============================================================================
// ACTIVE ROUTE
// ============================================================================

function isItemActive(pathname: string, item: NavItem): boolean {
  if (item.end) return pathname.replace(/\/$/, "") === item.to;
  const prefixes = item.matchPrefixes ?? [item.to];

  return prefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function SidebarNav() {
  const location = useLocation();

  // ==========================================================================
  // ACCESS
  // ==========================================================================

  const { roles, portal, isLoading, isError } = useAccessProfile();

  const operationalPortal = portal === "OPERATIONS";

  // ==========================================================================
  // OPERATIONAL CONTEXT
  // ==========================================================================

  const {
    electionId,
    scopeType,
    operationalAccess,
    loading: operationContextLoading,
  } = useOperationalContext(operationalPortal);

  // ==========================================================================
  // STORE
  // ==========================================================================

  const storeMode = useAuthStore((state: any) => state.dashboardMode);

  const tenantMeta = useAuthStore((state: any) => state.tenantMeta);

  const storedUser = useAuthStore((state: any) => state.user);

  // ==========================================================================
  // MODE
  // ==========================================================================

  const mode = normalizeMode(storeMode);

  // ==========================================================================
  // ORGANIZATION
  // ==========================================================================

  const rawTenantName = tenantMeta?.orgName ?? null;

  const tenantName =
    rawTenantName && String(rawTenantName).trim()
      ? String(rawTenantName)
      : "PLATFORM";

  // ==========================================================================
  // ROLE
  // ==========================================================================

  const roleLabel =
    roles.length > 0
      ? roles.join(", ")
      : String(
          storedUser?.roleName ??
            storedUser?.tenantRole ??
            storedUser?.systemRole ??
            "—",
        );

  // ==========================================================================
  // NAVIGATION
  // ==========================================================================

  const navItems = useMemo(
    () =>
      isLoading || isError
        ? []
        : portal === "OPERATIONS"
          ? operationalNavItems
          : portal === "ADMINISTRATIVE"
            ? administrativeNavItems
            : [],
    [portal, isLoading, isError],
  );

  // ==========================================================================
  // MOBILE
  // ==========================================================================

  const [open, setOpen] = useState(false);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    if (open) {
      window.addEventListener("keydown", onKeyDown);
    }

    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  // ==========================================================================
  // CONTENT
  // ==========================================================================

  const sidebarContent = (
    <div className="flex h-full min-h-0 min-w-0 flex-col">
      <div className="min-w-0 shrink-0">
        {/* ================================================================
            WORKSPACE CONTEXT
        ================================================================ */}

        <div
          className="
            min-w-0
            rounded-xl
            border
            px-3
            py-2.5

            lg:px-3
            lg:py-3
          "
          style={{
            backgroundColor: "#191970",

            borderColor: "#312e81",
          }}
        >
          <div className="text-lg font-extrabold text-white lg:text-xl xl:text-2xl">
            EMS
          </div>

          <div className="mt-1 min-w-0 space-y-0.5 text-xs text-slate-300 lg:mt-1.5 lg:space-y-1 lg:text-sm">
            <div>
              Portal:{" "}
              <span className="font-bold text-white">
                {isLoading ? "Loading..." : (portal ?? "Unavailable")}
              </span>
            </div>

            <div>
              Mode: <span className="font-bold text-white">{mode}</span>
            </div>

            <div className="min-w-0">
              <span
                className="
                  block
                  break-words
                  text-base
                  font-bold
                  leading-tight
                  text-[#FFA500]

                  lg:text-lg
                  xl:text-xl
                "
                title={tenantName}
              >
                {tenantName}
              </span>
            </div>

            <div className="min-w-0 break-words">
              Role: <span className="font-bold text-white">{roleLabel}</span>
            </div>

            {operationalPortal ? (
              <>
                <div className="min-w-0 break-words">
                  Election:{" "}
                  <span className="font-bold text-white">
                    {operationContextLoading
                      ? "Loading..."
                      : electionId
                        ? "Selected"
                        : "Not assigned"}
                  </span>
                </div>

                <div className="min-w-0 break-words">
                  Scope:{" "}
                  <span className="font-bold text-white">
                    {operationContextLoading
                      ? "Loading..."
                      : (scopeType ?? "—")}
                  </span>
                </div>

                {!operationContextLoading && !operationalAccess ? (
                  <div className="pt-1 text-xs font-semibold text-amber-300">
                    No active election assignment
                  </div>
                ) : null}
              </>
            ) : null}
          </div>
        </div>

        {/* ================================================================
            NAVIGATION
        ================================================================ */}

        <nav className="mt-2.5 flex min-w-0 flex-col gap-0.5 lg:mt-3 lg:gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;

            const active = isItemActive(location.pathname, item);

            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={() => setOpen(false)}
                className={() => linkClass(active)}
              >
                <Icon
                  size={22}
                  className="
                      shrink-0

                      lg:h-6
                      lg:w-6

                      xl:h-7
                      xl:w-7
                    "
                  style={{
                    color: item.iconColor,
                  }}
                />

                <span className="min-w-0 break-words leading-tight">
                  {item.label}
                </span>
              </NavLink>
            );
          })}
        </nav>
      </div>

      <div className="min-h-4 flex-1" />

      <div
        className="
          shrink-0
          border-t
          border-dashed
          border-white/25
          pt-2.5
          text-[10px]
          leading-4
          text-slate-300

          lg:pt-3
          lg:text-xs
          lg:leading-5
        "
      >
        {operationalPortal ? (
          <>
            Access is limited by election, role, assignment scope, resource
            location, ownership, and workflow state.
          </>
        ) : (
          <>
            Administrative access remains controlled by backend authorization.
          </>
        )}
      </div>
    </div>
  );

  // ==========================================================================
  // RENDER
  // ==========================================================================

  return (
    <>
      {/* ==================================================================
          DESKTOP
      ================================================================== */}

      <aside
        className="
          hidden
          shrink-0
          border-r
          p-2

          lg:block
          lg:w-[230px]

          xl:w-[260px]
          xl:p-3

          2xl:w-[280px]
        "
        style={{
          backgroundColor: "#191970",

          borderColor: "#312e81",
        }}
      >
        {sidebarContent}
      </aside>

      {/* ==================================================================
          MOBILE MENU BUTTON
      ================================================================== */}

      <div className="px-3 pt-3 lg:hidden">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="
            inline-flex
            min-h-10
            items-center
            justify-center
            gap-2
            rounded-lg
            border
            border-slate-200
            bg-white
            px-3
            py-2
            text-sm
            font-semibold
            text-slate-900
            shadow-sm
            transition

            hover:bg-slate-50
          "
          aria-label="Open menu"
        >
          <span className="text-base leading-none">☰</span>
          Menu
        </button>
      </div>

      {/* ==================================================================
          MOBILE DRAWER
      ================================================================== */}

      {open ? (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[1px] lg:hidden"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />

          <aside
            className="
              fixed
              inset-y-0
              left-0
              z-50
              w-[78vw]
              max-w-[300px]
              overflow-hidden
              border-r
              shadow-2xl

              sm:w-[72vw]
              sm:max-w-[320px]

              lg:hidden
            "
            style={{
              backgroundColor: "#191970",

              borderColor: "#312e81",
            }}
            role="dialog"
            aria-modal="true"
            aria-label="Navigation menu"
          >
            <div
              className="
                flex
                min-h-[50px]
                items-center
                justify-between
                gap-3
                border-b
                px-3
                py-2
              "
              style={{
                borderColor: "rgba(255,255,255,0.15)",
              }}
            >
              <div className="text-base font-extrabold text-white">Menu</div>

              <button
                type="button"
                onClick={() => setOpen(false)}
                className="
                  flex
                  h-9
                  w-9
                  min-h-0
                  shrink-0
                  items-center
                  justify-center
                  rounded-lg
                  border
                  text-white
                  transition

                  hover:bg-white/10
                "
                style={{
                  borderColor: "rgba(255,255,255,0.25)",
                }}
                aria-label="Close menu"
              >
                <X size={17} />
              </button>
            </div>

            <div
              className="
                h-[calc(100vh-50px)]
                min-h-0
                overflow-y-auto
                overscroll-contain
                p-2.5

                sm:p-3
              "
            >
              {sidebarContent}
            </div>
          </aside>
        </>
      ) : null}
    </>
  );
}

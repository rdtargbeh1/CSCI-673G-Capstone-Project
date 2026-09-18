// src/app/layout/SidebarNav.tsx

import { useEffect, useMemo, useState } from "react";

import { NavLink } from "react-router-dom";

import {
  FileText,
  LayoutDashboard,
  MapPin,
  Shield,
  Vote,
  X,
  Zap,
} from "lucide-react";

import type { LucideIcon } from "lucide-react";

import { useAuth } from "../../auth/useAuth";

import { useAuthStore } from "../../shared/store/authStore";

type DashboardMode = "SYSTEM" | "NEC" | "TENANT";

type NavItem = {
  to: string;
  label: string;
  icon: LucideIcon;
  iconColor: string;
  show: (mode: DashboardMode) => boolean;
};

// ============================================================================
// NAV LINK STYLE
// ============================================================================

function linkClass(isActive: boolean) {
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

    isActive
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
// MODE NORMALIZATION
// ============================================================================

function normalizeMode(value: unknown): DashboardMode {
  const mode = String(value ?? "").toUpperCase();

  if (mode === "SYSTEM") {
    return "SYSTEM";
  }

  if (mode === "NEC") {
    return "NEC";
  }

  return "TENANT";
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function SidebarNav() {
  const { tenant, user } = useAuth();

  const storeMode = useAuthStore((state) => state.dashboardMode);

  const tenantMeta = useAuthStore((state) => state.tenantMeta);

  // ==========================================================================
  // DASHBOARD MODE
  // ==========================================================================

  const sysRole = String(user?.systemRole ?? "").toUpperCase();

  const isSystemAdmin = sysRole === "SYSTEM_ADMIN";

  const isNecAdmin = sysRole === "NEC_ADMIN";

  let mode: DashboardMode = normalizeMode(storeMode);

  if (!storeMode) {
    const orgType = String(tenantMeta?.orgType ?? "").toUpperCase();

    if (isSystemAdmin) {
      mode = "SYSTEM";
    } else if (orgType === "NEC" || isNecAdmin) {
      mode = "NEC";
    } else {
      mode = "TENANT";
    }
  }

  // ==========================================================================
  // TENANT NAME
  // ==========================================================================

  const rawTenantName = tenantMeta?.orgName ?? tenant?.orgName ?? null;

  const isSystemPlatform =
    !rawTenantName || String(rawTenantName).trim().length === 0;

  const tenantName = isSystemPlatform ? "PLATFORM" : rawTenantName;

  // ==========================================================================
  // NAVIGATION
  // ==========================================================================

  const navItems: NavItem[] = [
    {
      to: "/dashboard",

      label: "Dashboard",

      icon: LayoutDashboard,

      iconColor: "#3b82f6",

      show: () => true,
    },

    {
      to: "/elections",

      label: "Elections",

      icon: Vote,

      iconColor: "#ef4444",

      show: () => true,
    },

    {
      to: "/operations",

      label: "Operations",

      icon: Zap,

      iconColor: "#f59e0b",

      show: () => true,
    },

    {
      to: "/geography-registry",

      label: "Geography & Registry",

      icon: MapPin,

      iconColor: "#10b981",

      show: () => true,
    },

    {
      to: "/reports",

      label: "Reports",

      icon: FileText,

      iconColor: "#8b5cf6",

      show: () => true,
    },

    {
      to: "/admin-security",

      label: "Admin & Security",

      icon: Shield,

      iconColor: "#ec4899",

      show: () => true,
    },
  ];

  const filteredNav = useMemo(
    () => navItems.filter((item) => item.show(mode)),

    [mode],
  );

  // ==========================================================================
  // MOBILE DRAWER
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
  // SHARED SIDEBAR CONTENT
  // ==========================================================================

  const sidebarContent = (
    <div
      className="
        flex
        h-full
        min-h-0
        min-w-0
        flex-col
      "
    >
      {/* ================================================================
          TOP CONTENT
      ================================================================ */}

      <div
        className="
          min-w-0
          shrink-0
        "
      >
        {/* ==============================================================
            WORKSPACE IDENTITY
        ============================================================== */}

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
          <div
            className="
              text-lg
              font-extrabold
              text-white

              lg:text-xl

              xl:text-2xl
            "
          >
            EMS
          </div>

          <div
            className="
              mt-1
              min-w-0
              space-y-0.5

              text-xs
              text-slate-300

              lg:mt-1.5
              lg:space-y-1
              lg:text-sm
            "
          >
            {/* MODE */}

            <div>
              Mode:{" "}
              <span
                className="
                  font-bold
                  text-white
                "
              >
                {mode}
              </span>
            </div>

            {/* TENANT */}

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
                title={String(tenantName)}
              >
                {tenantName}
              </span>
            </div>

            {/* TENANT ROLE */}

            {user?.tenantRole ? (
              <div
                className="
                  min-w-0
                  break-words
                "
              >
                Role:{" "}
                <span
                  className="
                    font-bold
                    text-white
                  "
                >
                  {user.tenantRole}
                </span>
              </div>
            ) : null}

            {/* SYSTEM ROLE */}

            {user?.systemRole ? (
              <div
                className="
                  min-w-0
                  break-words
                "
              >
                System:{" "}
                <span
                  className="
                    font-bold
                    text-white
                  "
                >
                  {user.systemRole}
                </span>
              </div>
            ) : null}
          </div>
        </div>

        {/* ==============================================================
            NAVIGATION
        ============================================================== */}

        <nav
          className="
            mt-2.5
            flex
            min-w-0
            flex-col
            gap-0.5

            lg:mt-3
            lg:gap-1
          "
        >
          {filteredNav.map((item) => {
            const Icon = item.icon;

            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                className={({ isActive }) => linkClass(isActive)}
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

                <span
                  className="
                      min-w-0
                      break-words
                      leading-tight
                    "
                >
                  {item.label}
                </span>
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* ================================================================
          FLEXIBLE SPACE
      ================================================================ */}

      <div className="min-h-4 flex-1" />

      {/* ================================================================
          FOOTER NOTE
      ================================================================ */}

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
        Elections are viewable by all tenants.
        <br />
        Create/edit controls remain restricted inside pages.
      </div>
    </div>
  );

  // ==========================================================================
  // RENDER
  // ==========================================================================

  return (
    <>
      {/* ================================================================
          DESKTOP SIDEBAR
      ================================================================ */}

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

      {/* ================================================================
          MOBILE / TABLET MENU BUTTON
      ================================================================ */}

      <div
        className="
          px-3
          pt-3

          lg:hidden
        "
      >
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
          <span
            className="
              text-base
              leading-none
            "
          >
            ☰
          </span>
          Menu
        </button>
      </div>

      {/* ================================================================
          MOBILE DRAWER
      ================================================================ */}

      {open ? (
        <>
          {/* BACKDROP */}

          <div
            className="
              fixed
              inset-0
              z-40

              bg-black/40

              backdrop-blur-[1px]

              lg:hidden
            "
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />

          {/* DRAWER */}

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
            {/* ============================================================
                DRAWER HEADER
            ============================================================ */}

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
              <div
                className="
                  text-base
                  font-extrabold
                  text-white
                "
              >
                Menu
              </div>

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

            {/* ============================================================
                DRAWER CONTENT
            ============================================================ */}

            <div
              className="
                h-[calc(100vh-50px)]
                min-h-0
                overflow-y-auto

                p-2.5

                overscroll-contain

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

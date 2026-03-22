
// src/app/layout/SidebarNav.tsx

import { useEffect, useMemo, useState } from "react";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Vote,
  Zap,
  MapPin,
  FileText,
  Shield,
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

// Side Bar Nav List item
function linkClass(isActive: boolean) {
  return [
    "flex items-center gap-4 px-4 py-4 text-[26px] font-semibold",
    isActive
      ? "text-green-600 border-slate-400 br-slate-400" // ✅ Keep original active state
      : "border-transparent text-slate-200 hover:border-slate-400 hover:bg-slate-700", // ✅ Light text for dark bg
  ].join(" ");
}

function normalizeMode(x: unknown): DashboardMode {
  const v = String(x ?? "").toUpperCase();
  if (v === "SYSTEM") return "SYSTEM";
  if (v === "NEC") return "NEC";
  return "TENANT";
}

export default function SidebarNav() {
  const { tenant, user } = useAuth();

  const storeMode = useAuthStore((s) => s.dashboardMode);
  const tenantMeta = useAuthStore((s) => s.tenantMeta);

  const sysRole = String(user?.systemRole ?? "").toUpperCase();
  const isSystemAdmin = sysRole === "SYSTEM_ADMIN";
  const isNecAdmin = sysRole === "NEC_ADMIN";

  let mode: DashboardMode = normalizeMode(storeMode);

  if (!storeMode) {
    const orgType = String(tenantMeta?.orgType ?? "").toUpperCase();
    if (isSystemAdmin) mode = "SYSTEM";
    else if (orgType === "NEC" || isNecAdmin) mode = "NEC";
    else mode = "TENANT";
  }

  // ✅ SAME LOGIC AS TOPBAR: SYSTEM PLATFORM fallback when orgName is null/empty
  const rawTenantName = tenantMeta?.orgName ?? tenant?.orgName ?? null;

  const isSystemPlatform =
    !rawTenantName || String(rawTenantName).trim().length === 0;

  const tenantName = isSystemPlatform ? " PLATFORM" : rawTenantName;

  const navItems: NavItem[] = [
    {
      to: "/dashboard",
      label: "Dashboard",
      icon: LayoutDashboard,
      iconColor: "#3b82f6", // Blue
      show: () => true,
    },
    {
      to: "/elections",
      label: "Elections",
      icon: Vote,
      iconColor: "#ef4444", // Red
      show: () => true,
    },
    {
      to: "/operations",
      label: "Operations",
      icon: Zap,
      iconColor: "#f59e0b", // Amber
      show: () => true,
    },
    {
      to: "/geography-registry",
      label: "Geography & Registry",
      icon: MapPin,
      iconColor: "#10b981", // Emerald
      show: () => true,
    },
    {
      to: "/reports",
      label: "Reports",
      icon: FileText,
      iconColor: "#8b5cf6", // Violet
      show: () => true,
    },
    {
      to: "/admin-security",
      label: "Admin & Security",
      icon: Shield,
      iconColor: "#ec4899", // Pink
      show: () => true,
    },
  ];

  const filteredNav = useMemo(
    () => navItems.filter((n) => n.show(mode)),
    [mode]
  );

  // Mobile drawer state
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    if (open) window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  const sidebarContent = (
    <div className="h-full">
      {/* ✅ UPDATED: Dark background box */}
      <div 
        className="rounded-xl border px-3 py-3"
        style={{ backgroundColor: "#191970", borderColor: "#312e81" }}
      >
        <div className="text-2xl font-extrabold text-white">EMS</div>

        <div className="mt-2 space-y-1 text-sm text-slate-300">
          <div>
            Mode: <span className="font-bold text-white">{mode}</span>
          </div>

          <div>
            {/* Tenant name */}
            <span className="font-bold text-2xl text-[#FFA500]">{tenantName}</span>  
          </div>

          {user?.tenantRole ? (
            <div>
              Role:{" "}
              <span className="font-bold text-white">{user.tenantRole}</span>
            </div>
          ) : null}

          {user?.systemRole ? (
            <div>
              System:{" "}
              <span className="font-bold text-white">{user.systemRole}</span>
            </div>
          ) : null}
        </div>
      </div>

      <nav className="mt-3 flex flex-col gap-2">
        {filteredNav.map((n) => {
          const Icon = n.icon;
          return (
            <NavLink
              key={n.to}
              to={n.to}
              onClick={() => setOpen(false)}
              className={({ isActive }) => linkClass(isActive)}
            >
              <Icon size={30} className="flex-shrink-0" style={{ color: n.iconColor }} />
              <span>{n.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="mt-4 border-t border-dashed border-slate-400 pt-3 text-sm text-slate-300">
        Elections are viewable by all tenants.
        <br />
        Create/edit controls remain restricted inside pages.
      </div>
    </div>
  );

  return (
    <>
      {/* ✅ Desktop sidebar (lg+) with dark background */}
      <aside 
        className="hidden lg:block w-280px shrink-0 border-r p-3"
        style={{ backgroundColor: "#191970", borderColor: "#312e81" }}
      >
        {sidebarContent}
      </aside>

      {/* ✅ Mobile "Menu" button */}
      <div className="lg:hidden px-3 pt-3">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold hover:bg-slate-50"
          aria-label="Open menu"
        >
          ☰ Menu
        </button>
      </div>

      {/* ✅ Mobile drawer with dark background */}
      {open ? (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/35"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <aside
            className={[
              "fixed z-50 inset-y-0 left-0",
              "w-[78vw] max-w-[320px]",
              "border-r shadow-2xl",
              "p-3",
            ].join(" ")}
            style={{ backgroundColor: "#800000", borderColor: "#312e81" }}
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="text-base font-extrabold text-white">Menu</div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="h-9 w-9 rounded-xl border hover:bg-slate-700"
                style={{ borderColor: "#312e81", color: "white" }}
                aria-label="Close menu"
              >
                ✕
              </button>
            </div>

            <div className="overflow-auto max-h-[calc(100vh-80px)]">
              {sidebarContent}
            </div>
          </aside>
        </>
      ) : null}
    </>
  );
}


// src/app/layout/SidebarNav.tsx
import { useEffect, useMemo, useState } from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../../auth/useAuth";
import { useAuthStore } from "../../shared/store/authStore";

type DashboardMode = "SYSTEM" | "NEC" | "TENANT";

type NavItem = {
  to: string;
  label: string;
  show: (mode: DashboardMode) => boolean;
};

function linkClass(isActive: boolean) {
  return [
    "flex items-center justify-between rounded-xl border px-3 py-2 text-sm font-semibold",
    isActive
      ? "border-slate-200 bg-slate-100 text-slate-900"
      : "border-transparent text-slate-700 hover:border-slate-200 hover:bg-slate-50",
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

  const navItems: NavItem[] = [
    { to: "/dashboard", label: "Dashboard", show: () => true },
    { to: "/elections", label: "Elections", show: () => true },
    { to: "/operations", label: "Operations", show: () => true },

    {
      to: "/geography-registry",
      label: "Geography & Registry",
      show: () => true,
    },
    // Show Geo only to System Admin & NEC admin
    // {
    //   to: "/geography-registry",
    //   label: "Geography & Registry",
    //   show: (m) => m === "NEC" || m === "SYSTEM",
    // },
    { to: "/reports", label: "Reports", show: () => true },
    { to: "/admin-security", label: "Admin & Security", show: () => true },
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
      <div className="rounded-xl border border-slate-200 bg-white p-3">
        <div className="text-lg font-extrabold">EMS</div>

        <div className="mt-2 space-y-1 text-xs text-slate-600">
          <div>
            Mode: <span className="font-bold text-slate-800">{mode}</span>
          </div>

          <div>
            {/* Tenant: */}{" "}
            <span className="font-bold text-slate-800">
              {tenantMeta?.orgName ?? tenant?.orgName ?? "—"}
            </span>
          </div>

          {user?.tenantRole ? (
            <div>
              Role:{" "}
              <span className="font-bold text-slate-800">
                {user.tenantRole}
              </span>
            </div>
          ) : null}

          {user?.systemRole ? (
            <div>
              System:{" "}
              <span className="font-bold text-slate-800">
                {user.systemRole}
              </span>
            </div>
          ) : null}
        </div>
      </div>

      <nav className="mt-3 flex flex-col gap-2">
        {filteredNav.map((n) => (
          <NavLink
            key={n.to}
            to={n.to}
            onClick={() => setOpen(false)}
            className={({ isActive }) => linkClass(isActive)}
          >
            <span>{n.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="mt-4 border-t border-dashed border-slate-200 pt-3 text-xs text-slate-600">
        Elections are viewable by all tenants.
        <br />
        Create/edit controls remain restricted inside pages.
      </div>
    </div>
  );

  return (
    <>
      {/* ✅ Desktop sidebar (lg+) */}
      <aside className="hidden lg:block w-280px shrink-0 border-r border-slate-200 bg-white p-3">
        {sidebarContent}
      </aside>

      {/* ✅ Mobile “Menu” button (ONLY if you want it here).
          If your TopBar already has a hamburger, you can remove this block.
      */}
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

      {/* ✅ Mobile drawer */}
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
              "w-[78vw] max-w-[320px]", // ✅ iPhone-friendly (not too wide)
              "bg-white border-r border-slate-200 shadow-2xl",
              "p-3",
            ].join(" ")}
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="text-base font-extrabold text-slate-900">
                Menu
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="h-9 w-9 rounded-xl border border-slate-200 hover:bg-slate-50"
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

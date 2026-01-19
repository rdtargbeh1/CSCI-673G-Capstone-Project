// src/app/layout/AppLayout.tsx
import { Outlet } from "react-router-dom";
import TopBar from "./TopBar";
import SidebarNav from "./SidebarNav";

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";

import { useAuthStore } from "../../shared/store/authStore";
import { useThemeStore } from "../../shared/store/themeStore";
import { fetchOrganizationById } from "../../shared/services/organizationService";

// ✅ helper (local) so we don't depend on other modules
function decodeIsSystemAdmin(token: string | null): boolean {
  try {
    if (!token) return false;
    const parts = token.split(".");
    if (parts.length < 2) return false;

    const b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const json = decodeURIComponent(
      atob(b64)
        .split("")
        .map((c) => "%" + c.charCodeAt(0).toString(16).padStart(2, "0"))
        .join("")
    );

    const payload = JSON.parse(json) as any;

    const role =
      payload.globalRoleName ??
      payload.roleName ??
      payload.role ??
      payload.authority ??
      payload.authorities?.[0];

    const isSysAdminFlag =
      payload.isSystemAdmin ?? payload.is_system_admin ?? payload.sysAdmin;

    return (
      isSysAdminFlag === true ||
      String(role ?? "").toUpperCase() === "SYSTEM_ADMIN" ||
      payload?.roles?.includes?.("SYSTEM_ADMIN")
    );
  } catch {
    return false;
  }
}

export default function AppLayout() {
  const currentOrgId = useAuthStore((s) => s.currentOrgId);

  const token = useAuthStore((s) => s.token);
  const setDashboardMode = useAuthStore((s) => s.setDashboardMode);
  const setTenantMeta = useAuthStore((s) => s.setTenantMeta);

  const { setTheme, resetTheme, primaryColor } = useThemeStore();

  const orgBrandingQuery = useQuery({
    queryKey: ["orgBranding", currentOrgId ?? "NO_ORG"],
    queryFn: () => fetchOrganizationById(currentOrgId as string),
    enabled: !!currentOrgId,
    staleTime: 0,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  useEffect(() => {
    if (!currentOrgId) {
      resetTheme();
      return;
    }
    const org: any = orgBrandingQuery.data;
    if (!org) return;

    setTheme({
      primaryColor: org.primaryColor ?? "#0A84FF",
      logoUrl: org.logoUrl ?? null,
    });
  }, [currentOrgId, orgBrandingQuery.data, setTheme, resetTheme]);

  useEffect(() => {
    if (!currentOrgId) {
      const isSys = decodeIsSystemAdmin(token);
      if (isSys) setDashboardMode("SYSTEM");
      return;
    }

    const org: any = orgBrandingQuery.data;
    if (!org) return;

    const orgType = String(
      org.organizationType ?? org.orgType ?? ""
    ).toUpperCase();

    if (orgType === "NEC") setDashboardMode("NEC");
    else setDashboardMode("TENANT");

    setTenantMeta({
      orgId: org.orgId ?? currentOrgId,
      orgName: org.orgName ?? "—",
      orgType: org.organizationType ?? null,
    });
  }, [
    currentOrgId,
    token,
    orgBrandingQuery.data,
    setDashboardMode,
    setTenantMeta,
  ]);

  useEffect(() => {
    document.documentElement.style.setProperty(
      "--org-primary",
      primaryColor || "#0A84FF"
    );
  }, [primaryColor]);

  return (
    <div className="min-h-screen w-full bg-slate-50">
      {/* TopBar stays on top (mobile + desktop) */}
      <TopBar />

      {/* Mobile-first shell:
          - Mobile: column (sidebar is drawer-only; desktop sidebar hidden)
          - Desktop: row with fixed sidebar
      */}
      <div className="flex flex-col lg:flex-row h-[calc(100vh-56px)]">
        {/* Sidebar handles: lg fixed sidebar + mobile drawer */}
        <SidebarNav />

        {/* Main content:
            - min-w-0 prevents “squeezed” layout
            - overflow-x hidden prevents side-scroll on phones
            - responsive padding
        */}
        <main className="min-w-0 flex-1 overflow-y-auto overflow-x-hidden">
          <div className="mx-auto w-full max-w-1400px px-3 py-3 sm:px-4 sm:py-4">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

// src/app/layout/AppLayout.tsx

import { useEffect } from "react";
import { Outlet } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import TopBar from "./TopBar";
import SidebarNav from "./SidebarNav";

import { useAuthStore } from "../../shared/store/authStore";
import { useThemeStore } from "../../shared/store/themeStore";
import { fetchOrganizationById } from "../../shared/services/organizationService";

// ============================================================================
// TOKEN HELPER
// ============================================================================

function decodeIsSystemAdmin(token: string | null): boolean {
  try {
    if (!token) {
      return false;
    }

    const parts = token.split(".");

    if (parts.length < 2) {
      return false;
    }

    const b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");

    const json = decodeURIComponent(
      atob(b64)
        .split("")
        .map((char) => "%" + char.charCodeAt(0).toString(16).padStart(2, "0"))
        .join(""),
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

// ============================================================================
// COMPONENT
// ============================================================================

export default function AppLayout() {
  const currentOrgId = useAuthStore((state) => state.currentOrgId);

  const token = useAuthStore((state) => state.token);

  const setDashboardMode = useAuthStore((state) => state.setDashboardMode);

  const setTenantMeta = useAuthStore((state) => state.setTenantMeta);

  const { setTheme, resetTheme, primaryColor } = useThemeStore();

  // ==========================================================================
  // ORGANIZATION BRANDING
  // ==========================================================================

  const orgBrandingQuery = useQuery({
    queryKey: ["orgBranding", currentOrgId ?? "NO_ORG"],

    queryFn: () => fetchOrganizationById(currentOrgId as string),

    enabled: !!currentOrgId,

    staleTime: 0,

    refetchOnWindowFocus: false,

    retry: 1,
  });

  // ==========================================================================
  // THEME
  // ==========================================================================

  useEffect(() => {
    if (!currentOrgId) {
      resetTheme();
      return;
    }

    const org: any = orgBrandingQuery.data;

    if (!org) {
      return;
    }

    setTheme({
      primaryColor: org.primaryColor ?? "#0A84FF",

      logoUrl: org.logoUrl ?? null,
    });
  }, [currentOrgId, orgBrandingQuery.data, setTheme, resetTheme]);

  // ==========================================================================
  // DASHBOARD MODE + TENANT META
  // ==========================================================================

  useEffect(() => {
    if (!currentOrgId) {
      const isSys = decodeIsSystemAdmin(token);

      if (isSys) {
        setDashboardMode("SYSTEM");
      }

      return;
    }

    const org: any = orgBrandingQuery.data;

    if (!org) {
      return;
    }

    const orgType = String(
      org.organizationType ?? org.orgType ?? "",
    ).toUpperCase();

    if (orgType === "NEC") {
      setDashboardMode("NEC");
    } else {
      setDashboardMode("TENANT");
    }

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

  // ==========================================================================
  // GLOBAL PRIMARY COLOR
  // ==========================================================================

  useEffect(() => {
    document.documentElement.style.setProperty(
      "--org-primary",
      primaryColor || "#0A84FF",
    );
  }, [primaryColor]);

  // ==========================================================================
  // RENDER
  // ==========================================================================

  return (
    <div
      className="
        flex
        min-h-screen
        w-full
        min-w-0
        flex-col
        bg-slate-50
      "
    >
      {/* ================================================================
          TOP BAR
      ================================================================ */}

      <TopBar />

      {/* ================================================================
          APPLICATION BODY

          Mobile / Tablet:
          - Column layout
          - Sidebar renders menu button + drawer

          Desktop:
          - Sidebar and main content side-by-side
      ================================================================ */}

      <div
        className="
          flex
          min-h-0
          min-w-0
          flex-1
          flex-col

          lg:flex-row
        "
      >
        {/* ==============================================================
            SIDEBAR
        ============================================================== */}

        <SidebarNav />

        {/* ==============================================================
            MAIN CONTENT
        ============================================================== */}

        <main
          className="
            min-h-0
            min-w-0
            flex-1

            overflow-x-hidden

            lg:overflow-y-auto
          "
        >
          <div
            className="
              mx-auto
              w-full
              min-w-0

              px-2
              pb-4
              pt-2

              sm:px-3
              sm:pb-5
              sm:pt-3

              md:px-4

              lg:px-4
              lg:py-4

              xl:px-5

              2xl:px-6
            "
          >
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

// src/app/layout/AppLayout.tsx

import { useEffect } from "react";

import { Navigate, Outlet, useLocation } from "react-router-dom";

import { useQuery } from "@tanstack/react-query";

import TopBar from "./TopBar";
import SidebarNav from "./SidebarNav";

import { useAuthStore } from "../../shared/store/authStore";
import { useThemeStore } from "../../shared/store/themeStore";

import { useAccessProfile } from "../../shared/hooks/useAccessProfile";

import { fetchOrganizationById } from "../../shared/services/organizationService";

// ============================================================================
// ADMINISTRATIVE ROUTE PREFIXES
// ============================================================================
//
// These are administrative workspaces.
//
// Operational-only users entering one of these URLs manually are returned to:
//
// /operations
//
// Operations itself is NOT administrative-only because administrators may
// also enter Operations.
//
// ============================================================================

const ADMINISTRATIVE_ROUTE_PREFIXES = [
  "/dashboard",
  "/elections",
  "/geography-registry",
  "/reports",
  "/admin-security",
] as const;

// ============================================================================
// ROUTE HELPER
// ============================================================================

function matchesRoutePrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function AppLayout() {
  const location = useLocation();

  // ==========================================================================
  // AUTH STORE
  // ==========================================================================

  const token = useAuthStore((state) => state.token);

  const currentOrgId = useAuthStore((state) => state.currentOrgId);

  const setDashboardMode = useAuthStore((state) => state.setDashboardMode);

  const setTenantMeta = useAuthStore((state) => state.setTenantMeta);

  // ==========================================================================
  // CENTRAL ACCESS PROFILE
  // ==========================================================================

  const {
    access,
    roles,
    portal,
    isAdministrative,
    isOperational,
    isLoading: accessLoading,
    isError: accessError,
    error: accessProfileError,
  } = useAccessProfile();

  const operationalOnly =
    portal === "OPERATIONS" && isOperational && !isAdministrative;

  const enteredAdministrativeRoute = ADMINISTRATIVE_ROUTE_PREFIXES.some(
    (prefix) => matchesRoutePrefix(location.pathname, prefix),
  );

  // ==========================================================================
  // THEME STORE
  // ==========================================================================

  const { setTheme, resetTheme, primaryColor } = useThemeStore();

  // ==========================================================================
  // ORGANIZATION BRANDING
  // ==========================================================================

  const orgBrandingQuery = useQuery({
    queryKey: ["orgBranding", currentOrgId ?? "NO_ORG"],

    queryFn: () => fetchOrganizationById(currentOrgId as string),

    enabled: Boolean(currentOrgId),

    staleTime: 0,

    refetchOnWindowFocus: false,

    retry: 1,
  });

  // ==========================================================================
  // ORGANIZATION THEME
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
  // DASHBOARD MODE / ENVIRONMENT
  // ==========================================================================
  //
  // dashboardMode remains:
  //
  // SYSTEM
  // NEC
  // TENANT
  //
  // But it describes the environment being displayed.
  //
  // It does NOT determine portal authorization.
  //
  // Example:
  //
  // COORDINATOR inside NEC organization:
  //
  // dashboardMode = NEC
  // portal        = OPERATIONS
  //
  // ==========================================================================

  useEffect(() => {
    if (!token) {
      return;
    }

    // ------------------------------------------------------------------------
    // SYSTEM PLATFORM
    // ------------------------------------------------------------------------

    if (!currentOrgId) {
      if (roles.includes("SYSTEM_ADMIN")) {
        setDashboardMode("SYSTEM");
      }

      return;
    }

    // ------------------------------------------------------------------------
    // ORGANIZATION ENVIRONMENT
    // ------------------------------------------------------------------------

    const org: any = orgBrandingQuery.data;

    if (!org) {
      return;
    }

    const orgType = String(org.organizationType ?? org.orgType ?? "")
      .trim()
      .toUpperCase();

    if (orgType === "NEC") {
      setDashboardMode("NEC");
    } else {
      setDashboardMode("TENANT");
    }

    setTenantMeta({
      orgId: org.orgId ?? currentOrgId,

      orgName: org.orgName ?? "—",

      orgType: org.organizationType ?? org.orgType ?? null,
    });
  }, [
    token,
    currentOrgId,
    roles,
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
  // AUTHENTICATION
  // ==========================================================================

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  // ==========================================================================
  // ACCESS LOADING
  // ==========================================================================

  if (accessLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="text-sm font-semibold text-slate-500">
          Loading workspace...
        </div>
      </div>
    );
  }

  // ==========================================================================
  // ACCESS ERROR
  // ==========================================================================

  if (accessError || !access) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="w-full max-w-lg rounded-xl border border-red-200 bg-white p-6 shadow-sm">
          <h1 className="text-lg font-bold text-slate-900">
            Unable to load workspace
          </h1>

          <p className="mt-2 text-sm text-slate-600">
            {accessProfileError?.message ??
              "The application could not resolve your current access profile."}
          </p>
        </div>
      </div>
    );
  }

  // ==========================================================================
  // NO PORTAL
  // ==========================================================================

  if (portal === "NONE") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm">
          <h1 className="text-lg font-bold text-slate-900">
            No workspace access
          </h1>

          <p className="mt-2 text-sm text-slate-600">
            Your account does not currently have access to an EMS application
            workspace.
          </p>
        </div>
      </div>
    );
  }

  // ==========================================================================
  // ADMINISTRATIVE ROUTE PROTECTION
  // ==========================================================================

  if (operationalOnly && enteredAdministrativeRoute) {
    return <Navigate to="/operations" replace />;
  }

  // ==========================================================================
  // APPLICATION SHELL
  // ==========================================================================

  return (
    <div className="flex min-h-screen w-full min-w-0 flex-col bg-slate-50">
      {/* ==================================================================
          TOP BAR
      ================================================================== */}

      <TopBar />

      {/* ==================================================================
          BODY
      ================================================================== */}

      <div className="flex min-h-0 min-w-0 flex-1 flex-col lg:flex-row">
        {/* ================================================================
            SIDEBAR
        ================================================================ */}

        <SidebarNav />

        {/* ================================================================
            PAGE
        ================================================================ */}

        <main className="min-h-0 min-w-0 flex-1 overflow-x-hidden lg:overflow-y-auto">
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

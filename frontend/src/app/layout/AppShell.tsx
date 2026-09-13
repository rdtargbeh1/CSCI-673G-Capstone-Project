// AppShell.tsx

import React, { useEffect } from "react";

import { useQuery } from "@tanstack/react-query";

import SidebarNav from "./SidebarNav";
import TopBar from "./TopBar";

import { useAuthStore } from "../../shared/store/authStore";

import { useThemeStore } from "../../shared/store/themeStore";

import { fetchOrganizationById } from "../../shared/services/organizationService";

interface AppShellProps {
  children: React.ReactNode;
}

const AppShell: React.FC<AppShellProps> = ({ children }) => {
  const { currentOrgId } = useAuthStore();

  const { setTheme, resetTheme, primaryColor } = useThemeStore();

  // ==========================================================================
  // ORGANIZATION BRANDING
  // ==========================================================================

  const orgBrandingQuery = useQuery({
    queryKey: ["orgBranding", currentOrgId ?? "NO_ORG"],

    queryFn: () => fetchOrganizationById(currentOrgId!),

    enabled: !!currentOrgId,

    staleTime: 0,

    refetchOnWindowFocus: false,

    retry: 1,
  });

  // ==========================================================================
  // UPDATE THEME STORE
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
  // APPLY GLOBAL THEME
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
        bg-slate-100
      "
    >
      {/* ================================================================
          TOP BAR

          Always spans the complete application width.
      ================================================================ */}

      <TopBar />

      {/* ================================================================
          APPLICATION BODY

          Mobile / Tablet:
          - Vertical flow
          - Sidebar renders Menu button + drawer

          Desktop:
          - Sidebar beside main content
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
          role="main"
          aria-live="polite"
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

              space-y-3

              px-2
              pb-4
              pt-2

              sm:space-y-4
              sm:px-3
              sm:pb-5
              sm:pt-3

              md:px-4

              lg:space-y-5
              lg:px-4
              lg:py-4

              xl:px-5

              2xl:px-6
            "
          >
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default AppShell;

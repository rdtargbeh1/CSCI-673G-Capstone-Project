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

  // ✅ Always fetch org branding from DB
  const orgBrandingQuery = useQuery({
    queryKey: ["orgBranding", currentOrgId ?? "NO_ORG"],
    queryFn: () => fetchOrganizationById(currentOrgId!),
    enabled: !!currentOrgId,
    staleTime: 0, // ✅ so invalidate triggers immediate refetch
    refetchOnWindowFocus: false,
    retry: 1,
  });

  // ✅ When org branding changes, update theme store
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

  // ✅ Apply theme globally
  useEffect(() => {
    document.documentElement.style.setProperty(
      "--org-primary",
      primaryColor || "#0A84FF"
    );
  }, [primaryColor]);

  return (
    <div className="min-h-screen flex bg-slate-100">
      <SidebarNav />
      <div className="flex-1 flex flex-col">
        <TopBar />
        <main
          role="main"
          className="flex-1 p-6 space-y-6 overflow-y-auto"
          aria-live="polite"
        >
          {children}
        </main>
      </div>
    </div>
  );
};

export default AppShell;


// src/pages/dashboard/shared/DashboardTabs.tsx

import { useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";

interface DashboardTab {
  to: string;
  label: string;
  hidden?: boolean;
}

interface DashboardTabsProps {
  mode: "TENANT" | "NEC" | "SYSTEM";
  currentOrgId?: string | null;
  isOfficialPublished?: boolean;
}

function DashboardTabs({
  mode,
  isOfficialPublished = false, // ✅ REVERTED: Default to false
}: DashboardTabsProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const tabs = useMemo(() => {
    const allTabs: DashboardTab[] = [];

    if (mode === "TENANT") {
      allTabs.push(
        { to: "/dashboard", label: "Home", hidden: false },
        { to: "/dashboard/local-results", label: "Local Results", hidden: false },
        {
          to: "/dashboard/official-results",
          label: "Official Results",
          hidden: !isOfficialPublished, // ✅ REVERTED: Hide until published
        }
      );
    }

    if (mode === "NEC") {
      allTabs.push(
        { to: "/dashboard/nec", label: "Home", hidden: false },
        { to: "/dashboard/nec/local-results", label: "Local Results", hidden: false },
        {
          to: "/dashboard/nec/official-results",
          label: "Official Results",
          hidden: false, // ✅ Always visible for NEC
        }
      );
    }

    return allTabs.filter((t) => !t.hidden);
  }, [mode, isOfficialPublished]);

  if (tabs.length === 0) return null;

  const currentTab = useMemo(() => {
    return tabs.find((t) => location.pathname === t.to) || tabs[0];
  }, [location.pathname, tabs]);

  const handleTabClick = (tabTo: string) => {
    navigate(tabTo);
  };

  return (
    <div className="flex items-center gap-1 border-b border-slate-200 bg-white">
      {tabs.map((tab) => (
        <button
          key={tab.to}
          onClick={() => handleTabClick(tab.to)}
          className={`px-4 py-3 text-xl font-medium transition-colors ${
            currentTab.to === tab.to
              ? "border-b-2 border-blue-600 text-blue-600"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          {tab.label}
        </button>
      ))}

      {/* ✅ Alert when official results are published (TENANT mode only) */}
      {mode === "TENANT" && isOfficialPublished && (
        <div className="ml-auto mr-4 flex items-center gap-2 rounded-md bg-green-50 px-3 py-2 text-xs font-medium text-green-700">
          <span className="h-2 w-2 rounded-full bg-green-600"></span>
          Official results published by NEC
        </div>
      )}

      {/* ✅ Show different alert for NEC when published */}
      {mode === "NEC" && isOfficialPublished && (
        <div className="ml-auto mr-4 flex items-center gap-2 rounded-md bg-blue-50 px-3 py-2 text-xs font-medium text-blue-700">
          <span className="h-2 w-2 rounded-full bg-blue-600"></span>
          Official results published
        </div>
      )}
    </div>
  );
}

export default DashboardTabs;


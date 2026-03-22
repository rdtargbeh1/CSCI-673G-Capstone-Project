
import { useState } from "react";
import { useAuth } from "../../../../../auth/useAuth";
import { Panel, Badge } from "../../../shared/elections-ui";

import PollingCenterAllocationsPage from "./PollingCenterAllocationsPage";
import PollingPlaceAllocationsPage from "./PollingPlaceAllocationsPage";

type SubTab = "CENTERS" | "PLACES";

export default function AllocationTab() {
  const { dashboardMode } = useAuth();
  const canEdit = dashboardMode === "NEC" || dashboardMode === "SYSTEM";

  const [tab, setTab] = useState<SubTab>("CENTERS");

  return (
    <div className="flex flex-col gap-3">
      <Panel
        title="Allocation"
        right={
          <div className="flex flex-wrap gap-3 items-center">
            {/* Centers Tab */}
            <button
              type="button"
              onClick={() => setTab("CENTERS")}
              className={`px-4 py-2 rounded-lg font-bold text-xl transition-all ${
                tab === "CENTERS"
                  ? "bg-blue-900 text-white shadow-md border-blue-600"
                  : "bg-white text-slate-900 border border-slate-300 hover:bg-slate-50"
              }`}
            >
              📍 Centers
            </button>

            {/* Places Tab */}
            <button
              type="button"
              onClick={() => setTab("PLACES")}
              className={`px-4 py-2 rounded-lg font-bold text-xl transition-all ${
                tab === "PLACES"
                  ? "bg-blue-900 text-white shadow-md border-blue-600"
                  : "bg-white text-slate-900 border border-slate-300 hover:bg-slate-50"
              }`}
            >
              🗳️ Places
            </button>

            {/* Divider */}
            <div className="hidden sm:block w-px h-6 bg-slate-300" />

            {/* Bulk Import Button */}
            {canEdit && (
              <button
                type="button"
                className="px-4 py-2 rounded-lg font-semibold text-base border border-slate-300 bg-white text-slate-900 hover:bg-slate-50 transition"
                title="Coming soon"
              >
                📥 Bulk Import
              </button>
            )}
          </div>
        }
      >
        {tab === "CENTERS" ? (
          <PollingCenterAllocationsPage />
        ) : (
          <PollingPlaceAllocationsPage />
        )}
      </Panel>
    </div>
  );
}


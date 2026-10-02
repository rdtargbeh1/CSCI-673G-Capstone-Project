// src/pages/geo-registry/shared/GeographyReadRoutes.tsx

import { Navigate, NavLink, Route, Routes } from "react-router-dom";

import CountiesPage from "../CountiesPage";

import DistrictsPage from "../DistrictsPage";
import PollingCentersPage from "../PollingCentersPage";
import PollingPlacesPage from "../PollingPlacesPage";

// ============================================================================
// TAB STYLE
// ============================================================================

function tabClass({ isActive }: { isActive: boolean }) {
  return [
    `
      inline-flex
      min-h-9
      items-center
      justify-center
      rounded-lg
      border
      px-3
      py-1.5
      text-sm
      font-bold
      transition
    `,

    isActive
      ? `
          border-[#00008B]
          bg-[#00008B]
          text-[#EFBF04]
        `
      : `
          border-slate-200
          bg-white
          text-slate-700
          hover:bg-slate-50
        `,
  ].join(" ");
}

// ============================================================================
// GEOGRAPHY NAVIGATION
// ============================================================================

function GeographyNavigation() {
  return (
    <div
      className="
        flex
        min-w-0
        flex-wrap
        items-center
        gap-2
        border-b
        border-slate-200
        pb-2
      "
    >
      <NavLink to="/operations/geography/counties" className={tabClass}>
        Counties
      </NavLink>
      <NavLink to="/operations/geography/districts" className={tabClass}>
        Districts
      </NavLink>

      <NavLink to="/operations/geography/polling-centers" className={tabClass}>
        Polling Centers
      </NavLink>

      <NavLink to="/operations/geography/polling-places" className={tabClass}>
        Polling Places
      </NavLink>
    </div>
  );
}

// ============================================================================
// OPERATIONS GEOGRAPHY ROUTES
// ============================================================================

export default function GeographyReadRoutes() {
  return (
    <div className="flex min-w-0 flex-col gap-3">
      <GeographyNavigation />

      <Routes>
        <Route
          index
          element={<Navigate to="/operations/geography/counties" replace />}
        />

        <Route path="counties" element={<CountiesPage />} />
        <Route
          path="centers"
          element={
            <Navigate to="/operations/geography/polling-centers" replace />
          }
        />
        <Route
          path="places"
          element={
            <Navigate to="/operations/geography/polling-places" replace />
          }
        />
        <Route path="districts" element={<DistrictsPage />} />

        <Route path="polling-centers" element={<PollingCentersPage />} />

        <Route path="polling-places" element={<PollingPlacesPage />} />

        <Route
          path="*"
          element={<Navigate to="/operations/geography/counties" replace />}
        />
      </Routes>
    </div>
  );
}

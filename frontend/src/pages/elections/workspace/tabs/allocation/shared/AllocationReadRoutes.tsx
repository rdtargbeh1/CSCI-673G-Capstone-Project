// src/pages/elections/workspace/tabs/allocation/shared/AllocationReadRoutes.tsx

import { Navigate, Route, Routes } from "react-router-dom";

import PollingCenterAllocationPage from "../PollingCenterAllocationsPage";
import PollingCenterAllocationDetailPage from "../PollingCenterAllocationDetailPage";
import PollingPlaceAllocationsPage from "../PollingPlaceAllocationsPage";
import PollingPlaceAllocationDetailPage from "../PollingPlaceAllocationDetailPage";

export default function AllocationReadRoutes() {
  return (
    <Routes>
      {/* DEFAULT */}

      <Route index element={<Navigate to="centers" replace />} />

      {/* ================================================================
          CENTER ALLOCATIONS
      ================================================================ */}

      <Route path="centers" element={<PollingCenterAllocationPage />} />

      <Route
        path="centers/new"
        element={<Navigate to="../centers" replace />}
      />

      <Route
        path="centers/:allocationId"
        element={<PollingCenterAllocationDetailPage />}
      />

      {/* ================================================================
          PLACE ALLOCATIONS
      ================================================================ */}

      <Route path="places" element={<PollingPlaceAllocationsPage />} />

      <Route path="places/new" element={<Navigate to="../places" replace />} />

      <Route
        path="places/:placeAllocationId"
        element={<PollingPlaceAllocationDetailPage />}
      />

      {/* ================================================================
          ALLOCATION FALLBACK
      ================================================================ */}

      <Route path="*" element={<Navigate to="centers" replace />} />
    </Routes>
  );
}

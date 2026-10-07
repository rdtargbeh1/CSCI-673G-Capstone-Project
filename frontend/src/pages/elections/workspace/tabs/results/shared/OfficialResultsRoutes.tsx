// src/pages/elections/workspace/tabs/results/shared/OfficialResultsRoutes.tsx

import { Navigate, NavLink, Outlet, Route, Routes } from "react-router-dom";

import { useAuthStore } from "../../../../../../shared/store/authStore";

import OfficialCandidateCentersPage from "../official/OfficialCandidateCentersPage";
import OfficialCandidateDistrictsPage from "../official/OfficialCandidateDistrictsPage";
import OfficialCandidateCountiesPage from "../official/OfficialCandidateCountiesPage";
import OfficialCandidateElectionPage from "../official/OfficialCandidateElectionPage";

import OfficialTotalsCentersPage from "../official/OfficialTotalsCentersPage";
import OfficialTotalsDistrictsPage from "../official/OfficialTotalsDistrictsPage";
import OfficialTotalsCountiesPage from "../official/OfficialTotalsCountiesPage";
import OfficialTotalsElectionPage from "../official/OfficialTotalsElectionPage";

import NecResultGeoPage from "../official/NecResultGeoPage";

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
          border-emerald-300
          bg-emerald-50
          text-emerald-900
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
// OFFICIAL RESULTS LAYOUT
// ============================================================================
//
// Operations route:
//
// /operations/results/official/*
//
// No electionId appears in the Operations route.
//
// Existing result pages receive orgId through outlet context.
//
// ============================================================================

function OperationsOfficialResultsLayout() {
  const currentOrgId = useAuthStore((state: any) => state.currentOrgId);

  return (
    <div className="flex min-w-0 flex-col gap-3">
      {/* ==================================================================
          CANDIDATE RESULTS
      ================================================================== */}

      <div className="flex min-w-0 flex-wrap items-center gap-2 border-b border-slate-200 pb-2">
        <span className="mr-1 text-xs font-extrabold uppercase tracking-wide text-slate-500">
          Candidates
        </span>

        <NavLink
          to="/operations/results/official/candidates/centers"
          className={tabClass}
        >
          Centers
        </NavLink>

        <NavLink
          to="/operations/results/official/candidates/districts"
          className={tabClass}
        >
          Districts
        </NavLink>

        <NavLink
          to="/operations/results/official/candidates/counties"
          className={tabClass}
        >
          Counties
        </NavLink>

        <NavLink
          to="/operations/results/official/candidates/election"
          className={tabClass}
        >
          Election
        </NavLink>
      </div>

      {/* ==================================================================
          GEOGRAPHIC / TOTAL RESULTS
      ================================================================== */}

      <div className="flex min-w-0 flex-wrap items-center gap-2 border-b border-slate-200 pb-2">
        <span className="mr-1 text-xs font-extrabold uppercase tracking-wide text-slate-500">
          Totals
        </span>

        <NavLink
          to="/operations/results/official/totals/centers"
          className={tabClass}
        >
          Centers
        </NavLink>

        <NavLink
          to="/operations/results/official/totals/districts"
          className={tabClass}
        >
          Districts
        </NavLink>

        <NavLink
          to="/operations/results/official/totals/counties"
          className={tabClass}
        >
          Counties
        </NavLink>

        <NavLink
          to="/operations/results/official/totals/election"
          className={tabClass}
        >
          Election
        </NavLink>

        <NavLink to="/operations/results/official/geo" className={tabClass}>
          Geographic View
        </NavLink>
      </div>

      {/* ==================================================================
          RESULT PAGE
      ================================================================== */}

      <Outlet
        context={{
          orgId: currentOrgId ?? undefined,
        }}
      />
    </div>
  );
}

// ============================================================================
// OFFICIAL RESULTS ROUTER
// ============================================================================
//
// Mounted under:
//
// /operations/results/official/*
//
// ============================================================================

export default function OfficialResultsRoutes() {
  return (
    <Routes>
      <Route element={<OperationsOfficialResultsLayout />}>
        {/* ==================================================================
            DEFAULT
        ================================================================== */}

        <Route
          index
          element={
            <Navigate
              to="/operations/results/official/candidates/counties"
              replace
            />
          }
        />

        {/* ==================================================================
            CANDIDATE RESULTS
        ================================================================== */}

        <Route
          path="candidates/centers"
          element={<OfficialCandidateCentersPage />}
        />

        <Route
          path="candidates/districts"
          element={<OfficialCandidateDistrictsPage />}
        />

        <Route
          path="candidates/counties"
          element={<OfficialCandidateCountiesPage />}
        />

        <Route
          path="candidates/election"
          element={<OfficialCandidateElectionPage />}
        />

        {/* ==================================================================
            TOTALS
        ================================================================== */}

        <Route path="totals/centers" element={<OfficialTotalsCentersPage />} />

        <Route
          path="totals/districts"
          element={<OfficialTotalsDistrictsPage />}
        />

        <Route
          path="totals/counties"
          element={<OfficialTotalsCountiesPage />}
        />

        <Route
          path="totals/election"
          element={<OfficialTotalsElectionPage />}
        />

        {/* ==================================================================
            GEOGRAPHIC RESULTS
        ================================================================== */}

        <Route path="geo" element={<NecResultGeoPage />} />

        {/* ==================================================================
            FALLBACK
        ================================================================== */}

        <Route
          path="*"
          element={
            <Navigate
              to="/operations/results/official/candidates/counties"
              replace
            />
          }
        />
      </Route>
    </Routes>
  );
}

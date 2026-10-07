// src/pages/elections/workspace/tabs/results/shared/PartyResultsRoutes.tsx

import { Navigate, NavLink, Outlet, Route, Routes } from "react-router-dom";

import { useAuthStore } from "../../../../../../shared/store/authStore";

import PartyCandidateCentersPage from "../party/PartyCandidateCentersPage";
import PartyCandidateDistrictsPage from "../party/PartyCandidateDistrictsPage";
import PartyCandidateCountiesPage from "../party/PartyCandidateCountiesPage";
import PartyCandidateElectionPage from "../party/PartyCandidateElectionPage";

import PartyTotalsCentersPage from "../party/PartyTotalsCentersPage";
import PartyTotalsDistrictsPage from "../party/PartyTotalsDistrictsPage";
import PartyTotalsCountiesPage from "../party/PartyTotalsCountiesPage";
import PartyTotalsElectionPage from "../party/PartyTotalsElectionPage";

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
          border-red-300
          bg-red-50
          text-red-900
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
// LOCAL RESULTS LAYOUT
// ============================================================================
//
// IMPORTANT:
//
// This layout deliberately does NOT use:
//
// /elections/:electionId/...
//
// Operations uses:
//
// /operations/results/local/*
//
// Election is supplied through application context, not route identity.
//
// Existing result pages currently consume orgId through useOutletContext(),
// so that context is preserved here.
//
// ============================================================================

function OperationsPartyResultsLayout() {
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
          to="/operations/results/local/candidates/centers"
          className={tabClass}
        >
          Centers
        </NavLink>

        <NavLink
          to="/operations/results/local/candidates/districts"
          className={tabClass}
        >
          Districts
        </NavLink>

        <NavLink
          to="/operations/results/local/candidates/counties"
          className={tabClass}
        >
          Counties
        </NavLink>

        <NavLink
          to="/operations/results/local/candidates/election"
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
          to="/operations/results/local/totals/centers"
          className={tabClass}
        >
          Centers
        </NavLink>

        <NavLink
          to="/operations/results/local/totals/districts"
          className={tabClass}
        >
          Districts
        </NavLink>

        <NavLink
          to="/operations/results/local/totals/counties"
          className={tabClass}
        >
          Counties
        </NavLink>

        <NavLink
          to="/operations/results/local/totals/election"
          className={tabClass}
        >
          Election
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
// PARTY / LOCAL RESULTS ROUTER
// ============================================================================
//
// Mounted under:
//
// /operations/results/local/*
//
// No electionId appears in the URL.
//
// ============================================================================

export default function PartyResultsRoutes() {
  return (
    <Routes>
      <Route element={<OperationsPartyResultsLayout />}>
        {/* ==================================================================
            DEFAULT
        ================================================================== */}

        <Route
          index
          element={
            <Navigate
              to="/operations/results/local/candidates/counties"
              replace
            />
          }
        />

        {/* ==================================================================
            CANDIDATE RESULTS
        ================================================================== */}

        <Route
          path="candidates/centers"
          element={<PartyCandidateCentersPage />}
        />

        <Route
          path="candidates/districts"
          element={<PartyCandidateDistrictsPage />}
        />

        <Route
          path="candidates/counties"
          element={<PartyCandidateCountiesPage />}
        />

        <Route
          path="candidates/election"
          element={<PartyCandidateElectionPage />}
        />

        {/* ==================================================================
            TOTALS
        ================================================================== */}

        <Route path="totals/centers" element={<PartyTotalsCentersPage />} />

        <Route path="totals/districts" element={<PartyTotalsDistrictsPage />} />

        <Route path="totals/counties" element={<PartyTotalsCountiesPage />} />

        <Route path="totals/election" element={<PartyTotalsElectionPage />} />

        {/* ==================================================================
            FALLBACK
        ================================================================== */}

        <Route
          path="*"
          element={
            <Navigate
              to="/operations/results/local/candidates/counties"
              replace
            />
          }
        />
      </Route>
    </Routes>
  );
}

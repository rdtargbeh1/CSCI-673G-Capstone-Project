// src/pages/elections/workspace/tabs/results/shared/ElectionResultsRoutes.tsx

import { Navigate, NavLink, Outlet, Route, Routes } from "react-router-dom";

import { useAuthStore } from "../../../../../../shared/store/authStore";

import VoteSubmissionContestPage from "../VoteSubmissionContestPage";
import VoteTallyPage from "../VoteTallyPage";

import PartyResultsRoutes from "./PartyResultsRoutes";
import OfficialResultsRoutes from "./OfficialResultsRoutes";

// ============================================================================
// TAB STYLE
// ============================================================================

function tabClass({ isActive }: { isActive: boolean }) {
  return [
    "inline-flex",
    "min-h-9",
    "items-center",
    "justify-center",
    "rounded-lg",
    "border",
    "px-3",
    "py-1.5",
    "text-sm",
    "font-bold",
    "transition",
    isActive
      ? "border-[#00008B] bg-[#00008B] text-[#EFBF04]"
      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
  ].join(" ");
}

// ============================================================================
// RESULTS NAVIGATION
// ============================================================================

function ResultsNavigation() {
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-2 border-b border-slate-200 pb-2">
      <NavLink to="/operations/results/submission-contest" className={tabClass}>
        Submission Normalized
      </NavLink>

      <NavLink to="/operations/results/tally" className={tabClass}>
        Vote Tallies
      </NavLink>

      <NavLink to="/operations/results/local" className={tabClass}>
        Local Results
      </NavLink>

      <NavLink to="/operations/results/official" className={tabClass}>
        Official Results
      </NavLink>
    </div>
  );
}

// ============================================================================
// RESULTS OUTLET CONTEXT
// ============================================================================
//
// Shared result pages expect:
//
// const { orgId } = useOutletContext(...);
//
// Supply that context through a parent route before rendering those pages.
// Backend authorization continues to enforce organization and assignment scope.
//
// ============================================================================

function OperationsResultsContext() {
  const orgId = useAuthStore((state) => state.currentOrgId);

  if (!orgId) {
    return <div role="status">Select an organization to view results.</div>;
  }

  return <Outlet context={{ orgId }} />;
}

// ============================================================================
// OPERATIONS RESULTS ROUTES
// ============================================================================
//
// /operations/results
//   → /operations/results/submission-contest
//
// Election selection remains in the existing application store.
//
// ============================================================================

export default function ElectionResultsRoutes() {
  return (
    <div className="flex min-w-0 flex-col gap-3">
      <ResultsNavigation />

      <Routes>
        <Route element={<OperationsResultsContext />}>
          <Route
            index
            element={
              <Navigate to="/operations/results/submission-contest" replace />
            }
          />

          <Route
            path="submission-contest"
            element={<VoteSubmissionContestPage />}
          />

          <Route
            path="normalized"
            element={
              <Navigate to="/operations/results/submission-contest" replace />
            }
          />

          <Route path="tally" element={<VoteTallyPage />} />

          <Route path="local/*" element={<PartyResultsRoutes />} />

          <Route path="official/*" element={<OfficialResultsRoutes />} />

          <Route
            path="*"
            element={
              <Navigate to="/operations/results/submission-contest" replace />
            }
          />
        </Route>
      </Routes>
    </div>
  );
}

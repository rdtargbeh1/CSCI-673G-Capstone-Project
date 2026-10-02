// src/pages/elections/workspace/tabs/setup/shared/ElectionReferenceRoutes.tsx

import {
  Navigate,
  NavLink,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";

import AllocationReadRoutes from "../../allocation/shared/AllocationReadRoutes";

import ElectionCandidatesTab from "../election/ElectionCandidatesTab";
import ElectionPartiesTab from "../election/ElectionPartiesTab";
import ContestsTab from "../election/ContestsTab";
import ContestOptionsPage from "../election/ContestOptionsPage";

// ============================================================================
// TAB STYLE
// ============================================================================

function tabClass({ isActive }: { isActive: boolean }) {
  return [
    "inline-flex min-h-9 items-center justify-center rounded-lg border",
    "px-3 py-1.5 text-sm font-bold transition",
    isActive
      ? "border-[#00008B] bg-[#00008B] text-[#EFBF04]"
      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
  ].join(" ");
}

// ============================================================================
// ROUTE NOT FOUND
// ============================================================================

function ReferenceRouteNotFound({ pathname }: { pathname: string }) {
  return (
    <div className="rounded-xl border border-red-300 bg-red-50 p-5">
      <div className="text-base font-extrabold text-red-800">
        Reference route not found
      </div>

      <p className="mt-2 text-sm text-red-700">
        The Operations Reference router could not match this URL:
      </p>

      <div className="mt-3 overflow-x-auto rounded-lg border border-red-200 bg-white px-3 py-2">
        <code className="text-sm font-bold text-red-800">{pathname}</code>
      </div>
    </div>
  );
}

// ============================================================================
// ELECTION REFERENCE ROUTES
// ============================================================================
//
// Parent:
//
// /operations/reference/*
//
// Routes:
//
// /operations/reference/allocation/*
//
// /operations/reference/candidates
//
// /operations/reference/parties
//
// /operations/reference/contests
//
// /operations/reference/contests/:contestId/options/*
//
// IMPORTANT:
//
// Contest Options uses descendant routing.
//
// Therefore its parent route MUST end with:
//
// /*
//
// Without that wildcard React Router warns:
//
// "You rendered descendant <Routes> ... but the parent route path
// has no trailing *."
//
// ============================================================================

export default function ElectionReferenceRoutes() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  // ==========================================================================
  // ACTIVE NAVIGATION STATES
  // ==========================================================================

  const centerActive =
    pathname === "/operations/reference/allocation/centers" ||
    pathname.startsWith("/operations/reference/allocation/centers/");

  const placesActive =
    pathname === "/operations/reference/allocation/places" ||
    pathname.startsWith("/operations/reference/allocation/places/");

  const candidatesActive =
    pathname === "/operations/reference/candidates" ||
    pathname.startsWith("/operations/reference/candidates/");

  const partiesActive =
    pathname === "/operations/reference/parties" ||
    pathname.startsWith("/operations/reference/parties/");

  const contestsActive =
    pathname === "/operations/reference/contests" ||
    pathname.startsWith("/operations/reference/contests/");

  // ==========================================================================
  // OPEN CONTEST OPTIONS
  // ==========================================================================
  //
  // Use an absolute URL.
  //
  // Do NOT use:
  //
  // navigate(`contests/${contestId}/options`)
  //
  // because while already at:
  //
  // /operations/reference/contests
  //
  // that would produce:
  //
  // /operations/reference/contests/contests/:contestId/options
  //
  // ==========================================================================

  const openContestOptions = (contestId: string) => {
    if (!contestId) {
      return;
    }

    const encodedContestId = encodeURIComponent(contestId);

    navigate(`/operations/reference/contests/${encodedContestId}/options`);
  };

  // ==========================================================================
  // RENDER
  // ==========================================================================

  return (
    <div className="flex min-w-0 flex-col gap-3">
      {/* ====================================================================
          REFERENCE NAVIGATION
      ==================================================================== */}

      <nav
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
        aria-label="Election reference sections"
      >
        {/* ================================================================
            CENTER ALLOCATIONS
        ================================================================ */}

        <NavLink
          to="/operations/reference/allocation/centers"
          className={({ isActive }) =>
            tabClass({
              isActive: isActive || centerActive,
            })
          }
        >
          Center Allocations
        </NavLink>

        {/* ================================================================
            PLACE ALLOCATIONS
        ================================================================ */}

        <NavLink
          to="/operations/reference/allocation/places"
          className={({ isActive }) =>
            tabClass({
              isActive: isActive || placesActive,
            })
          }
        >
          Place Allocations
        </NavLink>

        {/* ================================================================
            CANDIDATES
        ================================================================ */}

        <NavLink
          to="/operations/reference/candidates"
          className={({ isActive }) =>
            tabClass({
              isActive: isActive || candidatesActive,
            })
          }
        >
          Candidates
        </NavLink>

        {/* ================================================================
            PARTIES
        ================================================================ */}

        <NavLink
          to="/operations/reference/parties"
          className={({ isActive }) =>
            tabClass({
              isActive: isActive || partiesActive,
            })
          }
        >
          Parties
        </NavLink>

        {/* ================================================================
            CONTESTS

            This remains active for:

            /operations/reference/contests

            and:

            /operations/reference/contests/:contestId/options/*
        ================================================================ */}

        <NavLink
          to="/operations/reference/contests"
          className={({ isActive }) =>
            tabClass({
              isActive: isActive || contestsActive,
            })
          }
        >
          Contests
        </NavLink>
      </nav>

      {/* ====================================================================
          REFERENCE ROUTES
      ==================================================================== */}

      <Routes>
        {/* ================================================================
            DEFAULT
        ================================================================ */}

        <Route
          index
          element={
            <Navigate to="/operations/reference/allocation/centers" replace />
          }
        />

        {/* ================================================================
            ALLOCATIONS
        ================================================================ */}

        <Route path="allocation/*" element={<AllocationReadRoutes />} />

        {/* ================================================================
            CANDIDATES
        ================================================================ */}

        <Route path="candidates" element={<ElectionCandidatesTab />} />

        {/* ================================================================
            PARTIES
        ================================================================ */}

        <Route path="parties" element={<ElectionPartiesTab />} />

        {/* ================================================================
            CONTESTS
        ================================================================ */}

        <Route
          path="contests"
          element={<ContestsTab onOpenOptions={openContestOptions} />}
        />

        {/* ================================================================
            CONTEST OPTIONS

            IMPORTANT FIX:

            The trailing /* is REQUIRED because ContestOptionsPage
            participates in descendant routing.

            BEFORE:

            contests/:contestId/options

            AFTER:

            contests/:contestId/options/*

        ================================================================ */}

        <Route
          path="contests/:contestId/options/*"
          element={<ContestOptionsPage />}
        />

        {/* ================================================================
            FALLBACK

            Keep this diagnostic while testing Reference routing.

            Do NOT redirect unmatched URLs to Center Allocations yet,
            because doing so hides routing problems.
        ================================================================ */}

        <Route
          path="*"
          element={<ReferenceRouteNotFound pathname={pathname} />}
        />
      </Routes>
    </div>
  );
}

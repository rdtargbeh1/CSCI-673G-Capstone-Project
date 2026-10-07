// src/app/routes/RootRedirect.tsx

import { Navigate } from "react-router-dom";

import { useAuthStore } from "../../shared/store/authStore";
import { useAccessProfile } from "../../shared/hooks/useAccessProfile";

// ============================================================================
// ROOT REDIRECT
// ============================================================================
//
// Purpose:
//
// Send the authenticated user to the portal resolved by the backend.
//
// Backend authority:
//
// GET /api/access/me
//
// Expected:
//
// ADMINISTRATIVE
//     -> /dashboard
//
// OPERATIONS
//     -> /operations
//
// NONE
//     -> no portal access
//
// IMPORTANT:
//
// RootRedirect does NOT:
//
// - decode JWT roles
// - inspect dashboardMode
// - inspect election assignment
// - inspect geographic scope
// - maintain frontend administrative/operational role lists
//
// Election and assignment authorization occurs when election-scoped resources
// are requested.
//
// ============================================================================

export default function RootRedirect() {
  // ==========================================================================
  // AUTHENTICATION
  // ==========================================================================

  const token = useAuthStore((state) => state.token);

  // ==========================================================================
  // BACKEND ACCESS PROFILE
  // ==========================================================================

  const { access, defaultRoute, isLoading, isError, error } =
    useAccessProfile();

  // ==========================================================================
  // NOT AUTHENTICATED
  // ==========================================================================

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  // ==========================================================================
  // LOADING
  // ==========================================================================

  if (isLoading) {
    return (
      <div
        className="
          flex
          min-h-screen
          items-center
          justify-center
          bg-slate-50
          px-4
        "
      >
        <div
          className="
            text-sm
            font-semibold
            text-slate-500
          "
        >
          Loading workspace...
        </div>
      </div>
    );
  }

  // ==========================================================================
  // ACCESS PROFILE ERROR
  // ==========================================================================

  if (isError) {
    return (
      <div
        className="
          flex
          min-h-screen
          items-center
          justify-center
          bg-slate-50
          px-4
        "
      >
        <div
          className="
            w-full
            max-w-lg
            rounded-xl
            border
            border-red-200
            bg-white
            p-6
            shadow-sm
          "
        >
          <h1
            className="
              text-lg
              font-bold
              text-slate-900
            "
          >
            Unable to load workspace
          </h1>

          <p
            className="
              mt-2
              text-sm
              text-slate-600
            "
          >
            {error?.message ?? "Your access profile could not be loaded."}
          </p>
        </div>
      </div>
    );
  }

  // ==========================================================================
  // NO PORTAL ACCESS
  // ==========================================================================

  if (!access || access.portal === "NONE" || !defaultRoute) {
    return (
      <div
        className="
          flex
          min-h-screen
          items-center
          justify-center
          bg-slate-50
          px-4
        "
      >
        <div
          className="
            w-full
            max-w-lg
            rounded-xl
            border
            border-slate-200
            bg-white
            p-6
            text-center
            shadow-sm
          "
        >
          <h1
            className="
              text-lg
              font-bold
              text-slate-900
            "
          >
            No workspace access
          </h1>

          <p
            className="
              mt-2
              text-sm
              text-slate-600
            "
          >
            Your account is authenticated, but no application workspace is
            currently assigned.
          </p>
        </div>
      </div>
    );
  }

  // ==========================================================================
  // BACKEND-RESOLVED PORTAL
  // ==========================================================================

  return <Navigate to={defaultRoute} replace />;
}

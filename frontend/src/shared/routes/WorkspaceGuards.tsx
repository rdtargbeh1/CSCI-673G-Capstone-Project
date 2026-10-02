// src/shared/routes/WorkspaceGuards.tsx

import type { ReactNode } from "react";

import { Navigate } from "react-router-dom";

import { useAuthStore } from "../store/authStore";
import { useAccessProfile } from "../hooks/useAccessProfile";

// ============================================================================
// TYPES
// ============================================================================

type GuardProps = {
  children: ReactNode;
};

// ============================================================================
// LOADING
// ============================================================================

function LoadingAccess() {
  return (
    <div className="flex min-h-[240px] items-center justify-center">
      <div className="text-sm font-semibold text-slate-500">
        Loading access...
      </div>
    </div>
  );
}

// ============================================================================
// ACCESS ERROR
// ============================================================================

function WorkspaceAccessError({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-5">
      <div className="text-lg font-bold text-red-800">
        Workspace unavailable
      </div>

      <div className="mt-2 text-sm text-red-700">{message}</div>
    </div>
  );
}

// ============================================================================
// ADMINISTRATIVE WORKSPACE GUARD
// ============================================================================
//
// Administrative portal:
//
// SYSTEM_ADMIN
// NEC_ADMIN
// TENANT_ADMIN
// ADMIN
//
// IMPORTANT:
//
// We do not reproduce those role lists here.
//
// GET /api/access/me already resolved:
//
// administrativeRole
// operationalRole
// portal
// defaultRoute
//
// ============================================================================

export function AdministrativeWorkspaceGuard({ children }: GuardProps) {
  const token = useAuthStore((state) => state.token);

  const { access, isAdministrative, isOperational, isLoading, isError, error } =
    useAccessProfile();

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (isLoading) {
    return <LoadingAccess />;
  }

  if (isError) {
    return (
      <WorkspaceAccessError
        message={
          error?.message ?? "Unable to resolve your current access profile."
        }
      />
    );
  }

  // Operational-only user.
  if (isOperational && !isAdministrative) {
    return <Navigate to="/operations" replace />;
  }

  if (!isAdministrative) {
    return (
      <WorkspaceAccessError message="Your account does not have access to this administrative workspace." />
    );
  }

  if (!access || access.portal === "NONE") {
    return (
      <WorkspaceAccessError message="Your account does not currently have an assigned application workspace." />
    );
  }

  return <>{children}</>;
}

// ============================================================================
// DASHBOARD WORKSPACE GUARD
// ============================================================================
//
// /dashboard and its administrative dashboard children are protected by the
// same administrative portal decision.
//
// ============================================================================

export function DashboardWorkspaceGuard({ children }: GuardProps) {
  return (
    <AdministrativeWorkspaceGuard>{children}</AdministrativeWorkspaceGuard>
  );
}

// ============================================================================
// OPERATIONS WORKSPACE GUARD
// ============================================================================
//
// Operations can be used by:
//
// - administrative users
// - operational users
//
// This is intentional.
//
// Administrative users retain broad access and may enter Operations from the
// administrative sidebar.
//
// Operational-only users use Operations as their primary portal.
//
// Election/resource/action authorization is still enforced by the backend.
//
// ============================================================================

export function OperationsWorkspaceGuard({ children }: GuardProps) {
  const token = useAuthStore((state) => state.token);

  const {
    access,
    isAdministrative,
    isOperational,
    defaultRoute,
    isLoading,
    isError,
    error,
  } = useAccessProfile();

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (isLoading) {
    return <LoadingAccess />;
  }

  if (isError) {
    return (
      <WorkspaceAccessError
        message={
          error?.message ?? "Unable to resolve your current access profile."
        }
      />
    );
  }

  if (isAdministrative || isOperational) {
    return <>{children}</>;
  }

  if (defaultRoute && defaultRoute !== "/operations") {
    return <Navigate to={defaultRoute} replace />;
  }

  if (!access || access.portal === "NONE") {
    return (
      <WorkspaceAccessError message="Your account does not currently have access to Election Operations." />
    );
  }

  return (
    <WorkspaceAccessError message="Your account does not currently have access to Election Operations." />
  );
}

// src/shared/routes/RequireGuards.tsx
// ------------------------------------------------------
// Route guards for the Election Vote Tracker frontend.
//
// - RequireAuth: user must be logged in (token present)
// - RequireOrg:  user must have an organization in context
//
// Multi-tenant nuance:
// - Most users require orgId (tenant context)
// - SYSTEM_ADMIN is a platform user and may NOT have orgId
//   -> RequireOrg must allow SYSTEM_ADMIN to pass without orgId.
// ------------------------------------------------------

import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "../../shared/store/authStore";
import { apiClient } from "../lib/apiClient";

type GuardProps = { children: React.ReactNode };

type OrgDto = {
  orgId: string;
  orgName: string;
  organizationType: string; // "NEC" | "POLITICAL_PARTY" | ...
  active: boolean;
};

export async function fetchOrgById(orgId: string): Promise<OrgDto> {
  const { data } = await apiClient.get(`/orgs/${orgId}`);
  return data as OrgDto;
}

// RequireGuards.tsx (TOP or BOTTOM of file — not inside a component)

export function decodeIsSystemAdmin(token: string | null): boolean {
  try {
    if (!token) return false;

    const parts = token.split(".");
    if (parts.length < 2) return false;

    const b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const json = decodeURIComponent(
      atob(b64)
        .split("")
        .map((c) => "%" + c.charCodeAt(0).toString(16).padStart(2, "0"))
        .join("")
    );

    const payload = JSON.parse(json) as any;

    const role =
      payload.globalRoleName ??
      payload.roleName ??
      payload.role ??
      payload.authority ??
      payload.authorities?.[0];

    const isSysAdminFlag =
      payload.isSystemAdmin ?? payload.is_system_admin ?? payload.sysAdmin;

    return (
      isSysAdminFlag === true ||
      role === "SYSTEM_ADMIN" ||
      payload?.roles?.includes?.("SYSTEM_ADMIN")
    );
  } catch {
    return false;
  }
}

export const RequireAuth: React.FC<GuardProps> = ({ children }) => {
  const token = useAuthStore((s) => s.token);
  const location = useLocation();

  if (!token)
    return <Navigate to="/login" state={{ from: location }} replace />;
  return <>{children}</>;
};

export const RequireOrg: React.FC<GuardProps> = ({ children }) => {
  const currentOrgId = useAuthStore((s) => s.currentOrgId);
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);

  const isSystemAdmin =
    !!user?.isSystemAdmin ||
    user?.globalRoleName === "SYSTEM_ADMIN" ||
    decodeIsSystemAdmin(token);

  if (isSystemAdmin) return <>{children}</>;

  if (!currentOrgId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <div className="bg-white p-6 rounded-xl shadow border border-slate-200 max-w-md">
          <h1 className="text-lg font-semibold text-slate-900 mb-2">
            Organization Not Configured
          </h1>
          <p className="text-sm text-slate-700">
            Your account is not associated with any active organization. Please
            contact your system administrator.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

/**
 * ✅ NEW: RequireSystemAdmin
 * - Use for platform-only pages like Organization Management.
 * - SYSTEM_ADMIN can pass even without orgId.
 * - Everyone else is redirected away.
 */
export const RequireSystemAdmin: React.FC<GuardProps> = ({ children }) => {
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const location = useLocation();

  // must be logged in
  if (!token)
    return <Navigate to="/login" state={{ from: location }} replace />;

  const isSystemAdmin =
    !!user?.isSystemAdmin ||
    user?.globalRoleName === "SYSTEM_ADMIN" ||
    decodeIsSystemAdmin(token);

  if (!isSystemAdmin) {
    // send non-system users back to dashboard (adjust if your home route differs)
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

/**
 * ✅ RequireElectionAdmin
 * - Allows SYSTEM_ADMIN OR NEC_ADMIN to access election admin routes.
 * - SYSTEM_ADMIN can pass even without orgId.
 * - NEC_ADMIN must be authenticated (tenant membership is assumed validated by API usage).
 */
export const RequireElectionAdmin: React.FC<GuardProps> = ({ children }) => {
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const currentOrgId = useAuthStore((s) => s.currentOrgId);
  const location = useLocation();

  // must be logged in
  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const globalRole = String(user?.globalRoleName ?? "").toUpperCase();
  const tenantRole = String((user as any)?.roleName ?? "").toUpperCase();

  // ✅ SYSTEM_ADMIN always passes (no org required)
  const isSystemAdmin =
    decodeIsSystemAdmin(token) ||
    !!user?.isSystemAdmin ||
    globalRole === "SYSTEM_ADMIN";

  // ✅ NEC_ADMIN role (tenant-scoped)
  const isNecAdminRole = tenantRole === "NEC_ADMIN";

  /**
   * IMPORTANT: hooks must always run.
   * So we call useQuery unconditionally, but enable it ONLY when we need it.
   */
  const orgQuery = useQuery({
    queryKey: ["org-by-id", currentOrgId],
    queryFn: () => fetchOrgById(currentOrgId as string),
    enabled: !isSystemAdmin && isNecAdminRole && !!currentOrgId,
    staleTime: 1000 * 60 * 10,
    retry: 1,
  });

  // ✅ if system admin, allow immediately
  if (isSystemAdmin) return <>{children}</>;

  // not system admin => must have org context
  if (!currentOrgId) return <Navigate to="/dashboard" replace />;

  // must be NEC_ADMIN role
  if (!isNecAdminRole) return <Navigate to="/dashboard" replace />;

  // wait for org type check
  if (orgQuery.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <div className="bg-white p-6 rounded-xl shadow border border-slate-200 max-w-md">
          <h1 className="text-lg font-semibold text-slate-900 mb-2">
            Checking election access…
          </h1>
          <p className="text-sm text-slate-700">
            Verifying NEC organization context.
          </p>
        </div>
      </div>
    );
  }

  if (orgQuery.isError || !orgQuery.data) {
    return <Navigate to="/dashboard" replace />;
  }

  const orgType = String(orgQuery.data.organizationType ?? "").toUpperCase();
  const isNecOrg = orgType === "NEC";

  if (!isNecOrg) return <Navigate to="/dashboard" replace />;

  return <>{children}</>;
};
/**
 * ✅ NEW: RequireEnabledMembership
 * - Tenant users must have enabled membership in the current org.
 * - SYSTEM_ADMIN bypasses this.
 *
 * Assumes authStore.user includes:
 *   - membershipEnabled (boolean) OR
 *   - membershipStatus ("ENABLED"/"DISABLED")
 *
 * If you don’t have this yet, add it to your /me payload.
 */
export const RequireEnabledMembership: React.FC<GuardProps> = ({
  children,
}) => {
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const currentOrgId = useAuthStore((s) => s.currentOrgId);

  const isSystemAdmin =
    !!user?.isSystemAdmin ||
    user?.globalRoleName === "SYSTEM_ADMIN" ||
    decodeIsSystemAdmin(token);

  if (isSystemAdmin) return <>{children}</>;

  // must have org context (RequireOrg should already guarantee this)
  if (!currentOrgId) return null;

  const membershipEnabled =
    (user as any)?.membershipEnabled ??
    ((user as any)?.membershipStatus
      ? String((user as any).membershipStatus).toUpperCase() === "ENABLED"
      : undefined);

  // If you haven't loaded membership status yet, choose a safe default:
  // show a loading state instead of allowing access.
  if (membershipEnabled === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <div className="bg-white p-6 rounded-xl shadow border border-slate-200 max-w-md">
          <h1 className="text-lg font-semibold text-slate-900 mb-2">
            Checking access…
          </h1>
          <p className="text-sm text-slate-700">
            Please wait while we verify your organization permissions.
          </p>
        </div>
      </div>
    );
  }

  if (!membershipEnabled) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <div className="bg-white p-6 rounded-xl shadow border border-slate-200 max-w-md">
          <h1 className="text-lg font-semibold text-slate-900 mb-2">
            Access Disabled
          </h1>
          <p className="text-sm text-slate-700">
            Your membership in this organization is disabled. Please contact
            your administrator.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

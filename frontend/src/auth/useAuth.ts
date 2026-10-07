// src/auth/useAuth.ts

import { useEffect, useMemo, useState } from "react";

import { http, getOrgId } from "../api/http";

import type { DashboardMode, UserDto } from "./types";

import { computeCapabilities, type Capabilities } from "../utils/permissions";

// ============================================================================
// TYPES
// ============================================================================

// DB-backed org dto from GET /api/orgs/{id}
type OrgDto = {
  orgId: string;
  orgName: string;
  organizationType: string;
  active: boolean;
};

type TenantInfo = {
  orgId: string;
  orgName: string;
  tenantType: "NEC" | "ORG";
};

type AuthState = {
  user: UserDto | null;
  tenant: TenantInfo | null;
  dashboardMode: DashboardMode;
  capabilities: Capabilities;
  loading: boolean;
  error: string | null;
};

// ============================================================================
// EMPTY CAPABILITIES
// ============================================================================

const emptyCaps: Capabilities = {
  canManageElections: false,
  canManageSetup: false,
  canManageAllocation: false,
  canSubmitVotes: false,
  canVerifySubmissions: false,
  canPublishOfficialResults: false,
  canViewOfficialResults: false,
  canCreateDiscrepancy: false,
  canViewAuditLedger: false,
  canSwitchTenant: false,
};

// ============================================================================
// HELPERS
// ============================================================================

function upper(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/^ROLE_/, "");
}

/**
 * Determines whether the /users/me response represents
 * a platform SYSTEM_ADMIN.
 *
 * SYSTEM_ADMIN may legitimately have no organization context.
 */
function isSystemAdminUser(user: UserDto | null): boolean {
  if (!user) {
    return false;
  }

  // --------------------------------------------------------------------------
  // Backend boolean flag
  // --------------------------------------------------------------------------

  if ((user as any).isSystemAdmin === true) {
    return true;
  }

  // --------------------------------------------------------------------------
  // Canonical /users/me role field
  // --------------------------------------------------------------------------

  if (upper((user as any).roleName) === "SYSTEM_ADMIN") {
    return true;
  }

  // --------------------------------------------------------------------------
  // Older frontend compatibility
  // --------------------------------------------------------------------------

  if (upper((user as any).systemRole) === "SYSTEM_ADMIN") {
    return true;
  }

  // --------------------------------------------------------------------------
  // roles[] compatibility
  // --------------------------------------------------------------------------

  if (
    Array.isArray((user as any).roles) &&
    (user as any).roles.some((role: unknown) => upper(role) === "SYSTEM_ADMIN")
  ) {
    return true;
  }

  return false;
}

// ============================================================================
// API
// ============================================================================

async function fetchOrgById(orgId: string): Promise<OrgDto> {
  return http.get<OrgDto>(`/api/orgs/${orgId}`);
}

// ============================================================================
// AUTH HOOK
// ============================================================================

export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>({
    user: null,
    tenant: null,
    dashboardMode: "TENANT",
    capabilities: emptyCaps,
    loading: true,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;

    async function loadAuthContext() {
      try {
        // ====================================================================
        // 1. LOAD CURRENT USER
        // ====================================================================

        const user = await http.get<UserDto>("/api/users/me");

        if (cancelled) {
          return;
        }

        const systemAdmin = isSystemAdminUser(user);

        // ====================================================================
        // 2. RESOLVE ORGANIZATION CONTEXT
        // ====================================================================

        const orgId = getOrgId();

        // ====================================================================
        // 3. PLATFORM SYSTEM ADMIN
        //
        // SYSTEM_ADMIN is allowed to have no org context.
        // ====================================================================

        if (!orgId && systemAdmin) {
          const capabilities = computeCapabilities(user as any);

          if (cancelled) {
            return;
          }

          setState({
            user,
            tenant: null,
            dashboardMode: "SYSTEM",
            capabilities,
            loading: false,
            error: null,
          });

          return;
        }

        // ====================================================================
        // 4. NON-SYSTEM USER REQUIRES ORG CONTEXT
        // ====================================================================

        if (!orgId) {
          if (cancelled) {
            return;
          }

          setState({
            user,
            tenant: null,
            dashboardMode: "TENANT",
            capabilities: emptyCaps,
            loading: false,
            error:
              "Missing org context. Please select an organization (org_id).",
          });

          return;
        }

        // ====================================================================
        // 5. LOAD ORGANIZATION
        // ====================================================================

        const org = await fetchOrgById(orgId);

        if (cancelled) {
          return;
        }

        const tenantType: "NEC" | "ORG" =
          upper(org.organizationType) === "NEC" ? "NEC" : "ORG";

        const tenant: TenantInfo = {
          orgId: org.orgId,
          orgName: org.orgName,
          tenantType,
        };

        // ====================================================================
        // 6. RESOLVE DOMAIN / DASHBOARD MODE
        // ====================================================================

        let dashboardMode: DashboardMode = "TENANT";

        if (systemAdmin) {
          dashboardMode = "SYSTEM";
        } else if (tenantType === "NEC") {
          dashboardMode = "NEC";
        } else {
          dashboardMode = "TENANT";
        }

        // ====================================================================
        // 7. COMPUTE EXISTING FRONTEND CAPABILITIES
        //
        // Your existing computeCapabilities() accepts ONE argument.
        // ====================================================================

        const capabilities = computeCapabilities(user as any);

        if (cancelled) {
          return;
        }

        // ====================================================================
        // 8. SAVE AUTH CONTEXT
        // ====================================================================

        setState({
          user,
          tenant,
          dashboardMode,
          capabilities,
          loading: false,
          error: null,
        });
      } catch (error: any) {
        if (cancelled) {
          return;
        }

        setState((current) => ({
          ...current,
          loading: false,
          error: error?.message ?? "Failed to load auth context",
        }));
      }
    }

    loadAuthContext();

    return () => {
      cancelled = true;
    };
  }, []);

  return useMemo(() => state, [state]);
}

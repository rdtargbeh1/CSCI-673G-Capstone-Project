// src/auth/useAuth.ts
import { useEffect, useMemo, useState } from "react";
import { http, getOrgId } from "../api/http";
import type { DashboardMode, UserDto } from "./types";
import {
  computeCapabilities,
  // computeDashboardMode,
  type Capabilities,
} from "../utils/permissions";

// DB-backed org dto from GET /api/orgs/{id}
type OrgDto = {
  orgId: string;
  orgName: string;
  organizationType: string; // "NEC" | "POLITICAL_PARTY" | ...
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

function upper(x: unknown) {
  return String(x ?? "").toUpperCase();
}

function isSystemAdminUser(u: UserDto | null): boolean {
  if (!u) return false;

  // prefer explicit systemRole
  if (u.systemRole === "SYSTEM_ADMIN") return true;

  // roles array fallback
  if (u.roles?.some((r) => upper(r) === "SYSTEM_ADMIN")) return true;

  return false;
}

async function fetchOrgById(orgId: string): Promise<OrgDto> {
  const dto = await http.get<OrgDto>(`/api/orgs/${orgId}`);
  return dto;
}

export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>({
    user: null,
    tenant: null,
    dashboardMode: "TENANT", // ✅ must be a valid DashboardMode
    capabilities: emptyCaps,
    loading: true,
    error: null,
  });

  useEffect(() => {
    (async () => {
      try {
        // 1) Always load /me (DB)
        const user = await http.get<UserDto>("/api/users/me");

        const sysAdmin = isSystemAdminUser(user);

        // 2) Resolve org context ONLY if present
        const orgId = getOrgId(); // from header/local storage helper

        // ✅ SYSTEM_ADMIN can exist without org context
        if (!orgId) {
          if (sysAdmin) {
            const tenant: TenantInfo | null = null;
            const dashboardMode: DashboardMode = "SYSTEM";

            const capabilities = computeCapabilities(user as any, "ORG"); // safe default
            setState({
              user,
              tenant,
              dashboardMode,
              capabilities,
              loading: false,
              error: null,
            });
            return;
          }

          // Non-system admin must have org context
          setState((s) => ({
            ...s,
            user,
            loading: false,
            error:
              "Missing org context. Please select an organization (org_id).",
          }));
          return;
        }

        // 3) Fetch org details from DB (authoritative)
        const org = await fetchOrgById(orgId);

        const tenantType: "NEC" | "ORG" =
          upper(org.organizationType) === "NEC" ? "NEC" : "ORG";

        const tenant: TenantInfo = {
          orgId: org.orgId,
          orgName: org.orgName,
          tenantType,
        };

        // 4) Compute dashboard mode
        //    - SYSTEM if system admin
        //    - NEC if orgType == NEC
        //    - TENANT otherwise
        let dashboardMode: DashboardMode = "TENANT";
        if (sysAdmin) dashboardMode = "SYSTEM";
        else if (tenantType === "NEC") dashboardMode = "NEC";
        else dashboardMode = "TENANT";

        // 5) Compute capabilities (use your existing permission helpers)
        // computeDashboardMode expects (dto, tenantType) in your design,
        // but we already computed dashboardMode above. We keep computeDashboardMode
        // available if you want it later.
        const capabilities = computeCapabilities(user as any, tenantType);

        setState({
          user,
          tenant,
          dashboardMode,
          capabilities,
          loading: false,
          error: null,
        });
      } catch (e: any) {
        setState((s) => ({
          ...s,
          loading: false,
          error: e?.message ?? "Failed to load auth context",
        }));
      }
    })();
  }, []);

  return useMemo(() => state, [state]);
}

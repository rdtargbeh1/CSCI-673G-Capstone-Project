// src/utils/permissions.ts
import type { DashboardMode, UserDto } from "../auth/types";

export type Capabilities = {
  canManageElections: boolean;
  canManageSetup: boolean;
  canManageAllocation: boolean;

  canSubmitVotes: boolean;
  canVerifySubmissions: boolean;

  canPublishOfficialResults: boolean;
  canViewOfficialResults: boolean;

  canCreateDiscrepancy: boolean;
  canViewAuditLedger: boolean;

  canSwitchTenant: boolean;
};

export function computeDashboardMode(
  user: UserDto,
  tenantType: "NEC" | "ORG"
): DashboardMode {
  const roles = new Set((user.roles ?? []).map((r) => r.toUpperCase()));

  if (roles.has("SYSTEM_ADMIN")) return "SYSTEM";
  if (tenantType === "NEC") return "NEC";
  return "ORG";
}

export function computeCapabilities(
  user: UserDto,
  tenantType: "NEC" | "ORG"
): Capabilities {
  const roles = new Set((user.roles ?? []).map((r) => r.toUpperCase()));
  const tenantRole = (user.tenantRole ?? "").toUpperCase();

  const isSystem = roles.has("SYSTEM_ADMIN");
  const isNec = tenantType === "NEC";
  const isNecAdmin = roles.has("NEC_ADMIN") || tenantRole === "NEC_ADMIN";
  const isPartyAdmin =
    roles.has("PARTY_ADMIN") ||
    tenantRole === "PARTY_ADMIN" ||
    tenantRole === "ADMIN";

  return {
    canManageElections: isSystem || (isNec && isNecAdmin),
    canManageSetup: isSystem || (isNec && isNecAdmin),
    canManageAllocation: isSystem || (isNec && isNecAdmin),

    canSubmitVotes:
      !isNec &&
      [
        "DATA_ENTRY",
        "SUPERVISOR",
        "COORDINATOR",
        "PARTY_ADMIN",
        "ADMIN",
      ].includes(tenantRole),
    canVerifySubmissions:
      !isNec &&
      ["SUPERVISOR", "COORDINATOR", "PARTY_ADMIN", "ADMIN"].includes(
        tenantRole
      ),

    canPublishOfficialResults: isSystem || (isNec && isNecAdmin),
    canViewOfficialResults: true, // backend will enforce public=true for non-NEC
    canCreateDiscrepancy:
      isSystem ||
      (isNec && isNecAdmin) ||
      ["AUDITOR", "SUPERVISOR"].includes(tenantRole),
    canViewAuditLedger: isSystem || (isNec && isNecAdmin),

    canSwitchTenant: isSystem,
  };
}

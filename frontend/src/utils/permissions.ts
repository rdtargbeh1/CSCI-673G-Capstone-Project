// src/utils/permissions.ts
import type { DashboardMode, UserDto } from "../auth/types";
import { decodeIsSystemAdmin } from "../shared/routes/RequireGuards";

export type OrganizationType =
  | "POLITICAL_PARTY"
  | "COALITION"
  | "NEC"
  | "NGO"
  | "MEDIA"
  | "OTHER";

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

const norm = (v: unknown) =>
  String(v ?? "")
    .trim()
    .toUpperCase();

function isMembershipEnabled(
  user: UserDto | null | undefined
): boolean | undefined {
  const u: any = user;
  return (
    u?.membershipEnabled ??
    (u?.membershipStatus ? norm(u.membershipStatus) === "ENABLED" : undefined)
  );
}

function tenantRoleOf(user: UserDto | null | undefined): string {
  const u: any = user;
  return norm(u?.tenantRole) || norm(u?.roleName) || ""; // roleName often maps to OrgMembership.roleName
}

function isSystemAdmin(
  user: UserDto | null | undefined,
  token: string | null
): boolean {
  const u: any = user;
  return (
    !!u?.isSystemAdmin ||
    norm(u?.globalRoleName) === "SYSTEM_ADMIN" ||
    decodeIsSystemAdmin(token)
  );
}

export function computeDashboardMode(
  user: UserDto,
  orgType: OrganizationType
): DashboardMode {
  const isSys =
    !!(user as any)?.isSystemAdmin ||
    norm((user as any)?.globalRoleName) === "SYSTEM_ADMIN";
  if (isSys) return "SYSTEM";
  if (orgType === "NEC") return "NEC";
  return "TENANT";
}

/**
 * ✅ Aligns with backend:
 * - SYSTEM_ADMIN bypasses tenant/membership requirements
 * - NEC is the "election owner" tenant type
 * - All other OrganizationType values are regular tenants
 * - Tenant actions require membershipEnabled === true
 */
export function computeCapabilities(args: {
  user: UserDto | null | undefined;
  token: string | null;
  orgType: OrganizationType | null | undefined; // from current org context
}): Capabilities {
  const { user, token, orgType } = args;

  const isSys = isSystemAdmin(user, token);
  const isNecOrg = orgType === "NEC";

  const membershipEnabled = isMembershipEnabled(user);
  const tenantOk = isSys || membershipEnabled === true; // backend will enforce this too

  const tenantRole = tenantRoleOf(user);

  // NEC admin is tenant-scoped role in NEC org
  const isNecAdmin = tenantRole === "NEC_ADMIN";

  // Regular tenant admin roles (your model)
  const isTenantAdmin = ["ADMIN", "PARTY_ADMIN"].includes(tenantRole);

  const isSubmitter =
    isTenantAdmin ||
    ["DATA_ENTRY", "SUPERVISOR", "COORDINATOR"].includes(tenantRole);

  const isVerifier =
    isTenantAdmin || ["SUPERVISOR", "COORDINATOR"].includes(tenantRole);

  // Regular tenant operations are for NON-NEC orgs and require enabled membership
  const canRegularTenantOps = !isSys && !isNecOrg && tenantOk;

  return {
    // Platform or NEC admin (in NEC org)
    canManageElections: isSys || (isNecOrg && tenantOk && isNecAdmin),
    canManageSetup: isSys || (isNecOrg && tenantOk && isNecAdmin),
    canManageAllocation: isSys || (isNecOrg && tenantOk && isNecAdmin),

    // Vote submission is by regular tenants (parties, media, etc.)
    canSubmitVotes: canRegularTenantOps && isSubmitter,
    canVerifySubmissions: canRegularTenantOps && isVerifier,

    // Publishing official results is NEC/System only
    canPublishOfficialResults: isSys || (isNecOrg && tenantOk && isNecAdmin),
    canViewOfficialResults: true,

    // Discrepancy can be created by platform, NEC admins, or certain tenant roles (enabled)
    canCreateDiscrepancy:
      isSys ||
      (isNecOrg && tenantOk && isNecAdmin) ||
      (tenantOk && ["AUDITOR", "SUPERVISOR"].includes(tenantRole)),

    // Audit ledger is NEC/System only (per your earlier design)
    canViewAuditLedger: isSys || (isNecOrg && tenantOk && isNecAdmin),

    canSwitchTenant: isSys,
  };
}

// // src/utils/permissions.ts
// import type { DashboardMode, UserDto } from "../auth/types";

// export type Capabilities = {
//   canManageElections: boolean;
//   canManageSetup: boolean;
//   canManageAllocation: boolean;

//   canSubmitVotes: boolean;
//   canVerifySubmissions: boolean;

//   canPublishOfficialResults: boolean;
//   canViewOfficialResults: boolean;

//   canCreateDiscrepancy: boolean;
//   canViewAuditLedger: boolean;

//   canSwitchTenant: boolean;
// };

// export function computeDashboardMode(
//   user: UserDto,
//   tenantType: "NEC" | "ORG"
// ): DashboardMode {
//   const roles = new Set((user.roles ?? []).map((r) => r.toUpperCase()));

//   if (roles.has("SYSTEM_ADMIN")) return "SYSTEM";
//   if (tenantType === "NEC") return "NEC";
//   return "TENANT";
// }

// export function computeCapabilities(
//   user: UserDto,
//   tenantType: "NEC" | "ORG"
// ): Capabilities {
//   const roles = new Set((user.roles ?? []).map((r) => r.toUpperCase()));
//   const tenantRole = (user.tenantRole ?? "").toUpperCase();

//   const isSystem = roles.has("SYSTEM_ADMIN");
//   const isNec = tenantType === "NEC";
//   const isNecAdmin = roles.has("NEC_ADMIN") || tenantRole === "NEC_ADMIN";
//   const isPartyAdmin =
//     roles.has("PARTY_ADMIN") ||
//     tenantRole === "PARTY_ADMIN" ||
//     tenantRole === "ADMIN";

//   return {
//     canManageElections: isSystem || (isNec && isNecAdmin),
//     canManageSetup: isSystem || (isNec && isNecAdmin),
//     canManageAllocation: isSystem || (isNec && isNecAdmin),

//     canSubmitVotes:
//       !isNec &&
//       [
//         "DATA_ENTRY",
//         "AGENT",
//         "SUPERVISOR",
//         "COORDINATOR",
//         "PARTY_ADMIN",
//         "ADMIN",
//       ].includes(tenantRole),
//     canVerifySubmissions:
//       !isNec &&
//       ["SUPERVISOR", "COORDINATOR", "PARTY_ADMIN", "ADMIN"].includes(
//         tenantRole
//       ),

//     canPublishOfficialResults: isSystem || (isNec && isNecAdmin),
//     canViewOfficialResults: true, // backend will enforce public=true for non-NEC
//     canCreateDiscrepancy:
//       isSystem ||
//       (isNec && isNecAdmin) ||
//       ["AUDITOR", "SUPERVISOR"].includes(tenantRole),
//     canViewAuditLedger: isSystem || (isNec && isNecAdmin),

//     canSwitchTenant: isSystem,
//   };
// }

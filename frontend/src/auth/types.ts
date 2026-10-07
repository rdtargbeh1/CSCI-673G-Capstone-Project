// src/auth/types.ts

export type DashboardMode = "SYSTEM" | "NEC" | "TENANT";

export type RoleName =
  | "SYSTEM_ADMIN"
  | "NEC_ADMIN"
  | "TENANT_ADMIN"
  | "ADMIN"
  | "TALLY_OFFICER"
  | "AUDITOR"
  | "COORDINATOR"
  | "OBSERVER"
  | "SUPERVISOR"
  | "FIELD_OFFICER"
  | "PRESIDING_OFFICER"
  | "DATA_ENTRY";

export type SystemRole =
  | "SYSTEM_ADMIN"
  | "NEC_ADMIN"
  | "TENANT_ADMIN"
  | "ADMIN";

export type TenantRole =
  | "NEC_ADMIN"
  | "TENANT_ADMIN"
  | "ADMIN"
  | "TALLY_OFFICER"
  | "AUDITOR"
  | "COORDINATOR"
  | "OBSERVER"
  | "SUPERVISOR"
  | "FIELD_OFFICER"
  | "PRESIDING_OFFICER"
  | "DATA_ENTRY";

export interface TenantDto {
  orgId: string;
  orgName: string;
  tenantType?: "NEC" | "ORG" | null;
}

export interface UserDto {
  userId: string;

  firstName?: string | null;
  lastName?: string | null;

  username?: string | null;
  userName?: string | null;

  email?: string | null;
  fullName?: string | null;

  /**
   * Canonical role returned by /api/users/me.
   */
  roleName?: RoleName | string | null;

  /**
   * Explicit backend platform flag.
   */
  isSystemAdmin?: boolean;

  /**
   * Compatibility with older frontend auth structures.
   */
  systemRole?: SystemRole | null;

  tenantRole?: TenantRole | null;

  roles?: string[] | null;

  defaultOrgId?: string | null;
}

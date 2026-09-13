// src/auth/types.ts

export type DashboardMode = "SYSTEM" | "NEC" | "TENANT";

// Tenant-level roles (within an organization context)
export type TenantRole =
  | "OBSERVER"
  | "SUPERVISOR"
  | "COORDINATOR"
  | "DATA_ENTRY"
  | "AUDITOR";

// System-level roles (global)
export type SystemRole = "SYSTEM_ADMIN" | "NEC_ADMIN" | "PARTY_ADMIN";

export interface TenantDto {
  orgId: string;
  orgName: string;
  // Optional: if you want to expose tenant type from backend later
  tenantType?: "NEC" | "ORG" | null;
}

export interface UserDto {
  userId: string;
  username?: string | null;
  email?: string | null;
  fullName?: string | null;

  /**
   * Preferred explicit system role.
   * If your backend uses roles[] only, keep this optional and derive it in useAuth().
   */
  systemRole?: SystemRole | null;

  /**
   * Optional raw roles array (some backends return this).
   * Example: ["SYSTEM_ADMIN"] or ["NEC_ADMIN","AUDITOR"]
   */
  roles?: string[] | null;

  /**
   * Tenant role for the CURRENT org context (depends on X-Org-Id).
   * Example: "SUPERVISOR"
   */
  tenantRole?: TenantRole | null;
}

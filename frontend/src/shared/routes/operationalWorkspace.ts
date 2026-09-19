import type {
  AuthUser,
  DashboardMode,
  OrgMembership,
} from "../store/authStore";

const OPERATIONAL_ROLES = new Set<string>([
  "TALLY_OFFICER",
  "AUDITOR",
  "COORDINATOR",
  "OBSERVER",
  "SUPERVISOR",
  "FIELD_OFFICER",
  "PRESIDING_OFFICER",
  "DATA_ENTRY",
]);

function normalizeRoleName(value: unknown): string {
  return String(value ?? "").trim().toUpperCase();
}

export function isOperationalRole(value: unknown): boolean {
  return OPERATIONAL_ROLES.has(normalizeRoleName(value));
}

function findCurrentMembershipRole(args: {
  user: AuthUser;
  currentOrgId: string | null;
}): string {
  const { user, currentOrgId } = args;

  const enabledMemberships = (user.orgMemberships ?? []).filter(
    (membership) => membership.isEnabled,
  );

  if (!enabledMemberships.length) {
    return "";
  }

  if (currentOrgId) {
    const currentMembership = enabledMemberships.find(
      (membership) => membership.orgId === currentOrgId,
    );

    if (currentMembership) {
      return normalizeRoleName(currentMembership.roleName);
    }
  }

  return normalizeRoleName(enabledMemberships[0]?.roleName);
}

export function isOperationalWorkspaceUser(args: {
  user: AuthUser | null;
  currentOrgId: string | null;
  dashboardMode: DashboardMode;
}): boolean {
  const { user, currentOrgId, dashboardMode } = args;

  if (!user) {
    return false;
  }

  if (
    user.isSystemAdmin ||
    normalizeRoleName(user.globalRoleName) === "SYSTEM_ADMIN"
  ) {
    return false;
  }

  if (dashboardMode === "SYSTEM") {
    return false;
  }

  const globalRole = normalizeRoleName(user.globalRoleName);

  if (isOperationalRole(globalRole)) {
    return true;
  }

  const membershipRole = findCurrentMembershipRole({
    user,
    currentOrgId,
  });

  if (isOperationalRole(membershipRole)) {
    return true;
  }

  return (user.orgMemberships ?? []).some(
    (membership: OrgMembership) =>
      membership.isEnabled && isOperationalRole(membership.roleName),
  );
}

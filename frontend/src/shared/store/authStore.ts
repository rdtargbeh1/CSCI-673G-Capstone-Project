

// src/shared/store/authStore.ts
import { create } from "zustand";

export type RoleName =
  | "SYSTEM_ADMIN"
  | "NEC_ADMIN"
  | "ADMIN"
  | "PARTY_ADMIN"
  | "AGENT"
  | "OBSERVER"
  | "SUPERVISOR"
  | "COORDINATOR"
  | "DATA_ENTRY"
  | "AUDITOR";

export type DashboardMode = "SYSTEM" | "NEC" | "TENANT";

export type OrgMembership = {
  orgId: string;
  orgName: string;
  roleName: RoleName;
  isEnabled: boolean;
};

export type AuthUser = {
  userId: string;
  userName: string;

  firstName?: string;
  lastName?: string;
  email?: string;
  position?: string;

  // platform
  isSystemAdmin: boolean;
  globalRoleName: RoleName | null;

  // tenant
  orgMemberships: OrgMembership[];
};

export type TenantMeta = {
  orgId: string;
  orgName: string;
  orgType?: string | null;
} | null;

type AuthState = {
  user: AuthUser | null;
  token: string | null;

  currentOrgId: string | null;
  currentElectionId: string | null;

  dashboardMode: DashboardMode;

  // ✅ RESTORED (AppLayout uses these)
  tenantMeta: TenantMeta;
  setTenantMeta: (t: TenantMeta) => void;

  // actions
  setAuth: (payload: { user: AuthUser; token: string }) => void;
  clearAuth: () => void;

  setCurrentOrg: (orgId: string | null) => void;
  setCurrentElection: (electionId: string | null) => void;
  setDashboardMode: (m: DashboardMode) => void;

  // helpers
  isAuthenticated: () => boolean;
  isSystemAdmin: () => boolean;
  hasOrgContext: () => boolean;
  getEnabledOrgs: () => OrgMembership[];
  getRoleLabel: () => string;
};

const TOKEN_KEY = "evt.token";
const ORG_KEY = "evt.currentOrgId";
const ELECTION_KEY = "evt.currentElectionId";
const MODE_KEY = "evt.dashboardMode";

function persist(key: string, value: string | null) {
  try {
    if (value) sessionStorage.setItem(key, value);
    else sessionStorage.removeItem(key);
  } catch {}
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: sessionStorage.getItem(TOKEN_KEY),
  currentOrgId: sessionStorage.getItem(ORG_KEY),
  currentElectionId: sessionStorage.getItem(ELECTION_KEY),
  dashboardMode:
    (sessionStorage.getItem(MODE_KEY) as DashboardMode) ?? "TENANT",

  // ✅ RESTORED defaults
  tenantMeta: null,
  setTenantMeta: (t) => set(() => ({ tenantMeta: t })),

  setAuth: ({ user, token }) =>
    set(() => {
      persist(TOKEN_KEY, token);

      let nextOrgId = get().currentOrgId;

      // ✅ SYSTEM ADMIN: org optional
      if (user.isSystemAdmin || user.globalRoleName === "SYSTEM_ADMIN") {
        persist(ORG_KEY, nextOrgId);
        persist(MODE_KEY, "SYSTEM");
        return {
          user,
          token,
          currentOrgId: nextOrgId,
          dashboardMode: "SYSTEM",
          // keep tenantMeta as-is (AppLayout may update it later)
        };
      }

      // ✅ TENANT: org required
      const enabledOrgs = user.orgMemberships.filter((m) => m.isEnabled);

      if (!nextOrgId || !enabledOrgs.some((m) => m.orgId === nextOrgId)) {
        nextOrgId = enabledOrgs[0]?.orgId ?? null;
      }

      persist(ORG_KEY, nextOrgId);
      persist(MODE_KEY, "TENANT");

      return {
        user,
        token,
        currentOrgId: nextOrgId,
        dashboardMode: "TENANT",
      };
    }),

  clearAuth: () =>
    set(() => {
      persist(TOKEN_KEY, null);
      persist(ORG_KEY, null);
      persist(ELECTION_KEY, null);
      persist(MODE_KEY, null);

      return {
        user: null,
        token: null,
        currentOrgId: null,
        currentElectionId: null,
        dashboardMode: "TENANT",
        tenantMeta: null, // ✅ reset
      };
    }),

  setCurrentOrg: (orgId) =>
    set(() => {
      persist(ORG_KEY, orgId);
      return { currentOrgId: orgId };
    }),

  setCurrentElection: (electionId) =>
    set(() => {
      persist(ELECTION_KEY, electionId);
      return { currentElectionId: electionId };
    }),

  setDashboardMode: (m) =>
    set(() => {
      persist(MODE_KEY, m);
      return { dashboardMode: m };
    }),

  isAuthenticated: () => !!get().token,

  isSystemAdmin: () => {
    const u = get().user;
    return !!u && (u.isSystemAdmin || u.globalRoleName === "SYSTEM_ADMIN");
  },

  hasOrgContext: () => !!get().currentOrgId,

  getEnabledOrgs: () =>
    get().user?.orgMemberships.filter((m) => m.isEnabled) ?? [],

  getRoleLabel: () => {
    const u = get().user;
    if (!u) return "";

    if (u.isSystemAdmin || u.globalRoleName === "SYSTEM_ADMIN") {
      return "SYSTEM_ADMIN";
    }

    const orgId = get().currentOrgId;
    const m = u.orgMemberships.find((x) => x.orgId === orgId);
    return m?.roleName ?? "";
  },
}));

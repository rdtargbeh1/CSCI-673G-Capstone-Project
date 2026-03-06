// src/pages/admin-security/security/UsersPage.tsx
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "../../../shared/store/authStore";

import type {
  UserCreateRequest,
  UserDto,
  UserUpdateRequest,
  RoleName,
} from "../../../auth/userTypes";

import {
  fetchUsers, // tenant scoped (requires X-Org-Id header)
  createUser,
  updateUser,
  deleteUser,
  setUserActive,
  setUserVerified,
  assignUserCounty,
  fetchPlatformUsers, // GET /api/users/platform
  createPlatformUser, // POST /api/platform/system-users
  setPlatformUserActive, // PATCH /api/platform/system-users/{id}/active
  setPlatformUserVerified, // PATCH /api/platform/system-users/{id}/verified
  updatePlatformUser, // PUT /api/platform/system-users/{id}
  createTenantAdmin, // ✅ NEW: POST /api/tenants/users/admins (X-Org-Id required)
  adminResetPassword, // ✅ NEW: POST /api/user/{userId}/password/reset (X-Org-Id required)
} from "../../../shared/services/userService";

import {
  fetchOrganizations as fetchOrganizationsPaged,
  type Organization,
} from "../../../shared/services/organizationService";

import { apiClient } from "../../../shared/lib/apiClient";

import { AdminShell, Badge, Card, Note } from "../shared/admin-ui";
import {
  Pencil,
  Trash2,
  UserPlus,
  Search,
  RefreshCw,
  KeyRound, // ✅ NEW
} from "lucide-react";

// ✅ Existing modals
import UsersFormModal from "./UsersFormModal";
import TenantAdminFormModal from "./TenantAdminFormModal";

// ✅ NEW modal
import AdminResetPasswordModal from "./AdminResetPasswordModal";

// ✅ Parties lookup
import { searchParties } from "../../../shared/services/partyService";

/** ---------------- helpers ---------------- */
function safeStr(v: any) {
  return typeof v === "string" ? v : v == null ? "" : String(v);
}
function fullName(u: any) {
  const n = `${safeStr(u?.firstName)} ${safeStr(u?.lastName)}`.trim();
  return n || safeStr(u?.userName) || safeStr(u?.email) || "—";
}
function pickActive(u: any): boolean {
  const v = u?.isActive ?? u?.active ?? u?.enabled;
  return v === true || v === "true" || v === 1;
}
function pickVerified(u: any): boolean {
  const v = u?.isVerified ?? u?.verified;
  return v === true || v === "true" || v === 1;
}
function fmtDate(v?: string | null) {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v);
  return d.toLocaleString();
}

/** ✅ email + phone validation */
function isValidEmail(email: string) {
  const v = email.trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}
function isValidPhoneDigitsOnly(phone: string) {
  if (!phone.trim()) return true; // optional
  return /^[0-9]+$/.test(phone.trim());
}

function unwrapList<T = any>(data: any): T[] {
  if (Array.isArray(data)) return data as T[];
  if (Array.isArray(data?.content)) return data.content as T[];
  if (Array.isArray(data?.items)) return data.items as T[];
  return [];
}

/** ✅ Normalize BOTH backend shapes */
function normalizeUsersResponse(data: any): {
  rows: any[];
  totalPages: number;
} {
  const rows =
    (Array.isArray(data?.users) && data.users) ||
    (Array.isArray(data?.content) && data.content) ||
    (Array.isArray(data?.items) && data.items) ||
    (Array.isArray(data) && data) ||
    [];

  const totalPages =
    (typeof data?.totalPages === "number" && data.totalPages) ||
    (typeof data?.page?.totalPages === "number" && data.page.totalPages) ||
    0;

  return { rows, totalPages };
}

type CountyOption = { countyId: string; countyName: string };
async function fetchCounties(): Promise<CountyOption[]> {
  const { data } = await apiClient.get("/counties");
  return unwrapList<CountyOption>(data);
}

/** ✅ Role rules */
const TENANT_ALLOWED_ROLES: RoleName[] = [
  "AGENT",
  "OBSERVER",
  "SUPERVISOR",
  "COORDINATOR",
  "DATA_ENTRY",
  "AUDITOR",
];

const HIGH_LEVEL_ROLES: RoleName[] = [
  "SYSTEM_ADMIN",
  "NEC_ADMIN",
  "ADMIN",
  "TENANT_ADMIN",
];

const ALL_ROLES: RoleName[] = [
  "SYSTEM_ADMIN",
  "NEC_ADMIN",
  "ADMIN",
  "TENANT_ADMIN",
  "AGENT",
  "OBSERVER",
  "SUPERVISOR",
  "COORDINATOR",
  "DATA_ENTRY",
  "AUDITOR",
];

export default function UsersPage() {
  const qc = useQueryClient();

  const dashboardMode = useAuthStore((s) => s.dashboardMode);
  const currentOrgId = useAuthStore((s) => s.currentOrgId);

  const isSystemMode = dashboardMode === "SYSTEM";

  // ✅ SYSTEM: empty = PLATFORM users; selecting org = tenant users
  const [selectedOrgId, setSelectedOrgId] = useState<string>("");

  const isPlatformView = isSystemMode && !selectedOrgId.trim();
  const effectiveOrgId = isSystemMode ? selectedOrgId : String(currentOrgId ?? "");
  const hasOrgContext = !!effectiveOrgId.trim();

  // ✅ Permissions
  const canManagePlatform = isPlatformView && isSystemMode;
  const canManageTenant =
    !isPlatformView &&
    (dashboardMode === "SYSTEM" ||
      dashboardMode === "NEC" ||
      (dashboardMode === "TENANT" && hasOrgContext));

  const canManageUsers = canManagePlatform || canManageTenant;

  // Filters / paging
  const [q, setQ] = useState("");
  const [page, setPage] = useState(0);

  // Modal state (regular users)
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<UserDto | null>(null);

  // ✅ Tenant Admin modal state
  const [tenantAdminOpen, setTenantAdminOpen] = useState(false);

  // ✅ NEW: Admin Reset Password modal state
  const [resetPwOpen, setResetPwOpen] = useState(false);
  const [resetPwUser, setResetPwUser] = useState<any | null>(null);

  // ✅ IMPORTANT: detect “protected role” while editing IN TENANT VIEW
  const editingRoleName = safeStr((editing as any)?.roleName);
  const isProtectedTenantRoleEdit =
    !!editing &&
    !isPlatformView &&
    !isSystemMode && // ✅ only protect in non-system dashboards
    HIGH_LEVEL_ROLES.includes(editingRoleName as RoleName);

  // Form state (regular users)
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    userName: "",
    email: "",
    position: "",
    phoneNumber: "",
    password: "",
    roleName: "" as RoleName | "",
    assignedCountyId: "",
  });

  const [touched, setTouched] = useState<{ [k: string]: boolean }>({});
  const [phoneHasIllegalChar, setPhoneHasIllegalChar] = useState(false);

  // ✅ Tenant Admin form state
  const [tenantAdminForm, setTenantAdminForm] = useState({
    orgId: "",
    partyId: "",
    firstName: "",
    lastName: "",
    userName: "",
    email: "",
    position: "",
    phoneNumber: "",
    password: "",
    roleName: "" as RoleName | "",
  });
  const [tenantAdminTouched, setTenantAdminTouched] = useState<{ [k: string]: boolean }>({});
  const [tenantAdminPhoneHasIllegalChar, setTenantAdminPhoneHasIllegalChar] = useState(false);

  function openCreate() {
    if (!canManageUsers) return;
    setEditing(null);
    setTouched({});
    setPhoneHasIllegalChar(false);
    setForm({
      firstName: "",
      lastName: "",
      userName: "",
      email: "",
      position: "",
      phoneNumber: "",
      password: "",
      roleName: "",
      assignedCountyId: "",
    });
    setModalOpen(true);
  }

  function openEdit(u: UserDto) {
    if (!canManageUsers) return;

    setEditing(u);
    setTouched({});
    setPhoneHasIllegalChar(false);

    const role = safeStr((u as any).roleName ?? "");

    setForm({
      firstName: safeStr(u.firstName),
      lastName: safeStr(u.lastName),
      userName: safeStr(u.userName),
      email: safeStr(u.email),
      position: safeStr((u as any).position ?? ""),
      phoneNumber: safeStr((u as any).phoneNumber ?? ""),
      password: "",
      roleName: (role as any) || "",
      assignedCountyId: safeStr((u as any).assignedCountyId ?? ""),
    });

    setModalOpen(true);
  }

  function openTenantAdminCreate() {
    if (!isSystemMode) return;
    setTenantAdminTouched({});
    setTenantAdminPhoneHasIllegalChar(false);
    setTenantAdminForm({
      orgId: "",
      partyId: "",
      firstName: "",
      lastName: "",
      userName: "",
      email: "",
      position: "",
      phoneNumber: "",
      password: "",
      roleName: "",
    });
    setTenantAdminOpen(true);
  }

  // ✅ NEW: open reset password modal for a specific user
  function openResetPassword(u: any) {
    // We only support tenant reset with org header
    if (isPlatformView) return;
    if (!canManageTenant || !hasOrgContext) return;

    setResetPwUser(u);
    setResetPwOpen(true);
  }

  /** ✅ SYSTEM org dropdown options */
  const orgsQ = useQuery({
    queryKey: ["lookups", "orgs", "system"],
    queryFn: async () => {
      const res = await fetchOrganizationsPaged({
        page: 0,
        size: 200,
        search: undefined,
        active: undefined,
        orgType: undefined,
        orgId: undefined,
      } as any);
      return res.items as Organization[];
    },
    enabled: isSystemMode,
    staleTime: 1000 * 60 * 10,
    retry: 1,
  });

  const orgOptions = useMemo(() => {
    return (orgsQ.data ?? []).map((o) => ({
      value: o.orgId,
      label: o.subdomain ? `${o.orgName} (${o.subdomain})` : o.orgName,
    }));
  }, [orgsQ.data]);

  /** ✅ Parties lookup (for TenantAdmin modal) */
  const partiesQ = useQuery({
    queryKey: ["lookups", "parties", "system", "tenantAdmin"],
    queryFn: async () => {
      const res = await searchParties({ page: 0, size: 200, q: undefined });
      return res.items;
    },
    enabled: isSystemMode,
    staleTime: 1000 * 60 * 10,
    retry: 1,
  });

  const partyOptions = useMemo(() => {
    return (partiesQ.data ?? []).map((p) => ({
      value: p.partyId,
      label: p.abbreviation ? `${p.partyName} (${p.abbreviation})` : p.partyName,
    }));
  }, [partiesQ.data]);

  /** ✅ Counties lookup */
  const countiesQ = useQuery({
    queryKey: ["lookups", "counties", effectiveOrgId],
    queryFn: fetchCounties,
    enabled: hasOrgContext && !isPlatformView,
    staleTime: 1000 * 60 * 10,
    retry: 1,
  });

  const countyOptions = useMemo(() => {
    return (countiesQ.data ?? []).map((c) => ({
      value: c.countyId,
      label: c.countyName,
    }));
  }, [countiesQ.data]);

  const countyNameById = useMemo(() => {
    const map = new Map<string, string>();
    (countiesQ.data ?? []).forEach((c) => map.set(c.countyId, c.countyName));
    return map;
  }, [countiesQ.data]);

  /** ✅ Role options */
  const roleOptions = useMemo(() => {
    if (isSystemMode) return ALL_ROLES.map((r) => ({ value: r, label: r }));

    if (editing && isProtectedTenantRoleEdit) {
      const current = editingRoleName as RoleName;
      const set = new Set<RoleName>(TENANT_ALLOWED_ROLES);
      if (HIGH_LEVEL_ROLES.includes(current)) set.add(current);
      return Array.from(set).map((r) => ({ value: r, label: r }));
    }

    return TENANT_ALLOWED_ROLES.map((r) => ({ value: r, label: r }));
  }, [isSystemMode, editing, isProtectedTenantRoleEdit, editingRoleName]);

  /** ✅ Validation (regular users) */
  const errors = useMemo(() => {
    const e: Record<string, string> = {};
    const fn = form.firstName.trim();
    const ln = form.lastName.trim();
    const un = form.userName.trim();
    const em = form.email.trim();
    const rl = String(form.roleName || "").trim();

    if (!fn) e.firstName = "Required";
    if (!ln) e.lastName = "Required";
    if (!un) e.userName = "Required";

    if (!em) e.email = "Required";
    else if (!isValidEmail(em)) e.email = "Invalid email";

    if (phoneHasIllegalChar) e.phoneNumber = "Digits only.";

    if (!editing) {
      if (!form.password.trim()) e.password = "Required";
      if (!rl) e.roleName = "Required";
    } else {
      if (!rl) e.roleName = "Required";
    }

    if (rl && isSystemMode && !ALL_ROLES.includes(rl as RoleName)) {
      e.roleName = "Role not allowed";
    }

    if (
      rl &&
      !isSystemMode &&
      !isProtectedTenantRoleEdit &&
      HIGH_LEVEL_ROLES.includes(rl as RoleName)
    ) {
      e.roleName = "System-level role can only be assigned by SYSTEM admin";
    }

    return e;
  }, [form, editing, isSystemMode, phoneHasIllegalChar, isProtectedTenantRoleEdit]);

  const isValid = Object.keys(errors).length === 0;

  /** ✅ Validation (tenant admin) */
  const tenantAdminErrors = useMemo(() => {
    const e: Record<string, string> = {};
    const orgId = tenantAdminForm.orgId.trim();
    const fn = tenantAdminForm.firstName.trim();
    const ln = tenantAdminForm.lastName.trim();
    const un = tenantAdminForm.userName.trim();
    const em = tenantAdminForm.email.trim();
    const rl = String(tenantAdminForm.roleName || "").trim();

    if (!orgId) e.orgId = "Required";
    if (!fn) e.firstName = "Required";
    if (!ln) e.lastName = "Required";
    if (!un) e.userName = "Required";

    if (!em) e.email = "Required";
    else if (!isValidEmail(em)) e.email = "Invalid email";

    if (tenantAdminPhoneHasIllegalChar) e.phoneNumber = "Digits only.";

    if (!tenantAdminForm.password.trim()) e.password = "Required";
    if (!rl) e.roleName = "Required";

    return e;
  }, [tenantAdminForm, tenantAdminPhoneHasIllegalChar]);

  const tenantAdminIsValid = Object.keys(tenantAdminErrors).length === 0;

  /** ✅ Users query */
  const usersQ = useQuery({
    queryKey: ["users", isPlatformView ? "platform" : effectiveOrgId, page, q],
    queryFn: async () => {
      if (isPlatformView) {
        return fetchPlatformUsers({
          page,
          size: 20,
          q: q.trim() || undefined,
        });
      }
      return fetchUsers(String(effectiveOrgId), {
        page,
        size: 20,
        q: q.trim() || undefined,
      });
    },
    enabled: isPlatformView || hasOrgContext,
    staleTime: 10_000,
    retry: 1,
  });

  const { rows, totalPages } = normalizeUsersResponse(usersQ.data);

  const refreshNow = async () => {
    await qc.invalidateQueries({ queryKey: ["users"] });
    await usersQ.refetch();
  };

  /** ✅ Save (regular users) */
  const saveM = useMutation({
    mutationFn: async () => {
      if (!canManageUsers) throw new Error("No permission.");
      if (!isValid) throw new Error("Please fix validation errors.");

      if (form.phoneNumber.trim() && !isValidPhoneDigitsOnly(form.phoneNumber)) {
        throw new Error("Phone must contain digits only.");
      }

      // ✅ PLATFORM (no org)
      if (isPlatformView) {
        if (!canManagePlatform) throw new Error("Platform users: SYSTEM admin only.");

        if (!editing) {
          const payload: UserCreateRequest = {
            firstName: form.firstName.trim(),
            lastName: form.lastName.trim(),
            userName: form.userName.trim(),
            email: form.email.trim(),
            position: form.position.trim() || undefined,
            phoneNumber: form.phoneNumber.trim() || undefined,
            password: form.password.trim(),
            roleName: form.roleName as RoleName,
            assignedCountyId: null,
          } as any;

          return await createPlatformUser(payload);
        }

        const payload: UserUpdateRequest = {
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          userName: form.userName.trim(),
          email: form.email.trim(),
          position: form.position.trim() || undefined,
          phoneNumber: form.phoneNumber.trim() || undefined,
          roleName: form.roleName as RoleName,
        };

        return await updatePlatformUser(editing.userId, payload);
      }

      // ✅ TENANT (requires org)
      if (!hasOrgContext) throw new Error("Select an organization.");

      if (!isSystemMode && HIGH_LEVEL_ROLES.includes(form.roleName as RoleName)) {
        throw new Error("System-level role can only be assigned by SYSTEM admin.");
      }

      if (!editing) {
        const payload: UserCreateRequest = {
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          userName: form.userName.trim(),
          email: form.email.trim(),
          position: form.position.trim() || undefined,
          phoneNumber: form.phoneNumber.trim() || undefined,
          password: form.password.trim(),
          roleName: form.roleName as RoleName,
          assignedCountyId: form.assignedCountyId || null,
        } as any;

        const created = await createUser(String(effectiveOrgId), payload);
        await assignUserCounty(String(effectiveOrgId), created.userId, form.assignedCountyId || null);
        return created;
      }

      let payload: UserUpdateRequest;

      if (isProtectedTenantRoleEdit) {
        payload = {
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          userName: form.userName.trim(),
          email: form.email.trim(),
          position: form.position.trim() || undefined,
          phoneNumber: form.phoneNumber.trim() || undefined,
        } as UserUpdateRequest;
      } else {
        payload = {
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          userName: form.userName.trim(),
          email: form.email.trim(),
          position: form.position.trim() || undefined,
          phoneNumber: form.phoneNumber.trim() || undefined,
          roleName: form.roleName as RoleName,
        };
      }

      const updated = await updateUser(String(effectiveOrgId), editing.userId, payload);

      await assignUserCounty(String(effectiveOrgId), editing.userId, form.assignedCountyId || null);

      return updated;
    },
    onSuccess: async () => {
      await refreshNow();
      setModalOpen(false);
      setEditing(null);
    },
  });

  /** ✅ Create Tenant Admin (SYSTEM only) */
  const createTenantAdminM = useMutation({
    mutationFn: async () => {
      if (!isSystemMode) throw new Error("SYSTEM only.");
      if (!tenantAdminIsValid) throw new Error("Please fix validation errors.");

      if (
        tenantAdminForm.phoneNumber.trim() &&
        !isValidPhoneDigitsOnly(tenantAdminForm.phoneNumber)
      ) {
        throw new Error("Phone must contain digits only.");
      }

      const payload: UserCreateRequest = {
        firstName: tenantAdminForm.firstName.trim(),
        lastName: tenantAdminForm.lastName.trim(),
        userName: tenantAdminForm.userName.trim(),
        email: tenantAdminForm.email.trim(),
        position: tenantAdminForm.position.trim() || undefined,
        phoneNumber: tenantAdminForm.phoneNumber.trim() || undefined,
        password: tenantAdminForm.password.trim(),
        roleName: tenantAdminForm.roleName as RoleName,
        partyId: tenantAdminForm.partyId.trim() || null,
      } as any;

      return await createTenantAdmin(tenantAdminForm.orgId, payload);
    },
    onSuccess: async () => {
      await refreshNow();
      setTenantAdminOpen(false);
    },
  });

  const deleteM = useMutation({
    mutationFn: async (u: UserDto) => {
      if (!canManageTenant) throw new Error("Select a tenant org to manage users.");
      await deleteUser(String(effectiveOrgId), u.userId);
    },
    onSuccess: refreshNow,
  });

  const activeM = useMutation({
    mutationFn: async (args: { userId: string; value: boolean }) => {
      if (!canManageUsers) throw new Error("No permission.");

      if (isPlatformView) {
        if (!canManagePlatform) throw new Error("Platform users: SYSTEM admin only.");
        await setPlatformUserActive(args.userId, args.value);
        return;
      }

      if (!canManageTenant) throw new Error("Select a tenant org to manage users.");
      await setUserActive(String(effectiveOrgId), args.userId, args.value);
    },
    onSuccess: refreshNow,
  });

  const verifiedM = useMutation({
    mutationFn: async (args: { userId: string; value: boolean }) => {
      if (!canManageUsers) throw new Error("No permission.");

      if (isPlatformView) {
        if (!canManagePlatform) throw new Error("Platform users: SYSTEM admin only.");
        await setPlatformUserVerified(args.userId, args.value);
        return;
      }

      if (!canManageTenant) throw new Error("Select a tenant org to manage users.");
      await setUserVerified(String(effectiveOrgId), args.userId, args.value);
    },
    onSuccess: refreshNow,
  });

  // ✅ NEW: reset password mutation
  const resetPwM = useMutation({
    mutationFn: async (args: { userId: string; newPassword: string }) => {
      if (isPlatformView) throw new Error("Password reset is tenant-scoped only.");
      if (!canManageTenant) throw new Error("Select a tenant org to manage users.");
      if (!hasOrgContext) throw new Error("Select an organization first.");

      await adminResetPassword(String(effectiveOrgId), args.userId, args.newPassword);
    },
    onSuccess: async () => {
      await refreshNow();
      setResetPwOpen(false);
      setResetPwUser(null);
    },
  });

  const addDisabledReason = isPlatformView
    ? canManagePlatform
      ? ""
      : "Platform users: SYSTEM admin only."
    : !hasOrgContext
    ? "Select organization first"
    : !canManageTenant
    ? "No permission"
    : "";

  return (
    <AdminShell
      title="Security • Users"
      subtitle={
        isSystemMode
          ? "SYSTEM: platform users by default; select an org to manage tenant users."
          : "Tenant-scoped users."
      }
      right={<Badge>{isSystemMode ? (isPlatformView ? "Platform" : "Org") : "Tenant"}</Badge>}
    >
      <Card
        title="Users"
        right={
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={refreshNow}
              disabled={usersQ.isFetching || (!isPlatformView && !hasOrgContext)}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50"
            >
              <RefreshCw size={16} />
              Refresh
            </button>

            <button
              type="button"
              onClick={openCreate}
              className="inline-flex items-center gap-2 rounded-xl bg-(--org-primary) px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
              disabled={!!addDisabledReason || saveM.isPending}
              title={addDisabledReason || "Add user"}
            >
              <UserPlus size={16} />
              Add User
            </button>

            {/* ✅ SYSTEM ONLY: Create first Tenant Admin */}
            {isSystemMode ? (
              <button
                type="button"
                onClick={openTenantAdminCreate}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-blue-700 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-50 disabled:opacity-50"
                disabled={createTenantAdminM.isPending}
                title="SYSTEM: Create first tenant admin for a target org"
              >
                <UserPlus size={16} />
                Add Tenant Admin
              </button>
            ) : null}
          </div>
        }
      >
        {/* ✅ SYSTEM: Organization selector ALWAYS visible */}
        {isSystemMode ? (
          <div className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <label className="block">
              <div className="mb-1 flex items-center justify-between">
                <div className="text-[11px] font-semibold text-slate-600">
                  Organization (optional)
                </div>
              </div>
              <select
                value={selectedOrgId}
                onChange={(e) => {
                  const v = e.target.value;
                  setSelectedOrgId(v);
                  setPage(0);
                  setQ("");
                }}
                disabled={orgsQ.isLoading || orgsQ.isError}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-(--org-primary)"
              >
                <option value="">
                  {orgsQ.isLoading ? "Loading organizations…" : "— Platform Users (no org) —"}
                </option>
                {orgOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              {orgsQ.isError ? (
                <div className="mt-1 text-[11px] font-semibold text-red-600">
                  Failed to load organizations
                </div>
              ) : null}
            </label>
          </div>
        ) : null}

        {/* Filters */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex w-full items-center gap-2 sm:max-w-xl">
            <div className="relative w-full">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                size={16}
              />
              <input
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setPage(0);
                }}
                placeholder={isPlatformView ? "Search platform users..." : "Search tenant users..."}
                className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-(--org-primary)"
              />
            </div>
            <button
              type="button"
              onClick={() => {
                setQ("");
                setPage(0);
              }}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold hover:bg-slate-50"
            >
              Clear
            </button>
          </div>
        </div>

        {/* Status messages */}
        <div className="mt-3">
          {!isPlatformView && !hasOrgContext ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              Select an organization to view tenant users.
            </div>
          ) : usersQ.isLoading ? (
            <div className="text-sm text-slate-600">Loading users…</div>
          ) : usersQ.isError ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {(usersQ.error as any)?.message ?? "Failed to load users."}
            </div>
          ) : null}
        </div>

        {/* Table */}
        <div className="mt-3">
          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
            <table className="min-w-1100px w-full">
              <thead className="sticky top-0 z-10 bg-slate-50">
                <tr className="text-left">
                  {[
                    "Full Name",
                    "Username",
                    "Position",
                    "Email",
                    "Phone",
                    "Role",
                    "Assigned County",
                    "Date Created",
                    "Status",
                    "Actions",
                  ].map((h) => (
                    <th
                      key={h}
                      className="whitespace-nowrap border-b border-slate-200 px-3 py-2 text-[11px] font-extrabold text-slate-700"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {rows.length === 0 && !usersQ.isLoading ? (
                  <tr>
                    <td colSpan={10} className="px-3 py-6 text-sm text-slate-600">
                      No users found.
                    </td>
                  </tr>
                ) : (
                  rows.map((u: any) => {
                    const active = pickActive(u);
                    const verified = pickVerified(u);

                    const countyName =
                      countyNameById.get(safeStr(u.assignedCountyId)) ||
                      safeStr(u.assignedCountyName) ||
                      "—";

                    return (
                      <tr key={u.userId} className="hover:bg-slate-50">
                        <td className="border-b border-slate-100 px-3 py-2">
                          <div className="text-sm font-bold text-slate-900">{fullName(u)}</div>
                        </td>
                        <td className="border-b border-slate-100 px-3 py-2 text-sm font-semibold text-slate-800">
                          @{u.userName}
                        </td>
                        <td className="border-b border-slate-100 px-3 py-2 text-sm text-slate-700">
                          {safeStr(u.position ?? "—")}
                        </td>
                        <td className="border-b border-slate-100 px-3 py-2 text-sm text-slate-700">
                          {u.email}
                        </td>
                        <td className="border-b border-slate-100 px-3 py-2 text-sm text-slate-700">
                          {safeStr(u.phoneNumber ?? "—")}
                        </td>
                        <td className="border-b border-slate-100 px-3 py-2 text-sm text-slate-700">
                          {safeStr(u.roleName ?? "—")}
                        </td>
                        <td className="border-b border-slate-100 px-3 py-2 text-sm text-slate-700">
                          {isPlatformView ? "—" : countyName}
                        </td>
                        <td className="border-b border-slate-100 px-3 py-2 text-xs text-slate-700">
                          {fmtDate(u.dateCreated)}
                        </td>
                        <td className="border-b border-slate-100 px-3 py-2">
                          <div className="flex items-center gap-4">
                            <label className="inline-flex items-center gap-2 text-xs text-slate-700">
                              <input
                                type="checkbox"
                                checked={active}
                                disabled={!canManageUsers || activeM.isPending}
                                onChange={(e) =>
                                  activeM.mutate({
                                    userId: u.userId,
                                    value: e.target.checked,
                                  })
                                }
                                className="h-4 w-4 accent-(--org-primary)"
                              />
                              <span className="font-semibold">Active</span>
                            </label>

                            <label className="inline-flex items-center gap-2 text-xs text-slate-700">
                              <input
                                type="checkbox"
                                checked={verified}
                                disabled={!canManageUsers || verifiedM.isPending}
                                onChange={(e) =>
                                  verifiedM.mutate({
                                    userId: u.userId,
                                    value: e.target.checked,
                                  })
                                }
                                className="h-4 w-4 accent-(--org-primary)"
                              />
                              <span className="font-semibold">Verified</span>
                            </label>
                          </div>
                        </td>

                        <td className="border-b border-slate-100 px-3 py-2">
                          <div className="flex items-center gap-2">
                            {/* ✅ Reset password (tenant only) */}
                            <button
                              type="button"
                              className="h-9 w-9 rounded-xl border border-slate-200 hover:bg-slate-50 disabled:opacity-50"
                              title={
                                isPlatformView
                                  ? "Reset password not available for platform users"
                                  : "Reset password"
                              }
                              disabled={
                                isPlatformView ||
                                !canManageTenant ||
                                !hasOrgContext ||
                                resetPwM.isPending
                              }
                              onClick={() => openResetPassword(u)}
                            >
                              <KeyRound size={16} className="mx-auto text-slate-700" />
                            </button>

                            <button
                              type="button"
                              className="h-9 w-9 rounded-xl border border-slate-200 hover:bg-slate-50 disabled:opacity-50"
                              title="Edit"
                              onClick={() => openEdit(u)}
                              disabled={!canManageUsers}
                            >
                              <Pencil size={16} className="mx-auto text-slate-700" />
                            </button>

                            <button
                              type="button"
                              className="h-9 w-9 rounded-xl border border-slate-200 hover:bg-slate-50 disabled:opacity-50"
                              title={isPlatformView ? "Platform delete not enabled" : "Delete"}
                              disabled={isPlatformView || !canManageTenant || deleteM.isPending}
                              onClick={() => {
                                const ok = window.confirm(`Delete user "${fullName(u)}"?`);
                                if (ok) deleteM.mutate(u);
                              }}
                            >
                              <Trash2 size={16} className="mx-auto text-red-600" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="mt-3 flex items-center justify-between">
            <div className="text-xs text-slate-600">
              Page <span className="font-bold">{page + 1}</span> of{" "}
              <span className="font-bold">{Math.max(totalPages, 1)}</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50"
                disabled={page <= 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
              >
                Prev
              </button>
              <button
                type="button"
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50"
                disabled={totalPages === 0 || page >= totalPages - 1}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </button>
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
          <Note
            title="Tenant protected roles"
            bullets={[
              "In NEC/Tenant dashboards, SYSTEM_ADMIN / NEC_ADMIN / ADMIN / PARTY_ADMIN are system-level roles.",
              "Tenant admins cannot assign them (Create), and they become read-only during edit if the user already has one.",
              "During protected edits, roleName is not sent in updates.",
            ]}
          />
          <Note
            title="County display"
            bullets={[
              "County lookup now loads when an org is selected, not only when the modal opens.",
              "Assigned County now displays on the table immediately.",
            ]}
          />
        </div>
      </Card>

      {/* ✅ Regular Users Modal */}
      <UsersFormModal
        open={modalOpen}
        editing={editing}
        onClose={() => {
          if (saveM.isPending) return;
          setModalOpen(false);
          setEditing(null);
        }}
        saveM={saveM}
        canManageUsers={canManageUsers}
        isValid={isValid}
        errors={errors}
        touched={touched}
        setTouched={setTouched}
        form={form}
        setForm={setForm}
        phoneHasIllegalChar={phoneHasIllegalChar}
        setPhoneHasIllegalChar={setPhoneHasIllegalChar}
        roleOptions={roleOptions}
        isProtectedTenantRoleEdit={isProtectedTenantRoleEdit}
        countyOptions={countyOptions}
        countiesQ={countiesQ}
        isPlatformView={isPlatformView}
      />

      {/* ✅ Tenant Admin Modal (SYSTEM only) */}
      <TenantAdminFormModal
        open={tenantAdminOpen}
        onClose={() => {
          if (createTenantAdminM.isPending) return;
          setTenantAdminOpen(false);
        }}
        createM={createTenantAdminM}
        isValid={tenantAdminIsValid}
        errors={tenantAdminErrors}
        touched={tenantAdminTouched}
        setTouched={setTenantAdminTouched}
        form={tenantAdminForm}
        setForm={setTenantAdminForm}
        phoneHasIllegalChar={tenantAdminPhoneHasIllegalChar}
        setPhoneHasIllegalChar={setTenantAdminPhoneHasIllegalChar}
        orgOptions={orgOptions}
        partyOptions={partyOptions}
        partiesQ={partiesQ}
      />

      {/* ✅ Admin Reset Password Modal */}
      <AdminResetPasswordModal
        open={resetPwOpen}
        user={resetPwUser}
        onClose={() => {
          if (resetPwM.isPending) return;
          setResetPwOpen(false);
          setResetPwUser(null);
        }}
        isSaving={resetPwM.isPending}
        errorText={
          resetPwM.isError ? ((resetPwM.error as any)?.message ?? "Reset failed.") : ""
        }
        disabledReason={
          isPlatformView
            ? "Platform users: reset password not enabled here."
            : !hasOrgContext
            ? "Select an organization first."
            : !canManageTenant
            ? "No permission to manage tenant users."
            : ""
        }
        onSubmit={(newPassword) => {
          if (!resetPwUser?.userId) return;
          resetPwM.mutate({ userId: resetPwUser.userId, newPassword });
        }}
      />
    </AdminShell>
  );
}


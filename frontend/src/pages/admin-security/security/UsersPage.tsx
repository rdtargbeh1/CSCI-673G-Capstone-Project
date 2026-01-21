// src/pages/admin-security/security/UsersPage.tsx
import React, { useMemo, useState } from "react";
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
  Power,
  PowerOff,
  ShieldCheck,
  ShieldX,
} from "lucide-react";

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

/** ✅ Normalize BOTH backend shapes:
 *  - tenant fetchUsers -> { users: UserDto[], totalPages: number }
 *  - platform fetchPlatformUsers -> Spring Page { content: UserDto[], totalPages: number }
 */
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
  "PARTY_ADMIN",
];

const ALL_ROLES: RoleName[] = [
  "SYSTEM_ADMIN",
  "NEC_ADMIN",
  "ADMIN",
  "PARTY_ADMIN",
  "AGENT",
  "OBSERVER",
  "SUPERVISOR",
  "COORDINATOR",
  "DATA_ENTRY",
  "AUDITOR",
];

/** ---------------- UI bits ---------------- */
function StatusCheck({
  label,
  checked,
  disabled,
  onToggle,
}: {
  label: string;
  checked: boolean;
  disabled?: boolean;
  onToggle?: (next: boolean) => void;
}) {
  return (
    <label className="inline-flex items-center gap-2 text-xs text-slate-700">
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onToggle?.(e.target.checked)}
        className="h-4 w-4 accent-(--org-primary)"
      />
      <span className="font-semibold">{label}</span>
    </label>
  );
}

function Modal({
  open,
  title,
  children,
  onClose,
}: {
  open: boolean;
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  if (!open) return null;
  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/35" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-start justify-center p-3 sm:p-6">
        <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white shadow-2xl">
          <div className="flex items-start justify-between border-b border-slate-200 px-4 py-3">
            <div>
              <div className="text-base font-extrabold text-slate-900">
                {title}
              </div>
              <div className="text-[11px] text-slate-500">
                Required fields must be filled before saving.
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="h-9 w-9 rounded-xl border border-slate-200 hover:bg-slate-50"
              aria-label="Close"
            >
              ✕
            </button>
          </div>
          <div className="max-h-[75vh] overflow-auto px-4 py-4">{children}</div>
        </div>
      </div>
    </>
  );
}

function TextField({
  label,
  value,
  onChange,
  type,
  disabled,
  placeholder,
  required,
  error,
  onBlur,
  onFocus,
  inputMode,
  name, // ✅ NEW
  autoComplete, // ✅ NEW
  selectAllOnFocus, // ✅ NEW
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  disabled?: boolean;
  placeholder?: string;
  required?: boolean;
  error?: string;
  onBlur?: () => void;
  onFocus?: () => void;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  name?: string; // ✅ NEW
  autoComplete?: string; // ✅ NEW
  selectAllOnFocus?: boolean; // ✅ NEW
}) {
  return (
    <label className="block">
      <div className="mb-1 flex items-center justify-between">
        <div className="text-[11px] font-semibold text-slate-600">
          {label} {required ? <span className="text-red-600">*</span> : null}
        </div>
        {error ? (
          <div className="text-[11px] font-semibold text-red-600">{error}</div>
        ) : null}
      </div>
      <input
        name={name}
        autoComplete={autoComplete}
        type={type ?? "text"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        onFocus={(e) => {
          if (selectAllOnFocus) {
            // ✅ ensures user typing replaces existing dots/value (autofill or previous)
            setTimeout(() => e.currentTarget.select(), 0);
          }
          onFocus?.();
        }}
        inputMode={inputMode}
        disabled={disabled}
        placeholder={placeholder}
        className={[
          "w-full rounded-xl border bg-white px-3 py-2 text-sm outline-none focus:ring-2",
          error
            ? "border-red-300 focus:ring-red-400"
            : "border-slate-200 focus:ring-(--org-primary)",
          disabled ? "bg-slate-50" : "",
        ].join(" ")}
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
  required,
  error,
  disabled,
  emptyLabel = "Select…",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  required?: boolean;
  error?: string;
  disabled?: boolean;
  emptyLabel?: string;
}) {
  return (
    <label className="block">
      <div className="mb-1 flex items-center justify-between">
        <div className="text-[11px] font-semibold text-slate-600">
          {label} {required ? <span className="text-red-600">*</span> : null}
        </div>
        {error ? (
          <div className="text-[11px] font-semibold text-red-600">{error}</div>
        ) : null}
      </div>
      <select
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className={[
          "w-full rounded-xl border bg-white px-3 py-2 text-sm outline-none focus:ring-2",
          error
            ? "border-red-300 focus:ring-red-400"
            : "border-slate-200 focus:ring-(--org-primary)",
          disabled ? "bg-slate-50" : "",
        ].join(" ")}
      >
        <option value="">{emptyLabel}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export default function UsersPage() {
  const qc = useQueryClient();

  const dashboardMode = useAuthStore((s) => s.dashboardMode);
  const currentOrgId = useAuthStore((s) => s.currentOrgId);

  const isSystemMode = dashboardMode === "SYSTEM";

  // ✅ SYSTEM: empty = PLATFORM users; selecting org = tenant users
  const [selectedOrgId, setSelectedOrgId] = useState<string>("");

  const isPlatformView = isSystemMode && !selectedOrgId.trim();
  const effectiveOrgId = isSystemMode
    ? selectedOrgId
    : String(currentOrgId ?? "");
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

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<UserDto | null>(null);

  // ✅ IMPORTANT: detect “protected role” while editing IN TENANT VIEW
  const editingRoleName = safeStr((editing as any)?.roleName);
  const isProtectedTenantRoleEdit =
    !!editing &&
    !isPlatformView &&
    !isSystemMode && // ✅ only protect in non-system dashboards
    HIGH_LEVEL_ROLES.includes(editingRoleName as RoleName);

  // Form state
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
      // ✅ keep role populated (prevents “empty role” bug)
      roleName: (role as any) || "",
      assignedCountyId: safeStr((u as any).assignedCountyId ?? ""),
    });

    setModalOpen(true);
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

  /** ✅ Counties lookup
   * load counties when org selected (so table can display county immediately)
   */
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

  /** ✅ Role options:
   * - SYSTEM dashboard: all roles editable
   * - NEC/TENANT dashboards:
   *    - Create: ONLY tenant roles
   *    - Edit: if user already has a system-level role, show it but keep field read-only
   */
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

  /** ✅ Validation */
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

    // ✅ System dashboard: enforce only known roles
    if (rl && isSystemMode && !ALL_ROLES.includes(rl as RoleName)) {
      e.roleName = "Role not allowed";
    }

    // ✅ Non-system dashboards (NEC/TENANT): cannot assign system-level roles
    if (
      rl &&
      !isSystemMode &&
      !isProtectedTenantRoleEdit &&
      HIGH_LEVEL_ROLES.includes(rl as RoleName)
    ) {
      e.roleName = "System-level role can only be assigned by SYSTEM admin";
    }

    return e;
  }, [
    form,
    editing,
    isSystemMode,
    phoneHasIllegalChar,
    isProtectedTenantRoleEdit,
  ]);

  const isValid = Object.keys(errors).length === 0;

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

  /** ✅ Save */
  const saveM = useMutation({
    mutationFn: async () => {
      if (!canManageUsers) throw new Error("No permission.");
      if (!isValid) throw new Error("Please fix validation errors.");

      if (
        form.phoneNumber.trim() &&
        !isValidPhoneDigitsOnly(form.phoneNumber)
      ) {
        throw new Error("Phone must contain digits only.");
      }

      // ✅ PLATFORM (no org)
      if (isPlatformView) {
        if (!canManagePlatform)
          throw new Error("Platform users: SYSTEM admin only.");

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

      // ✅ extra guard (non-system dashboards cannot assign high-level roles)
      if (
        !isSystemMode &&
        HIGH_LEVEL_ROLES.includes(form.roleName as RoleName)
      ) {
        throw new Error(
          "System-level role can only be assigned by SYSTEM admin."
        );
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
        await assignUserCounty(
          String(effectiveOrgId),
          created.userId,
          form.assignedCountyId || null
        );
        return created;
      }

      // ✅ TENANT UPDATE:
      // If user is high-level role, DO NOT send roleName.
      let payload: UserUpdateRequest;

      if (isProtectedTenantRoleEdit) {
        payload = {
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          userName: form.userName.trim(),
          email: form.email.trim(),
          position: form.position.trim() || undefined,
          phoneNumber: form.phoneNumber.trim() || undefined,
        } as UserUpdateRequest; // ✅ roleName intentionally omitted for protected edit
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

      const updated = await updateUser(
        String(effectiveOrgId),
        editing.userId,
        payload
      );

      await assignUserCounty(
        String(effectiveOrgId),
        editing.userId,
        form.assignedCountyId || null
      );

      return updated;
    },
    onSuccess: async () => {
      await refreshNow();
      setModalOpen(false);
      setEditing(null);
    },
  });

  const deleteM = useMutation({
    mutationFn: async (u: UserDto) => {
      if (!canManageTenant)
        throw new Error("Select a tenant org to manage users.");
      await deleteUser(String(effectiveOrgId), u.userId);
    },
    onSuccess: refreshNow,
  });

  const activeM = useMutation({
    mutationFn: async (args: { userId: string; value: boolean }) => {
      if (!canManageUsers) throw new Error("No permission.");

      if (isPlatformView) {
        if (!canManagePlatform)
          throw new Error("Platform users: SYSTEM admin only.");
        await setPlatformUserActive(args.userId, args.value);
        return;
      }

      if (!canManageTenant)
        throw new Error("Select a tenant org to manage users.");
      await setUserActive(String(effectiveOrgId), args.userId, args.value);
    },
    onSuccess: refreshNow,
  });

  const verifiedM = useMutation({
    mutationFn: async (args: { userId: string; value: boolean }) => {
      if (!canManageUsers) throw new Error("No permission.");

      if (isPlatformView) {
        if (!canManagePlatform)
          throw new Error("Platform users: SYSTEM admin only.");
        await setPlatformUserVerified(args.userId, args.value);
        return;
      }

      if (!canManageTenant)
        throw new Error("Select a tenant org to manage users.");
      await setUserVerified(String(effectiveOrgId), args.userId, args.value);
    },
    onSuccess: refreshNow,
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
      right={
        <Badge>
          {isSystemMode ? (isPlatformView ? "Platform" : "Org") : "Tenant"}
        </Badge>
      }
    >
      <Card
        title="Users"
        right={
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={refreshNow}
              disabled={
                usersQ.isFetching || (!isPlatformView && !hasOrgContext)
              }
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
          </div>
        }
      >
        {/* ✅ SYSTEM: Organization selector ALWAYS visible */}
        {isSystemMode ? (
          <div className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <SelectField
              label="Organization (optional)"
              value={selectedOrgId}
              onChange={(v) => {
                setSelectedOrgId(v);
                setPage(0);
                setQ("");
              }}
              options={orgOptions}
              disabled={orgsQ.isLoading || orgsQ.isError}
              error={orgsQ.isError ? "Failed to load organizations" : ""}
              emptyLabel={
                orgsQ.isLoading
                  ? "Loading organizations…"
                  : "— Platform Users (no org) —"
              }
            />
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
                placeholder={
                  isPlatformView
                    ? "Search platform users..."
                    : "Search tenant users..."
                }
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
                    <td
                      colSpan={10}
                      className="px-3 py-6 text-sm text-slate-600"
                    >
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
                          <div className="text-sm font-bold text-slate-900">
                            {fullName(u)}
                          </div>
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
                            <StatusCheck
                              label="Active"
                              checked={active}
                              disabled={!canManageUsers || activeM.isPending}
                              onToggle={(next) =>
                                activeM.mutate({
                                  userId: u.userId,
                                  value: next,
                                })
                              }
                            />
                            <StatusCheck
                              label="Verified"
                              checked={verified}
                              disabled={!canManageUsers || verifiedM.isPending}
                              onToggle={(next) =>
                                verifiedM.mutate({
                                  userId: u.userId,
                                  value: next,
                                })
                              }
                            />
                          </div>
                        </td>

                        <td className="border-b border-slate-100 px-3 py-2">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              className="h-9 w-9 rounded-xl border border-slate-200 hover:bg-slate-50 disabled:opacity-50"
                              title="Edit"
                              onClick={() => openEdit(u)}
                              disabled={!canManageUsers}
                            >
                              <Pencil
                                size={16}
                                className="mx-auto text-slate-700"
                              />
                            </button>

                            <button
                              type="button"
                              className="h-9 w-9 rounded-xl border border-slate-200 hover:bg-slate-50 disabled:opacity-50"
                              title={active ? "Deactivate" : "Activate"}
                              disabled={!canManageUsers || activeM.isPending}
                              onClick={() =>
                                activeM.mutate({
                                  userId: u.userId,
                                  value: !active,
                                })
                              }
                            >
                              {active ? (
                                <PowerOff
                                  size={16}
                                  className="mx-auto text-amber-600"
                                />
                              ) : (
                                <Power
                                  size={16}
                                  className="mx-auto text-emerald-600"
                                />
                              )}
                            </button>

                            <button
                              type="button"
                              className="h-9 w-9 rounded-xl border border-slate-200 hover:bg-slate-50 disabled:opacity-50"
                              title={verified ? "Unverify" : "Verify"}
                              disabled={!canManageUsers || verifiedM.isPending}
                              onClick={() =>
                                verifiedM.mutate({
                                  userId: u.userId,
                                  value: !verified,
                                })
                              }
                            >
                              {verified ? (
                                <ShieldX
                                  size={16}
                                  className="mx-auto text-amber-600"
                                />
                              ) : (
                                <ShieldCheck
                                  size={16}
                                  className="mx-auto text-emerald-600"
                                />
                              )}
                            </button>

                            <button
                              type="button"
                              className="h-9 w-9 rounded-xl border border-slate-200 hover:bg-slate-50 disabled:opacity-50"
                              title={
                                isPlatformView
                                  ? "Platform delete not enabled"
                                  : "Delete"
                              }
                              disabled={
                                isPlatformView ||
                                !canManageTenant ||
                                deleteM.isPending
                              }
                              onClick={() => {
                                const ok = window.confirm(
                                  `Delete user "${fullName(u)}"?`
                                );
                                if (ok) deleteM.mutate(u);
                              }}
                            >
                              <Trash2
                                size={16}
                                className="mx-auto text-red-600"
                              />
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

      {/* Modal */}
      <Modal
        open={modalOpen}
        title={editing ? "Edit User" : "Add User"}
        onClose={() => {
          if (saveM.isPending) return;
          setModalOpen(false);
          setEditing(null);
        }}
      >
        {saveM.isError ? (
          <div className="mb-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {(saveM.error as any)?.message ?? "Save failed."}
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <TextField
            label="First Name"
            required
            value={form.firstName}
            onChange={(v) => setForm((p) => ({ ...p, firstName: v }))}
            error={touched.firstName ? errors.firstName : ""}
            onBlur={() => setTouched((t) => ({ ...t, firstName: true }))}
          />
          <TextField
            label="Last Name"
            required
            value={form.lastName}
            onChange={(v) => setForm((p) => ({ ...p, lastName: v }))}
            error={touched.lastName ? errors.lastName : ""}
            onBlur={() => setTouched((t) => ({ ...t, lastName: true }))}
          />
          <TextField
            label="Username"
            required
            value={form.userName}
            onChange={(v) => setForm((p) => ({ ...p, userName: v }))}
            error={touched.userName ? errors.userName : ""}
            onBlur={() => setTouched((t) => ({ ...t, userName: true }))}
          />
          <TextField
            label="Email"
            type="email"
            required
            value={form.email}
            onChange={(v) => setForm((p) => ({ ...p, email: v }))}
            error={touched.email ? errors.email : ""}
            onBlur={() => setTouched((t) => ({ ...t, email: true }))}
          />
          <TextField
            label="Position"
            value={form.position}
            onChange={(v) => setForm((p) => ({ ...p, position: v }))}
          />
          <TextField
            label="Phone"
            value={form.phoneNumber}
            onChange={(v) => {
              setForm((p) => ({ ...p, phoneNumber: v }));
              if (!v.trim()) setPhoneHasIllegalChar(false);
              else setPhoneHasIllegalChar(!/^[0-9]+$/.test(v.trim()));
            }}
            error={phoneHasIllegalChar ? "Digits only." : ""}
            placeholder="Digits only"
            inputMode="numeric"
          />

          {/* ✅ Role:
              - SYSTEM dashboard: fully editable
              - NEC/TENANT: only tenant roles selectable;
                if editing a system-level role user, field is read-only and shows current role
          */}
          <SelectField
            label="Role"
            required
            value={form.roleName}
            onChange={(v) => setForm((p) => ({ ...p, roleName: v as any }))}
            options={roleOptions}
            disabled={isProtectedTenantRoleEdit}
            error={touched.roleName ? errors.roleName : ""}
          />

          <SelectField
            label="Assigned County"
            value={form.assignedCountyId}
            onChange={(v) => setForm((p) => ({ ...p, assignedCountyId: v }))}
            options={countyOptions}
            disabled={
              isPlatformView || countiesQ.isLoading || countiesQ.isError
            }
            error={
              isPlatformView
                ? ""
                : countiesQ.isError
                ? "Failed to load counties"
                : ""
            }
            emptyLabel={isPlatformView ? "—" : "None"}
          />

          {!editing ? (
            <div className="block">
              <TextField
                label="Password"
                type="password"
                required
                value={form.password}
                onChange={(v) => setForm((p) => ({ ...p, password: v }))}
                error={touched.password ? errors.password : ""}
                onBlur={() => setTouched((t) => ({ ...t, password: true }))}
                placeholder="" // ✅ no placeholder
                name="new-password" // ✅ stops autofill guessing
                autoComplete="new-password" // ✅ blocks saved passwords
                selectAllOnFocus // ✅ typing replaces dots (no delete)
              />
              <div className="mt-1 text-[11px] text-slate-500">
                Set initial password
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div className="text-[11px] font-semibold text-slate-600">
                Password
              </div>
              <div className="mt-1 text-xs text-slate-600">
                Password reset will be added later.
              </div>
            </div>
          )}
        </div>

        <div className="mt-4 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => {
              if (saveM.isPending) return;
              setModalOpen(false);
              setEditing(null);
            }}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold hover:bg-slate-50"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={() => {
              setTouched({
                firstName: true,
                lastName: true,
                userName: true,
                email: true,
                password: true,
                roleName: true,
              });
              if (!isValid) return;
              saveM.mutate();
            }}
            disabled={saveM.isPending || !canManageUsers || !isValid}
            className="rounded-xl bg-(--org-primary) px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {saveM.isPending ? "Saving…" : "Save"}
          </button>
        </div>
      </Modal>
    </AdminShell>
  );
}

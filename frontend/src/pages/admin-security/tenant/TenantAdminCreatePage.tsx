// src/pages/admin-security/tenant/TenantAdminCreatePage.tsx

import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  ArrowLeft,
  Building2,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Save,
  ShieldCheck,
  UserRound,
  X,
} from "lucide-react";

import { useAuthStore } from "../../../shared/store/authStore";
import type { UserCreateRequest } from "../../../auth/userTypes";
import { createTenantAdmin } from "../../../shared/services/userService";
import {
  fetchOrganizations as fetchOrganizationsPaged,
  type Organization,
} from "../../../shared/services/organizationService";
import { searchParties } from "../../../shared/services/partyService";

// ============================================================================
// TYPES
// ============================================================================

type AppRoleName = UserCreateRequest["roleName"];

type LocationState = {
  orgId?: string;
};

type TenantAdminFormState = {
  orgId: string;
  partyId: string;
  firstName: string;
  lastName: string;
  userName: string;
  email: string;
  position: string;
  phoneNumber: string;
  roleName: AppRoleName | "";
  password: string;
};

// ============================================================================
// ROLE OPTIONS
// ============================================================================

const TENANT_ADMIN_ROLE_OPTIONS: Array<{
  value: AppRoleName;
  label: string;
}> = [
  { value: "TENANT_ADMIN", label: "Tenant Admin" },
  { value: "ADMIN", label: "Admin" },
];

// ============================================================================
// HELPERS
// ============================================================================

function safeStr(value: unknown): string {
  if (typeof value === "string") return value;
  if (value == null) return "";
  return String(value);
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function isValidPhone(value: string): boolean {
  if (!value.trim()) return true;
  return /^[0-9]+$/.test(value.trim());
}

function resolveTenantAdminRole(value: unknown): AppRoleName | undefined {
  const role = safeStr(value);
  if (role === "TENANT_ADMIN" || role === "ADMIN") return role;
  return undefined;
}

function friendlyError(error: any): string {
  return (
    error?.response?.data?.message ??
    error?.response?.data?.error ??
    error?.message ??
    "Unable to create tenant administrator."
  );
}

// ============================================================================
// PAGE
// ============================================================================

export default function TenantAdminCreatePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();

  // ==========================================================================
  // ACCESS
  // ==========================================================================

  const dashboardMode = useAuthStore((state) => state.dashboardMode);
  const isSystemMode = dashboardMode === "SYSTEM";
  const routeState = (location.state ?? {}) as LocationState;

  // ==========================================================================
  // FORM
  // ==========================================================================

  const [form, setForm] = useState<TenantAdminFormState>({
    orgId: safeStr(routeState.orgId),
    partyId: "",
    firstName: "",
    lastName: "",
    userName: "",
    email: "",
    position: "",
    phoneNumber: "",
    roleName: "",
    password: "",
  });

  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // ==========================================================================
  // ORGANIZATIONS
  // ==========================================================================

  const organizationsQuery = useQuery({
    queryKey: ["lookups", "orgs", "tenant-admin-create"],
    queryFn: async () => {
      const response = await fetchOrganizationsPaged({
        page: 0,
        size: 200,
        search: undefined,
        active: undefined,
        orgType: undefined,
        orgId: undefined,
      } as any);
      return (response.items ?? []) as Organization[];
    },
    enabled: isSystemMode,
    staleTime: 60_000,
    retry: 1,
  });

  // ==========================================================================
  // ORGANIZATION OPTIONS
  // ==========================================================================

  const organizationOptions = useMemo(() => {
    return (organizationsQuery.data ?? [])
      .map((organization) => ({
        value: organization.orgId,
        label: organization.subdomain
          ? `${organization.orgName} (${organization.subdomain})`
          : organization.orgName,
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [organizationsQuery.data]);

  // ==========================================================================
  // SELECTED ORGANIZATION
  // ==========================================================================

  const selectedOrganization = useMemo(() => {
    return (organizationsQuery.data ?? []).find(
      (organization) => organization.orgId === form.orgId,
    );
  }, [organizationsQuery.data, form.orgId]);

  // ==========================================================================
  // PARTIES
  // ==========================================================================

  const partiesQuery = useQuery({
    queryKey: ["lookups", "parties", "tenant-admin-create"],
    queryFn: async () => {
      const response = await searchParties({
        page: 0,
        size: 200,
        q: undefined,
      });
      return response.items ?? [];
    },
    enabled: isSystemMode,
    staleTime: 60_000,
    retry: 1,
  });

  // ==========================================================================
  // SELECTED ORGANIZATION PARTY ID
  // ==========================================================================

  const organizationPartyId = safeStr(
    (selectedOrganization as any)?.partyId,
  ).trim();

  // ==========================================================================
  // FILTER PARTY TO SELECTED ORGANIZATION
  // ==========================================================================

  const filteredPartyOptions = useMemo(() => {
    if (!organizationPartyId) return [];

    const matchedParty = (partiesQuery.data ?? []).find(
      (party) => safeStr(party.partyId) === organizationPartyId,
    );

    if (matchedParty) {
      return [
        {
          value: matchedParty.partyId,
          label: matchedParty.abbreviation
            ? `${matchedParty.partyName} (${matchedParty.abbreviation})`
            : matchedParty.partyName,
        },
      ];
    }

    const organizationPartyName = safeStr(
      (selectedOrganization as any)?.partyName,
    );
    const organizationPartyAbbreviation = safeStr(
      (selectedOrganization as any)?.partyAbbreviation,
    );

    if (organizationPartyName) {
      return [
        {
          value: organizationPartyId,
          label: organizationPartyAbbreviation
            ? `${organizationPartyName} (${organizationPartyAbbreviation})`
            : organizationPartyName,
        },
      ];
    }

    return [{ value: organizationPartyId, label: "Linked Party" }];
  }, [organizationPartyId, partiesQuery.data, selectedOrganization]);

  // ==========================================================================
  // AUTO-SYNC PARTY WHEN ORGANIZATION CHANGES
  // ==========================================================================

  useEffect(() => {
    setForm((current) => {
      const nextPartyId = organizationPartyId || "";
      if (current.partyId === nextPartyId) return current;
      return { ...current, partyId: nextPartyId };
    });
  }, [organizationPartyId]);

  // ==========================================================================
  // VALIDATION
  // ==========================================================================

  const errors = useMemo(() => {
    const result: Record<string, string> = {};

    if (!form.orgId.trim()) result.orgId = "Required";
    if (!form.firstName.trim()) result.firstName = "Required";
    if (!form.lastName.trim()) result.lastName = "Required";
    if (!form.userName.trim()) result.userName = "Required";
    if (!form.email.trim()) {
      result.email = "Required";
    } else if (!isValidEmail(form.email)) {
      result.email = "Invalid email";
    }
    if (!isValidPhone(form.phoneNumber)) result.phoneNumber = "Digits only";
    if (!resolveTenantAdminRole(form.roleName)) result.roleName = "Required";
    if (!form.password.trim()) result.password = "Required";

    return result;
  }, [form]);

  const isValid = Object.keys(errors).length === 0;

  // ==========================================================================
  // CREATE TENANT ADMIN
  // ==========================================================================

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!isSystemMode) {
        throw new Error(
          "Tenant administrators can only be created from the SYSTEM dashboard.",
        );
      }

      if (!isValid) {
        throw new Error("Please correct the highlighted fields.");
      }

      const roleName = resolveTenantAdminRole(form.roleName);
      if (!roleName) {
        throw new Error("Administrator role must be ADMIN or TENANT_ADMIN.");
      }

      const payload: UserCreateRequest = {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        userName: form.userName.trim(),
        email: form.email.trim(),
        position: form.position.trim() || undefined,
        phoneNumber: form.phoneNumber.trim() || undefined,
        password: form.password.trim(),
        roleName,
        partyId: form.partyId.trim() || undefined,
      };

      return await createTenantAdmin(form.orgId, payload);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["users"] });
      navigate("/admin-security/users", {
        replace: true,
        state: { orgId: form.orgId },
      });
    },
  });

  // ==========================================================================
  // SUBMIT
  // ==========================================================================

  function submitForm() {
    setTouched({
      orgId: true,
      firstName: true,
      lastName: true,
      userName: true,
      email: true,
      phoneNumber: true,
      roleName: true,
      password: true,
    });

    if (!isValid) return;
    createMutation.mutate();
  }

  // ==========================================================================
  // ACCESS GUARD
  // ==========================================================================

  if (!isSystemMode) {
    return (
      <div className="app-content min-h-screen bg-slate-50/50 p-4 sm:p-6">
        <div className="mx-auto w-full max-w-2xl pt-10">
          <div className="rounded-2xl border border-amber-200/80 bg-amber-50/80 p-6 shadow-sm backdrop-blur-sm">
            <div className="flex items-start gap-4">
              <div className="rounded-xl bg-amber-100 p-2.5 text-amber-700">
                <AlertCircle size={22} />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-amber-950">
                  SYSTEM Access Required
                </h3>
                <p className="text-sm text-amber-800/90 leading-relaxed">
                  Tenant administrators can only be created from the SYSTEM
                  dashboard mode. Please check your active workspace role.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => navigate("/admin-security/users")}
              className="mt-6 inline-flex items-center gap-2 rounded-xl border border-amber-300/80 bg-white px-4 py-2.5 text-sm font-semibold text-amber-900 shadow-sm transition hover:bg-amber-50 hover:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 active:scale-[0.98]"
            >
              <ArrowLeft size={16} />
              Back to Users
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================================================
  // RENDER
  // ==========================================================================

  return (
    <div className="app-content min-h-screen bg-slate-50/50 py-6 px-4 sm:px-6">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
        {/* HEADER */}
        <header className="flex min-w-0 items-center justify-between gap-4 pb-1">
          <div className="flex min-w-0 items-center gap-3.5">
            <button
              type="button"
              onClick={() => navigate(-1)}
              disabled={createMutation.isPending}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 active:scale-95 disabled:opacity-50"
              aria-label="Go back"
            >
              <ArrowLeft size={18} />
            </button>

            <div className="min-w-0">
              <h1 className="truncate text-xl font-bold tracking-tight text-slate-900">
                Create Tenant Administrator
              </h1>
              <p className="mt-0.5 truncate text-xs font-medium text-slate-500">
                Provision administrator credentials and access control for an
                organization.
              </p>
            </div>
          </div>

          <span className="inline-flex shrink-0 items-center rounded-full border border-violet-200 bg-violet-50/80 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-violet-700 shadow-xs">
            System Only
          </span>
        </header>

        {/* ERROR NOTIFICATION */}
        {createMutation.isError ? (
          <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50/90 p-4 shadow-xs">
            <AlertCircle size={20} className="mt-0.5 shrink-0 text-red-600" />
            <div className="space-y-0.5">
              <h4 className="text-sm font-bold text-red-900">
                Unable to create tenant administrator
              </h4>
              <p className="text-sm text-red-700">
                {friendlyError(createMutation.error)}
              </p>
            </div>
          </div>
        ) : null}

        {/* FORM CONTAINER */}
        <main className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm ring-1 ring-slate-900/5">
          {/* TENANT ASSIGNMENT */}
          <FormSection title="Tenant Assignment" icon={<Building2 size={18} />}>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <SelectField
                label="Organization"
                required
                value={form.orgId}
                onChange={(value) => {
                  setForm((current) => ({
                    ...current,
                    orgId: value,
                    partyId: "",
                  }));
                }}
                onBlur={() =>
                  setTouched((current) => ({ ...current, orgId: true }))
                }
                options={organizationOptions}
                placeholder={
                  organizationsQuery.isLoading
                    ? "Loading organizations..."
                    : "Select organization"
                }
                disabled={organizationsQuery.isLoading}
                error={touched.orgId ? errors.orgId : ""}
              />

              <SelectField
                label="Party"
                value={form.partyId}
                onChange={() => {}}
                options={filteredPartyOptions}
                placeholder={
                  !form.orgId
                    ? "Select organization first"
                    : organizationPartyId
                      ? partiesQuery.isLoading &&
                        filteredPartyOptions.length === 0
                        ? "Loading linked party..."
                        : "Linked party"
                      : "No party linked"
                }
                disabled
              />
            </div>
          </FormSection>

          {/* ADMINISTRATOR INFORMATION */}
          <FormSection
            title="Administrator Information"
            icon={<UserRound size={18} />}
            borderTop
          >
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <TextField
                label="First Name"
                required
                value={form.firstName}
                onChange={(value) =>
                  setForm((current) => ({ ...current, firstName: value }))
                }
                onBlur={() =>
                  setTouched((current) => ({ ...current, firstName: true }))
                }
                error={touched.firstName ? errors.firstName : ""}
                placeholder="First name"
                autoComplete="given-name"
              />

              <TextField
                label="Last Name"
                required
                value={form.lastName}
                onChange={(value) =>
                  setForm((current) => ({ ...current, lastName: value }))
                }
                onBlur={() =>
                  setTouched((current) => ({ ...current, lastName: true }))
                }
                error={touched.lastName ? errors.lastName : ""}
                placeholder="Last name"
                autoComplete="family-name"
              />

              <TextField
                label="Username"
                required
                value={form.userName}
                onChange={(value) =>
                  setForm((current) => ({ ...current, userName: value }))
                }
                onBlur={() =>
                  setTouched((current) => ({ ...current, userName: true }))
                }
                error={touched.userName ? errors.userName : ""}
                placeholder="username"
                autoComplete="username"
              />

              <TextField
                label="Email Address"
                required
                type="email"
                value={form.email}
                onChange={(value) =>
                  setForm((current) => ({ ...current, email: value }))
                }
                onBlur={() =>
                  setTouched((current) => ({ ...current, email: true }))
                }
                error={touched.email ? errors.email : ""}
                placeholder="admin@example.com"
                autoComplete="email"
              />

              <TextField
                label="Position"
                value={form.position}
                onChange={(value) =>
                  setForm((current) => ({ ...current, position: value }))
                }
                placeholder="e.g. Executive Director"
              />

              <TextField
                label="Phone Number"
                value={form.phoneNumber}
                onChange={(value) =>
                  setForm((current) => ({ ...current, phoneNumber: value }))
                }
                onBlur={() =>
                  setTouched((current) => ({ ...current, phoneNumber: true }))
                }
                error={touched.phoneNumber ? errors.phoneNumber : ""}
                placeholder="Digits only"
                inputMode="numeric"
                autoComplete="tel"
              />
            </div>
          </FormSection>

          {/* ACCESS & SECURITY */}
          <FormSection
            title="Access & Security"
            icon={<ShieldCheck size={18} />}
            borderTop
          >
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <SelectField
                label="Administrator Role"
                required
                value={form.roleName}
                onChange={(value) =>
                  setForm((current) => ({
                    ...current,
                    roleName: resolveTenantAdminRole(value) ?? "",
                  }))
                }
                onBlur={() =>
                  setTouched((current) => ({ ...current, roleName: true }))
                }
                options={TENANT_ADMIN_ROLE_OPTIONS}
                placeholder="Select role"
                error={touched.roleName ? errors.roleName : ""}
              />

              <PasswordField
                label="Initial Password"
                required
                value={form.password}
                onChange={(value) =>
                  setForm((current) => ({ ...current, password: value }))
                }
                onBlur={() =>
                  setTouched((current) => ({ ...current, password: true }))
                }
                error={touched.password ? errors.password : ""}
              />
            </div>

            <div className="mt-4 flex items-center gap-2 text-xs font-medium text-slate-500">
              <KeyRound size={14} className="text-slate-400" />
              <span>
                Password can be changed later from user security settings.
              </span>
            </div>
          </FormSection>
        </main>

        {/* STICKY ACTIONS FOOTER */}
        <footer className="sticky bottom-4 z-20 flex items-center justify-end gap-3 rounded-2xl border border-slate-200/80 bg-white/90 px-4 py-3 shadow-lg shadow-slate-900/5 backdrop-blur-md">
          <button
            type="button"
            onClick={() => navigate(-1)}
            disabled={createMutation.isPending}
            className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-xs transition hover:bg-slate-50 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 active:scale-95 disabled:opacity-50"
          >
            <X size={16} />
            Cancel
          </button>

          <button
            type="button"
            onClick={submitForm}
            disabled={createMutation.isPending}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white shadow-xs transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600/30 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {createMutation.isPending ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Creating…</span>
              </>
            ) : (
              <>
                <Save size={16} />
                <span>Create Tenant Admin</span>
              </>
            )}
          </button>
        </footer>
      </div>
    </div>
  );
}

// ============================================================================
// FORM SECTION
// ============================================================================

function FormSection({
  title,
  icon,
  borderTop = false,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  borderTop?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={[
        "p-6 sm:p-7",
        borderTop ? "border-t border-slate-100" : "",
      ].join(" ")}
    >
      <div className="mb-5 flex items-center gap-2.5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
          {icon}
        </div>
        <h2 className="text-base font-bold text-slate-900">{title}</h2>
      </div>

      {children}
    </div>
  );
}

// ============================================================================
// FIELD LABEL
// ============================================================================

function FieldLabel({
  label,
  required,
  error,
}: {
  label: string;
  required?: boolean;
  error?: string;
}) {
  return (
    <div className="mb-1.5 flex items-center justify-between gap-2">
      <span className="text-xs font-semibold text-slate-700 sm:text-sm">
        {label}
        {required ? <span className="ml-0.5 text-red-500">*</span> : null}
      </span>

      {error ? (
        <span className="text-xs font-medium text-red-600">{error}</span>
      ) : null}
    </div>
  );
}

// ============================================================================
// TEXT FIELD
// ============================================================================

function TextField({
  label,
  value,
  onChange,
  onBlur,
  type = "text",
  placeholder,
  required,
  disabled,
  error,
  inputMode,
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  autoComplete?: string;
}) {
  return (
    <label className="block min-w-0">
      <FieldLabel label={label} required={required} error={error} />

      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
        disabled={disabled}
        placeholder={placeholder}
        inputMode={inputMode}
        autoComplete={autoComplete}
        className={[
          "h-10 w-full rounded-xl border bg-white px-3.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition duration-150",
          error
            ? "border-red-300 focus:border-red-500 focus:ring-4 focus:ring-red-500/10"
            : "border-slate-200 hover:border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10",
          disabled
            ? "cursor-not-allowed bg-slate-50/80 text-slate-500 hover:border-slate-200"
            : "",
        ].join(" ")}
      />
    </label>
  );
}

// ============================================================================
// SELECT FIELD
// ============================================================================

function SelectField({
  label,
  value,
  onChange,
  onBlur,
  options,
  placeholder,
  required,
  disabled,
  error,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  options: Array<{ value: string; label: string }>;
  placeholder: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
}) {
  return (
    <label className="block min-w-0">
      <FieldLabel label={label} required={required} error={error} />

      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
        disabled={disabled}
        className={[
          "h-10 w-full rounded-xl border bg-white px-3.5 text-sm text-slate-900 outline-none transition duration-150",
          error
            ? "border-red-300 focus:border-red-500 focus:ring-4 focus:ring-red-500/10"
            : "border-slate-200 hover:border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10",
          disabled
            ? "cursor-not-allowed bg-slate-50/80 text-slate-500 hover:border-slate-200"
            : "",
        ].join(" ")}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

// ============================================================================
// PASSWORD FIELD
// ============================================================================

function PasswordField({
  label,
  value,
  onChange,
  onBlur,
  required,
  error,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  required?: boolean;
  error?: string;
}) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <label className="block min-w-0">
      <FieldLabel label={label} required={required} error={error} />

      <div className="relative">
        <input
          type={showPassword ? "text" : "password"}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onBlur={onBlur}
          autoComplete="new-password"
          className={[
            "h-10 w-full rounded-xl border bg-white pl-3.5 pr-10 text-sm text-slate-900 outline-none transition duration-150",
            error
              ? "border-red-300 focus:border-red-500 focus:ring-4 focus:ring-red-500/10"
              : "border-slate-200 hover:border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10",
          ].join(" ")}
        />

        <button
          type="button"
          onClick={() => setShowPassword((current) => !current)}
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-slate-500/20"
          aria-label={showPassword ? "Hide password" : "Show password"}
        >
          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    </label>
  );
}

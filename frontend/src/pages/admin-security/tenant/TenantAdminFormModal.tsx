// src/pages/admin-security/security/TenantAdminFormModal.tsx

import React from "react";
import type { UseMutationResult } from "@tanstack/react-query";
import type { RoleName } from "../../../auth/userTypes";
import { X, AlertCircle } from "lucide-react";

function Modal({
  open,
  title,
  subtitle,
  children,
  onClose,
}: {
  open: boolean;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  if (!open) return null;
  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
        <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden flex flex-col max-h-[95vh] sm:max-h-[90vh]">
          {/* HEADER */}
          <div className="bg-gradient-to-r from-blue-600 via-blue-500 to-blue-400 px-4 sm:px-6 py-5 sm:py-6 border-b border-blue-600 flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
                👨‍💼 {title}
              </h2>
              {subtitle && (
                <p className="text-xs sm:text-sm font-semibold text-blue-100 mt-1">
                  {subtitle}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex-shrink-0 h-9 w-9 rounded-lg border-2 border-blue-300 hover:bg-blue-700 bg-blue-600 transition text-white flex items-center justify-center"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>

          {/* CONTENT */}
          <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 sm:py-5">
            {children}
          </div>
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
  inputMode,
  name,
  autoComplete,
  selectAllOnFocus,
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
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  name?: string;
  autoComplete?: string;
  selectAllOnFocus?: boolean;
}) {
  return (
    <label className="block">
      <div className="mb-2 flex items-center justify-between">
        <div className="text-sm font-semibold text-slate-900">
          {label} {required ? <span className="text-red-600">*</span> : null}
        </div>
        {error && (
          <div className="flex items-center gap-1 text-xs sm:text-sm font-semibold text-red-600">
            <AlertCircle size={14} />
            {error}
          </div>
        )}
      </div>
      <input
        name={name}
        autoComplete={autoComplete}
        type={type ?? "text"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        onFocus={(e) => {
          if (selectAllOnFocus) setTimeout(() => e.currentTarget.select(), 0);
        }}
        inputMode={inputMode}
        disabled={disabled}
        placeholder={placeholder}
        className={`w-full rounded-lg border px-3 py-2.5 text-base outline-none transition ${
          error
            ? "border-red-300 bg-red-50 text-red-900 placeholder:text-red-400 focus:ring-2 focus:ring-red-400"
            : "border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500"
        } ${disabled ? "bg-slate-50 cursor-not-allowed opacity-60" : ""}`}
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
      <div className="mb-2 flex items-center justify-between">
        <div className="text-sm font-semibold text-slate-900">
          {label} {required ? <span className="text-red-600">*</span> : null}
        </div>
        {error && (
          <div className="flex items-center gap-1 text-xs sm:text-sm font-semibold text-red-600">
            <AlertCircle size={14} />
            {error}
          </div>
        )}
      </div>
      <select
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full rounded-lg border px-3 py-2.5 text-base outline-none transition ${
          error
            ? "border-red-300 bg-red-50 text-red-900 focus:ring-2 focus:ring-red-400"
            : "border-slate-300 bg-white text-slate-900 focus:ring-2 focus:ring-blue-500"
        } ${disabled ? "bg-slate-50 cursor-not-allowed opacity-60" : ""}`}
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

function TenantAdminFormModal(props: {
  open: boolean;
  onClose: () => void;

  createM: UseMutationResult<any, any, void, any>;
  isValid: boolean;

  errors: Record<string, string>;
  touched: { [k: string]: boolean };
  setTouched: React.Dispatch<React.SetStateAction<{ [k: string]: boolean }>>;

  form: {
    orgId: string;
    partyId: string;
    firstName: string;
    lastName: string;
    userName: string;
    email: string;
    position: string;
    phoneNumber: string;
    password: string;
    roleName: RoleName | "";
  };
  setForm: React.Dispatch<
    React.SetStateAction<{
      orgId: string;
      partyId: string;
      firstName: string;
      lastName: string;
      userName: string;
      email: string;
      position: string;
      phoneNumber: string;
      password: string;
      roleName: RoleName | "";
    }>
  >;

  phoneHasIllegalChar: boolean;
  setPhoneHasIllegalChar: React.Dispatch<React.SetStateAction<boolean>>;

  orgOptions: { value: string; label: string }[];
  partyOptions: { value: string; label: string }[];
  partiesQ: { isLoading: boolean; isError: boolean };
}) {
  const {
    open,
    onClose,
    createM,
    isValid,
    errors,
    touched,
    setTouched,
    form,
    setForm,
    phoneHasIllegalChar,
    setPhoneHasIllegalChar,
    orgOptions,
    partyOptions,
    partiesQ,
  } = props;

  const tenantAdminRoleOptions = [
    { value: "TENANT_ADMIN", label: "TENANT_ADMIN" },
    { value: "ADMIN", label: "ADMIN" },
    { value: "PARTY_ADMIN", label: "PARTY_ADMIN" },
  ];

  return (
    <Modal
      open={open}
      title="Add Tenant Admin"
      subtitle="SYSTEM only: Creates first tenant admin for a target organization. Party is optional."
      onClose={() => {
        if (createM.isPending) return;
        onClose();
      }}
    >
      {/* Error Message */}
      {createM.isError && (
        <div className="mb-4 flex gap-3 rounded-lg border border-red-200 bg-red-50 p-3">
          <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
          <div className="text-sm text-red-700 font-semibold">
            {(createM.error as any)?.message ?? "Create failed."}
          </div>
        </div>
      )}

      {/* Form Fields - Responsive Grid */}
      <div className="space-y-4">
        {/* Row 1: Organization & Party */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <SelectField
            label="Tenant (Organization)"
            required
            value={form.orgId}
            onChange={(v) => setForm((p) => ({ ...p, orgId: v }))}
            options={orgOptions}
            error={touched.orgId ? errors.orgId : ""}
            emptyLabel="Select tenant…"
          />

          <SelectField
            label="Party"
            value={form.partyId}
            onChange={(v) => setForm((p) => ({ ...p, partyId: v }))}
            options={partyOptions}
            disabled={partiesQ.isLoading || partiesQ.isError}
            error={partiesQ.isError ? "Failed to load parties" : ""}
            emptyLabel={
              partiesQ.isLoading ? "Loading parties…" : "None (optional)"
            }
          />
        </div>

        {/* Row 2: First Name & Last Name */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <TextField
            label="First Name"
            required
            value={form.firstName}
            onChange={(v) => setForm((p) => ({ ...p, firstName: v }))}
            error={touched.firstName ? errors.firstName : ""}
            onBlur={() => setTouched((t) => ({ ...t, firstName: true }))}
            placeholder="John"
          />
          <TextField
            label="Last Name"
            required
            value={form.lastName}
            onChange={(v) => setForm((p) => ({ ...p, lastName: v }))}
            error={touched.lastName ? errors.lastName : ""}
            onBlur={() => setTouched((t) => ({ ...t, lastName: true }))}
            placeholder="Doe"
          />
        </div>

        {/* Row 3: Username & Email */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <TextField
            label="Username"
            required
            value={form.userName}
            onChange={(v) => setForm((p) => ({ ...p, userName: v }))}
            error={touched.userName ? errors.userName : ""}
            onBlur={() => setTouched((t) => ({ ...t, userName: true }))}
            placeholder="johndoe"
          />
          <TextField
            label="Email"
            type="email"
            required
            value={form.email}
            onChange={(v) => setForm((p) => ({ ...p, email: v }))}
            error={touched.email ? errors.email : ""}
            onBlur={() => setTouched((t) => ({ ...t, email: true }))}
            placeholder="john@example.com"
          />
        </div>

        {/* Row 4: Position & Phone */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <TextField
            label="Position"
            value={form.position}
            onChange={(v) => setForm((p) => ({ ...p, position: v }))}
            placeholder="e.g., Senior Officer"
          />
          <TextField
            label="Phone Number"
            value={form.phoneNumber}
            onChange={(v) => {
              setForm((p) => ({ ...p, phoneNumber: v }));
              if (!v.trim()) setPhoneHasIllegalChar(false);
              else setPhoneHasIllegalChar(!/^[0-9]+$/.test(v.trim()));
            }}
            error={phoneHasIllegalChar ? "Digits only" : ""}
            placeholder="Digits only"
            inputMode="numeric"
          />
        </div>

        {/* Row 5: Role & Password */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <SelectField
            label="Role"
            required
            value={form.roleName}
            onChange={(v) => setForm((p) => ({ ...p, roleName: v as any }))}
            options={tenantAdminRoleOptions}
            error={touched.roleName ? errors.roleName : ""}
          />

          <div>
            <TextField
              label="Password"
              type="password"
              required
              value={form.password}
              onChange={(v) => setForm((p) => ({ ...p, password: v }))}
              error={touched.password ? errors.password : ""}
              onBlur={() => setTouched((t) => ({ ...t, password: true }))}
              name="new-password"
              autoComplete="new-password"
              selectAllOnFocus
            />
            <div className="mt-1.5 text-xs text-slate-500 font-semibold">
              Set initial password
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-6 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-3 border-t border-slate-200 pt-4">
        <button
          type="button"
          onClick={() => {
            if (createM.isPending) return;
            onClose();
          }}
          className="px-4 h-10 rounded-lg border border-slate-300 bg-white text-slate-900 text-sm font-semibold hover:bg-slate-50 transition disabled:opacity-50 sm:min-w-fit"
        >
          Cancel
        </button>

        <button
          type="button"
          onClick={() => {
            setTouched({
              orgId: true,
              firstName: true,
              lastName: true,
              userName: true,
              email: true,
              password: true,
              roleName: true,
            });
            if (!isValid) return;
            createM.mutate();
          }}
          disabled={createM.isPending || !isValid}
          className={`px-4 h-10 rounded-lg text-sm font-semibold text-white transition flex items-center justify-center gap-2 sm:min-w-fit ${
            createM.isPending || !isValid
              ? "bg-slate-300 cursor-not-allowed opacity-60"
              : "bg-blue-600 hover:bg-blue-700 shadow-sm"
          }`}
        >
          {createM.isPending ? (
            <>
              <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span className="hidden sm:inline">Creating…</span>
            </>
          ) : (
            <>
              👤 Create Tenant Admin
            </>
          )}
        </button>
      </div>
    </Modal>
  );
}

export { TenantAdminFormModal };
export default TenantAdminFormModal;




// src/pages/admin-security/security/UsersFormModal.tsx
import React from "react";
import type { UseMutationResult } from "@tanstack/react-query";
import type { RoleName, UserDto } from "../../../auth/userTypes";

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
  onFocus?: () => void;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  name?: string;
  autoComplete?: string;
  selectAllOnFocus?: boolean;
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

export default function UsersFormModal(props: {
  open: boolean;
  editing: UserDto | null;
  onClose: () => void;

  saveM: UseMutationResult<any, any, void, any>;
  canManageUsers: boolean;
  isValid: boolean;

  errors: Record<string, string>;
  touched: { [k: string]: boolean };
  setTouched: React.Dispatch<React.SetStateAction<{ [k: string]: boolean }>>;

  form: {
    firstName: string;
    lastName: string;
    userName: string;
    email: string;
    position: string;
    phoneNumber: string;
    password: string;
    roleName: RoleName | "";
    assignedCountyId: string;
  };
  setForm: React.Dispatch<
    React.SetStateAction<{
      firstName: string;
      lastName: string;
      userName: string;
      email: string;
      position: string;
      phoneNumber: string;
      password: string;
      roleName: RoleName | "";
      assignedCountyId: string;
    }>
  >;

  phoneHasIllegalChar: boolean;
  setPhoneHasIllegalChar: React.Dispatch<React.SetStateAction<boolean>>;

  roleOptions: { value: string; label: string }[];
  isProtectedTenantRoleEdit: boolean;

  countyOptions: { value: string; label: string }[];
  countiesQ: { isLoading: boolean; isError: boolean };

  isPlatformView: boolean;
}) {
  const {
    open,
    editing,
    onClose,
    saveM,
    canManageUsers,
    isValid,
    errors,
    touched,
    setTouched,
    form,
    setForm,
    phoneHasIllegalChar,
    setPhoneHasIllegalChar,
    roleOptions,
    isProtectedTenantRoleEdit,
    countyOptions,
    countiesQ,
    isPlatformView,
  } = props;

  return (
    <Modal
      open={open}
      title={editing ? "Edit User" : "Add User"}
      onClose={() => {
        if (saveM.isPending) return;
        onClose();
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

        {/* ✅ Role */}
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
          disabled={isPlatformView || countiesQ.isLoading || countiesQ.isError}
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
              placeholder=""
              name="new-password"
              autoComplete="new-password"
              selectAllOnFocus
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
            onClose();
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
  );
}


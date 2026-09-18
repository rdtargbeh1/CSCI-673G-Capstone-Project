// src/pages/admin-security/security/UserCreateForm.tsx

import { useEffect, useMemo, useRef, useState } from "react";

import { useLocation, useNavigate, useParams } from "react-router-dom";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  ImagePlus,
  Loader2,
  Save,
  X,
} from "lucide-react";

import { useAuthStore } from "../../../shared/store/authStore";

import type {
  UserCreateRequest,
  UserDto,
  UserUpdateRequest,
} from "../../../auth/userTypes";

import {
  createPlatformUser,
  createUser,
  fetchUserById,
  updatePlatformUser,
  updateUser,
} from "../../../shared/services/userService";

import { uploadUserProfilePhoto } from "../../../shared/services/fileUploadService";

// ============================================================================
// TYPES
// ============================================================================

type AppRoleName = UserCreateRequest["roleName"];

type LocationState = {
  orgId?: string;
  platform?: boolean;
};

type UserFormState = {
  firstName: string;
  lastName: string;
  userName: string;
  email: string;
  position: string;
  phoneNumber: string;
  password: string;
  roleName: AppRoleName | "";
};

// ============================================================================
// ROLES
// ============================================================================

const TENANT_ALLOWED_ROLES: AppRoleName[] = [
  "TALLY_OFFICER",
  "AUDITOR",
  "COORDINATOR",
  "OBSERVER",
  "SUPERVISOR",
  "FIELD_OFFICER",
  "PRESIDING_OFFICER",
  "DATA_ENTRY",
];

const HIGH_LEVEL_ROLES: AppRoleName[] = [
  "SYSTEM_ADMIN",
  "NEC_ADMIN",
  "TENANT_ADMIN",
  "ADMIN",
];

const ALL_ROLES: AppRoleName[] = [
  "SYSTEM_ADMIN",
  "NEC_ADMIN",
  "TENANT_ADMIN",
  "ADMIN",
  "TALLY_OFFICER",
  "AUDITOR",
  "COORDINATOR",
  "OBSERVER",
  "SUPERVISOR",
  "FIELD_OFFICER",
  "PRESIDING_OFFICER",
  "DATA_ENTRY",
];

// ============================================================================
// HELPERS
// ============================================================================

function safeStr(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }

  if (value == null) {
    return "";
  }

  return String(value);
}

function resolveRole(value: unknown): AppRoleName | undefined {
  const text = safeStr(value);

  return ALL_ROLES.find((role) => role === text);
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function isValidPhone(value: string): boolean {
  if (!value.trim()) {
    return true;
  }

  return /^[0-9]+$/.test(value.trim());
}

function initials(form: UserFormState): string {
  const first = form.firstName.trim().charAt(0).toUpperCase();

  const last = form.lastName.trim().charAt(0).toUpperCase();

  const combined = `${first}${last}`;

  if (combined) {
    return combined;
  }

  return form.userName.trim().charAt(0).toUpperCase() || "U";
}

function friendlyError(error: any): string {
  return (
    error?.response?.data?.message ??
    error?.response?.data?.error ??
    error?.message ??
    "Something went wrong."
  );
}

// ============================================================================
// TEXT FIELD
// ============================================================================

function TextField({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  required,
  disabled,
  error,
  inputMode,
  autoComplete,
  showPasswordToggle,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  autoComplete?: string;
  showPasswordToggle?: boolean;
}) {
  const [showPassword, setShowPassword] = useState(false);

  const isPassword = type === "password";

  const inputType = isPassword && showPassword ? "text" : type;

  return (
    <label className="block min-w-0">
      <div
        className="
          mb-1.5
          flex
          items-center
          justify-between
          gap-2
        "
      >
        <span
          className="
            text-sm
            font-bold
            text-slate-700
          "
        >
          {label}

          {required ? <span className="text-red-600"> *</span> : null}
        </span>

        {error ? (
          <span
            className="
              text-xs
              font-semibold
              text-red-600
            "
          >
            {error}
          </span>
        ) : null}
      </div>

      <div className="relative">
        <input
          type={inputType}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled}
          placeholder={placeholder}
          inputMode={inputMode}
          autoComplete={autoComplete}
          className={[
            `
              h-11
              w-full
              rounded-lg
              border
              bg-white
              px-3
              text-sm
              text-slate-900
              outline-none
              transition

              sm:text-base
            `,
            isPassword ? "pr-11" : "",
            error
              ? `
                  border-red-300
                  focus:border-red-500
                  focus:ring-2
                  focus:ring-red-100
                `
              : `
                  border-slate-300
                  focus:border-blue-500
                  focus:ring-2
                  focus:ring-blue-100
                `,
            disabled
              ? `
                  cursor-not-allowed
                  bg-slate-100
                  text-slate-500
                `
              : "",
          ].join(" ")}
        />

        {isPassword && showPasswordToggle ? (
          <button
            type="button"
            onClick={() => setShowPassword((current) => !current)}
            className="
              absolute
              right-3
              top-1/2
              -translate-y-1/2
              text-slate-400
              transition
              hover:text-slate-700
            "
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        ) : null}
      </div>
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
  options,
  required,
  disabled,
  error,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: {
    value: string;
    label: string;
  }[];
  required?: boolean;
  disabled?: boolean;
  error?: string;
}) {
  return (
    <label className="block min-w-0">
      <div
        className="
          mb-1.5
          flex
          items-center
          justify-between
          gap-2
        "
      >
        <span
          className="
            text-sm
            font-bold
            text-slate-700
          "
        >
          {label}

          {required ? <span className="text-red-600"> *</span> : null}
        </span>

        {error ? (
          <span
            className="
              text-xs
              font-semibold
              text-red-600
            "
          >
            {error}
          </span>
        ) : null}
      </div>

      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        className={[
          `
            h-11
            w-full
            rounded-lg
            border
            bg-white
            px-3
            text-sm
            text-slate-900
            outline-none
            transition

            sm:text-base
          `,
          error
            ? `
                border-red-300
                focus:border-red-500
                focus:ring-2
                focus:ring-red-100
              `
            : `
                border-slate-300
                focus:border-blue-500
                focus:ring-2
                focus:ring-blue-100
              `,
          disabled
            ? `
                cursor-not-allowed
                bg-slate-100
                text-slate-500
              `
            : "",
        ].join(" ")}
      >
        <option value="">Select role</option>

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
// FORM SECTION HEADER
// ============================================================================

function FormSectionHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <div className="mb-4">
      <h3
        className="
          text-base
          font-extrabold
          text-slate-900
        "
      >
        {title}
      </h3>

      <p
        className="
          mt-0.5
          text-xs
          text-slate-500

          sm:text-sm
        "
      >
        {subtitle}
      </p>
    </div>
  );
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function UserCreateForm() {
  const navigate = useNavigate();

  const location = useLocation();

  const queryClient = useQueryClient();

  const { userId } = useParams<{
    userId: string;
  }>();

  // ==========================================================================
  // ROUTE / CONTEXT
  // ==========================================================================

  const routeState = (location.state ?? {}) as LocationState;

  const dashboardMode = useAuthStore((state) => state.dashboardMode);

  const currentOrgId = useAuthStore((state) => state.currentOrgId);

  const isSystemMode = dashboardMode === "SYSTEM";

  const isEditing = Boolean(userId);

  const isPlatformView = Boolean(routeState.platform);

  const effectiveOrgId = isPlatformView
    ? ""
    : safeStr(routeState.orgId) || safeStr(currentOrgId);

  const hasOrgContext = Boolean(effectiveOrgId.trim());

  const canManagePlatform = isPlatformView && isSystemMode;

  const canManageTenant =
    !isPlatformView &&
    (dashboardMode === "SYSTEM" ||
      dashboardMode === "NEC" ||
      (dashboardMode === "TENANT" && hasOrgContext));

  const canManage = canManagePlatform || canManageTenant;

  // ==========================================================================
  // FORM
  // ==========================================================================

  const [form, setForm] = useState<UserFormState>({
    firstName: "",
    lastName: "",
    userName: "",
    email: "",
    position: "",
    phoneNumber: "",
    password: "",
    roleName: "",
  });

  const [touched, setTouched] = useState(false);

  // ==========================================================================
  // PROFILE PHOTO
  // ==========================================================================

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [profileFile, setProfileFile] = useState<File | null>(null);

  const [localPreviewUrl, setLocalPreviewUrl] = useState("");

  const [existingProfileUrl, setExistingProfileUrl] = useState("");

  const [photoError, setPhotoError] = useState("");

  useEffect(() => {
    if (!profileFile) {
      setLocalPreviewUrl("");

      return;
    }

    const url = URL.createObjectURL(profileFile);

    setLocalPreviewUrl(url);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [profileFile]);

  const displayedPhotoUrl = localPreviewUrl || existingProfileUrl;

  // ==========================================================================
  // EDIT QUERY
  // ==========================================================================

  const userQuery = useQuery({
    queryKey: ["user", userId, isPlatformView ? "platform" : effectiveOrgId],

    enabled: isEditing && Boolean(userId) && (isPlatformView || hasOrgContext),

    queryFn: () =>
      fetchUserById(
        isPlatformView ? undefined : effectiveOrgId,

        userId!,
      ),

    staleTime: 10_000,

    retry: 1,
  });

  // ==========================================================================
  // LOAD EDIT USER
  // ==========================================================================

  useEffect(() => {
    const user = userQuery.data;

    if (!user) {
      return;
    }

    setForm({
      firstName: safeStr(user.firstName),

      lastName: safeStr(user.lastName),

      userName: safeStr(user.userName),

      email: safeStr(user.email),

      position: safeStr(user.position),

      phoneNumber: safeStr(user.phoneNumber),

      password: "",

      roleName: resolveRole(user.roleName) ?? "",
    });

    setExistingProfileUrl(safeStr(user.profileImageUrl));

    setProfileFile(null);

    setPhotoError("");
  }, [userQuery.data]);

  // ==========================================================================
  // ROLE PROTECTION
  // ==========================================================================

  const existingRole = resolveRole(userQuery.data?.roleName);

  const isProtectedTenantRoleEdit = Boolean(
    isEditing &&
    !isPlatformView &&
    !isSystemMode &&
    existingRole &&
    HIGH_LEVEL_ROLES.includes(existingRole),
  );

  const roleOptions = useMemo(() => {
    if (isSystemMode) {
      return ALL_ROLES.map((role) => ({
        value: role,

        label: role,
      }));
    }

    if (isProtectedTenantRoleEdit && existingRole) {
      const roles = new Set<AppRoleName>(TENANT_ALLOWED_ROLES);

      roles.add(existingRole);

      return Array.from(roles).map((role) => ({
        value: role,

        label: role,
      }));
    }

    return TENANT_ALLOWED_ROLES.map((role) => ({
      value: role,

      label: role,
    }));
  }, [isSystemMode, isProtectedTenantRoleEdit, existingRole]);

  // ==========================================================================
  // VALIDATION
  // ==========================================================================

  const errors = useMemo(() => {
    const result: Record<string, string> = {};

    if (!form.firstName.trim()) {
      result.firstName = "Required";
    }

    if (!form.lastName.trim()) {
      result.lastName = "Required";
    }

    if (!form.userName.trim()) {
      result.userName = "Required";
    }

    if (!form.email.trim()) {
      result.email = "Required";
    } else if (!isValidEmail(form.email)) {
      result.email = "Invalid email";
    }

    if (!isValidPhone(form.phoneNumber)) {
      result.phoneNumber = "Digits only";
    }

    const selectedRole = resolveRole(form.roleName);

    if (!selectedRole) {
      result.roleName = "Required";
    }

    if (!isEditing && !form.password.trim()) {
      result.password = "Required";
    }

    if (!isEditing && form.password.trim() && form.password.trim().length < 8) {
      result.password = "Minimum 8 characters";
    }

    if (
      selectedRole &&
      !isSystemMode &&
      !isProtectedTenantRoleEdit &&
      HIGH_LEVEL_ROLES.includes(selectedRole)
    ) {
      result.roleName = "Role not allowed";
    }

    return result;
  }, [form, isEditing, isSystemMode, isProtectedTenantRoleEdit]);

  const isValid = Object.keys(errors).length === 0;

  // ==========================================================================
  // PROFILE PHOTO SELECTION
  // ==========================================================================

  function selectProfilePhoto(file: File | null) {
    setPhotoError("");

    if (!file) {
      setProfileFile(null);

      return;
    }

    if (!file.type.startsWith("image/")) {
      setPhotoError("Please select an image file.");

      return;
    }

    setProfileFile(file);
  }

  function removeSelectedPhoto() {
    setProfileFile(null);

    setPhotoError("");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  // ==========================================================================
  // SAVE
  // ==========================================================================

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!canManage) {
        throw new Error("You do not have permission to manage users.");
      }

      if (!isValid) {
        throw new Error("Please correct the highlighted fields.");
      }

      const selectedRole = resolveRole(form.roleName);

      if (!selectedRole) {
        throw new Error("Role is required.");
      }

      let savedUser: UserDto;

      // ================================================================
      // CREATE
      // ================================================================

      if (!isEditing) {
        const payload: UserCreateRequest = {
          firstName: form.firstName.trim(),

          lastName: form.lastName.trim(),

          userName: form.userName.trim(),

          email: form.email.trim(),

          position: form.position.trim() || undefined,

          phoneNumber: form.phoneNumber.trim() || undefined,

          password: form.password,

          roleName: selectedRole,
        };

        if (isPlatformView) {
          savedUser = await createPlatformUser(payload);
        } else {
          if (!effectiveOrgId) {
            throw new Error("Organization context is required.");
          }

          savedUser = await createUser(effectiveOrgId, payload);
        }
      }

      // ================================================================
      // EDIT
      // ================================================================
      else {
        if (!userId) {
          throw new Error("Missing user ID.");
        }

        const roleForUpdate =
          isProtectedTenantRoleEdit && existingRole
            ? existingRole
            : selectedRole;

        const payload: UserUpdateRequest = {
          firstName: form.firstName.trim(),

          lastName: form.lastName.trim(),

          userName: form.userName.trim(),

          email: form.email.trim(),

          position: form.position.trim() || undefined,

          phoneNumber: form.phoneNumber.trim() || undefined,

          roleName: roleForUpdate,
        };

        if (isPlatformView) {
          savedUser = await updatePlatformUser(userId, payload);
        } else {
          if (!effectiveOrgId) {
            throw new Error("Organization context is required.");
          }

          savedUser = await updateUser(effectiveOrgId, userId, payload);
        }
      }

      // ================================================================
      // PROFILE PHOTO
      //
      // User must exist before FileUpload can reference system_users/userId.
      // TenantContext resolves authenticated uploader and organization.
      // ================================================================

      if (profileFile) {
        await uploadUserProfilePhoto({
          userId: savedUser.userId,

          file: profileFile,
        });
      }

      return savedUser;
    },

    onSuccess: async (savedUser) => {
      await queryClient.invalidateQueries({
        queryKey: ["users"],
      });

      await queryClient.invalidateQueries({
        queryKey: ["user", savedUser.userId],
      });

      navigate(-1);
    },
  });

  // ==========================================================================
  // SAVE CLICK
  // ==========================================================================

  function submitForm() {
    setTouched(true);

    if (!isValid) {
      return;
    }

    saveMutation.mutate();
  }

  // ==========================================================================
  // MISSING CONTEXT
  // ==========================================================================

  if (!isPlatformView && !hasOrgContext) {
    return (
      <div className="app-content">
        <div
          className="
            rounded-xl
            border
            border-amber-200
            bg-amber-50
            p-4
          "
        >
          <div
            className="
              font-bold
              text-amber-900
            "
          >
            Organization required
          </div>

          <div
            className="
              mt-1
              text-sm
              text-amber-800
            "
          >
            Return to the users list and select an organization before creating
            or editing this user.
          </div>

          <button
            type="button"
            onClick={() => navigate(-1)}
            className="
              mt-4
              inline-flex
              min-h-10
              items-center
              gap-2
              rounded-lg
              border
              border-amber-300
              bg-white
              px-3
              py-2
              text-sm
              font-bold
              text-amber-900
            "
          >
            <ArrowLeft size={17} />
            Go Back
          </button>
        </div>
      </div>
    );
  }

  // ==========================================================================
  // EDIT LOADING
  // ==========================================================================

  if (isEditing && userQuery.isLoading) {
    return (
      <div className="app-content">
        <div
          className="
            flex
            min-h-[240px]
            items-center
            justify-center
            rounded-xl
            border
            border-slate-200
            bg-white
          "
        >
          <div className="text-center">
            <Loader2
              size={28}
              className="
                mx-auto
                animate-spin
                text-blue-600
              "
            />

            <div
              className="
                mt-2
                text-sm
                font-semibold
                text-slate-600
              "
            >
              Loading user…
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================================================
  // EDIT ERROR
  // ==========================================================================

  if (isEditing && userQuery.isError) {
    return (
      <div className="app-content">
        <div
          className="
            rounded-xl
            border
            border-red-200
            bg-red-50
            p-4
          "
        >
          <div
            className="
              flex
              items-start
              gap-2
            "
          >
            <AlertCircle
              size={20}
              className="
                mt-0.5
                shrink-0
                text-red-600
              "
            />

            <div>
              <div
                className="
                  font-bold
                  text-red-800
                "
              >
                Unable to load user
              </div>

              <div
                className="
                  mt-1
                  text-sm
                  text-red-700
                "
              >
                {friendlyError(userQuery.error)}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => navigate(-1)}
            className="
              mt-4
              inline-flex
              min-h-10
              items-center
              gap-2
              rounded-lg
              border
              border-red-300
              bg-white
              px-3
              py-2
              text-sm
              font-bold
              text-red-700
            "
          >
            <ArrowLeft size={17} />
            Go Back
          </button>
        </div>
      </div>
    );
  }

  // ==========================================================================
  // RENDER
  // ==========================================================================

  return (
    <div className="app-content">
      <div
        className="
          mx-auto
          flex
          w-full
          max-w-6xl
          min-w-0
          flex-col
          gap-3
        "
      >
        {/* ================================================================== */}
        {/* PAGE HEADER */}
        {/* ================================================================== */}

        <div
          className="
            flex
            min-w-0
            items-center
            justify-between
            gap-3
          "
        >
          <div
            className="
              flex
              min-w-0
              items-center
              gap-3
            "
          >
            <button
              type="button"
              onClick={() => navigate(-1)}
              disabled={saveMutation.isPending}
              className="
                inline-flex
                h-10
                w-10
                shrink-0
                items-center
                justify-center
                rounded-lg
                border
                border-slate-300
                bg-white
                text-slate-700
                transition
                hover:bg-slate-50
                disabled:opacity-50
              "
              aria-label="Go back"
            >
              <ArrowLeft size={18} />
            </button>

            <div className="min-w-0">
              <h2
                className="
                  truncate
                  text-lg
                  font-extrabold
                  text-slate-900

                  sm:text-xl
                "
              >
                {isEditing ? "Edit User" : "Create User"}
              </h2>

              <p
                className="
                  mt-0.5
                  hidden
                  text-xs
                  text-slate-500

                  sm:block
                  sm:text-sm
                "
              >
                {isEditing
                  ? "Update account and profile information."
                  : "Create a new user account."}
              </p>
            </div>
          </div>

          <div
            className="
              shrink-0
              rounded-full
              bg-slate-100
              px-2.5
              py-1
              text-[11px]
              font-bold
              text-slate-700

              sm:px-3
              sm:py-1.5
              sm:text-xs
            "
          >
            {isPlatformView ? "Platform User" : "Organization User"}
          </div>
        </div>

        {/* ================================================================== */}
        {/* SAVE ERROR */}
        {/* ================================================================== */}

        {saveMutation.isError ? (
          <div
            className="
              flex
              items-start
              gap-2
              rounded-lg
              border
              border-red-200
              bg-red-50
              p-3
            "
          >
            <AlertCircle
              size={18}
              className="
                mt-0.5
                shrink-0
                text-red-600
              "
            />

            <div className="min-w-0">
              <div
                className="
                  text-sm
                  font-bold
                  text-red-800
                "
              >
                Save failed
              </div>

              <div
                className="
                  mt-0.5
                  text-sm
                  text-red-700
                "
              >
                {friendlyError(saveMutation.error)}
              </div>
            </div>
          </div>
        ) : null}

        {/* ================================================================== */}
        {/* MAIN USER FORM CARD */}
        {/* ================================================================== */}

        <section
          className="
            overflow-hidden
            rounded-xl
            border
            border-slate-200
            bg-white
          "
        >
          <div
            className="
              grid
              grid-cols-1

              lg:grid-cols-[190px_minmax(0,1fr)]
            "
          >
            {/* ================================================================ */}
            {/* PROFILE PHOTO */}
            {/* ================================================================ */}

            <aside
              className="
                border-b
                border-slate-200
                p-3

                sm:p-4

                lg:border-b-0
                lg:border-r
                lg:p-5
              "
            >
              {/* MOBILE / TABLET PROFILE */}

              <div
                className="
                  flex
                  items-center
                  gap-3

                  lg:hidden
                "
              >
                <div
                  className="
                    relative
                    flex
                    h-16
                    w-16
                    shrink-0
                    items-center
                    justify-center
                    overflow-hidden
                    rounded-full
                    border
                    border-slate-200
                    bg-blue-50
                    shadow-sm

                    sm:h-[72px]
                    sm:w-[72px]
                  "
                >
                  {displayedPhotoUrl ? (
                    <img
                      src={displayedPhotoUrl}
                      alt="User profile preview"
                      className="
                        h-full
                        w-full
                        object-cover
                      "
                    />
                  ) : (
                    <span
                      className="
                        text-xl
                        font-extrabold
                        text-blue-700
                      "
                    >
                      {initials(form)}
                    </span>
                  )}

                  {saveMutation.isPending && profileFile ? (
                    <div
                      className="
                        absolute
                        inset-0
                        flex
                        items-center
                        justify-center
                        bg-slate-900/50
                      "
                    >
                      <Loader2
                        size={20}
                        className="
                          animate-spin
                          text-white
                        "
                      />
                    </div>
                  ) : null}
                </div>

                <div
                  className="
                    min-w-0
                    flex-1
                  "
                >
                  <div
                    className="
                      text-sm
                      font-extrabold
                      text-slate-900
                    "
                  >
                    Profile Photo
                  </div>

                  <div
                    className="
                      mt-0.5
                      text-xs
                      text-slate-500
                    "
                  >
                    Optional profile image.
                  </div>

                  <div
                    className="
                      mt-2
                      flex
                      flex-wrap
                      items-center
                      gap-2
                    "
                  >
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={saveMutation.isPending}
                      className="
                        inline-flex
                        min-h-9
                        items-center
                        justify-center
                        gap-1.5
                        rounded-lg
                        border
                        border-blue-300
                        bg-blue-50
                        px-2.5
                        py-1.5
                        text-xs
                        font-bold
                        text-blue-700
                        transition
                        hover:bg-blue-100
                        disabled:cursor-not-allowed
                        disabled:opacity-50
                      "
                    >
                      <ImagePlus size={15} />

                      {displayedPhotoUrl ? "Change" : "Choose Photo"}
                    </button>

                    {profileFile ? (
                      <button
                        type="button"
                        onClick={removeSelectedPhoto}
                        disabled={saveMutation.isPending}
                        className="
                          inline-flex
                          min-h-9
                          items-center
                          gap-1
                          px-1
                          text-xs
                          font-bold
                          text-red-600
                          hover:text-red-700
                        "
                      >
                        <X size={14} />
                        Remove
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>

              {/* DESKTOP PROFILE */}

              <div
                className="
                  hidden

                  lg:block
                "
              >
                <div
                  className="
                    text-sm
                    font-extrabold
                    text-slate-900
                  "
                >
                  Profile Photo
                </div>

                <div
                  className="
                    mt-0.5
                    text-xs
                    text-slate-500
                  "
                >
                  Optional profile image.
                </div>

                <div
                  className="
                    mt-5
                    flex
                    flex-col
                    items-center
                    text-center
                  "
                >
                  <div
                    className="
                      relative
                      flex
                      h-24
                      w-24
                      items-center
                      justify-center
                      overflow-hidden
                      rounded-full
                      border
                      border-slate-200
                      bg-blue-50
                      shadow-sm
                    "
                  >
                    {displayedPhotoUrl ? (
                      <img
                        src={displayedPhotoUrl}
                        alt="User profile preview"
                        className="
                          h-full
                          w-full
                          object-cover
                        "
                      />
                    ) : (
                      <span
                        className="
                          text-2xl
                          font-extrabold
                          text-blue-700
                        "
                      >
                        {initials(form)}
                      </span>
                    )}

                    {saveMutation.isPending && profileFile ? (
                      <div
                        className="
                          absolute
                          inset-0
                          flex
                          items-center
                          justify-center
                          bg-slate-900/50
                        "
                      >
                        <Loader2
                          size={24}
                          className="
                            animate-spin
                            text-white
                          "
                        />
                      </div>
                    ) : null}
                  </div>

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={saveMutation.isPending}
                    className="
                      mt-4
                      inline-flex
                      min-h-9
                      items-center
                      justify-center
                      gap-1.5
                      rounded-lg
                      border
                      border-blue-300
                      bg-blue-50
                      px-3
                      py-1.5
                      text-xs
                      font-bold
                      text-blue-700
                      transition
                      hover:bg-blue-100
                      disabled:cursor-not-allowed
                      disabled:opacity-50
                    "
                  >
                    <ImagePlus size={15} />

                    {displayedPhotoUrl ? "Change Photo" : "Choose Photo"}
                  </button>

                  {profileFile ? (
                    <button
                      type="button"
                      onClick={removeSelectedPhoto}
                      disabled={saveMutation.isPending}
                      className="
                        mt-2
                        inline-flex
                        items-center
                        gap-1
                        text-xs
                        font-bold
                        text-red-600
                        hover:text-red-700
                      "
                    >
                      <X size={13} />
                      Remove
                    </button>
                  ) : null}

                  <p
                    className="
                      mt-3
                      max-w-[150px]
                      text-xs
                      leading-5
                      text-slate-500
                    "
                  >
                    Select an image to use as this user's profile photo.
                  </p>
                </div>
              </div>

              {/* FILE INPUT */}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) =>
                  selectProfilePhoto(event.target.files?.[0] ?? null)
                }
              />

              {/* PHOTO ERROR */}

              {photoError ? (
                <div
                  className="
                    mt-3
                    rounded-lg
                    border
                    border-red-200
                    bg-red-50
                    p-2
                    text-xs
                    font-semibold
                    text-red-700
                  "
                >
                  {photoError}
                </div>
              ) : null}
            </aside>

            {/* ================================================================ */}
            {/* FORM CONTENT */}
            {/* ================================================================ */}

            <div className="min-w-0">
              {/* ============================================================ */}
              {/* USER INFORMATION */}
              {/* ============================================================ */}

              <div
                className="
                  p-3

                  sm:p-4

                  md:p-5
                "
              >
                <FormSectionHeader
                  title="User Information"
                  subtitle="Basic identity and contact information."
                />

                <div
                  className="
                    grid
                    grid-cols-1
                    gap-x-4
                    gap-y-3

                    md:grid-cols-2
                    md:gap-y-4
                  "
                >
                  <TextField
                    label="First Name"
                    required
                    value={form.firstName}
                    onChange={(value) =>
                      setForm((current) => ({
                        ...current,
                        firstName: value,
                      }))
                    }
                    error={touched ? errors.firstName : ""}
                    placeholder="First name"
                  />

                  <TextField
                    label="Last Name"
                    required
                    value={form.lastName}
                    onChange={(value) =>
                      setForm((current) => ({
                        ...current,
                        lastName: value,
                      }))
                    }
                    error={touched ? errors.lastName : ""}
                    placeholder="Last name"
                  />

                  <TextField
                    label="Username"
                    required
                    value={form.userName}
                    onChange={(value) =>
                      setForm((current) => ({
                        ...current,
                        userName: value,
                      }))
                    }
                    error={touched ? errors.userName : ""}
                    placeholder="username"
                    autoComplete="username"
                  />

                  <TextField
                    label="Email Address"
                    required
                    type="email"
                    value={form.email}
                    onChange={(value) =>
                      setForm((current) => ({
                        ...current,
                        email: value,
                      }))
                    }
                    error={touched ? errors.email : ""}
                    placeholder="user@example.com"
                    autoComplete="email"
                  />

                  <TextField
                    label="Position"
                    value={form.position}
                    onChange={(value) =>
                      setForm((current) => ({
                        ...current,
                        position: value,
                      }))
                    }
                    placeholder="e.g. Presiding Officer"
                  />

                  <TextField
                    label="Phone Number"
                    value={form.phoneNumber}
                    onChange={(value) =>
                      setForm((current) => ({
                        ...current,
                        phoneNumber: value,
                      }))
                    }
                    error={touched ? errors.phoneNumber : ""}
                    placeholder="Digits only"
                    inputMode="numeric"
                    autoComplete="tel"
                  />
                </div>
              </div>

              {/* ============================================================ */}
              {/* ACCESS */}
              {/* ============================================================ */}

              <div
                className="
                  border-t
                  border-slate-200
                  p-3

                  sm:p-4

                  md:p-5
                "
              >
                <FormSectionHeader
                  title="Access"
                  subtitle="Set the user's system role."
                />

                <div
                  className="
                    grid
                    grid-cols-1
                    gap-3

                    md:grid-cols-2
                    md:gap-4
                  "
                >
                  <SelectField
                    label="Role"
                    required
                    value={form.roleName}
                    onChange={(value) =>
                      setForm((current) => ({
                        ...current,

                        roleName: resolveRole(value) ?? "",
                      }))
                    }
                    options={roleOptions}
                    disabled={isProtectedTenantRoleEdit}
                    error={touched ? errors.roleName : ""}
                  />

                  {isProtectedTenantRoleEdit ? (
                    <div
                      className="
                        self-end
                        rounded-lg
                        border
                        border-amber-200
                        bg-amber-50
                        p-3
                        text-sm
                        text-amber-800
                      "
                    >
                      This higher-level role is protected and will remain
                      unchanged.
                    </div>
                  ) : null}
                </div>
              </div>

              {/* ============================================================ */}
              {/* PASSWORD */}
              {/* ============================================================ */}

              {!isEditing ? (
                <div
                  className="
                    border-t
                    border-slate-200
                    p-3

                    sm:p-4

                    md:p-5
                  "
                >
                  <FormSectionHeader
                    title="Initial Password"
                    subtitle="Set the initial password for this account."
                  />

                  <div
                    className="
                      max-w-md
                    "
                  >
                    <TextField
                      label="Password"
                      required
                      type="password"
                      value={form.password}
                      onChange={(value) =>
                        setForm((current) => ({
                          ...current,

                          password: value,
                        }))
                      }
                      error={touched ? errors.password : ""}
                      autoComplete="new-password"
                      showPasswordToggle
                    />

                    <div
                      className="
                        mt-1.5
                        text-xs
                        text-slate-500
                      "
                    >
                      Minimum 8 characters.
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </section>

        {/* ================================================================== */}
        {/* FOOTER ACTIONS */}
        {/* ================================================================== */}

        <div
          className="
            sticky
            bottom-0
            z-10
            flex
            items-center
            justify-end
            gap-2
            border-t
            border-slate-200
            bg-white/95
            px-3
            py-2.5
            shadow-[0_-4px_12px_rgba(15,23,42,0.05)]
            backdrop-blur

            sm:rounded-xl
            sm:border
            sm:px-4
          "
        >
          <button
            type="button"
            onClick={() => navigate(-1)}
            disabled={saveMutation.isPending}
            className="
              inline-flex
              min-h-10
              items-center
              justify-center
              gap-1.5
              rounded-lg
              border
              border-slate-300
              bg-white
              px-3
              py-2
              text-sm
              font-bold
              text-slate-700
              transition
              hover:bg-slate-50
              disabled:opacity-50
            "
          >
            <X size={16} />
            Cancel
          </button>

          <button
            type="button"
            onClick={submitForm}
            disabled={saveMutation.isPending || !canManage}
            className="
              inline-flex
              min-h-10
              items-center
              justify-center
              gap-1.5
              rounded-lg
              bg-blue-600
              px-4
              py-2
              text-sm
              font-bold
              text-white
              shadow-sm
              transition
              hover:bg-blue-700
              disabled:cursor-not-allowed
              disabled:opacity-50
            "
          >
            {saveMutation.isPending ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Saving…
              </>
            ) : (
              <>
                <Save size={16} />

                {isEditing ? "Save Changes" : "Create User"}
              </>
            )}
          </button>
        </div>

        {/* ================================================================== */}
        {/* SUCCESS SUPPORT */}
        {/* ================================================================== */}

        {saveMutation.isSuccess ? (
          <div className="sr-only">
            <CheckCircle2 />
            User saved successfully.
          </div>
        ) : null}
      </div>
    </div>
  );
}

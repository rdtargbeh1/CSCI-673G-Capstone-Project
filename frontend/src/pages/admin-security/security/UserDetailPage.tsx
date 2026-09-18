// src/pages/admin-security/security/UserDetailPage.tsx

import { useEffect, useMemo, useState, type ReactNode } from "react";

import { useLocation, useNavigate, useParams } from "react-router-dom";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  AlertCircle,
  ArrowLeft,
  BadgeCheck,
  Eye,
  Fingerprint,
  KeyRound,
  LockKeyhole,
  Pencil,
  RefreshCw,
  ShieldCheck,
  ShieldX,
  Trash2,
  UserRound,
  UserRoundCheck,
  UserRoundX,
  X,
} from "lucide-react";

import { useAuthStore } from "../../../shared/store/authStore";

import type { UserDto } from "../../../auth/userTypes";

import {
  adminResetPassword,
  deleteUser,
  fetchUserById,
  setPlatformUserActive,
  setPlatformUserVerified,
  setUserActive,
  setUserVerified,
} from "../../../shared/services/userService";

import { fetchFileBlob } from "../../../shared/services/fileUploadService";

import AdminResetPasswordModal from "./AdminResetPasswordModal";

// ============================================================================
// TYPES
// ============================================================================

type LocationState = {
  orgId?: string;
  platform?: boolean;
};

type ActionVariant = "blue" | "green" | "amber" | "red" | "slate";

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

function fullName(user?: UserDto | null): string {
  if (!user) {
    return "—";
  }

  const name = `${safeStr(user.firstName)} ${safeStr(user.lastName)}`.trim();

  return name || safeStr(user.userName) || safeStr(user.email) || "—";
}

function initials(user?: UserDto | null): string {
  if (!user) {
    return "U";
  }

  const first = safeStr(user.firstName).trim().charAt(0).toUpperCase();

  const last = safeStr(user.lastName).trim().charAt(0).toUpperCase();

  const combined = `${first}${last}`;

  if (combined) {
    return combined;
  }

  return safeStr(user.userName).trim().charAt(0).toUpperCase() || "U";
}

function pickActive(user?: UserDto | null): boolean {
  const value =
    (user as any)?.isActive ?? (user as any)?.active ?? (user as any)?.enabled;

  return value === true || value === "true" || value === 1;
}

function pickVerified(user?: UserDto | null): boolean {
  const value = (user as any)?.isVerified ?? (user as any)?.verified;

  return value === true || value === "true" || value === 1;
}

function formatDateTime(value?: string | null): string {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleString();
}

function friendlyError(error: any): string {
  return (
    error?.response?.data?.message ??
    error?.response?.data?.error ??
    error?.message ??
    "The user could not be loaded."
  );
}

function activeStatusClasses(active: boolean) {
  return active
    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
    : "border-slate-300 bg-slate-100 text-slate-600";
}

function verifiedStatusClasses(verified: boolean) {
  return verified
    ? "border-blue-200 bg-blue-50 text-blue-700"
    : "border-amber-200 bg-amber-50 text-amber-700";
}

function isSystemAdminUser(user?: UserDto | null) {
  return (
    safeStr(user?.roleName) === "SYSTEM_ADMIN" ||
    (user as any)?.systemAdmin === true
  );
}

// ============================================================================
// PAGE
// ============================================================================

export default function UserDetailPage() {
  const navigate = useNavigate();

  const location = useLocation();

  const queryClient = useQueryClient();

  const { userId } = useParams<{
    userId: string;
  }>();

  // ==========================================================================
  // CONTEXT
  // ==========================================================================

  const routeState = (location.state ?? {}) as LocationState;

  const dashboardMode = useAuthStore((state) => state.dashboardMode);

  const currentOrgId = useAuthStore((state) => state.currentOrgId);

  const isSystemMode = dashboardMode === "SYSTEM";

  const isPlatformView =
    routeState.platform === true ||
    (isSystemMode &&
      !safeStr(routeState.orgId).trim() &&
      !safeStr(currentOrgId).trim());

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
  // PATHS
  // ==========================================================================

  const backToList = () => {
    navigate("/admin-security/users");
  };

  const openEdit = () => {
    if (!userId) {
      return;
    }

    navigate(`/admin-security/users/${userId}/edit`, {
      state: {
        orgId: isPlatformView ? undefined : effectiveOrgId,

        platform: isPlatformView,
      },
    });
  };

  // ==========================================================================
  // USER QUERY
  // ==========================================================================

  const userQuery = useQuery<UserDto>({
    enabled: Boolean(userId) && (isPlatformView || hasOrgContext),

    queryKey: ["user", userId, isPlatformView ? "platform" : effectiveOrgId],

    queryFn: () =>
      fetchUserById(
        isPlatformView ? undefined : effectiveOrgId,

        userId!,
      ),

    staleTime: 10_000,

    retry: 1,
  });

  const user = userQuery.data;

  const active = pickActive(user);

  const verified = pickVerified(user);

  const protectedSystemAdmin = isSystemAdminUser(user);

  // ==========================================================================
  // PROFILE PHOTO
  // ==========================================================================

  const [profilePhotoUrl, setProfilePhotoUrl] = useState("");

  const [profilePhotoLoading, setProfilePhotoLoading] = useState(false);

  const [profilePhotoError, setProfilePhotoError] = useState(false);

  const [photoViewerOpen, setPhotoViewerOpen] = useState(false);

  const profileImageUploadId = safeStr((user as any)?.profileImageUploadId);

  useEffect(() => {
    let activeRequest = true;

    let objectUrl = "";

    setProfilePhotoUrl("");

    setProfilePhotoError(false);

    if (!profileImageUploadId) {
      setProfilePhotoLoading(false);

      return;
    }

    setProfilePhotoLoading(true);

    fetchFileBlob(profileImageUploadId)
      .then((blob) => {
        if (!activeRequest) {
          return;
        }

        objectUrl = URL.createObjectURL(blob);

        setProfilePhotoUrl(objectUrl);
      })
      .catch(() => {
        if (activeRequest) {
          setProfilePhotoError(true);
        }
      })
      .finally(() => {
        if (activeRequest) {
          setProfilePhotoLoading(false);
        }
      });

    return () => {
      activeRequest = false;

      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [profileImageUploadId]);

  useEffect(() => {
    if (!photoViewerOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setPhotoViewerOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [photoViewerOpen]);

  // ==========================================================================
  // REFRESH
  // ==========================================================================

  async function refreshUser() {
    await queryClient.invalidateQueries({
      queryKey: ["users"],
    });

    await queryClient.invalidateQueries({
      queryKey: ["user", userId],
    });

    await userQuery.refetch();
  }

  // ==========================================================================
  // ACTIVE / INACTIVE
  // ==========================================================================

  const activeMutation = useMutation({
    mutationFn: async (value: boolean) => {
      if (!userId) {
        throw new Error("Missing user ID.");
      }

      if (!canManage) {
        throw new Error("You do not have permission to manage this user.");
      }

      if (isPlatformView) {
        if (!canManagePlatform) {
          throw new Error("Platform users can only be managed in SYSTEM mode.");
        }

        await setPlatformUserActive(userId, value);

        return;
      }

      if (!effectiveOrgId) {
        throw new Error("Organization context is required.");
      }

      await setUserActive(effectiveOrgId, userId, value);
    },

    onSuccess: refreshUser,
  });

  // ==========================================================================
  // VERIFIED / UNVERIFIED
  // ==========================================================================

  const verifiedMutation = useMutation({
    mutationFn: async (value: boolean) => {
      if (!userId) {
        throw new Error("Missing user ID.");
      }

      if (!canManage) {
        throw new Error("You do not have permission to manage this user.");
      }

      if (isPlatformView) {
        if (!canManagePlatform) {
          throw new Error("Platform users can only be managed in SYSTEM mode.");
        }

        await setPlatformUserVerified(userId, value);

        return;
      }

      if (!effectiveOrgId) {
        throw new Error("Organization context is required.");
      }

      await setUserVerified(effectiveOrgId, userId, value);
    },

    onSuccess: refreshUser,
  });

  // ==========================================================================
  // PASSWORD RESET
  // ==========================================================================

  const [resetPasswordOpen, setResetPasswordOpen] = useState(false);

  const resetPasswordMutation = useMutation({
    mutationFn: async (args: { newPassword: string; sendEmail: boolean }) => {
      if (!userId) {
        throw new Error("Missing user ID.");
      }

      if (!canManage) {
        throw new Error("You do not have permission to reset this password.");
      }

      const resetOrgId = isPlatformView ? undefined : effectiveOrgId;

      await adminResetPassword(
        resetOrgId,
        userId,
        args.newPassword,
        args.sendEmail,
      );
    },

    onSuccess: async () => {
      await refreshUser();

      setResetPasswordOpen(false);
    },
  });

  // ==========================================================================
  // DELETE
  // ==========================================================================

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!userId) {
        throw new Error("Missing user ID.");
      }

      if (!canManageTenant) {
        throw new Error("This delete action requires tenant context.");
      }

      if (!effectiveOrgId) {
        throw new Error("Organization context is required.");
      }

      if (protectedSystemAdmin) {
        throw new Error("SYSTEM_ADMIN cannot be deleted.");
      }

      await deleteUser(effectiveOrgId, userId);
    },

    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["users"],
      });

      backToList();
    },
  });

  // ==========================================================================
  // ACTION STATE
  // ==========================================================================

  const actionPending =
    activeMutation.isPending ||
    verifiedMutation.isPending ||
    resetPasswordMutation.isPending ||
    deleteMutation.isPending;

  const actionError =
    activeMutation.error ??
    verifiedMutation.error ??
    resetPasswordMutation.error ??
    deleteMutation.error;

  // ==========================================================================
  // MISSING CONTEXT
  // ==========================================================================

  if (!isPlatformView && !hasOrgContext) {
    return (
      <PageMessage
        title="Organization required"
        description="Return to the users list and select an organization before opening this user."
        onBack={backToList}
      />
    );
  }

  // ==========================================================================
  // MISSING ID
  // ==========================================================================

  if (!userId) {
    return (
      <PageMessage
        title="Missing user ID"
        description="The user ID could not be determined from the current route."
        onBack={backToList}
      />
    );
  }

  // ==========================================================================
  // LOADING
  // ==========================================================================

  if (userQuery.isLoading) {
    return (
      <div className="py-16 text-center">
        <div
          className="
            mx-auto
            h-7
            w-7
            animate-spin
            rounded-full
            border-2
            border-slate-200
            border-t-blue-600
          "
        />

        <div
          className="
            mt-3
            text-sm
            font-semibold
            text-slate-500
          "
        >
          Loading user...
        </div>
      </div>
    );
  }

  // ==========================================================================
  // ERROR
  // ==========================================================================

  if (userQuery.isError || !user) {
    const error: any = userQuery.error;

    const statusCode = error?.response?.status;

    const message = friendlyError(error);

    return (
      <PageMessage
        title="Unable to load user"
        description={statusCode ? `HTTP ${statusCode}: ${message}` : message}
        onBack={backToList}
      />
    );
  }

  // ==========================================================================
  // DERIVED
  // ==========================================================================

  const roleName = safeStr(user.roleName) || "—";

  const organizationName = safeStr((user as any).organizationName) || "—";

  const partyName = safeStr((user as any).partyName) || "—";

  const lockedUntil = safeStr((user as any).lockedUntil);

  const locked = Boolean(
    lockedUntil && new Date(lockedUntil).getTime() > Date.now(),
  );

  // ==========================================================================
  // RENDER
  // ==========================================================================

  return (
    <>
      <div
        className="
          mx-auto
          flex
          w-full
          max-w-[1280px]
          flex-col
          gap-3
        "
      >
        {/* ================================================================== */}
        {/* HEADER */}
        {/* ================================================================== */}

        <section
          className="
            border-b
            border-slate-200
            bg-white
            pb-4

            lg:rounded-xl
            lg:border
            lg:p-4
          "
        >
          <button
            type="button"
            onClick={backToList}
            className="
              inline-flex
              h-9
              w-fit
              items-center
              justify-center
              gap-1.5
              rounded-md
              bg-[#00095f]
              px-3
              text-xs
              font-bold
              leading-none
              text-white
              hover:bg-[#000b73]
            "
          >
            <ArrowLeft size={14} />
            Back
          </button>

          <div
            className="
              mt-3
              flex
              flex-col
              gap-4

              lg:flex-row
              lg:items-start
              lg:justify-between
            "
          >
            {/* IDENTITY */}

            <div
              className="
                flex
                min-w-0
                items-center
                gap-3

                sm:gap-4
              "
            >
              <ProfilePhoto
                user={user}
                photoUrl={profilePhotoUrl}
                loading={profilePhotoLoading}
                error={profilePhotoError}
              />

              <div className="min-w-0">
                <div
                  className="
                    flex
                    flex-wrap
                    items-center
                    gap-2
                  "
                >
                  <h1
                    className="
                      truncate
                      text-xl
                      font-extrabold
                      tracking-tight
                      text-slate-900

                      sm:text-2xl
                    "
                  >
                    {fullName(user)}
                  </h1>

                  <span
                    className={[
                      `
                        inline-flex
                        rounded-full
                        border
                        px-2.5
                        py-1
                        text-[10px]
                        font-bold

                        sm:text-xs
                      `,
                      activeStatusClasses(active),
                    ].join(" ")}
                  >
                    {active ? "ACTIVE" : "INACTIVE"}
                  </span>
                </div>

                <div
                  className="
                    mt-1
                    text-sm
                    font-bold
                    text-slate-700
                  "
                >
                  {roleName}
                </div>

                <div
                  className="
                    mt-1
                    flex
                    flex-wrap
                    items-center
                    gap-x-1.5
                    gap-y-1
                    text-xs
                    font-semibold
                    text-slate-500

                    sm:text-sm
                  "
                >
                  <span>@{safeStr(user.userName) || "—"}</span>

                  {user.position ? (
                    <>
                      <span className="text-slate-300">•</span>

                      <span>{user.position}</span>
                    </>
                  ) : null}
                </div>
              </div>
            </div>

            {/* ACTIONS */}

            <div
              className="
                grid
                grid-cols-2
                gap-2

                sm:flex
                sm:flex-wrap

                lg:max-w-xl
                lg:justify-end
              "
            >
              <ActionButton
                label="Edit"
                icon={<Pencil size={14} />}
                onClick={openEdit}
                disabled={!canManage || actionPending}
                variant="blue"
              />

              {!protectedSystemAdmin ? (
                <ActionButton
                  label="Reset Password"
                  icon={<KeyRound size={14} />}
                  onClick={() => setResetPasswordOpen(true)}
                  disabled={!canManage || actionPending}
                  variant="slate"
                />
              ) : null}

              <ActionButton
                label={active ? "Deactivate" : "Activate"}
                icon={
                  active ? (
                    <UserRoundX size={14} />
                  ) : (
                    <UserRoundCheck size={14} />
                  )
                }
                onClick={() => activeMutation.mutate(!active)}
                disabled={!canManage || actionPending || protectedSystemAdmin}
                variant={active ? "amber" : "green"}
              />

              <ActionButton
                label={verified ? "Unverify" : "Verify"}
                icon={
                  verified ? <ShieldX size={14} /> : <ShieldCheck size={14} />
                }
                onClick={() => verifiedMutation.mutate(!verified)}
                disabled={!canManage || actionPending || protectedSystemAdmin}
                variant={verified ? "amber" : "green"}
              />

              <ActionButton
                label="Refresh"
                icon={<RefreshCw size={14} />}
                onClick={refreshUser}
                disabled={actionPending || userQuery.isFetching}
                variant="slate"
              />

              {!isPlatformView && !protectedSystemAdmin ? (
                <ActionButton
                  label="Delete"
                  icon={<Trash2 size={14} />}
                  onClick={() => {
                    const confirmed = window.confirm(
                      `Delete ${fullName(user)}?`,
                    );

                    if (confirmed) {
                      deleteMutation.mutate();
                    }
                  }}
                  disabled={!canManageTenant || actionPending}
                  variant="red"
                />
              ) : null}
            </div>
          </div>

          {/* SUMMARY */}

          <div
            className="
              mt-4
              grid
              grid-cols-2
              border-y
              border-slate-200
              py-3

              sm:grid-cols-4
            "
          >
            <SummaryValue
              label="Account"
              value={active ? "Active" : "Inactive"}
              emphasis={active}
            />

            <SummaryValue
              label="Verified"
              value={verified ? "Yes" : "No"}
              emphasis={verified}
            />

            <SummaryValue label="Role" value={roleName} />

            <SummaryValue
              label="Last Login"
              value={formatDateTime((user as any).lastLogin)}
            />
          </div>
        </section>

        {/* ================================================================== */}
        {/* ACTION ERROR */}
        {/* ================================================================== */}

        {actionError ? (
          <div
            className="
              flex
              items-start
              gap-2
              rounded-xl
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

            <div>
              <div
                className="
                  text-sm
                  font-bold
                  text-red-800
                "
              >
                Action failed
              </div>

              <div
                className="
                  mt-0.5
                  text-sm
                  text-red-700
                "
              >
                {friendlyError(actionError)}
              </div>
            </div>
          </div>
        ) : null}

        {/* ================================================================== */}
        {/* PRIMARY DETAIL GRID */}
        {/* ================================================================== */}

        <div
          className="
            grid
            gap-3

            lg:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.85fr)]
          "
        >
          {/* LEFT */}

          <div
            className="
              min-w-0
              space-y-3
            "
          >
            {/* USER INFORMATION */}

            <Section title="User Information" icon={<UserRound size={16} />}>
              <div
                className="
                  divide-y
                  divide-slate-200

                  sm:grid
                  sm:grid-cols-2
                  sm:divide-y-0
                "
              >
                <InfoRow
                  label="First Name"
                  value={safeStr(user.firstName) || "—"}
                />

                <InfoRow
                  label="Last Name"
                  value={safeStr(user.lastName) || "—"}
                />

                <InfoRow
                  label="Username"
                  value={safeStr(user.userName) || "—"}
                />

                <InfoRow
                  label="Position"
                  value={safeStr(user.position) || "—"}
                />

                <InfoRow
                  label="Email"
                  value={
                    <span className="break-all">
                      {safeStr(user.email) || "—"}
                    </span>
                  }
                />

                <InfoRow
                  label="Phone"
                  value={safeStr(user.phoneNumber) || "—"}
                />
              </div>
            </Section>

            {/* ACCESS & ROLE */}

            <Section title="Access & Role" icon={<BadgeCheck size={16} />}>
              <div
                className="
                  divide-y
                  divide-slate-200

                  sm:grid
                  sm:grid-cols-2
                  sm:divide-y-0
                "
              >
                <InfoRow
                  label="Role"
                  value={
                    <span
                      className="
                        font-bold
                        text-blue-700
                      "
                    >
                      {roleName}
                    </span>
                  }
                />

                <InfoRow label="Organization" value={organizationName} />

                <InfoRow
                  label="Party"
                  value={partyName}
                  className="
                    sm:col-span-2
                  "
                />
              </div>
            </Section>
          </div>

          {/* RIGHT / PROFILE */}

          <div className="min-w-0">
            <Section title="Profile" icon={<UserRound size={16} />}>
              {/* MOBILE */}

              <div
                className="
                  flex
                  items-center
                  gap-3
                  py-2

                  lg:hidden
                "
              >
                <ProfilePhoto
                  user={user}
                  photoUrl={profilePhotoUrl}
                  loading={profilePhotoLoading}
                  error={profilePhotoError}
                  compact
                />

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
                    {profilePhotoUrl
                      ? "Tap View Photo to see the full image."
                      : profilePhotoLoading
                        ? "Loading profile photo..."
                        : "No profile photo available."}
                  </div>

                  {profilePhotoUrl ? (
                    <button
                      type="button"
                      onClick={() => setPhotoViewerOpen(true)}
                      className="
                        mt-2
                        inline-flex
                        min-h-9
                        items-center
                        gap-1.5
                        rounded-lg
                        border
                        border-blue-200
                        bg-blue-50
                        px-3
                        text-xs
                        font-bold
                        text-blue-700
                        hover:bg-blue-100
                      "
                    >
                      <Eye size={15} />
                      View Photo
                    </button>
                  ) : null}
                </div>
              </div>

              {/* DESKTOP */}

              <div
                className="
                  hidden
                  flex-col
                  items-center
                  px-2
                  py-4
                  text-center

                  lg:flex
                "
              >
                <ProfilePhoto
                  user={user}
                  photoUrl={profilePhotoUrl}
                  loading={profilePhotoLoading}
                  error={profilePhotoError}
                  large
                />

                <div
                  className="
                    mt-3
                    text-lg
                    font-extrabold
                    text-slate-900
                  "
                >
                  {fullName(user)}
                </div>

                <div
                  className="
                    mt-1
                    text-sm
                    font-semibold
                    text-slate-500
                  "
                >
                  {roleName}
                </div>

                <div
                  className="
                    mt-3
                    flex
                    flex-wrap
                    justify-center
                    gap-2
                  "
                >
                  <span
                    className={[
                      `
                        rounded-full
                        border
                        px-2.5
                        py-1
                        text-xs
                        font-bold
                      `,
                      activeStatusClasses(active),
                    ].join(" ")}
                  >
                    {active ? "Active" : "Inactive"}
                  </span>

                  <span
                    className={[
                      `
                        rounded-full
                        border
                        px-2.5
                        py-1
                        text-xs
                        font-bold
                      `,
                      verifiedStatusClasses(verified),
                    ].join(" ")}
                  >
                    {verified ? "Verified" : "Not Verified"}
                  </span>
                </div>
              </div>
            </Section>
          </div>
        </div>

        {/* ================================================================== */}
        {/* SECURITY + RECORD INFORMATION */}
        {/* ================================================================== */}

        <div
          className="
            grid
            gap-3

            md:grid-cols-2
          "
        >
          {/* SECURITY */}

          <Section title="Security" icon={<LockKeyhole size={16} />}>
            <div
              className="
                divide-y
                divide-slate-200
              "
            >
              <InfoRow label="Verified" value={verified ? "Yes" : "No"} />

              <InfoRow
                label="Locked Until"
                value={lockedUntil ? formatDateTime(lockedUntil) : "—"}
              />

              <InfoRow
                label="Lock Status"
                value={
                  locked ? (
                    <span
                      className="
                        font-bold
                        text-red-700
                      "
                    >
                      Locked
                    </span>
                  ) : (
                    <span
                      className="
                        font-bold
                        text-emerald-700
                      "
                    >
                      Not Locked
                    </span>
                  )
                }
              />

              <InfoRow
                label="Password Changed"
                value={formatDateTime((user as any).lastPasswordChange)}
              />
            </div>
          </Section>

          {/* RECORD INFORMATION */}

          <Section title="Record Information" icon={<Fingerprint size={16} />}>
            <div
              className="
                divide-y
                divide-slate-200
              "
            >
              <InfoRow
                label="Created"
                value={formatDateTime((user as any).dateCreated)}
              />

              <InfoRow
                label="Updated"
                value={formatDateTime((user as any).dateUpdated)}
              />

              <InfoRow
                label="Last Login"
                value={formatDateTime((user as any).lastLogin)}
              />

              <InfoRow
                label="Signing Key"
                value={safeStr((user as any).signingKeyId) || "—"}
              />
            </div>
          </Section>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* PROFILE PHOTO VIEWER */}
      {/* ==================================================================== */}

      <ProfilePhotoViewer
        open={photoViewerOpen}
        user={user}
        photoUrl={profilePhotoUrl}
        onClose={() => setPhotoViewerOpen(false)}
      />

      {/* ==================================================================== */}
      {/* RESET PASSWORD */}
      {/* ==================================================================== */}

      <AdminResetPasswordModal
        open={resetPasswordOpen}
        user={resetPasswordOpen ? user : null}
        onClose={() => {
          if (resetPasswordMutation.isPending) {
            return;
          }

          setResetPasswordOpen(false);
        }}
        isSaving={resetPasswordMutation.isPending}
        errorText={
          resetPasswordMutation.isError
            ? friendlyError(resetPasswordMutation.error)
            : ""
        }
        disabledReason={
          !canManage
            ? "No permission to manage users."
            : !isPlatformView && !hasOrgContext
              ? "Organization context is required."
              : protectedSystemAdmin
                ? "SYSTEM_ADMIN password cannot be reset here."
                : ""
        }
        onSubmit={(newPassword, sendEmail) => {
          resetPasswordMutation.mutate({
            newPassword,
            sendEmail,
          });
        }}
      />
    </>
  );
}

// ============================================================================
// PROFILE PHOTO
// ============================================================================

function ProfilePhoto({
  user,
  photoUrl,
  loading,
  error,
  large = false,
  compact = false,
}: {
  user: UserDto;
  photoUrl: string;
  loading: boolean;
  error: boolean;
  large?: boolean;
  compact?: boolean;
}) {
  const dimension = large
    ? "h-28 w-28"
    : compact
      ? "h-14 w-14"
      : "h-14 w-14 sm:h-16 sm:w-16";

  const fontSize = large
    ? "text-3xl"
    : compact
      ? "text-lg"
      : "text-lg sm:text-xl";

  return (
    <div
      className={[
        `
          relative
          shrink-0
          overflow-hidden
          rounded-full
          border-2
          border-white
          bg-blue-50
          shadow-sm
        `,
        dimension,
      ].join(" ")}
    >
      {photoUrl ? (
        <img
          src={photoUrl}
          alt={`${fullName(user)} profile`}
          className="
            h-full
            w-full
            object-cover
          "
        />
      ) : (
        <div
          className="
            flex
            h-full
            w-full
            items-center
            justify-center
          "
        >
          <span
            className={[
              `
                font-extrabold
                text-blue-700
              `,
              fontSize,
            ].join(" ")}
          >
            {initials(user)}
          </span>
        </div>
      )}

      {loading ? (
        <div
          className="
            absolute
            inset-0
            flex
            items-center
            justify-center
            bg-white/75
          "
        >
          <div
            className="
              h-5
              w-5
              animate-spin
              rounded-full
              border-2
              border-slate-200
              border-t-blue-600
            "
          />
        </div>
      ) : null}

      {error && !photoUrl ? (
        <div
          className="
            absolute
            bottom-0
            left-0
            right-0
            bg-amber-100
            py-0.5
            text-center
            text-[8px]
            font-bold
            text-amber-700
          "
        >
          Unavailable
        </div>
      ) : null}
    </div>
  );
}

// ============================================================================
// PROFILE PHOTO VIEWER
// ============================================================================

function ProfilePhotoViewer({
  open,
  user,
  photoUrl,
  onClose,
}: {
  open: boolean;
  user: UserDto;
  photoUrl: string;
  onClose: () => void;
}) {
  if (!open || !photoUrl) {
    return null;
  }

  return (
    <div
      className="
        fixed
        inset-0
        z-[100]
        flex
        items-center
        justify-center
        bg-slate-950/75
        p-4
        backdrop-blur-sm
      "
      role="dialog"
      aria-modal="true"
      aria-label="Profile photo"
      onClick={onClose}
    >
      <div
        className="
          relative
          flex
          max-h-[90vh]
          w-full
          max-w-xl
          flex-col
          overflow-hidden
          rounded-2xl
          bg-white
          shadow-2xl
        "
        onClick={(event) => event.stopPropagation()}
      >
        <div
          className="
            flex
            items-center
            justify-between
            gap-3
            border-b
            border-slate-200
            px-4
            py-3
          "
        >
          <div className="min-w-0">
            <div
              className="
                truncate
                text-sm
                font-extrabold
                text-slate-900
              "
            >
              {fullName(user)}
            </div>

            <div
              className="
                mt-0.5
                text-xs
                text-slate-500
              "
            >
              Profile Photo
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="
              inline-flex
              h-9
              w-9
              items-center
              justify-center
              rounded-lg
              border
              border-slate-200
              bg-white
              text-slate-600
              hover:bg-slate-50
            "
            aria-label="Close profile photo"
          >
            <X size={18} />
          </button>
        </div>

        <div
          className="
            flex
            min-h-0
            flex-1
            items-center
            justify-center
            bg-slate-100
            p-3
          "
        >
          <img
            src={photoUrl}
            alt={`${fullName(user)} full profile`}
            className="
              max-h-[75vh]
              max-w-full
              rounded-xl
              object-contain
            "
          />
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// SECTION
// ============================================================================

function Section({
  title,
  icon,
  right,
  children,
}: {
  title: string;
  icon: ReactNode;
  right?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section
      className="
        border-b
        border-slate-200
        bg-white
        pb-1

        lg:overflow-hidden
        lg:rounded-xl
        lg:border
        lg:pb-0
      "
    >
      <div
        className="
          flex
          items-center
          justify-between
          gap-3
          border-b
          border-slate-200
          py-2.5

          lg:bg-slate-50
          lg:px-4
          lg:py-3
        "
      >
        <div
          className="
            flex
            min-w-0
            items-center
            gap-2
            text-sm
            font-extrabold
            text-slate-900

            sm:text-base
          "
        >
          <span
            className="
              shrink-0
              text-blue-600
            "
          >
            {icon}
          </span>

          <span className="truncate">{title}</span>
        </div>

        {right ? <div className="shrink-0">{right}</div> : null}
      </div>

      <div
        className="
          py-1

          lg:p-4
        "
      >
        {children}
      </div>
    </section>
  );
}

// ============================================================================
// INFO ROW
// ============================================================================

function InfoRow({
  label,
  value,
  className = "",
}: {
  label: string;
  value: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={[
        `
          grid
          min-w-0
          grid-cols-[105px_minmax(0,1fr)]
          items-start
          gap-3
          py-2.5

          sm:grid-cols-[135px_minmax(0,1fr)]
          sm:px-2

          lg:grid-cols-[125px_minmax(0,1fr)]
          lg:px-2
        `,
        className,
      ].join(" ")}
    >
      <div
        className="
          pt-0.5
          text-[10px]
          font-bold
          uppercase
          tracking-wide
          text-slate-400
        "
      >
        {label}
      </div>

      <div
        className="
          min-w-0
          break-words
          text-sm
          font-semibold
          text-slate-900
        "
      >
        {value}
      </div>
    </div>
  );
}

// ============================================================================
// SUMMARY
// ============================================================================

function SummaryValue({
  label,
  value,
  emphasis = false,
}: {
  label: string;
  value: ReactNode;
  emphasis?: boolean;
}) {
  return (
    <div
      className="
        min-w-0
        px-2
        text-center

        sm:px-3
      "
    >
      <div
        className={[
          `
            truncate
            text-[8px]
            font-bold
            uppercase
            tracking-wide

            sm:text-[9px]
          `,
          emphasis ? "text-blue-500" : "text-slate-400",
        ].join(" ")}
      >
        {label}
      </div>

      <div
        className={[
          `
            mt-1
            truncate
            text-sm
            font-extrabold

            sm:text-base
          `,
          emphasis ? "text-blue-700" : "text-slate-900",
        ].join(" ")}
      >
        {value}
      </div>
    </div>
  );
}

// ============================================================================
// ACTION BUTTON
// ============================================================================

function ActionButton({
  label,
  icon,
  onClick,
  disabled,
  variant,
}: {
  label: string;
  icon: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  variant: ActionVariant;
}) {
  const classes = useMemo(() => {
    switch (variant) {
      case "green":
        return "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100";

      case "amber":
        return "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100";

      case "red":
        return "border-red-200 bg-red-50 text-red-700 hover:bg-red-100";

      case "slate":
        return "border-slate-200 bg-white text-slate-700 hover:bg-slate-50";

      case "blue":

      default:
        return "border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100";
    }
  }, [variant]);

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={[
        `
          inline-flex
          min-h-10
          items-center
          justify-center
          gap-1.5
          rounded-lg
          border
          px-3
          text-xs
          font-bold
          transition

          sm:text-sm
        `,
        classes,
        disabled ? "cursor-not-allowed opacity-50" : "",
      ].join(" ")}
    >
      {icon}

      <span>{label}</span>
    </button>
  );
}

// ============================================================================
// PAGE MESSAGE
// ============================================================================

function PageMessage({
  title,
  description,
  onBack,
}: {
  title: string;
  description: string;
  onBack: () => void;
}) {
  return (
    <div
      className="
        mx-auto
        w-full
        max-w-[1280px]
      "
    >
      <div
        className="
          rounded-xl
          border
          border-slate-200
          bg-white
          p-5
        "
      >
        <div
          className="
            flex
            items-start
            gap-3
          "
        >
          <AlertCircle
            size={21}
            className="
              mt-0.5
              shrink-0
              text-amber-600
            "
          />

          <div className="min-w-0">
            <div
              className="
                font-extrabold
                text-slate-900
              "
            >
              {title}
            </div>

            <div
              className="
                mt-1
                text-sm
                text-slate-600
              "
            >
              {description}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onBack}
          className="
            mt-4
            inline-flex
            min-h-10
            items-center
            gap-2
            rounded-lg
            border
            border-slate-300
            bg-white
            px-3
            py-2
            text-sm
            font-bold
            text-slate-700
            hover:bg-slate-50
          "
        >
          <ArrowLeft size={16} />
          Back to Users
        </button>
      </div>
    </div>
  );
}

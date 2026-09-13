// src/pages/admin-security/security/UsersPage.tsx

import { useMemo, useState } from "react";

import { useLocation, useNavigate } from "react-router-dom";

import { useQuery, useQueryClient } from "@tanstack/react-query";

import {
  Eye,
  ListChecks,
  MapPinned,
  Plus,
  RefreshCw,
  Search,
  UserPlus,
  UserRound,
} from "lucide-react";

import { useAuthStore } from "../../../shared/store/authStore";

import type { UserDto } from "../../../auth/userTypes";

import {
  fetchPlatformUsers,
  fetchUsers,
} from "../../../shared/services/userService";

import { fetchOrganizations as fetchOrganizationsPaged } from "../../../shared/services/organizationService";

import { AdminShell, Badge, Card } from "../shared/admin-ui";

// ============================================================================
// CONSTANTS
// ============================================================================

const PAGE_SIZE = 20;

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

function fullName(user: any): string {
  const name = `${safeStr(user?.firstName)} ${safeStr(user?.lastName)}`.trim();

  return name || safeStr(user?.userName) || safeStr(user?.email) || "—";
}

function initials(user: any): string {
  const first = safeStr(user?.firstName).trim().charAt(0).toUpperCase();

  const last = safeStr(user?.lastName).trim().charAt(0).toUpperCase();

  const value = `${first}${last}`;

  if (value) {
    return value;
  }

  return safeStr(user?.userName).trim().charAt(0).toUpperCase() || "U";
}

function pickActive(user: any): boolean {
  const value = user?.isActive ?? user?.active ?? user?.enabled;

  return value === true || value === "true" || value === 1;
}

function pickVerified(user: any): boolean {
  const value = user?.isVerified ?? user?.verified;

  return value === true || value === "true" || value === 1;
}

function fmtDate(value?: string | null): string {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function filterUsersBySearch(users: any[], searchQuery: string): any[] {
  const query = searchQuery.trim().toLowerCase();

  if (!query) {
    return users;
  }

  return users.filter((user: any) => {
    const searchable = [
      fullName(user),

      safeStr(user?.userName),

      safeStr(user?.email),

      safeStr(user?.phoneNumber),

      safeStr(user?.position),

      safeStr(user?.roleName),
    ]
      .join(" ")
      .toLowerCase();

    return searchable.includes(query);
  });
}

function normalizeUsersResponse(data: any): {
  rows: UserDto[];
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

  return {
    rows,
    totalPages,
  };
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function UsersPage() {
  const navigate = useNavigate();

  const location = useLocation();

  const queryClient = useQueryClient();

  // ==========================================================================
  // AUTH / ORGANIZATION CONTEXT
  // ==========================================================================

  const dashboardMode = useAuthStore((state) => state.dashboardMode);

  const currentOrgId = useAuthStore((state) => state.currentOrgId);

  const isSystemMode = dashboardMode === "SYSTEM";

  const initialOrgId = safeStr(
    (location.state as { orgId?: string } | null)?.orgId,
  );

  const [selectedOrgId, setSelectedOrgId] = useState(
    isSystemMode ? initialOrgId : "",
  );

  const isPlatformView = isSystemMode && !selectedOrgId.trim();

  const effectiveOrgId = isSystemMode
    ? selectedOrgId
    : String(currentOrgId ?? "");

  const hasOrgContext = Boolean(effectiveOrgId.trim());

  const canManagePlatform = isPlatformView && isSystemMode;

  const canManageTenant =
    !isPlatformView &&
    (dashboardMode === "SYSTEM" ||
      dashboardMode === "NEC" ||
      (dashboardMode === "TENANT" && hasOrgContext));

  const canManageUsers = canManagePlatform || canManageTenant;

  // ==========================================================================
  // LIST STATE
  // ==========================================================================

  const [search, setSearch] = useState("");

  const [page, setPage] = useState(0);

  const [selectedUserId, setSelectedUserId] = useState<string>("");

  // ==========================================================================
  // ORGANIZATIONS
  // ==========================================================================

  const organizationsQuery = useQuery({
    queryKey: ["lookups", "orgs", "users"],

    queryFn: async () => {
      const response = await fetchOrganizationsPaged({
        page: 0,
        size: 200,
        search: undefined,
        active: undefined,
        orgType: undefined,
        orgId: undefined,
      } as any);

      return response.items;
    },

    enabled: isSystemMode,

    staleTime: 60_000,

    retry: 1,
  });

  const organizationOptions = useMemo(() => {
    return (organizationsQuery.data ?? []).map((organization) => ({
      value: organization.orgId,

      label: organization.subdomain
        ? `${organization.orgName} (${organization.subdomain})`
        : organization.orgName,
    }));
  }, [organizationsQuery.data]);

  // ==========================================================================
  // USERS
  // ==========================================================================

  const usersQuery = useQuery({
    queryKey: ["users", isPlatformView ? "platform" : effectiveOrgId],

    queryFn: async () => {
      if (isPlatformView) {
        return fetchPlatformUsers({
          page: 0,
          size: 1000,
          q: undefined,
        });
      }

      return fetchUsers(String(effectiveOrgId), {
        page: 0,
        size: 1000,
        q: undefined,
      });
    },

    enabled: isPlatformView || hasOrgContext,

    staleTime: 10_000,

    retry: 1,
  });

  const { rows } = normalizeUsersResponse(usersQuery.data);

  // ==========================================================================
  // FILTERED USERS
  // ==========================================================================

  const filteredUsers = useMemo(() => {
    return filterUsersBySearch(rows, search);
  }, [rows, search]);

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / PAGE_SIZE));

  const visibleUsers = useMemo(() => {
    const start = page * PAGE_SIZE;

    return filteredUsers.slice(start, start + PAGE_SIZE);
  }, [filteredUsers, page]);

  const selectedUser = useMemo(() => {
    return rows.find((user) => user.userId === selectedUserId);
  }, [rows, selectedUserId]);

  // ==========================================================================
  // REFRESH
  // ==========================================================================

  const refreshNow = async () => {
    await queryClient.invalidateQueries({
      queryKey: ["users"],
    });

    await usersQuery.refetch();
  };

  // ==========================================================================
  // CONTEXT
  // ==========================================================================

  function userRouteState() {
    return {
      orgId: isPlatformView ? undefined : effectiveOrgId,

      platform: isPlatformView,
    };
  }

  // ==========================================================================
  // CREATE
  // ==========================================================================

  function openCreateUser() {
    if (!canManageUsers) {
      return;
    }

    navigate("new", {
      state: userRouteState(),
    });
  }

  // ==========================================================================
  // CREATE TENANT ADMIN
  // ==========================================================================

  function openTenantAdminCreate() {
    if (!isSystemMode) {
      return;
    }

    navigate("/admin-security/tenant/admins/new", {
      state: {
        orgId: selectedOrgId.trim() || undefined,
      },
    });
  }

  // ==========================================================================
  // USER ASSIGNMENTS LIST
  // ==========================================================================

  function openAssignments() {
    if (isPlatformView || !effectiveOrgId || !canManageTenant) {
      return;
    }

    navigate("/admin-security/user-assignments", {
      state: {
        orgId: effectiveOrgId,
      },
    });
  }

  // ==========================================================================
  // DETAIL
  // ==========================================================================

  function openUserDetail(user: UserDto) {
    navigate(user.userId, {
      state: userRouteState(),
    });
  }

  // ==========================================================================
  // ASSIGN USER TO GEOGRAPHY
  // ==========================================================================

  function openGeographyAssignment() {
    if (!selectedUser) {
      return;
    }

    if (isPlatformView) {
      return;
    }

    if (!effectiveOrgId) {
      return;
    }

    navigate("/admin-security/user-assignments/new", {
      state: {
        userId: selectedUser.userId,

        user: selectedUser,

        orgId: effectiveOrgId,
      },
    });
  }

  // ==========================================================================
  // ORGANIZATION CHANGE
  // ==========================================================================

  function changeOrganization(value: string) {
    setSelectedOrgId(value);

    setSelectedUserId("");

    setSearch("");

    setPage(0);
  }

  // ==========================================================================
  // SEARCH CHANGE
  // ==========================================================================

  function changeSearch(value: string) {
    setSearch(value);

    setPage(0);
  }

  // ==========================================================================
  // CREATE BUTTON STATE
  // ==========================================================================

  const createDisabledReason = isPlatformView
    ? canManagePlatform
      ? ""
      : "Platform users can only be managed by SYSTEM admin."
    : !hasOrgContext
      ? "Select an organization first."
      : !canManageTenant
        ? "You do not have permission to create users."
        : "";

  // ==========================================================================
  // ASSIGNMENTS LIST BUTTON STATE
  // ==========================================================================

  const assignmentsDisabledReason = isPlatformView
    ? "Select an organization before viewing user assignments."
    : !hasOrgContext
      ? "Select an organization first."
      : !canManageTenant
        ? "You do not have permission to manage user assignments."
        : "";

  // ==========================================================================
  // ASSIGNMENT BUTTON STATE
  // ==========================================================================

  const assignmentDisabledReason = isPlatformView
    ? "Select an organization before assigning election geography."
    : !hasOrgContext
      ? "Select an organization first."
      : !canManageTenant
        ? "You do not have permission to assign users."
        : !selectedUser
          ? "Select a user first."
          : "";

  // ==========================================================================
  // RENDER
  // ==========================================================================

  return (
    <AdminShell
      title="Security • Users"
      subtitle={
        isSystemMode
          ? "Manage platform and organization users."
          : "Manage organization users."
      }
      right={
        <Badge>
          {isSystemMode
            ? isPlatformView
              ? "Platform"
              : "Organization"
            : "Tenant"}
        </Badge>
      }
    >
      <Card title="Users">
        <div className="flex min-w-0 flex-col gap-3">
          {/* ================================================================ */}
          {/* ACTION ROW */}
          {/* ================================================================ */}

          <div
            className="
              flex
              min-w-0
              flex-wrap
              items-center
              justify-between
              gap-2
            "
          >
            <div
              className="
                min-w-0
                text-sm
                font-semibold
                text-slate-600
              "
            >
              {selectedUser ? (
                <>
                  Selected:{" "}
                  <span className="font-bold text-slate-900">
                    {fullName(selectedUser)}
                  </span>
                </>
              ) : (
                "Select a user to assign election geography"
              )}
            </div>

            <div
              className="
                ml-auto
                flex
                shrink-0
                flex-wrap
                items-center
                justify-end
                gap-2
              "
            >
              {/* CREATE USER */}

              <button
                type="button"
                onClick={openCreateUser}
                disabled={Boolean(createDisabledReason)}
                title={createDisabledReason || "Create user"}
                className="
                  inline-flex
                  min-h-10
                  items-center
                  justify-center
                  gap-1.5
                  rounded-lg
                  bg-blue-600
                  px-3
                  py-2
                  text-sm
                  font-bold
                  text-white
                  shadow-sm
                  transition
                  hover:bg-blue-700
                  disabled:cursor-not-allowed
                  disabled:opacity-40
                "
              >
                <Plus size={17} />

                <span className="hidden sm:inline">Create User</span>

                <span className="sm:hidden">Create</span>
              </button>

              {/* CREATE TENANT ADMIN */}

              {isSystemMode ? (
                <button
                  type="button"
                  onClick={openTenantAdminCreate}
                  title="Create first tenant administrator"
                  className="
                    inline-flex
                    min-h-10
                    items-center
                    justify-center
                    gap-1.5
                    rounded-lg
                    border
                    border-indigo-300
                    bg-indigo-50
                    px-3
                    py-2
                    text-sm
                    font-bold
                    text-indigo-700
                    transition
                    hover:bg-indigo-100
                    disabled:cursor-not-allowed
                    disabled:opacity-40
                  "
                >
                  <UserPlus size={17} />

                  <span className="hidden sm:inline">Create Tenant Admin</span>

                  <span className="sm:hidden">Tenant Admin</span>
                </button>
              ) : null}

              {/* USER ASSIGNMENTS */}

              <button
                type="button"
                onClick={openAssignments}
                disabled={Boolean(assignmentsDisabledReason)}
                title={assignmentsDisabledReason || "View user assignments"}
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
                  disabled:cursor-not-allowed
                  disabled:opacity-40
                "
              >
                <ListChecks size={17} />

                <span className="hidden sm:inline">Assignments</span>

                <span className="sm:hidden">Assigned</span>
              </button>

              {/* ASSIGN GEOGRAPHY */}

              <button
                type="button"
                onClick={openGeographyAssignment}
                disabled={Boolean(assignmentDisabledReason)}
                title={
                  assignmentDisabledReason ||
                  `Assign ${fullName(selectedUser)} to election geography`
                }
                className="
                  inline-flex
                  min-h-10
                  items-center
                  justify-center
                  gap-1.5
                  rounded-lg
                  border
                  border-blue-300
                  bg-blue-50
                  px-3
                  py-2
                  text-sm
                  font-bold
                  text-blue-700
                  transition
                  hover:bg-blue-100
                  disabled:cursor-not-allowed
                  disabled:opacity-40
                "
              >
                <MapPinned size={17} />

                <span className="hidden sm:inline">Assign Geography</span>

                <span className="sm:hidden">Assign</span>
              </button>

              {/* REFRESH */}

              <button
                type="button"
                onClick={refreshNow}
                disabled={
                  usersQuery.isFetching || (!isPlatformView && !hasOrgContext)
                }
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
                  font-semibold
                  text-slate-700
                  transition
                  hover:bg-slate-50
                  disabled:cursor-not-allowed
                  disabled:opacity-40
                "
              >
                <RefreshCw
                  size={16}
                  className={usersQuery.isFetching ? "animate-spin" : ""}
                />

                <span className="hidden sm:inline">Refresh</span>
              </button>
            </div>
          </div>

          {/* ================================================================ */}
          {/* FILTERS */}
          {/* ================================================================ */}

          <section
            className="
              rounded-xl
              border
              border-slate-200
              bg-white
              p-2.5
            "
          >
            <div
              className={
                isSystemMode
                  ? `
                      grid
                      min-w-0
                      grid-cols-1
                      gap-2
                      sm:grid-cols-2
                    `
                  : `
                      grid
                      min-w-0
                      grid-cols-1
                      gap-2
                    `
              }
            >
              {/* SEARCH */}

              <div className="relative min-w-0">
                <Search
                  size={17}
                  className="
                    pointer-events-none
                    absolute
                    left-3
                    top-1/2
                    -translate-y-1/2
                    text-slate-400
                  "
                />

                <input
                  type="search"
                  value={search}
                  onChange={(event) => changeSearch(event.target.value)}
                  placeholder="Search name, username, email, role..."
                  className="
                    min-h-10
                    w-full
                    rounded-lg
                    border
                    border-slate-300
                    bg-white
                    py-2
                    pl-9
                    pr-3
                    text-sm
                    text-slate-900
                    outline-none
                    placeholder:text-slate-400
                    focus:border-blue-500
                    focus:ring-2
                    focus:ring-blue-100
                  "
                />
              </div>

              {/* ORGANIZATION */}

              {isSystemMode ? (
                <select
                  value={selectedOrgId}
                  onChange={(event) => changeOrganization(event.target.value)}
                  disabled={
                    organizationsQuery.isLoading || organizationsQuery.isError
                  }
                  className="
                          min-h-10
                          w-full
                          rounded-lg
                          border
                          border-slate-300
                          bg-white
                          px-2.5
                          text-sm
                          text-slate-900
                          outline-none
                          focus:border-blue-500
                          focus:ring-2
                          focus:ring-blue-100
                          disabled:cursor-not-allowed
                          disabled:bg-slate-100
                        "
                  aria-label="Organization"
                >
                  <option value="">
                    {organizationsQuery.isLoading
                      ? "Loading organizations…"
                      : "Platform Users"}
                  </option>

                  {organizationOptions.map((organization) => (
                    <option key={organization.value} value={organization.value}>
                      {organization.label}
                    </option>
                  ))}
                </select>
              ) : null}
            </div>

            {selectedUser ? (
              <div
                className="
                        mt-2
                        flex
                        min-w-0
                        items-center
                        gap-2
                        border-t
                        border-slate-100
                        pt-2
                        text-xs
                        text-slate-500
                      "
              >
                <span className="font-semibold">Selected user:</span>

                <span
                  className="
                          min-w-0
                          truncate
                          font-bold
                          text-slate-700
                        "
                >
                  {fullName(selectedUser)}
                </span>

                <button
                  type="button"
                  onClick={() => setSelectedUserId("")}
                  className="
                          ml-auto
                          shrink-0
                          font-semibold
                          text-blue-600
                          hover:text-blue-700
                        "
                >
                  Clear selection
                </button>
              </div>
            ) : null}
          </section>

          {/* ================================================================ */}
          {/* LOADING */}
          {/* ================================================================ */}

          {usersQuery.isLoading ? (
            <div
              className="
                      rounded-xl
                      border
                      border-slate-200
                      bg-white
                      p-5
                      text-center
                      text-sm
                      text-slate-500
                    "
            >
              Loading users…
            </div>
          ) : null}

          {/* ================================================================ */}
          {/* ERROR */}
          {/* ================================================================ */}

          {usersQuery.isError ? (
            <div
              className="
                      rounded-xl
                      border
                      border-red-200
                      bg-red-50
                      p-4
                      text-sm
                      font-semibold
                      text-red-700
                    "
            >
              {(usersQuery.error as any)?.message ?? "Failed to load users."}
            </div>
          ) : null}

          {/* ================================================================ */}
          {/* EMPTY */}
          {/* ================================================================ */}

          {!usersQuery.isLoading &&
          !usersQuery.isError &&
          filteredUsers.length === 0 ? (
            <div
              className="
                      rounded-xl
                      border
                      border-dashed
                      border-slate-300
                      bg-white
                      px-4
                      py-8
                      text-center
                    "
            >
              <UserRound size={30} className="mx-auto text-slate-400" />

              <div
                className="
                        mt-2
                        text-base
                        font-bold
                        text-slate-700
                      "
              >
                No users found
              </div>

              <div
                className="
                        mt-1
                        text-sm
                        text-slate-500
                      "
              >
                {search.trim()
                  ? "No users match the current search."
                  : "There are no users to display."}
              </div>
            </div>
          ) : null}

          {/* ================================================================ */}
          {/* LIST */}
          {/* ================================================================ */}

          {!usersQuery.isLoading &&
          !usersQuery.isError &&
          visibleUsers.length > 0 ? (
            <section className="entity-list">
              {/* ====================================================== */}
              {/* DESKTOP HEADER */}
              {/* ====================================================== */}

              <div
                className="
                        hidden
                        border-b
                        border-slate-200
                        bg-slate-50
                        px-4
                        py-2
                        text-xs
                        font-bold
                        uppercase
                        tracking-wide
                        text-slate-500

                        md:grid
                        md:grid-cols-[minmax(0,1.1fr)_minmax(0,0.8fr)_minmax(0,1.15fr)_minmax(0,0.8fr)_110px_95px_90px]
                        md:items-center
                        md:gap-4
                      "
              >
                <div>User</div>

                <div>Position</div>

                <div>Email</div>

                <div>Role</div>

                <div>Created</div>

                <div className="text-center">Status</div>

                <div className="text-right">Action</div>
              </div>

              {/* ====================================================== */}
              {/* RECORDS */}
              {/* ====================================================== */}

              {visibleUsers.map((user) => {
                const active = pickActive(user);

                const verified = pickVerified(user);

                const selected = selectedUserId === user.userId;

                return (
                  <div
                    key={user.userId}
                    className={[
                      "group border-b border-slate-200 bg-white last:border-b-0",
                      selected ? "bg-blue-50/50" : "hover:bg-slate-50",
                    ].join(" ")}
                  >
                    {/* ================================================== */}
                    {/* MOBILE */}
                    {/* ================================================== */}

                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() =>
                        setSelectedUserId(selected ? "" : user.userId)
                      }
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          setSelectedUserId(selected ? "" : user.userId);
                        }
                      }}
                      className="
                        cursor-pointer
                        px-3.5
                        py-3
                        outline-none
                        md:hidden
                      "
                      aria-label={`Select ${fullName(user)}`}
                    >
                      <div className="flex min-w-0 items-start gap-3">
                        {user.profileImageUrl ? (
                          <img
                            src={user.profileImageUrl}
                            alt=""
                            className="h-11 w-11 shrink-0 rounded-full border border-slate-200 object-cover"
                          />
                        ) : (
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-50 text-sm font-extrabold text-blue-700">
                            {initials(user)}
                          </div>
                        )}

                        <div className="min-w-0 flex-1">
                          <div className="flex min-w-0 items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div className="truncate text-base font-bold text-slate-900">
                                {fullName(user)}
                              </div>

                              <div className="mt-0.5 truncate text-xs font-semibold text-slate-500">
                                @{user.userName}
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                openUserDetail(user);
                              }}
                              className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
                              aria-label={`View ${fullName(user)}`}
                            >
                              <Eye size={15} />
                              View
                            </button>
                          </div>

                          <div className="mt-2 grid min-w-0 grid-cols-[minmax(0,1fr)_auto] gap-2">
                            <div className="min-w-0">
                              <div className="truncate text-sm font-semibold text-slate-700">
                                {safeStr(user.position) || "No position"}
                              </div>

                              <div className="mt-0.5 truncate text-xs text-slate-500">
                                {user.email}
                              </div>
                            </div>

                            <div className="flex flex-col items-end gap-1">
                              <span className="inline-flex rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-700">
                                {safeStr(user.roleName) || "No role"}
                              </span>

                              <span
                                className={
                                  active
                                    ? "inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700"
                                    : "inline-flex items-center gap-1 text-[11px] font-bold text-slate-500"
                                }
                              >
                                <span
                                  className={
                                    active
                                      ? "h-2 w-2 rounded-full bg-emerald-500"
                                      : "h-2 w-2 rounded-full bg-slate-400"
                                  }
                                />
                                {active ? "Active" : "Inactive"}
                              </span>
                            </div>
                          </div>

                          {verified ? (
                            <div className="mt-2 text-xs font-semibold text-blue-600">
                              Verified account
                            </div>
                          ) : null}

                          {selected ? (
                            <div className="mt-2 text-xs font-bold text-blue-700">
                              Selected for assignment
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </div>

                    {/* ================================================== */}
                    {/* TABLET / DESKTOP */}
                    {/* ================================================== */}

                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() =>
                        setSelectedUserId(selected ? "" : user.userId)
                      }
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          setSelectedUserId(selected ? "" : user.userId);
                        }
                      }}
                      className="
                        hidden
                        min-w-0
                        cursor-pointer
                        px-4
                        py-3
                        outline-none
                        md:grid
                        md:grid-cols-[minmax(0,1.1fr)_minmax(0,0.8fr)_minmax(0,1.15fr)_minmax(0,0.8fr)_110px_95px_90px]
                        md:items-center
                        md:gap-4
                      "
                      aria-label={`Select ${fullName(user)}`}
                    >
                      <div className="flex min-w-0 items-center gap-2.5">
                        {user.profileImageUrl ? (
                          <img
                            src={user.profileImageUrl}
                            alt=""
                            className="h-10 w-10 shrink-0 rounded-full border border-slate-200 object-cover"
                          />
                        ) : (
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-50 text-xs font-extrabold text-blue-700">
                            {initials(user)}
                          </div>
                        )}

                        <div className="min-w-0">
                          <div className="truncate text-sm font-bold text-slate-900 lg:text-base">
                            {fullName(user)}
                          </div>

                          <div className="mt-0.5 truncate text-xs font-medium text-slate-500">
                            @{user.userName}
                          </div>

                          {selected ? (
                            <div className="mt-0.5 text-[11px] font-bold text-blue-700">
                              Selected
                            </div>
                          ) : null}
                        </div>
                      </div>

                      <div
                        className="min-w-0 truncate text-sm font-semibold text-slate-700"
                        title={safeStr(user.position)}
                      >
                        {safeStr(user.position) || "—"}
                      </div>

                      <div
                        className="min-w-0 truncate text-sm text-slate-700"
                        title={safeStr(user.email)}
                      >
                        {user.email}
                      </div>

                      <div className="min-w-0 truncate text-sm font-semibold text-slate-700">
                        {safeStr(user.roleName) || "—"}
                      </div>

                      <div className="text-sm text-slate-600">
                        {fmtDate(user.dateCreated)}
                      </div>

                      <div className="flex justify-center">
                        <span
                          className={
                            active
                              ? "inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700"
                              : "inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600"
                          }
                        >
                          {active ? "Active" : "Inactive"}
                        </span>
                      </div>

                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            openUserDetail(user);
                          }}
                          className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 text-xs font-bold text-slate-700 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
                          aria-label={`View ${fullName(user)}`}
                        >
                          <Eye size={15} />
                          View
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </section>
          ) : null}

          {/* ================================================================ */}
          {/* PAGINATION */}
          {/* ================================================================ */}

          {filteredUsers.length > 0 ? (
            <section
              className="
                      flex
                      min-w-0
                      flex-col
                      gap-2
                      rounded-xl
                      border
                      border-slate-200
                      bg-white
                      p-2.5

                      sm:flex-row
                      sm:items-center
                      sm:justify-between
                    "
            >
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((current) => Math.max(0, current - 1))}
                  disabled={page <= 0 || usersQuery.isFetching}
                  className="
                          min-h-10
                          rounded-lg
                          border
                          border-slate-300
                          bg-white
                          px-3
                          py-2
                          text-sm
                          font-semibold
                          text-slate-700
                          hover:bg-slate-50
                          disabled:cursor-not-allowed
                          disabled:opacity-40
                        "
                >
                  Previous
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setPage((current) =>
                      current + 1 < totalPages ? current + 1 : current,
                    )
                  }
                  disabled={page + 1 >= totalPages || usersQuery.isFetching}
                  className="
                          min-h-10
                          rounded-lg
                          border
                          border-slate-300
                          bg-white
                          px-3
                          py-2
                          text-sm
                          font-semibold
                          text-slate-700
                          hover:bg-slate-50
                          disabled:cursor-not-allowed
                          disabled:opacity-40
                        "
                >
                  Next
                </button>
              </div>

              <div
                className="
                        flex
                        flex-wrap
                        items-center
                        gap-2
                        text-xs
                        font-semibold
                        text-slate-600
                        sm:justify-end
                        sm:text-sm
                      "
              >
                <span>
                  Page {page + 1} of {totalPages}
                </span>

                <span className="hidden text-slate-300 sm:inline">•</span>

                <span>
                  {filteredUsers.length} user
                  {filteredUsers.length === 1 ? "" : "s"}
                </span>
              </div>
            </section>
          ) : null}
        </div>
      </Card>
    </AdminShell>
  );
}

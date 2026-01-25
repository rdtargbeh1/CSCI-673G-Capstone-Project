



// src/shared/services/userService.ts
import type { AxiosResponse } from "axios";
import { apiClient } from "../lib/apiClient";
// import { http } from "../../api/http";

import type {
  UserCreateRequest,
  UserUpdateRequest,
  UserDto,
  FetchUsersResponse,
  RoleName,
} from "../../auth/userTypes";

/**
 * Multi-tenant header helper:
 * - Tenant endpoints require X-Org-Id (TenantContext)
 * - SYSTEM_ADMIN may load platform endpoints without org, BUT
 *   tenant-scoped operations still need orgId to set TenantContext.
 */
const tenantHeaders = (orgId?: string | null) =>
  orgId ? { headers: { "X-Org-Id": orgId } } : undefined;

/**
 * ✅ NEW: hard guard for tenant-scoped operations.
 * Prevents silent requests without X-Org-Id (which cause 403).
 */
function requireOrgId(
  orgId?: string | null,
  action = "this operation"
): string {
  const v = String(orgId ?? "").trim();
  if (!v) throw new Error(`X-Org-Id is required for ${action}.`);
  return v;
}

/**
 * For assign endpoints that support clearing:
 * - pass {"id":"uuid"} to set
 * - pass {} to clear (AssignIdRequest.id becomes null)
 *
 * IMPORTANT:
 * Always send JSON to avoid Spring rejecting x-www-form-urlencoded.
 */
async function patchAssignId(
  orgId: string | null | undefined,
  url: string,
  id: string | null
): Promise<void> {
  const cfg = tenantHeaders(orgId);

  await apiClient.patch(
    url,
    id ? { id } : {}, // ✅ always JSON body
    {
      ...(cfg ?? {}),
      headers: {
        ...(cfg?.headers ?? {}),
        "Content-Type": "application/json", // ✅ force JSON
      },
    }
  );
}

/* =========================================================
   USERS - SEARCH / GET / UPDATE
   ========================================================= */

/** Tenant-scoped paginated search: GET /api/users?q=&active=&page=&size= */
export async function fetchUsers(
  orgId: string,
  params: {
    page: number;
    size: number;
    q?: string;
    active?: boolean;
  }
): Promise<FetchUsersResponse> {
  const tenantId = requireOrgId(orgId, "fetch users");

  const res: AxiosResponse<any> = await apiClient.get("/user", {
    ...tenantHeaders(tenantId),
    params: {
      page: params.page,
      size: params.size,
      q: params.q || undefined,
      active: params.active ?? undefined,
    },
  });

  return {
    users: res.data?.content ?? [],
    totalElements: res.data?.totalElements ?? 0,
    totalPages: res.data?.totalPages ?? 0,
    size: res.data?.size ?? params.size,
    number: res.data?.number ?? params.page,
  };
}

/* =========================================================
   USERS - DELETE
   ========================================================= */

/** DELETE /api/users/{userId} (tenant-scoped) */
export async function deleteUser(orgId: string, userId: string): Promise<void> {
  const tenantId = requireOrgId(orgId, "delete user");
  await apiClient.delete(`/user/${userId}`, tenantHeaders(tenantId));
}

/**
 * Get by UUID:
 * - Tenant: orgId required
 * - SYSTEM_ADMIN: may work without org if backend allows; keep header optional
 */
export async function fetchUserById(
  orgId: string | null | undefined,
  userId: string
): Promise<UserDto> {
  const { data }: AxiosResponse<UserDto> = await apiClient.get(
    `/user/${userId}`,
    tenantHeaders(orgId)
  );
  return data;
}

/** Update user: PUT /api/users/{userId} (tenant-scoped in your service) */
export async function updateUser(
  orgId: string | null | undefined,
  userId: string,
  payload: UserUpdateRequest
): Promise<UserDto> {
  const tenantId = requireOrgId(orgId, "update user");
  const { data }: AxiosResponse<UserDto> = await apiClient.put(
    `/user/${userId}`,
    payload,
    tenantHeaders(tenantId)
  );
  return data;
}

/* =========================================================
   USERS - CREATE (TenantUserController)
   ========================================================= */

/**
 * Create tenant member (AGENT/SUPERVISOR/DATA_ENTRY/OBSERVER/COORDINATOR/AUDITOR)
 * POST /api/tenants/users
 * Caller must be PARTY_ADMIN/ADMIN/SYSTEM_ADMIN (checked on backend)
 *
 * ✅ MUST include X-Org-Id
 */
export async function createTenantMember(
  orgId: string,
  payload: UserCreateRequest
): Promise<UserDto> {
  const tenantId = requireOrgId(orgId, "create tenant user");
  const { data }: AxiosResponse<UserDto> = await apiClient.post(
    "/tenants/users",
    payload,
    tenantHeaders(tenantId)
  );
  return data;
}

// ✅ Create user in tenant (SYSTEM/NEC acting inside a selected org)
// POST /api/users
export async function createUser(
  orgId: string,
  payload: UserCreateRequest
): Promise<UserDto> {
  const tenantId = requireOrgId(orgId, "create user");
  const { data } = await apiClient.post<UserDto>(
    "/user",
    payload,
    tenantHeaders(tenantId)
  );
  return data;
}

/**
 * Create tenant admin (ADMIN/PARTY_ADMIN) - SYSTEM_ADMIN only
 * POST /api/tenants/users/admins
 * System admin must send X-Org-Id of target org
 *
 * ✅ MUST include X-Org-Id
 */
export async function createTenantAdmin(
  orgId: string,
  payload: UserCreateRequest
): Promise<UserDto> {
  const tenantId = requireOrgId(orgId, "create tenant admin");
  const { data }: AxiosResponse<UserDto> = await apiClient.post(
    "/tenants/users/admins",
    payload,
    tenantHeaders(tenantId)
  );
  return data;
}

/* =========================================================
   STATUS FLAGS
   ========================================================= */

/** PATCH /api/users/{userId}/active  body: {value:boolean} */
export async function setUserActive(
  orgId: string,
  userId: string,
  value: boolean
): Promise<void> {
  const tenantId = requireOrgId(orgId, "set user active");
  await apiClient.patch(
    `/user/${userId}/active`,
    { value },
    tenantHeaders(tenantId)
  );
}

/** PATCH /api/users/{userId}/verified body: {value:boolean} */
export async function setUserVerified(
  orgId: string,
  userId: string,
  value: boolean
): Promise<void> {
  const tenantId = requireOrgId(orgId, "set user verified");
  await apiClient.patch(
    `/user/${userId}/verified`,
    { value },
    tenantHeaders(tenantId)
  );
}

/* =========================================================
   ROLE & AFFILIATIONS
   ========================================================= */

/** PATCH /api/users/{userId}/role body: {roleName: RoleName} */
export async function assignUserRole(
  orgId: string,
  userId: string,
  roleName: RoleName | string
): Promise<void> {
  const tenantId = requireOrgId(orgId, "assign role");
  await apiClient.patch(
    `/user/${userId}/role`,
    { roleName },
    tenantHeaders(tenantId)
  );
}

/** PATCH /api/users/{userId}/party  body: {"id":uuid} or null to clear */
export async function assignUserParty(
  orgId: string,
  userId: string,
  partyId: string | null
): Promise<void> {
  await patchAssignId(orgId, `/user/${userId}/party`, partyId);
}

/** PATCH /api/users/{userId}/county body: {"id":uuid} or null to clear */
export async function assignUserCounty(
  orgId: string,
  userId: string,
  countyId: string | null
): Promise<void> {
  await patchAssignId(orgId, `/user/${userId}/county`, countyId);
}

/** PATCH /api/users/{userId}/default-org body: {"id":uuid} or null to clear */
export async function setUserDefaultOrg(
  orgId: string,
  userId: string,
  defaultOrgId: string | null
): Promise<void> {
  await patchAssignId(orgId, `/user/${userId}/default-org`, defaultOrgId);
}

/**
 * PATCH /api/users/{userId}/assign-county-role
 * body: { countyId: uuid, roleName: RoleName }
 */
export async function assignUserToCountyAndRole(
  orgId: string,
  userId: string,
  countyId: string,
  roleName: RoleName | string
): Promise<UserDto> {
  const tenantId = requireOrgId(orgId, "assign county + role");
  const { data }: AxiosResponse<UserDto> = await apiClient.patch(
    `/user/${userId}/assign-county-role`,
    { countyId, roleName },
    tenantHeaders(tenantId)
  );
  return data;
}

/* =========================================================
   SECURITY / PASSWORD / LOCK
   ========================================================= */

export async function changePassword(
  orgId: string,
  userId: string,
  payload: any
): Promise<void> {
  const tenantId = requireOrgId(orgId, "change password");
  await apiClient.post(
    `/user/${userId}/password`,
    payload,
    tenantHeaders(tenantId)
  );
}

export async function adminResetPassword(
  orgId: string,
  userId: string,
  newPassword: string
): Promise<void> {
  const tenantId = requireOrgId(orgId, "admin reset password");
  await apiClient.post(
    `/user/${userId}/password/reset`,
    { newPassword },
    tenantHeaders(tenantId)
  );
}

export async function setUserLock(
  orgId: string,
  userId: string,
  lock: boolean,
  until?: string | null
): Promise<void> {
  const tenantId = requireOrgId(orgId, "set lock");
  await apiClient.patch(
    `/user/${userId}/lock`,
    { lock, until: until ?? null },
    tenantHeaders(tenantId)
  );
}

export async function recordLoginFailure(
  orgId: string,
  userId: string
): Promise<void> {
  const tenantId = requireOrgId(orgId, "record login failure");
  await apiClient.post(
    `/user/${userId}/login-failure`,
    null,
    tenantHeaders(tenantId)
  );
}

export async function recordLoginSuccess(
  orgId: string,
  userId: string
): Promise<void> {
  const tenantId = requireOrgId(orgId, "record login success");
  await apiClient.post(
    `/user/${userId}/login-success`,
    null,
    tenantHeaders(tenantId)
  );
}

/* =========================================================
   CURRENT USER
   ========================================================= */

/** GET /api/users/me (requires X-Org-Id per your controller) */
export async function fetchMe(orgId: string): Promise<UserDto> {
  const tenantId = requireOrgId(orgId, "fetch current user (/user/me)");
  const { data }: AxiosResponse<UserDto> = await apiClient.get(
    "/user/me",
    tenantHeaders(tenantId)
  );
  return data;
}

/* =========================================================
   PROFILE PHOTO
   ========================================================= */

export async function uploadProfilePhoto(
  orgId: string | null | undefined,
  userId: string,
  file: File
): Promise<string> {
  const tenantId = requireOrgId(orgId, "upload profile photo");

  const formData = new FormData();
  formData.append("file", file);

  const { data }: AxiosResponse<string> = await apiClient.post(
    `/user/${userId}/profile-photo`,
    formData,
    tenantHeaders(tenantId)
  );

  return data;
}

// ✅ Bootstrap first system admin (platform user, no org header)
// POST /api/public/bootstrap/system-admin
export async function bootstrapFirstSystemAdmin(
  payload: UserCreateRequest
): Promise<UserDto> {
  const { data }: AxiosResponse<UserDto> = await apiClient.post(
    "/public/bootstrap/system-admin",
    payload
  );
  return data;
}

// ✅ NEW: platform create (NO X-Org-Id)
export async function createUserPlatform(
  req: UserCreateRequest
): Promise<UserDto> {
  const { data } = await apiClient.post<UserDto>("platform/system-users", req);
  return data;
}

export async function fetchPlatformUsers(params: {
  page: number;
  size: number;
  q?: string;
  active?: boolean;
}) {
  const { data } = await apiClient.get("/users/platform", { params });

  const items = data?.content ?? data?.items ?? [];
  const totalPages = data?.totalPages ?? 0;
  const totalElements = data?.totalElements ?? items.length;

  return {
    users: items,
    totalPages,
    totalElements,
  };
}

export async function createPlatformUser(payload: UserCreateRequest) {
  const { data } = await apiClient.post("/platform/system-users", payload);

  return data;
}

// ✅ PLATFORM update (NO X-Org-Id)
// PUT /api/platform/system-users/{userId}
export async function updatePlatformUser(
  userId: string,
  payload: UserUpdateRequest
): Promise<UserDto> {
  const { data } = await apiClient.put<UserDto>(
    `/platform/system-users/${userId}`,
    payload
  );
  return data;
}

// ✅ PLATFORM flags (NO X-Org-Id)
// Backend should expose these endpoints:
// PATCH /api/platform/system-users/{id}/active?value=true
// PATCH /api/platform/system-users/{id}/verified?value=true

export async function setPlatformUserActive(
  userId: string,
  value: boolean
): Promise<void> {
  await apiClient.patch(`/platform/system-users/${userId}/active`, null, {
    params: { value },
  });
}

export async function setPlatformUserVerified(
  userId: string,
  value: boolean
): Promise<void> {
  await apiClient.patch(`/platform/system-users/${userId}/verified`, null, {
    params: { value },
  });
}

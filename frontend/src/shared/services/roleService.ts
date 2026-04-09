import { apiClient } from "../lib/apiClient";
import type { AxiosResponse } from "axios";

export type RoleName =
  | "SYSTEM_ADMIN"
  | "NEC_ADMIN"
  | "PARTY_ADMIN"
  | "ADMIN"
  | "AGENT"
  | "OBSERVER"
  | "SUPERVISOR"
  | "COORDINATOR"
  | "DATA_ENTRY"
  | "AUDITOR"
  | string;

export type UserRoleDto = {
  roleId: string;
  roleName: RoleName;
  description?: string | null;
  // if your API includes this later:
  isBuiltin?: boolean;
};

export async function fetchRoles(params: {
  page: number;
  size: number;
}): Promise<{
  items: UserRoleDto[];
  totalElements: number;
  totalPages: number;
}> {
  const res: AxiosResponse<any> = await apiClient.get("/roles", {
    params: { page: params.page, size: params.size },
  });

  const data = res.data ?? {};
  return {
    items: data.content ?? [],
    totalElements: data.totalElements ?? 0,
    totalPages: data.totalPages ?? 0,
  };
}

export async function updateRole(
  roleId: string,
  body: { roleName: RoleName; description?: string | null }
): Promise<UserRoleDto> {
  const { data } = await apiClient.put(`/roles/${roleId}`, body);
  return data as UserRoleDto;
}

export async function deleteRole(roleId: string): Promise<void> {
  await apiClient.delete(`/roles/${roleId}`);
}

/**
 * Optional (only if your backend supports it).
 * If not supported, keep UI create disabled.
 */
export async function createRole(body: {
  roleName: RoleName;
  description?: string | null;
}): Promise<UserRoleDto> {
  const { data } = await apiClient.post(`/roles`, body);
  return data as UserRoleDto;
}

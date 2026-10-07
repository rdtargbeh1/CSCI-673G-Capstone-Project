import { apiClient } from "../lib/apiClient";

export type OrgSettingDto = {
  orgId: string;
  settings: Record<string, any>; // already merged with defaults on backend
};

const BASE_URL = "/org-settings";

/** Tenant-scoped: requires X-Org-Id */
export async function fetchOrgSettings(orgId: string): Promise<OrgSettingDto> {
  const { data } = await apiClient.get(BASE_URL, {
    headers: { "X-Org-Id": orgId },
  });
  return data as OrgSettingDto;
}

/** Tenant-scoped: requires X-Org-Id */
export async function patchOrgSettings(
  orgId: string,
  patch: Record<string, any>
): Promise<OrgSettingDto> {
  const { data } = await apiClient.patch(BASE_URL, patch, {
    headers: { "X-Org-Id": orgId },
  });
  return data as OrgSettingDto;
}

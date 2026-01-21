// src/shared/services/organizationService.ts
import { apiClient } from "../lib/apiClient";

const BASE_URL = "/orgs";

/** Must match backend enum */
export type OrganizationType =
  | "POLITICAL_PARTY"
  | "COALITION"
  | "NEC"
  | "NGO"
  | "MEDIA"
  | "OTHER";

export interface FetchOrganizationsParams {
  search?: string;
  active?: boolean;
  orgType?: OrganizationType;
  page: number;
  size: number;
}

export interface Organization {
  orgId: string;
  orgName: string;
  organizationType: OrganizationType;

  logoUrl?: string | null;
  primaryColor?: string | null;
  subdomain?: string | null;

  active: boolean;

  partyId?: string | null;
  partyName?: string | null;
  partyAbbreviation?: string | null;
}

export type FetchOrganizationsResponse = {
  items: Organization[];
  totalElements: number;
};

export interface OrganizationCreateRequest {
  orgName: string;
  organizationType: OrganizationType;
  subdomain?: string;
  logoUrl?: string;
  primaryColor?: string;
  isActive?: boolean; // ✅ matches your create DTO
  partyId?: string;
}

export interface OrganizationUpdateRequest {
  orgId: string;

  orgName?: string;
  organizationType?: OrganizationType;
  partyId?: string | null;

  subdomain?: string | null;
  logoUrl?: string | null;
  primaryColor?: string | null;

  isActive?: boolean; // ✅ recommend aligning update DTO to isActive too
}

/** Fetch organizations (backend returns Spring Page<OrganizationDto>) */
export async function fetchOrganizations(
  params: FetchOrganizationsParams
): Promise<FetchOrganizationsResponse> {
  const { data } = await apiClient.get(BASE_URL, {
    params: {
      page: params.page,
      size: params.size,
      q: params.search || undefined,
      active: params.active ?? undefined,
      type: params.orgType ?? undefined,
    },
  });

  // Spring Data Page shape: { content, totalElements, ... }
  const items = (data?.content ?? []) as Organization[];
  const totalElements = Number(data?.totalElements ?? items.length ?? 0);

  return { items, totalElements };
}

export async function createOrganization(org: OrganizationCreateRequest) {
  const { data } = await apiClient.post(BASE_URL, org);
  return data as Organization;
}

export async function updateOrganization(org: OrganizationUpdateRequest) {
  const { data } = await apiClient.put(`${BASE_URL}/${org.orgId}`, org);
  return data as Organization;
}

export async function setOrganizationActive(args: {
  orgId: string;
  active: boolean;
}) {
  await apiClient.patch(`${BASE_URL}/${args.orgId}/active`, {
    active: args.active,
  });
}

export async function fetchOrganizationById(
  orgId: string
): Promise<Organization> {
  const { data } = await apiClient.get(`${BASE_URL}/${orgId}`);
  return data as Organization;
}

export async function fetchOrganizationBySubdomain(
  subdomain: string
): Promise<Organization> {
  const { data } = await apiClient.get(`${BASE_URL}/by-subdomain/${subdomain}`);
  return data as Organization;
}

export async function updateOrganizationBranding(args: {
  orgId: string;
  logoUrl?: string | null;
  primaryColor?: string | null;
  subdomain?: string | null;
}) {
  const { data } = await apiClient.patch(`${BASE_URL}/${args.orgId}/branding`, {
    logoUrl: args.logoUrl ?? null,
    primaryColor: args.primaryColor ?? null,
    subdomain: args.subdomain ?? null,
  });
  return data as Organization;
}

// // src/shared/services/organizationService.ts
// import { apiClient } from "../lib/apiClient";

// const BASE_URL = "/orgs";

// /** Must match backend enum */
// export type OrganizationType =
//   | "POLITICAL_PARTY"
//   | "COALITION"
//   | "NEC"
//   | "NGO"
//   | "MEDIA"
//   | "OTHER";

// export interface FetchOrganizationsParams {
//   search?: string;
//   active?: boolean;
//   orgType?: OrganizationType; // ✅ no "" here (filters convert "" -> undefined)
//   page: number;
//   size: number;
//   orgId?: string; // optional restriction for non-platform users if you keep it
// }

// export type FetchOrganizationsResponse = {
//   items: Organization[];
//   totalElements: number;
// };

// export interface OrganizationCreateRequest {
//   orgName: string;
//   organizationType: OrganizationType;
//   subdomain?: string;
//   logoUrl?: string;
//   primaryColor?: string;
//   isActive?: boolean; // ✅ backend uses isActive
//   partyId?: string; // nullable/optional
// }

// export interface OrganizationUpdateRequest {
//   orgId: string;
//   orgName?: string;
//   organizationType?: OrganizationType;
//   partyId?: string | null; // ✅ nullable to clear
//   subdomain?: string | null;
//   logoUrl?: string | null;
//   primaryColor?: string | null;
//   active?: boolean; // ✅ backend update uses active (Boolean)
// }

// export interface Organization {
//   orgId: string;
//   orgName: string;
//   organizationType: OrganizationType;
//   logoUrl?: string | null;
//   primaryColor?: string | null;
//   subdomain?: string | null;
//   active: boolean;

//   partyId?: string | null;
//   partyName?: string | null;
//   partyAbbreviation?: string | null;
// }

// /** Fetch organizations (normalize backend shapes) */
// export async function fetchOrganizations(
//   params: FetchOrganizationsParams
// ): Promise<FetchOrganizationsResponse> {
//   const { data } = await apiClient.get(BASE_URL, {
//     params: {
//       page: params.page,
//       size: params.size,
//       q: params.search || undefined, // ✅ backend expects q
//       active: params.active ?? undefined,
//       type: params.orgType ?? undefined, // ✅ backend expects type
//       // orgId: params.orgId || undefined,     // only if you actually support this backend-side
//     },
//   });

//   const items = (data?.items ?? data?.content ?? data ?? []) as Organization[];
//   const totalElements = (data?.totalElements ?? items.length ?? 0) as number;

//   return { items, totalElements };
// }

// export async function createOrganization(org: OrganizationCreateRequest) {
//   const { data } = await apiClient.post(BASE_URL, org);
//   return data;
// }

// export async function updateOrganization(org: OrganizationUpdateRequest) {
//   const { data } = await apiClient.put(`${BASE_URL}/${org.orgId}`, org);
//   return data;
// }

// export async function setOrganizationActive(args: {
//   orgId: string;
//   active: boolean;
// }): Promise<void> {
//   await apiClient.patch(`${BASE_URL}/${args.orgId}/active`, {
//     active: args.active,
//   });
// }

// export async function fetchOrganizationById(orgId: string) {
//   const { data } = await apiClient.get(`${BASE_URL}/${orgId}`);
//   return data;
// }

// export async function fetchOrganizationBySubdomain(subdomain: string) {
//   const { data } = await apiClient.get(`${BASE_URL}/by-subdomain/${subdomain}`);
//   return data;
// }

// export async function updateOrganizationBranding(args: {
//   orgId: string;
//   logoUrl?: string | null;
//   primaryColor?: string | null;
//   subdomain?: string | null;
// }) {
//   const { data } = await apiClient.patch(`/orgs/${args.orgId}/branding`, {
//     logoUrl: args.logoUrl ?? null,
//     primaryColor: args.primaryColor ?? null,
//     subdomain: args.subdomain ?? null,
//   });
//   return data;
// }

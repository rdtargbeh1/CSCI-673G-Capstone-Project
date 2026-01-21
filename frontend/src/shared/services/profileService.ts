// src/shared/services/profileService.ts

import { apiClient } from "../lib/apiClient";
import type { UserDto } from "../../auth/userTypes";

type MyProfileUpdatePayload = {
  firstName: string;
  lastName: string;
  userName: string;
  email: string;
  position?: string;
  phoneNumber?: string;
};

function readBool(v: any): boolean {
  if (v === true) return true;
  if (v === false) return false;
  if (typeof v === "string") return v.toLowerCase() === "true";
  if (typeof v === "number") return v === 1;
  return false;
}

/** Normalize inconsistent backend field names into your UserDto shape */
function normalizeUser(raw: any): UserDto {
  const u = raw ?? {};

  // support both forms
  const active = u.isActive ?? u.active ?? u.is_active ?? false;
  const verified = u.isVerified ?? u.verified ?? u.is_verified ?? false;

  return {
    ...u,
    isActive: readBool(active),
    isVerified: readBool(verified),
  } as UserDto;
}

/** GET /api/users/me */
export async function fetchMeProfile(): Promise<UserDto> {
  const { data } = await apiClient.get("/users/me");
  return normalizeUser(data);
}

/**
 * Update CURRENT user profile:
 * 1) GET /users/me -> resolve UUID
 * 2) PUT /users/{uuid} -> your backend requires UUID path param
 */
export async function updateMyProfile(
  payload: MyProfileUpdatePayload
): Promise<UserDto> {
  const me = await fetchMeProfile();
  const userId = me.userId;

  if (!userId)
    throw new Error("Cannot update profile: missing userId from /users/me.");

  // Your backend requires roleName in UserUpdateRequest.
  // Since profile edit is limited, we preserve existing roleName.
  const updateReq = {
    ...payload,
    roleName: (me as any).roleName, // keep current roleName
  };

  const { data } = await apiClient.put(`/users/${userId}`, updateReq);
  return normalizeUser(data);
}

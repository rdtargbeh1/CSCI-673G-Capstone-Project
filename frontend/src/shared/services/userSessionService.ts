


// src/shared/services/userSessionService.ts
/**
 * SECURITY: SESSIONS
 * TABLE: user_session
 *
 * Backend:
 * - POST    /api/v1/sessions
 * - GET     /api/v1/sessions/user/{userId}
 * - GET     /api/v1/sessions/user/{userId}/active
 * - DELETE  /api/v1/sessions/{sessionId}
 * - DELETE  /api/v1/sessions/user/{userId}
 */

import { apiClient } from "../lib/apiClient";

/**
 * ✅ UPDATED: mirrors backend UserSessionDto after adding:
 * - userFullName
 * - orgName
 */
export type UserSessionDto = {
  sessionId: string;

  userId: string;
  userFullName?: string | null;

  orgId: string | null;
  orgName?: string | null;

  dateCreated: string; // ISO string
  expiresDate: string; // ISO string
  revoked: boolean;
};

/** Mirrors backend UserSessionCreateRequest (best-guess common fields) */
export type UserSessionCreateRequest = {
  userId: string;
  orgId?: string | null;

  // allow server to compute if omitted
  expiresDate?: string; // ISO string

  // optional metadata (only include if backend supports)
  ipAddress?: string;
  userAgent?: string;
  deviceInfo?: string;
};

const BASE = "/v1/sessions";

/** Create a session row (usually done by backend during login, but endpoint exists) */
export async function createUserSession(
  req: UserSessionCreateRequest
): Promise<UserSessionDto> {
  const { data } = await apiClient.post(`${BASE}`, req);
  return data as UserSessionDto;
}

/** Get all sessions for a user */
export async function fetchUserSessions(userId: string): Promise<UserSessionDto[]> {
  const { data } = await apiClient.get(`${BASE}/user/${userId}`);
  return (Array.isArray(data) ? data : []) as UserSessionDto[];
}

/** Get active sessions for a user */
export async function fetchActiveUserSessions(userId: string): Promise<UserSessionDto[]> {
  const { data } = await apiClient.get(`${BASE}/user/${userId}/active`);
  return (Array.isArray(data) ? data : []) as UserSessionDto[];
}

/** Revoke a single session */
export async function revokeSession(sessionId: string): Promise<void> {
  await apiClient.delete(`${BASE}/${sessionId}`);
}

/** Revoke all sessions for a user */
export async function revokeAllSessionsForUser(userId: string): Promise<void> {
  await apiClient.delete(`${BASE}/user/${userId}`);
}

/** Helpers (UI) */
export function isSessionExpired(s: UserSessionDto): boolean {
  if (!s?.expiresDate) return false;
  const t = new Date(s.expiresDate).getTime();
  if (Number.isNaN(t)) return false;
  return t <= Date.now();
}

export function getSessionState(s: UserSessionDto): "REVOKED" | "EXPIRED" | "ACTIVE" {
  if (s.revoked) return "REVOKED";
  if (isSessionExpired(s)) return "EXPIRED";
  return "ACTIVE";
}



// // src/shared/services/userSessionService.ts
// /**
//  * SECURITY: SESSIONS
//  * TABLE: user_session
//  *
//  * Backend:
//  * - POST   /api/v1/sessions
//  * - GET    /api/v1/sessions/user/{userId}
//  * - GET    /api/v1/sessions/user/{userId}/active
//  * - DELETE /api/v1/sessions/{sessionId}
//  * - DELETE /api/v1/sessions/user/{userId}
//  */

// import { apiClient } from "../lib/apiClient";

// /** Mirrors backend UserSessionDto */
// export type UserSessionDto = {
//   sessionId: string;
//   userId: string;
//   orgId: string | null;
//   dateCreated: string;  // ISO string
//   expiresDate: string;  // ISO string
//   revoked: boolean;
// };

// /** Mirrors backend UserSessionCreateRequest (best-guess common fields)
//  * If your backend request has more fields (ip/device/userAgent), add them here.
//  */
// export type UserSessionCreateRequest = {
//   userId: string;
//   orgId?: string | null;
//   // optional: allow server to compute if omitted
//   expiresDate?: string; // ISO string (LocalDateTime serialized)
//   // optional metadata (only include if backend supports)
//   ipAddress?: string;
//   userAgent?: string;
//   deviceInfo?: string;
// };

// const BASE = "/v1/sessions";

// /** Create a session row (usually done by backend during login, but endpoint exists) */
// export async function createUserSession(req: UserSessionCreateRequest): Promise<UserSessionDto> {
//   const { data } = await apiClient.post(`${BASE}`, req);
//   return data as UserSessionDto;
// }

// /** Get all sessions for a user */
// export async function fetchUserSessions(userId: string): Promise<UserSessionDto[]> {
//   const { data } = await apiClient.get(`${BASE}/user/${userId}`);
//   return (Array.isArray(data) ? data : []) as UserSessionDto[];
// }

// /** Get active sessions for a user (not expired + not revoked, per backend) */
// export async function fetchActiveUserSessions(userId: string): Promise<UserSessionDto[]> {
//   const { data } = await apiClient.get(`${BASE}/user/${userId}/active`);
//   return (Array.isArray(data) ? data : []) as UserSessionDto[];
// }

// /** Revoke a single session (admin action) */
// export async function revokeSession(sessionId: string): Promise<void> {
//   await apiClient.delete(`${BASE}/${sessionId}`);
// }

// /** Revoke all sessions for a user (admin action) */
// export async function revokeAllSessionsForUser(userId: string): Promise<void> {
//   await apiClient.delete(`${BASE}/user/${userId}`);
// }

// /** Helpers (UI) */
// export function isSessionExpired(s: UserSessionDto): boolean {
//   if (!s?.expiresDate) return false;
//   const t = new Date(s.expiresDate).getTime();
//   if (Number.isNaN(t)) return false;
//   return t <= Date.now();
// }

// export function getSessionState(s: UserSessionDto): "REVOKED" | "EXPIRED" | "ACTIVE" {
//   if (s.revoked) return "REVOKED";
//   if (isSessionExpired(s)) return "EXPIRED";
//   return "ACTIVE";
// }


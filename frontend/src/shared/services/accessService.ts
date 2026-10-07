// src/shared/services/accessService.ts

import { http } from "../../api/http";

// ============================================================================
// TYPES
// ============================================================================

export type EmsPortal = "ADMINISTRATIVE" | "OPERATIONS" | "NONE";

export interface CurrentAccessProfile {
  roles: string[];

  administrativeRole: boolean;

  operationalRole: boolean;

  portal: EmsPortal;

  defaultRoute: string | null;
}

// ============================================================================
// CURRENT ACCESS PROFILE
// ============================================================================
//
// Backend:
//
// GET /api/access/me
//
// Portal-level authorization only.
//
// This endpoint does NOT replace election/resource authorization.
//
// ============================================================================

export async function fetchCurrentAccessProfile(): Promise<CurrentAccessProfile> {
  return http.get<CurrentAccessProfile>("/api/access/me");
}

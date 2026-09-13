// src/shared/services/userElectionAssignmentService.ts

import { apiClient } from "../lib/apiClient";

// ============================================================================
// ASSIGNMENT SCOPE
// ============================================================================

export type AssignmentScope =
  | "ORGANIZATION"
  | "MULTI_COUNTY"
  | "COUNTY"
  | "DISTRICT"
  | "CENTER"
  | "PLACE";

// ============================================================================
// REQUEST
// ============================================================================

export type UserElectionAssignmentRequest = {
  userId: string;

  orgId: string;

  electionId: string;

  scopeType: AssignmentScope;

  countyId?: string;

  districtId?: string;

  centerId?: string;

  placeId?: string;

  countyIds?: string[];

  centerIds?: string[];
};

// ============================================================================
// DTO
// ============================================================================

export type UserElectionAssignmentDto = {
  assignmentId: string;

  userId: string;

  userName?: string | null;

  userDisplayName?: string | null;

  orgId: string;

  orgName?: string | null;

  electionId: string;

  electionName?: string | null;

  scopeType: AssignmentScope;

  countyId?: string | null;

  countyName?: string | null;

  districtId?: string | null;

  districtName?: string | null;

  centerId?: string | null;

  centerName?: string | null;

  placeId?: string | null;

  placeName?: string | null;

  active: boolean;

  dateCreated?: string | null;

  dateUpdated?: string | null;
};

// ============================================================================
// TENANT HEADERS
// ============================================================================

function tenantHeaders(orgId: string) {
  const tenantId = String(orgId ?? "").trim();

  if (!tenantId) {
    throw new Error("Organization context is required for user assignment.");
  }

  return {
    headers: {
      "X-Org-Id": tenantId,
    },
  };
}

// ============================================================================
// LIST ACTIVE ASSIGNMENTS
//
// GET
// /api/user-election-assignments/list
//     ?orgId=...
//     &electionId=...
// ============================================================================

export async function listUserElectionAssignments(
  orgId: string,
  electionId: string,
): Promise<UserElectionAssignmentDto[]> {
  const tenantId = String(orgId ?? "").trim();

  const selectedElectionId = String(electionId ?? "").trim();

  if (!tenantId) {
    throw new Error("Organization is required.");
  }

  if (!selectedElectionId) {
    throw new Error("Election is required.");
  }

  const { data } = await apiClient.get<UserElectionAssignmentDto[]>(
    "/user-election-assignments/list",
    {
      ...tenantHeaders(tenantId),

      params: {
        orgId: tenantId,

        electionId: selectedElectionId,
      },
    },
  );

  return Array.isArray(data) ? data : [];
}

// ============================================================================
// GET ONE USER'S ACTIVE ASSIGNMENT SET
//
// GET
// /api/user-election-assignments/users/{userId}
//     ?orgId=...
//     &electionId=...
// ============================================================================

export async function fetchUserElectionAssignments(
  orgId: string,
  userId: string,
  electionId: string,
): Promise<UserElectionAssignmentDto[]> {
  const tenantId = String(orgId ?? "").trim();

  const selectedUserId = String(userId ?? "").trim();

  const selectedElectionId = String(electionId ?? "").trim();

  if (!tenantId) {
    throw new Error("Organization is required.");
  }

  if (!selectedUserId) {
    throw new Error("User is required.");
  }

  if (!selectedElectionId) {
    throw new Error("Election is required.");
  }

  const { data } = await apiClient.get<UserElectionAssignmentDto[]>(
    `/user-election-assignments/users/${selectedUserId}`,
    {
      ...tenantHeaders(tenantId),

      params: {
        orgId: tenantId,

        electionId: selectedElectionId,
      },
    },
  );

  return Array.isArray(data) ? data : [];
}

// ============================================================================
// ASSIGN / REPLACE
//
// POST /api/user-election-assignments
// ============================================================================

export async function assignUserElection(
  orgId: string,
  payload: UserElectionAssignmentRequest,
): Promise<UserElectionAssignmentDto[]> {
  const tenantId = String(orgId ?? "").trim();

  if (!tenantId) {
    throw new Error("Organization is required.");
  }

  const { data } = await apiClient.post<UserElectionAssignmentDto[]>(
    "/user-election-assignments",
    payload,
    tenantHeaders(tenantId),
  );

  return Array.isArray(data) ? data : [];
}

// ============================================================================
// DEACTIVATE USER ASSIGNMENT SET
//
// DELETE
// /api/user-election-assignments/users/{userId}
//     ?orgId=...
//     &electionId=...
// ============================================================================

export async function deactivateUserElectionAssignments(
  orgId: string,
  userId: string,
  electionId: string,
): Promise<void> {
  const tenantId = String(orgId ?? "").trim();

  const selectedUserId = String(userId ?? "").trim();

  const selectedElectionId = String(electionId ?? "").trim();

  if (!tenantId) {
    throw new Error("Organization is required.");
  }

  if (!selectedUserId) {
    throw new Error("User is required.");
  }

  if (!selectedElectionId) {
    throw new Error("Election is required.");
  }

  await apiClient.delete(`/user-election-assignments/users/${selectedUserId}`, {
    ...tenantHeaders(tenantId),

    params: {
      orgId: tenantId,

      electionId: selectedElectionId,
    },
  });
}

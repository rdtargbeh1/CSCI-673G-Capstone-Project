// src/shared/services/operationWorkspaceService.ts

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
// OPERATION ACCESS CONTEXT
// ============================================================================
//
// This matches the backend DTO returned by:
//
// GET /api/operations/access-context?electionId={electionId}
//
// The apiClient already uses the application's API base path, so the service
// calls /operations/access-context.
//
// ============================================================================

export type OperationAccessContext = {
  electionId: string;

  operationalAccess: boolean;

  scopeType: AssignmentScope | null;
};

// ============================================================================
// FETCH OPERATION ACCESS
// ============================================================================
//
// ADMINISTRATIVE USER:
//
// - no UserElectionAssignment required
// - organization + election establish operational reach
//
// OPERATIONAL USER:
//
// - requires UserElectionAssignment
// - backend resolves effective scope
//
// This endpoint is informational.
//
// Individual resource APIs remain responsible for actual authorization.
//
// ============================================================================

export async function fetchOperationWorkspaceAccess(
  electionId: string,
): Promise<OperationAccessContext> {
  const normalizedElectionId = String(electionId ?? "").trim();

  if (!normalizedElectionId) {
    throw new Error("Election ID is required to resolve Operations access.");
  }

  const { data } = await apiClient.get<OperationAccessContext>(
    "/operations/access-context",
    {
      params: {
        electionId: normalizedElectionId,
      },
    },
  );

  return data;
}

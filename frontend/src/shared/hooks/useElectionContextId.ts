// src/shared/hooks/useElectionContextId.ts

import { useParams } from "react-router-dom";

import { useAuthStore } from "../store/authStore";

// ============================================================================
// NORMALIZE
// ============================================================================

function normalizeId(value: unknown): string | null {
  const normalized = String(value ?? "").trim();

  return normalized || null;
}

// ============================================================================
// ELECTION CONTEXT ID
// ============================================================================
//
// Administrative workspace:
//
// /elections/:electionId/...
//
//      -> use route electionId
//
// Operations workspace:
//
// /operations/...
//
//      -> use currentElectionId from application state
//
// This allows existing election-aware components to be reused by both portal
// families without making electionId part of the Operations URL.
//
// ============================================================================

export function useElectionContextId(): string | null {
  const params = useParams<{
    electionId?: string;
  }>();

  const currentElectionId = useAuthStore(
    (state: any) => state.currentElectionId,
  );

  const routeElectionId = normalizeId(params.electionId);

  if (routeElectionId) {
    return routeElectionId;
  }

  return normalizeId(currentElectionId);
}

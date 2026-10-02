// src/shared/hooks/useOperationalContext.ts

import { useEffect } from "react";

import { useQuery } from "@tanstack/react-query";

import { useAuthStore } from "../store/authStore";

import { listActiveElections } from "../services/electionService";

import {
  fetchOperationWorkspaceAccess,
  type AssignmentScope,
  type OperationAccessContext,
} from "../services/operationWorkspaceService";

// ============================================================================
// TYPES
// ============================================================================

export type OperationalContextResult = {
  electionId: string | null;

  scopeType: AssignmentScope | null;

  operationalAccess: boolean;

  loading: boolean;

  error: unknown;

  context: OperationAccessContext | null;
};

// ============================================================================
// NORMALIZE
// ============================================================================

function normalizeId(value: unknown): string | null {
  const normalized = String(value ?? "").trim();

  return normalized || null;
}

// ============================================================================
// STORE CURRENT ELECTION
// ============================================================================

function storeCurrentElectionId(electionId: string) {
  const normalized = normalizeId(electionId);

  if (!normalized) {
    return;
  }

  const state: any = useAuthStore.getState?.() ?? {};

  const setter =
    state.setCurrentElectionId ??
    state.setElectionId ??
    state.setCurrentElection ??
    state.setElection ??
    null;

  if (typeof setter === "function") {
    setter(normalized);

    return;
  }

  const store: any = useAuthStore as any;

  if (typeof store.setState === "function") {
    store.setState({
      currentElectionId: normalized,

      electionId: normalized,
    });
  }
}

// ============================================================================
// OPERATIONAL CONTEXT
// ============================================================================
//
// Operations uses stable routes:
//
// /operations/dashboard
// /operations/geography
// /operations/personnel
// /operations/reference
// /operations/submissions
// /operations/results
// /operations/reports
//
// Election is data context.
//
// ============================================================================

export function useOperationalContext(
  enabled = true,
): OperationalContextResult {
  const currentElectionId = useAuthStore(
    (state: any) => state.currentElectionId,
  );

  const currentOrgId = useAuthStore((state) => state.currentOrgId);
  const userId = useAuthStore((state) => state.user?.userId);
  const token = useAuthStore((state) => state.token);
  enabled = enabled && Boolean(token) && Boolean(currentOrgId);

  const storedElectionId = normalizeId(currentElectionId);

  // ==========================================================================
  // CURRENT ELECTION ACCESS
  // ==========================================================================

  const currentAccessQuery = useQuery<OperationAccessContext, Error>({
    queryKey: [
      "operations",
      "access-context",
      currentOrgId,
      userId,
      storedElectionId,
    ],

    queryFn: () => fetchOperationWorkspaceAccess(storedElectionId as string),

    enabled: enabled && Boolean(storedElectionId),

    staleTime: 30_000,

    refetchOnWindowFocus: false,

    retry: 1,
  });

  // ==========================================================================
  // INITIAL ELECTION DISCOVERY
  // ==========================================================================

  const discoveryQuery = useQuery<OperationAccessContext | null, Error>({
    queryKey: ["operations", "discover-election", currentOrgId, userId],

    queryFn: async () => {
      const elections = await listActiveElections();

      const ordered = [...(elections ?? [])].sort((left: any, right: any) => {
        const yearDifference =
          Number(right?.year ?? 0) - Number(left?.year ?? 0);

        if (yearDifference !== 0) {
          return yearDifference;
        }

        const leftDate = Date.parse(String(left?.dateCreated ?? ""));

        const rightDate = Date.parse(String(right?.dateCreated ?? ""));

        const safeLeftDate = Number.isFinite(leftDate) ? leftDate : 0;

        const safeRightDate = Number.isFinite(rightDate) ? rightDate : 0;

        return safeRightDate - safeLeftDate;
      });

      for (const election of ordered) {
        const electionId = normalizeId(election?.electionId);

        if (!electionId) {
          continue;
        }

        try {
          const context = await fetchOperationWorkspaceAccess(electionId);

          if (context.operationalAccess) {
            return context;
          }
        } catch {
          /*
           * Continue checking the remaining active elections.
           */
        }
      }

      return null;
    },

    enabled: enabled && !storedElectionId,

    staleTime: 30_000,

    refetchOnWindowFocus: false,

    retry: 1,
  });

  // ==========================================================================
  // STORE DISCOVERED ELECTION
  // ==========================================================================

  useEffect(() => {
    if (!enabled || storedElectionId) {
      return;
    }

    const discoveredElectionId = normalizeId(discoveryQuery.data?.electionId);

    if (!discoveredElectionId) {
      return;
    }

    storeCurrentElectionId(discoveredElectionId);
  }, [enabled, storedElectionId, discoveryQuery.data]);

  // ==========================================================================
  // EFFECTIVE CONTEXT
  // ==========================================================================

  const context = storedElectionId
    ? (currentAccessQuery.data ?? null)
    : (discoveryQuery.data ?? null);

  const electionId =
    storedElectionId ?? normalizeId(discoveryQuery.data?.electionId);

  // ==========================================================================
  // RETURN
  // ==========================================================================

  return {
    electionId,

    scopeType: context?.scopeType ?? null,

    operationalAccess:
      enabled &&
      !currentAccessQuery.isError &&
      !discoveryQuery.isError &&
      context?.operationalAccess === true,

    loading:
      enabled &&
      (storedElectionId
        ? currentAccessQuery.isLoading
        : discoveryQuery.isLoading),

    error: storedElectionId
      ? (currentAccessQuery.error ?? null)
      : (discoveryQuery.error ?? null),

    context,
  };
}

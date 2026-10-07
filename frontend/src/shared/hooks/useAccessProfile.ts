// src/shared/hooks/useAccessProfile.ts

import { useQuery } from "@tanstack/react-query";

import { useAuthStore } from "../store/authStore";

import {
  fetchCurrentAccessProfile,
  type CurrentAccessProfile,
} from "../services/accessService";

// ============================================================================
// QUERY KEY
// ============================================================================

export const accessProfileQueryKey = (
  currentOrgId?: string | null,
  userId?: string | null,
) => ["access", "me", currentOrgId ?? "NO_ORG", userId ?? "NO_USER"] as const;

// ============================================================================
// ACCESS PROFILE HOOK
// ============================================================================
//
// Central frontend access source.
//
// This replaces frontend role inference such as:
//
// - decode JWT
// - dashboardMode === "NEC"
// - user.isSystemAdmin
// - local administrative/operational role arrays
//
// The backend /api/access/me endpoint is authoritative for portal selection.
//
// dashboardMode remains useful for UI/environment presentation:
//
// SYSTEM
// NEC
// TENANT
//
// but dashboardMode is NOT authorization.
//
// ============================================================================

export function useAccessProfile() {
  const token = useAuthStore((state) => state.token);

  const currentOrgId = useAuthStore((state) => state.currentOrgId);

  const userId = useAuthStore((state) => state.user?.userId);

  const query = useQuery<CurrentAccessProfile, Error>({
    queryKey: accessProfileQueryKey(currentOrgId, userId),

    queryFn: fetchCurrentAccessProfile,

    enabled: Boolean(token),

    /*
     * Access should remain stable while navigating inside the same
     * organization context.
     *
     * Changing currentOrgId creates a different query key and therefore
     * resolves access again for that organization.
     */
    staleTime: 0,
    refetchOnMount: "always",

    refetchOnWindowFocus: false,

    retry: 1,
  });

  return {
    access: token && !query.isError ? (query.data ?? null) : null,

    roles: query.data?.roles ?? [],

    portal: query.data?.portal ?? null,

    defaultRoute: query.data?.defaultRoute ?? null,

    isAdministrative: query.data?.administrativeRole === true,

    isOperational: query.data?.operationalRole === true,

    isLoading: query.isPending && Boolean(token),

    isFetching: query.isFetching,

    isError: query.isError,

    error: query.error,

    refetch: query.refetch,
  };
}

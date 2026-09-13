

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "../../../../shared/store/authStore";
import { necResultService } from "../../../../shared/services/necResultService";

/**
 * TENANT/SYSTEM: stable publish status.
 * - Same queryKey across ALL pages (Home/Local/Official)
 * - placeholderData keeps previous value so tabs don't disappear on navigation
 */
export function useTenantOfficialPublished() {
  const electionId = useAuthStore((s: any) => s.currentElectionId);
  const qc = useQueryClient();

  return useQuery({
    queryKey: ["nec-election-published", electionId], // ✅ ONE key everywhere
    enabled: !!electionId,
    staleTime: 15_000,
    refetchInterval: 30_000,
    retry: 0,

    queryFn: () =>
      necResultService.isElectionPublished({
        electionId: String(electionId),
        contestId: null,
      }),

    // ✅ keep previous boolean during remount/refetch
    placeholderData: () =>
      (qc.getQueryData(["nec-election-published", electionId]) as boolean | undefined) ??
      undefined,
  });
}
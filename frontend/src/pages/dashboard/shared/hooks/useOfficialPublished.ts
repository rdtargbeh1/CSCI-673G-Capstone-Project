

import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "../../../../shared/store/authStore";
import { necResultService } from "../../../../shared/services/necResultService";

/**
 * Single source of truth for "Is official published?"
 * TENANT pages should all use this hook so tabs don't flicker/disappear.
 */
export function useOfficialPublished() {
  const currentElectionId = useAuthStore((s: any) => s.currentElectionId);
  const currentOrgId = useAuthStore((s: any) => s.currentOrgId);

  const q = useQuery({
    queryKey: ["nec-election-published", currentElectionId, currentOrgId],
    queryFn: () =>
      necResultService.isElectionPublished({
        electionId: String(currentElectionId ?? ""),
        contestId: null,
      }),
    enabled: !!currentElectionId,
    staleTime: 15_000,
    retry: 0,
    refetchInterval: 30_000,
  });

  return {
    isOfficialPublished: q.data === true,
    publishQuery: q,
  };
}
import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import { fetchElectionOverview } from "../services/overviewService";

export function useElectionOverview() {
  const mode = useAuthStore((s) => s.dashboardMode);
  const orgId = useAuthStore((s) => s.currentOrgId);
  const storeElectionId = useAuthStore((s) => s.currentElectionId);

  // fallback if electionId isn't set in store yet
  const params = useParams();
  const routeElectionId = (params as any)?.electionId as string | undefined;

  const electionId = storeElectionId ?? routeElectionId ?? null;

  const needsOrg = mode === "TENANT";

  return useQuery({
    // ✅ include orgId so cache is correct per-tenant
    queryKey: ["election-overview", electionId, mode, orgId],

    // ✅ tenant mode requires orgId
    enabled: !!electionId && (!needsOrg || !!orgId),

    queryFn: () => fetchElectionOverview(electionId!, mode),

    staleTime: 10_000,
  });
}

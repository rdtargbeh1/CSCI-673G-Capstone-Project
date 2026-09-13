
// src/shared/hooks/useElectionOverview.ts

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

  // ✅ NEC + TENANT require org context
  const needsOrg = mode === "TENANT" || mode === "NEC";

  return useQuery({
    // ✅ include orgId so cache is correct per-tenant
    queryKey: ["election-overview", electionId, mode, orgId],

    // ✅ tenant modes require orgId
    enabled: !!electionId && (!needsOrg || !!orgId),

    // ✅ pass orgId for NEC/TENANT modes
    queryFn: () => fetchElectionOverview(electionId!, mode, orgId ?? undefined),

    staleTime: 10_000,
  });
}




// ✅ FILE: src/shared/services/stats/electionStatsOfficialService.ts

import { apiClient } from "../../lib/apiClient";

export type PageResponse<T> = {
  content: T[];
  number: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
};

export type ElectionStatsOfficialRow = {
  electionId: string;
  contestId?: string | null;

  registeredVoters: number;
  ballotsCast: number;
  validVotes: number;
  invalidTotal: number;

  turnoutPct: number;
  invalidPct: number;

  centersReported: number;
  centersTotal: number;
  reportingPct: number;

  centersStarted: number;
};

export type ElectionStatsOfficialQuery = {
  // ✅ SYSTEM optional
  orgId?: string;

  electionId: string;
  contestId?: string;

  page?: number;
  size?: number;
  sort?: string[];
};

export async function searchElectionStatsOfficial(
  q: ElectionStatsOfficialQuery
): Promise<PageResponse<ElectionStatsOfficialRow>> {
  const res = await apiClient.get<PageResponse<ElectionStatsOfficialRow>>(
    "/stats/official/elections",
    {
      params: {
        orgId: q.orgId,
        electionId: q.electionId,
        contestId: q.contestId,
        page: q.page ?? 0,
        size: q.size ?? 1,
        sort: q.sort,
      },
      paramsSerializer: {
        // ensure sort=field,dir repeats in query string
        serialize: (p: any) => {
          const sp = new URLSearchParams();
          Object.entries(p ?? {}).forEach(([k, v]) => {
            if (v == null || v === "") return;
            if (Array.isArray(v)) v.forEach((x) => sp.append(k, String(x)));
            else sp.set(k, String(v));
          });
          return sp.toString();
        },
      } as any,
    }
  );

  return res.data as PageResponse<ElectionStatsOfficialRow>;
}



// ✅ FILE: src/shared/services/stats/countyStatsOfficialService.ts

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

export type CountyStatsOfficialRow = {
  electionId: string;
  contestId?: string | null;
  contestName: string;

  countyId: string;
  countyName: string;

  registeredVoters: number;
  ballotsCast: number;
  validVotes: number;
  invalidTotal: number;

  turnoutPct: number;
  invalidPct: number;

  centersReported: number;
  centersTotal: number;
  reportingPct: number;

  districtsReported: number;
  districtsTotal: number;
  districtsCompleted: number;
  districtsStarted: number;

  centersStarted: number;
};

export type CountyStatsOfficialQuery = {
  electionId: string;
  contestId?: string;
  countyId?: string;
  page?: number;
  size?: number;
  sort?: string[];
};

export async function searchCountyStatsOfficial(
  q: CountyStatsOfficialQuery
): Promise<PageResponse<CountyStatsOfficialRow>> {
  const res = await apiClient.get<PageResponse<CountyStatsOfficialRow>>(
    "/stats/official/counties",
    {
      params: {
        electionId: q.electionId,
        contestId: q.contestId,
        countyId: q.countyId,
        page: q.page ?? 0,
        size: q.size ?? 25,
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

  return res.data as PageResponse<CountyStatsOfficialRow>;
}

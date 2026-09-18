
// ✅ FILE: src/shared/services/stats/centerStatsOfficialService.ts

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

/**
 * ✅ Matches backend CenterStatsOfficialDto fields (UUID -> string, Long/BigDecimal -> number|string)
 */
export type CenterStatsOfficialRow = {
  electionId: string;
  contestId?: string | null;

  countyId?: string | null;
  countyName?: string | null;

  districtId?: string | null;
  districtName?: string | null;

  centerId: string;
  centerCode?: string | null;
  centerName?: string | null;

  registeredVoters?: number | string | null;
  ballotsIssued?: number | string | null;

  ballotsCast?: number | string | null;
  validVotes?: number | string | null;
  invalidTotal?: number | string | null;

  turnoutPct?: number | string | null;
  invalidPct?: number | string | null;

  placesTotal?: number | string | null;
  placesReported?: number | string | null;
  placesReportingPct?: number | string | null;

  hasPlaceAllocation?: number | string | null;
  centerStarted?: number | string | null;
  centerPartial?: number | string | null;
  centerCompleted?: number | string | null;

  source?: string | null;
  uploadTime?: string | null; // Instant serialized to ISO string
};

export type CenterStatsOfficialQuery = {
  electionId: string;
  contestId?: string;

  countyId?: string;
  districtId?: string;
  centerId?: string;

  page?: number;
  size?: number;
  sort?: string[];
};

/**
 * API: GET /stats/official/centers
 * Source: v_center_stats_official
 */
export async function searchCenterStatsOfficial(
  q: CenterStatsOfficialQuery
): Promise<PageResponse<CenterStatsOfficialRow>> {
  const res = await apiClient.get<PageResponse<CenterStatsOfficialRow>>("/stats/official/centers", {
    params: {
      electionId: q.electionId,
      contestId: q.contestId || undefined,
      countyId: q.countyId || undefined,
      districtId: q.districtId || undefined,
      centerId: q.centerId || undefined,
      page: q.page ?? 0,
      size: q.size ?? 25,
      sort: q.sort,
    },
    paramsSerializer: {
      // ✅ ensure sort=field,dir repeats in query string
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
  });

  return res.data;
}

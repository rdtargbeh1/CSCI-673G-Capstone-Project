import { apiClient } from "../../lib/apiClient";

export type NecResultGeoRow = {
  resultId: string;
  electionId: string;
  contestId: string;

  centerId: string;
  centerCode?: string;
  centerName?: string;

  districtId?: string;
  districtName?: string;

  countyId?: string;
  countyName?: string;

  totalRegisteredVoters?: number;
  ballotsCast?: number;

  invalidBallots?: number;
  unmarkedBallots?: number;   // ✅ matches backend now
  rejectedBallots?: number;

  spoiledBallots?: number;
  unusedBallots?: number;

  ballotsIssued?: number;

  source?: string;
  uploadTime?: string;
};

export type PageResp<T> = {
  content: T[];
  number: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
};

export async function searchNecResultGeo(params: {
  electionId: string;
  contestId?: string;
  countyId?: string;
  districtId?: string;
  centerId?: string;
  page?: number;
  size?: number;
  sort?: string[];
}): Promise<PageResp<NecResultGeoRow>> {
  const res = await apiClient.get<PageResp<NecResultGeoRow>>(
    "/stats/official/nec/geo",
    {
      params,
      paramsSerializer: {
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
  return res.data;
}

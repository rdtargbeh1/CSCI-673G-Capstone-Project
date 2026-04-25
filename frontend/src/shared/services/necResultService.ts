


// ✅ FILE: src/shared/services/necResultService.ts
import { apiClient } from "../lib/apiClient";

export type NecResultPublishRequest = {
  actorUserId: string;
  publishedUntil: string;
};

export type NECResultDto = {
  resultId: string;
  electionId: string;
  electionName?: string;
  contest?: string;
  contestName?: string;
  centerId?: string;
  pollingCenterName?: string;
  candidateVotes?: Record<string, number>;
  totalRegisteredVoters?: number;
  ballotsInBox?: number;
  invalidBallots?: number;
  unmarkedBallots?: number;
  unusedBallots?: number;
  rejectedBallots?: number;
  spoiledBallots?: number;
  resultSignature?: string;
  resultSignerKeyId?: string;
  chainHash?: string;
  source?: string;
  uploadTime?: string;
};

export type PageResponse<T> = {
  content: T[];
  number: number;
  size: number;
  totalElements: number;
  totalPages: number;
};

export type NECOverallTotalsDto = {
  totalRegisteredVoters?: number;
  ballotsInBox?: number;
  invalidBallots?: number;
  unmarkedBallots?: number;
  rejectedBallots?: number;
  spoiledBallots?: number;
  unusedBallots?: number;
};

export type CandidateVoteTotalDto = {
  optionId?: string;
  optionLabel?: string;
  totalVotes?: number;
};

export type CandidateScopedTotalDto = {
  optionId?: string;
  optionLabel?: string;
  scopeId?: string;
  scopeName?: string;
  totalVotes?: number;
};

export type CandidateDailyTotalDto = {
  optionId?: string;
  optionLabel?: string;
  day?: string;
  totalVotes?: number;
};

export type NECResultAdminRow = {
  resultId: string;

  election?: { electionId: string; electionName?: string };
  contest?: { contestId: string; contestName?: string };
  pollingCenter?: { centerId: string; centerName?: string };

  electionId?: string;
  contestId?: string;
  centerId?: string;

  candidateVotes?: Record<string, number> | any;

  totalRegisteredVoters?: number;
  ballotsInBox?: number;

  invalidBallots?: number;
  unmarkedBallots?: number;
  unusedBallots?: number;
  rejectedBallots?: number;
  spoiledBallots?: number;

  isPublished?: boolean;
  publishedAt?: string;
  publishedUntil?: string;

  resultSignature?: string;
  resultSignerKeyId?: string;
  chainHash?: string;

  source?: string;
  uploadTime?: string;
};

export const necResultService = {
  // ---------- /api/nec-results ----------
  async get(id: string) {
    const { data } = await apiClient.get<NECResultDto>(`/nec-results/${id}`);
    return data;
  },

  async search(p: {
    electionId?: string;
    centerId?: string;
    uploadedAfter?: string;
    uploadedBefore?: string;
    page?: number;
    size?: number;
  }) {
    const params = new URLSearchParams();
    if (p.electionId) params.set("electionId", p.electionId);
    if (p.centerId) params.set("centerId", p.centerId);
    if (p.uploadedAfter) params.set("uploadedAfter", p.uploadedAfter);
    if (p.uploadedBefore) params.set("uploadedBefore", p.uploadedBefore);

    params.set("page", String(p.page ?? 0));
    params.set("size", String(p.size ?? 20));
    params.set("sort", "uploadTime,desc");

    const { data } = await apiClient.get<PageResponse<NECResultDto>>(
      `/nec-results?${params.toString()}`
    );
    return data;
  },

  async publishForCenterContest(p: {
    electionId: string;
    contestId: string;
    centerId: string;
    body: NecResultPublishRequest;
  }) {
    const params = new URLSearchParams();
    params.set("electionId", p.electionId);
    params.set("contestId", p.contestId);
    params.set("centerId", p.centerId);

    await apiClient.post(`/nec-results/publish?${params.toString()}`, p.body);
  },

  async unpublishForCenterContest(p: {
    electionId: string;
    contestId: string;
    centerId: string;
    actorUserId: string;
    reason?: string;
  }) {
    const params = new URLSearchParams();
    params.set("electionId", p.electionId);
    params.set("contestId", p.contestId);
    params.set("centerId", p.centerId);
    params.set("actorUserId", p.actorUserId);
    if (p.reason) params.set("reason", p.reason);

    await apiClient.post(`/nec-results/unpublish?${params.toString()}`);
  },

  // ✅ NEW: TENANT-safe single truth for “published?”
  // MUST be backed by: GET /api/nec-results/published?electionId=...&contestId=...
  async isElectionPublished(p: { electionId: string; contestId?: string | null }) {
    const { data } = await apiClient.get<{ published?: boolean; isPublished?: boolean }>(
      `/nec-results/published`,
      {
        params: {
          electionId: p.electionId,
          contestId: p.contestId ?? undefined,
        },
      }
    );

    if (typeof data?.published !== "undefined") return Boolean(data.published);
    if (typeof data?.isPublished !== "undefined") return Boolean(data.isPublished);

    throw new Error("published endpoint returned unknown shape");
  },

  // ---------- Stats ----------
  async totals(electionId: string, centerId?: string) {
    const params = new URLSearchParams();
    params.set("electionId", electionId);
    if (centerId) params.set("centerId", centerId);

    const { data } = await apiClient.get<NECOverallTotalsDto>(
      `/nec-results/stats/totals?${params.toString()}`
    );
    return data;
  },

  async byCandidate(electionId: string, centerId?: string) {
    const params = new URLSearchParams();
    params.set("electionId", electionId);
    if (centerId) params.set("centerId", centerId);

    const { data } = await apiClient.get<CandidateVoteTotalDto[]>(
      `/nec-results/stats/by-candidate?${params.toString()}`
    );
    return data;
  },

  async byCounty(electionId: string) {
    const { data } = await apiClient.get<CandidateScopedTotalDto[]>(
      `/nec-results/stats/by-county?electionId=${encodeURIComponent(electionId)}`
    );
    return data;
  },

  async byDistrict(electionId: string, countyId?: string) {
    const params = new URLSearchParams();
    params.set("electionId", electionId);
    if (countyId) params.set("countyId", countyId);

    const { data } = await apiClient.get<CandidateScopedTotalDto[]>(
      `/nec-results/stats/by-district?${params.toString()}`
    );
    return data;
  },

  async daily(electionId: string) {
    const { data } = await apiClient.get<CandidateDailyTotalDto[]>(
      `/nec-results/stats/daily?electionId=${encodeURIComponent(electionId)}`
    );
    return data;
  },

  // ---------- /api/admin/nec (NEC-only) ----------
  async adminGetRawResults(electionId: string) {
    const { data } = await apiClient.get<any[]>(
      `/admin/nec/results/${encodeURIComponent(electionId)}`
    );
    return data;
  },

  async adminPublishElection(p: { electionId: string; body: NecResultPublishRequest }) {
    const { data } = await apiClient.post<string>(
      `/admin/nec/results/${encodeURIComponent(p.electionId)}/publish`,
      p.body
    );
    return data;
  },

  async adminUnpublishElection(p: {
    electionId: string;
    actorUserId: string;
    reason?: string;
  }) {
    const params = new URLSearchParams();
    params.set("actorUserId", p.actorUserId);
    if (p.reason) params.set("reason", p.reason);

    const { data } = await apiClient.post<string>(
      `/admin/nec/results/${encodeURIComponent(p.electionId)}/unpublish?${params.toString()}`
    );
    return data;
  },
};


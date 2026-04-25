


// ✅ FILE: src/shared/services/voteSubmissionService.ts
//
// ✅ Multi-tenant client selection:
// - Uses sysClient automatically when dashboardMode === "SYSTEM"
// - Uses apiClient otherwise
// - Sends X-Org-Id header for TENANT/NEC mode
// - SYSTEM mode must NOT send X-Org-Id header (orgId goes in query)
//
// ✅ Updates:
// - VoteStatus includes DELETED
// - searchSubmissions supports includeDeleted (default false)
// - deleteSubmission uses DELETE /vote-submissions/{id} with body { reason, deletedByUserId }

import { apiClient, sysClient } from "../lib/apiClient";
import { useAuthStore } from "../store/authStore";

export type VoteStatus =
  | "PENDING"
  | "VERIFIED"
  | "FLAGGED"
  | "REJECTED"
  | "DELETED"
  | "DRAFT";

export type VoteSubmissionDto = {
  submissionId: string;

  orgId?: string;
  orgName?: string;

  electionId: string;
  electionName?: string;
  year?: number;

  countyId?: string | null;
  countyName?: string | null;

  districtId?: string | null;
  districtName?: string | null;

  centerId?: string;
  centerCode?: string | null;
  centerName?: string;

  placeId?: string;
  placeCode?: string | null;
  placeNumber?: number | null;
  placeLabel?: string | null;

  contestId: string;
  contestName?: string;
  contestCategory?: string;
  contestScopeType?: string;

  agentId?: string;
  agentName?: string;

  verifiedBy?: string;
  verifiedByName?: string;
  dateVerified?: string;

  submissionTime?: string;

  candidateVotes?: Record<string, number>;

  ballotsInBox?: number;
  ballotsReceived?: number;
  invalidBallots?: number;
  unmarkedBallots?: number;
  spoiledBallots?: number;
  rejectedBallots?: number;
  unusedBallots?: number;

  validVotes?: number;
  invalidTotal?: number;
  turnoutPct?: number;
  invalidPct?: number;

  registeredVoters?: number;
  ballotsIssued?: number;
  allocationSource?: "PLACE" | "CENTER" | "NONE" | string;

  status?: VoteStatus | string;
  comments?: string;

  latitude?: number;
  longitude?: number;

  tallySheetUrl?: string | null;
  tallySheetCount?: number | null;

  // Optional if backend exposes it
  dateDeleted?: string | null;
};

export type VoteSubmissionCreateRequest = {
  orgId: string;
  electionId: string;
  centerId: string;
  placeId: string;

  agentId: string;
  contestId: string;

  candidateVotes: Record<string, number>;

  ballotsInBox?: number;
  ballotsReceived?: number;
  invalidBallots?: number;
  unmarkedBallots?: number;
  rejectedBallots?: number;
  spoiledBallots?: number;
  unusedBallots?: number;

  comments?: string;

  latitude?: number;
  longitude?: number;

  idempotencyKey?: string;

  draft?: boolean;
};

export type VoteSubmissionUpdateRequest = {
  candidateVotes?: Record<string, number>;

  ballotsInBox?: number;
  ballotsReceived?: number;
  invalidBallots?: number;
  unmarkedBallots?: number;
  rejectedBallots?: number;
  spoiledBallots?: number;
  unusedBallots?: number;

  comments?: string;

  latitude?: number;
  longitude?: number;
};

export type VoteSubmissionVerifyRequest = {
  verifierUserId: string;
  accept: boolean;
  comment?: string;
};

export type VoteSubmissionFlagRequest = {
  actorUserId: string;
  flagged: boolean;
  comments?: string;
};

export type VoteSubmissionAmendRequest = {
  actorUserId: string;
  reason: string;
  candidateVotes?: Record<string, number>;
  ballotsInBox?: number;

  invalidBallots?: number;
  unmarkedBallots?: number;
  rejectedBallots?: number;
  spoiledBallots?: number;
  unusedBallots?: number;
};

/** ✅ DELETE request (backend requires BOTH) */
export type VoteSubmissionDeleteRequest = {
  reason: string;
  deletedByUserId: string;
};

export type PageResult<T> = {
  items: T[];
  page: number;
  size: number;
  totalItems: number;
  totalPages: number;
};

function mapSpringPage<T>(p: any): PageResult<T> {
  const items = (p?.content ?? []) as T[];
  return {
    items,
    page: Number(p?.number ?? 0),
    size: Number(p?.size ?? items.length ?? 0),
    totalItems: Number(p?.totalElements ?? items.length ?? 0),
    totalPages: Math.max(1, Number(p?.totalPages ?? 1)),
  };
}

/* -----------------------------------------------------
   ✅ Multi-tenant helpers
----------------------------------------------------- */

function getCtx() {
  try {
    const s = useAuthStore.getState();
    return {
      mode: s.dashboardMode,
      storeOrgId: s.currentOrgId ?? null,
    };
  } catch {
    return { mode: "TENANT" as const, storeOrgId: null as string | null };
  }
}

function pickClient() {
  const { mode } = getCtx();
  return mode === "SYSTEM" ? sysClient : apiClient;
}

function tenantHeaders(preferredOrgId?: string | null) {
  const { mode, storeOrgId } = getCtx();

  // SYSTEM must never send tenant header
  if (mode === "SYSTEM") return undefined;

  const orgId = preferredOrgId ?? storeOrgId;
  return orgId ? { "X-Org-Id": orgId } : undefined;
}

/* -----------------------------------------------------
   API
----------------------------------------------------- */

export async function searchSubmissions(params: {
  page?: number;
  size?: number;

  orgId?: string;
  electionId?: string;

  countyId?: string;
  districtId?: string;
  centerId?: string;
  placeId?: string;

  contestId?: string;
  agentId?: string;

  status?: VoteStatus | string;
  from?: string;
  to?: string;

  q?: string;
  category?: string;
  scopeType?: string;

  /** ✅ NEW: show deleted records when true */
  includeDeleted?: boolean;
}): Promise<PageResult<VoteSubmissionDto>> {
  const client = pickClient();
  const { mode } = getCtx();

  const res = await client.get("/vote-submissions", {
    headers: tenantHeaders(params.orgId ?? null),
    params: {
      page: params.page ?? 0,
      size: params.size ?? 20,

      // ✅ SYSTEM needs orgId in query param (no header)
      orgId: mode === "SYSTEM" ? params.orgId : params.orgId,

      electionId: params.electionId,

      countyId: params.countyId,
      districtId: params.districtId,
      centerId: params.centerId,
      placeId: params.placeId,

      contestId: params.contestId,
      agentId: params.agentId,

      status: params.status,
      from: params.from,
      to: params.to,

      q: params.q,
      category: params.category,
      scopeType: params.scopeType,

      includeDeleted: Boolean(params.includeDeleted),
    },
  });

  return mapSpringPage<VoteSubmissionDto>(res.data);
}

export async function createSubmissionJson(
  req: VoteSubmissionCreateRequest
): Promise<VoteSubmissionDto> {
  const client = pickClient();
  const res = await client.post("/vote-submissions", req, {
    headers: tenantHeaders(req.orgId),
  });
  return res.data as VoteSubmissionDto;
}

export async function createSubmissionMultipart(params: {
  payload: VoteSubmissionCreateRequest;
  files: File[];
}): Promise<VoteSubmissionDto> {
  const client = pickClient();

  const fd = new FormData();
  fd.append(
    "payload",
    new Blob([JSON.stringify(params.payload)], { type: "application/json" })
  );
  params.files.forEach((f) => fd.append("files", f));

  const res = await client.post("/vote-submissions", fd, {
    headers: {
      ...(tenantHeaders(params.payload.orgId) ?? {}),
      "Content-Type": "multipart/form-data",
    },
  });

  return res.data as VoteSubmissionDto;
}

export async function getSubmission(id: string): Promise<VoteSubmissionDto> {
  const client = pickClient();
  const res = await client.get(`/vote-submissions/${id}`, {
    headers: tenantHeaders(null),
  });
  return res.data as VoteSubmissionDto;
}

export async function updateSubmissionJson(
  id: string,
  req: VoteSubmissionUpdateRequest
): Promise<VoteSubmissionDto> {
  const client = pickClient();
  const payload = normalizeUpdatePayload(req);

  const res = await client.put(`/vote-submissions/${id}`, payload, {
    headers: tenantHeaders(null),
  });

  return res.data as VoteSubmissionDto;
}

export async function updateSubmissionMultipart(params: {
  id: string;
  payload: VoteSubmissionUpdateRequest;
  files?: File[];
}): Promise<VoteSubmissionDto> {
  const client = pickClient();
  const payload = normalizeUpdatePayload(params.payload);

  const fd = new FormData();
  fd.append(
    "payload",
    new Blob([JSON.stringify(payload)], { type: "application/json" })
  );
  (params.files ?? []).forEach((f) => fd.append("files", f));

  const res = await client.put(`/vote-submissions/${params.id}`, fd, {
    headers: {
      ...(tenantHeaders(null) ?? {}),
      "Content-Type": "multipart/form-data",
    },
  });

  return res.data as VoteSubmissionDto;
}

/** ✅ DELETE WITH REASON (DELETE /vote-submissions/{id}) */
export async function deleteSubmission(
  id: string,
  req: VoteSubmissionDeleteRequest
): Promise<void> {
  const client = pickClient();

  const reason = String(req?.reason ?? "").trim();
  if (!reason) throw new Error("reason is required");
  if (reason.length > 500) throw new Error("reason must be <= 500 chars");

  const deletedByUserId = String(req?.deletedByUserId ?? "").trim();
  if (!deletedByUserId) throw new Error("deletedByUserId is required");

  await client.delete(`/vote-submissions/${id}`, {
    data: { reason, deletedByUserId },
    headers: tenantHeaders(null),
  });
}

export async function verifySubmission(
  id: string,
  req: VoteSubmissionVerifyRequest
): Promise<VoteSubmissionDto> {
  const client = pickClient();
  const res = await client.post(`/vote-submissions/${id}/verify`, req, {
    headers: tenantHeaders(null),
  });
  return res.data as VoteSubmissionDto;
}

export async function flagSubmission(
  id: string,
  req: VoteSubmissionFlagRequest
): Promise<VoteSubmissionDto> {
  if (!req?.actorUserId) throw new Error("actorUserId is required");
  if (typeof req.flagged !== "boolean") throw new Error("flagged is required");
  if (req.flagged && !(req.comments ?? "").trim()) {
    throw new Error("comments is required when flagged=true");
  }

  const client = pickClient();
  const res = await client.post(
    `/vote-submissions/${id}/flag`,
    {
      actorUserId: req.actorUserId,
      flagged: req.flagged,
      comments: req.comments,
    },
    { headers: tenantHeaders(null) }
  );

  return res.data as VoteSubmissionDto;
}

export async function amendSubmission(
  id: string,
  req: VoteSubmissionAmendRequest
): Promise<VoteSubmissionDto> {
  if (!req?.actorUserId) throw new Error("actorUserId is required");
  if (!(req?.reason ?? "").trim()) throw new Error("reason is required");

  const client = pickClient();
  const payload = normalizeAmendPayload(req);

  const res = await client.post(`/vote-submissions/${id}/amend`, payload, {
    headers: tenantHeaders(null),
  });

  return res.data as VoteSubmissionDto;
}

/* ---------------- helpers ---------------- */

function sumCandidateVotes(v?: Record<string, number>) {
  if (!v) return 0;
  return Object.values(v).reduce((a, b) => a + (Number(b) || 0), 0);
}

function normalizeUpdatePayload(
  p: VoteSubmissionUpdateRequest
): VoteSubmissionUpdateRequest {
  const hasVotes =
    !!p.candidateVotes && Object.keys(p.candidateVotes).length > 0;

  if (!hasVotes) return p;

  if (p.ballotsInBox == null) {
    const invalidTotalInBox =
      (Number(p.invalidBallots) || 0) +
      (Number(p.unmarkedBallots) || 0) +
      (Number(p.rejectedBallots) || 0);

    const computedInBox = sumCandidateVotes(p.candidateVotes) + invalidTotalInBox;

    return {
      ...p,
      ballotsInBox: computedInBox,
    };
  }

  return p;
}

function normalizeAmendPayload(
  p: VoteSubmissionAmendRequest
): VoteSubmissionAmendRequest {
  const hasVotes =
    !!p.candidateVotes && Object.keys(p.candidateVotes).length > 0;

  if (!hasVotes) return p;

  if (p.ballotsInBox == null) {
    const invalidTotalInBox =
      (Number(p.invalidBallots) || 0) +
      (Number(p.unmarkedBallots) || 0) +
      (Number(p.rejectedBallots) || 0);

    const computedInBox = sumCandidateVotes(p.candidateVotes) + invalidTotalInBox;

    return {
      ...p,
      ballotsInBox: computedInBox,
    };
  }

  return p;
}




// ✅ FILE: src/shared/services/voteSubmissionService.ts
// ✅ FIX (multi-tenant header + SYSTEM mode client):
// - Uses sysClient automatically when dashboardMode === "SYSTEM"
// - Forces X-Org-Id header from params.orgId / req.orgId when provided (tenant/NEC)
// - Prevents SYSTEM requests from accidentally carrying tenant header
//
// ✅ Existing DTO changes kept:
// - ballotsCast  -> ballotsInBox
// - invalidTotal excludes spoiled (spoiled is OUTSIDE box)

import { apiClient, sysClient } from "../lib/apiClient";
import { useAuthStore } from "../store/authStore";

export type VoteStatus =
  | "PENDING"
  | "VERIFIED"
  | "FLAGGED"
  | "REJECTED"
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

  // --- ballots ---
  ballotsInBox?: number;

  invalidBallots?: number;
  unmarkedBallots?: number;
  spoiledBallots?: number;
  rejectedBallots?: number;
  unusedBallots?: number;

  // --- derived helpers ---
  validVotes?: number;
  invalidTotal?: number;
  turnoutPct?: number;
  invalidPct?: number;

  // --- allocation read-only ---
  registeredVoters?: number;
  ballotsIssued?: number;
  allocationSource?: "PLACE" | "CENTER" | "NONE" | string;

  status?: VoteStatus | string;
  comments?: string;

  latitude?: number;
  longitude?: number;

  tallySheetUrl?: string | null;
  tallySheetCount?: number | null;
};

// CreateRequest
export type VoteSubmissionCreateRequest = {
  orgId: string;
  electionId: string;
  centerId: string;
  placeId: string;

  agentId: string;
  contestId: string;

  candidateVotes: Record<string, number>;

  ballotsInBox?: number;

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
}): Promise<PageResult<VoteSubmissionDto>> {
  const client = pickClient();
  const { mode } = getCtx();

  const res = await client.get("/vote-submissions", {
    headers: tenantHeaders(params.orgId ?? null),
    params: {
      page: params.page ?? 0,
      size: params.size ?? 20,

      // ✅ SYSTEM needs orgId as query param (no header)
      // ✅ TENANT/NEC may also accept it; harmless if backend ignores
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
    },
  });

  return mapSpringPage<VoteSubmissionDto>(res.data);
}

/** JSON create (no files) */
export async function createSubmissionJson(
  req: VoteSubmissionCreateRequest
): Promise<VoteSubmissionDto> {
  const client = pickClient();
  const res = await client.post("/vote-submissions", req, {
    headers: tenantHeaders(req.orgId),
  });
  return res.data as VoteSubmissionDto;
}

/** Multipart create */
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

/** JSON update (no files) */
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

/** Multipart update (optional files) */
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

export async function deleteSubmission(id: string): Promise<void> {
  const client = pickClient();
  await client.delete(`/vote-submissions/${id}`, {
    headers: tenantHeaders(null),
  });
}

/** verify */
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

/** flag/unflag */
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

/* ---------------- helpers ---------------- */

function sumCandidateVotes(v?: Record<string, number>) {
  if (!v) return 0;
  return Object.values(v).reduce((a, b) => a + (Number(b) || 0), 0);
}

/**
 * Ensures ballotsInBox is present whenever candidateVotes is present.
 * - If ballotsInBox already provided -> keep it
 * - Else compute ballotsInBox = sum(candidateVotes)
 *   + invalidBallots + rejectedBallots + unmarkedBallots
 *   (❗spoiled is OUTSIDE box, do NOT include)
 */
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


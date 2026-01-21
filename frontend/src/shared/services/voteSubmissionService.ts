// ✅ FILE: src/shared/services/voteSubmissionService.ts
import { apiClient } from "../lib/apiClient";

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
  ballotsCast?: number;

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

  // --- allocation read-only (derived from place allocation) ---
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

  ballotsCast?: number;

  invalidBallots?: number;
  unmarkedBallots?: number;
  rejectedBallots?: number;
  spoiledBallots?: number;
  unusedBallots?: number;

  comments?: string;

  latitude?: number;
  longitude?: number;

  idempotencyKey?: string;

  // ✅ draft support (true => DRAFT, false/undefined => PENDING)
  draft?: boolean;
};

export type VoteSubmissionUpdateRequest = {
  candidateVotes?: Record<string, number>;

  ballotsCast?: number;
  invalidBallots?: number;
  unmarkedBallots?: number;
  rejectedBallots?: number;
  spoiledBallots?: number;
  unusedBallots?: number;

  comments?: string;

  latitude?: number;
  longitude?: number;
};

// ✅ UPDATED to match backend (keep as-is if your backend expects these names)
export type VoteSubmissionVerifyRequest = {
  verifierUserId: string;
  accept: boolean; // true=VERIFY, false=REJECT
  comment?: string;
};

// ✅ MUST MATCH BACKEND DTO EXACTLY
export type VoteSubmissionFlagRequest = {
  actorUserId: string; // required
  flagged: boolean; // required
  comments?: string; // required when flagged=true (frontend enforces)
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
  const res = await apiClient.get("/vote-submissions", {
    params: {
      page: params.page ?? 0,
      size: params.size ?? 20,

      orgId: params.orgId,
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
  const res = await apiClient.post("/vote-submissions", req);
  return res.data as VoteSubmissionDto;
}

/** Multipart create */
export async function createSubmissionMultipart(params: {
  payload: VoteSubmissionCreateRequest;
  files: File[];
}): Promise<VoteSubmissionDto> {
  const fd = new FormData();
  fd.append(
    "payload",
    new Blob([JSON.stringify(params.payload)], { type: "application/json" })
  );
  params.files.forEach((f) => fd.append("files", f));

  const res = await apiClient.post("/vote-submissions", fd, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data as VoteSubmissionDto;
}

export async function getSubmission(id: string): Promise<VoteSubmissionDto> {
  const res = await apiClient.get(`/vote-submissions/${id}`);
  return res.data as VoteSubmissionDto;
}

/** JSON update (no files) */
export async function updateSubmissionJson(
  id: string,
  req: VoteSubmissionUpdateRequest
): Promise<VoteSubmissionDto> {
  const payload = normalizeUpdatePayload(req);
  const res = await apiClient.put(`/vote-submissions/${id}`, payload);
  return res.data as VoteSubmissionDto;
}

/** Multipart update (optional files) */
export async function updateSubmissionMultipart(params: {
  id: string;
  payload: VoteSubmissionUpdateRequest;
  files?: File[];
}): Promise<VoteSubmissionDto> {
  const payload = normalizeUpdatePayload(params.payload);

  const fd = new FormData();
  fd.append(
    "payload",
    new Blob([JSON.stringify(payload)], { type: "application/json" })
  );
  (params.files ?? []).forEach((f) => fd.append("files", f));

  const res = await apiClient.put(`/vote-submissions/${params.id}`, fd, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data as VoteSubmissionDto;
}

export async function deleteSubmission(id: string): Promise<void> {
  await apiClient.delete(`/vote-submissions/${id}`);
}

/** verify */
export async function verifySubmission(
  id: string,
  req: VoteSubmissionVerifyRequest
): Promise<VoteSubmissionDto> {
  const res = await apiClient.post(`/vote-submissions/${id}/verify`, req);
  return res.data as VoteSubmissionDto;
}

/**
 * ✅ flag/unflag
 * IMPORTANT: backend expects { actorUserId, flagged, comments }
 * If you send { flag } or { reason } you will get 400 VALIDATION_ERROR.
 */
export async function flagSubmission(
  id: string,
  req: VoteSubmissionFlagRequest
): Promise<VoteSubmissionDto> {
  // Optional: frontend safety guard (keeps backend validation happy)
  if (!req?.actorUserId) {
    throw new Error("actorUserId is required");
  }
  if (typeof req.flagged !== "boolean") {
    throw new Error("flagged is required");
  }
  if (req.flagged && !(req.comments ?? "").trim()) {
    throw new Error("comments is required when flagged=true");
  }

  const res = await apiClient.post(`/vote-submissions/${id}/flag`, {
    actorUserId: req.actorUserId,
    flagged: req.flagged,
    comments: req.comments,
  });
  return res.data as VoteSubmissionDto;
}

/** ---------------- helpers ---------------- */

function sumCandidateVotes(v?: Record<string, number>) {
  if (!v) return 0;
  return Object.values(v).reduce((a, b) => a + (Number(b) || 0), 0);
}

/**
 * Ensures ballotsCast is present whenever candidateVotes is present.
 * - If ballotsCast already provided -> keep it
 * - Else compute ballotsCast = sum(candidateVotes) + invalidTotal
 */
function normalizeUpdatePayload(
  p: VoteSubmissionUpdateRequest
): VoteSubmissionUpdateRequest {
  const hasVotes =
    !!p.candidateVotes && Object.keys(p.candidateVotes).length > 0;

  if (!hasVotes) return p;

  if (p.ballotsCast == null) {
    const invalidTotal =
      (Number(p.invalidBallots) || 0) +
      (Number(p.unmarkedBallots) || 0) +
      (Number(p.rejectedBallots) || 0) +
      (Number(p.spoiledBallots) || 0);

    const computedCast = sumCandidateVotes(p.candidateVotes) + invalidTotal;

    return {
      ...p,
      ballotsCast: computedCast,
    };
  }

  return p;
}

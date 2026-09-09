import { apiClient, sysClient } from "../lib/apiClient";

import { useAuthStore } from "../store/authStore";

// ============================================================================
// TYPES
// ============================================================================

export type VoteSubmissionActionType =
  | "VERIFY"
  | "REJECT"
  | "FLAG"
  | "UNFLAG"
  | "AMEND"
  | "DELETE";

export type VoteSubmissionActionDto = {
  // ==========================================================================
  // ACTION
  // ==========================================================================

  actionId: string;

  actionType: VoteSubmissionActionType;

  statusBefore?: string | null;

  statusAfter?: string | null;

  actionTime?: string | null;

  dateCreated?: string | null;

  // ==========================================================================
  // SUBMISSION
  // ==========================================================================

  submissionId: string;

  // ==========================================================================
  // ORGANIZATION
  // ==========================================================================

  orgId: string;

  // ==========================================================================
  // ELECTION
  // ==========================================================================

  electionId?: string | null;

  electionName?: string | null;

  // ==========================================================================
  // CONTEST
  // ==========================================================================

  contestId?: string | null;

  contestName?: string | null;

  // ==========================================================================
  // COUNTY
  // ==========================================================================

  countyId?: string | null;

  countyName?: string | null;

  // ==========================================================================
  // DISTRICT
  // ==========================================================================

  districtId?: string | null;

  districtName?: string | null;

  // ==========================================================================
  // POLLING CENTER
  // ==========================================================================

  centerId?: string | null;

  centerName?: string | null;

  centerCode?: string | null;

  // ==========================================================================
  // POLLING PLACE
  // ==========================================================================

  placeId?: string | null;

  placeCode?: string | null;

  placeNumber?: number | null;

  placeLabel?: string | null;

  // ==========================================================================
  // ACTOR
  // ==========================================================================

  actorUserId: string;

  actorName?: string | null;

  // ==========================================================================
  // EXPLANATION
  // ==========================================================================

  reason?: string | null;

  comments?: string | null;

  // ==========================================================================
  // CERTIFICATION
  // ==========================================================================

  typedSignature?: string | null;

  certificationStatement?: string | null;

  certificationConfirmed: boolean;

  // ==========================================================================
  // TECHNICAL AUDIT
  // ==========================================================================

  clientIp?: string | null;

  userAgent?: string | null;

  // ==========================================================================
  // ACTION DATA
  // ==========================================================================

  actionData?: Record<string, unknown> | null;
};

export type VoteSubmissionActionPage = {
  content: VoteSubmissionActionDto[];

  number: number;

  size: number;

  totalElements: number;

  totalPages: number;

  first: boolean;

  last: boolean;

  empty: boolean;
};

export type SearchVoteSubmissionActionsParams = {
  orgId?: string;

  submissionId?: string;

  actionType?: VoteSubmissionActionType | "";

  page?: number;

  size?: number;
};

// ============================================================================
// CLIENT
// ============================================================================

function getClient() {
  const mode = useAuthStore.getState().dashboardMode;

  return mode === "SYSTEM" ? sysClient : apiClient;
}

// ============================================================================
// SEARCH ALL ACTIONS
// ============================================================================

export async function searchVoteSubmissionActions(
  params: SearchVoteSubmissionActionsParams = {},
): Promise<VoteSubmissionActionPage> {
  const client = getClient();

  const query: Record<string, unknown> = {
    page: params.page ?? 0,

    size: params.size ?? 25,
  };

  if (params.orgId?.trim()) {
    query.orgId = params.orgId.trim();
  }

  if (params.submissionId?.trim()) {
    query.submissionId = params.submissionId.trim();
  }

  if (params.actionType) {
    query.actionType = params.actionType;
  }

  const { data } = await client.get<VoteSubmissionActionPage>(
    "/vote-submissions/actions",
    {
      params: query,
    },
  );

  return data;
}

// ============================================================================
// GET ONE ACTION
// ============================================================================

export async function getVoteSubmissionAction(
  actionId: string,
): Promise<VoteSubmissionActionDto> {
  const cleanId = String(actionId ?? "").trim();

  if (!cleanId) {
    throw new Error("actionId is required.");
  }

  const client = getClient();

  const { data } = await client.get<VoteSubmissionActionDto>(
    `/vote-submissions/actions/${encodeURIComponent(cleanId)}`,
  );

  return data;
}

// ============================================================================
// ONE SUBMISSION
// ============================================================================

export async function listVoteSubmissionActions(
  submissionId: string,
): Promise<VoteSubmissionActionDto[]> {
  const cleanId = String(submissionId ?? "").trim();

  if (!cleanId) {
    throw new Error("submissionId is required.");
  }

  const client = getClient();

  const { data } = await client.get<VoteSubmissionActionDto[]>(
    `/vote-submissions/${encodeURIComponent(cleanId)}/actions`,
  );

  return Array.isArray(data) ? data : [];
}

// ============================================================================
// COUNT
// ============================================================================

export async function countVoteSubmissionActions(
  submissionId: string,
): Promise<number> {
  const cleanId = String(submissionId ?? "").trim();

  if (!cleanId) {
    throw new Error("submissionId is required.");
  }

  const client = getClient();

  const { data } = await client.get<number>(
    `/vote-submissions/${encodeURIComponent(cleanId)}/actions/count`,
  );

  const count = Number(data);

  return Number.isFinite(count) ? count : 0;
}

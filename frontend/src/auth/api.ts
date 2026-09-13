/**
 * src/shared/types/api.ts
 *
 * Canonical TypeScript DTOs and shared types for the frontend.
 * This file is the single source of truth for the shapes used by pages,
 * hooks and services. Keep it small and stable. When the backend changes,
 * update these types first and then adapt services/hooks/pages.
 *
 * Place this file at: src/shared/types/api.ts
 */

export type UUID = string;

/**
 * Generic Spring-style page response.
 */
export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number; // current page index (0-based)
}

/**
 * API error normalized by apiClient.
 * Backend error details (validation / trigger messages) should be mapped
 * into this shape for consistent UI handling.
 */
export interface ApiError {
  status?: number;
  code?: string;
  message: string;
  details?: Record<string, string | string[]>;
}

/* ---------------------------
   Election / Stats
   --------------------------- */
export interface ElectionDto {
  electionId: UUID;
  electionName: string;
  year: number;
  // canonical name for the enum (e.g., "PRESIDENTIAL")
  electionType?: string;
  isActive?: boolean;
  dateCreated?: string;
  dateUpdated?: string;
}

export interface ElectionStatsDto {
  orgId: UUID;
  electionId: UUID;

  registeredVoters: number;
  ballotsCast: number;
  validVotes: number;
  invalidTotal: number;

  // percentages 0..100 (use number, may be null when no data)
  turnoutPct: number | null;
  invalidPct: number | null;
}

/* ---------------------------
   Geography
   --------------------------- */
export interface CountyDto {
  countyId: UUID;
  countyName: string;
}

export interface DistrictDto {
  districtId: UUID;
  districtName: string;
  countyId: UUID;
  countyName?: string;
}

export interface PollingCenterDto {
  centerId: UUID;
  centerName: string;
  code?: string;
  registeredVoters?: number;
  districtId?: UUID;
  districtName?: string;
  countyId?: UUID;
  countyName?: string;
}

export interface PollingPlaceDto {
  placeId: UUID;
  centerId: UUID;
  centerCode?: string;
  centerName?: string;
  districtId?: UUID;
  districtName?: string;
  countyId?: UUID;
  countyName?: string;
  placeNumber?: number;
  code?: string;
  label?: string | null;
  active?: boolean;
}

/* ---------------------------
   Organization & Membership
   --------------------------- */
export interface OrgMembershipDto {
  orgId: UUID;
  orgName: string;
  roleName: string;
  isEnabled: boolean;
}

/* ---------------------------
   Users & Roles (light)
   --------------------------- */
export interface UserDto {
  userId: UUID;
  firstName?: string;
  lastName?: string;
  email?: string;
  position?: string;
  userName?: string;
  roleName?: string;
  partyId?: UUID | null;
  assignedCountyId?: UUID | null;
  defaultOrgId?: UUID | null;
  isActive?: boolean;
  isVerified?: boolean;
  dateCreated?: string;
  lastLogin?: string | null;
}

/* ---------------------------
   Candidates & ElectionCandidates
   --------------------------- */
export interface CandidateDto {
  candidateId: UUID;
  fullName: string;
  position?: string | null;
  partyId?: UUID | null;
  partyName?: string | null;
  abbreviation?: string | null;
  photoUrl?: string | null;
  isActive?: boolean;
  isIndependent?: boolean;
}

export interface ElectionCandidateDto {
  electId: UUID;
  electionId: UUID;
  electionName?: string;
  candidateId: UUID;
  fullName?: string;
  centerId?: UUID | null;
  centerName?: string | null;
}

/* ---------------------------
   Observer Reports
   --------------------------- */
export type ObserverReportType =
  | "VIOLENCE"
  | "INTIMIDATION"
  | "EQUIPMENT_ISSUE"
  | "OTHER";

export interface ObserverReportDto {
  reportId: UUID;
  orgId: UUID;
  observerId: UUID;
  observerName?: string;
  countyId?: UUID | null;
  countyName?: string | null;
  centerId?: UUID | null;
  centerName?: string | null;
  type: ObserverReportType;
  description: string;
  mediaUrl?: string | null;
  // flattened GPS fields for frontend convenience
  latitude?: number | null;
  longitude?: number | null;
  timestamp?: string;
  resolved: boolean;
  dateCreated?: string | null;
  dateUpdated?: string | null;
}

/* ---------------------------
   Vote Submissions & Vote Detail
   --------------------------- */
export type VoteStatus = "PENDING" | "VERIFIED" | "FLAGGED" | "REJECTED";

export type CandidateVotesMap = Record<string /* candidateId (UUID) */, number>;

export interface VoteSubmissionDto {
  submissionId: UUID;
  orgId: UUID;
  orgName?: string;
  electionId: UUID;
  electionName?: string;
  year?: number;

  // center/place
  centerId?: UUID;
  centerCode?: string;
  centerName?: string;
  placeId?: UUID;
  placeCode?: string;
  placeNumber?: number | null;
  placeLabel?: string | null;

  // agent
  agentId?: UUID;
  agentName?: string | null;

  submissionTime?: string | null;

  candidateVotes?: CandidateVotesMap;

  ballotsCast?: number | null;
  invalidBallots?: number | null;
  blankBallots?: number | null;
  rejectedBallots?: number | null;
  spoiledBallots?: number | null;

  // derived helpers
  validVotes?: number | null;
  invalidTotal?: number | null;
  turnoutPct?: number | null;
  invalidPct?: number | null;

  status: VoteStatus;
  comments?: string | null;

  latitude?: number | null;
  longitude?: number | null;

  verifiedBy?: UUID | null;
  verifiedByName?: string | null;
  dateVerified?: string | null;
  clientIp?: string | null;
  userAgent?: string | null;
  submissionHash?: string | null;
  version?: number | null;

  dateCreated?: string | null;
  dateUpdated?: string | null;
}

/** Payload the frontend sends to create a submission (multipart or JSON variant). */
export interface VoteSubmissionCreatePayload {
  orgId: UUID;
  electionId: UUID;
  centerId: UUID;
  placeId: UUID;
  agentId: UUID;

  candidateVotes: CandidateVotesMap;

  ballotsCast: number;
  invalidBallots?: number;
  blankBallots?: number;
  rejectedBallots?: number;
  spoiledBallots?: number;

  comments?: string;

  // GPS
  latitude?: number;
  longitude?: number;

  // Optional idempotency fields (frontend may compute)
  clientGuid?: string; // client-generated UUID for idempotency
  submissionHash?: string; // SHA-256 hex of canonicalized payload (recommended)
}

/** Partial update payload for submissions. */
export interface VoteSubmissionUpdatePayload {
  candidateVotes?: CandidateVotesMap;

  ballotsCast?: number;
  invalidBallots?: number;
  blankBallots?: number;
  rejectedBallots?: number;
  spoiledBallots?: number;

  comments?: string;

  latitude?: number;
  longitude?: number;
}

export type VoteSubmissionQuery = {
  orgId?: string;
  electionId?: string;
  centerId?: string;
  agentId?: string;
  status?: string;
  from?: string;
  to?: string;
  q?: string;
  page?: number;
  size?: number;
};

/* ---------------------------
   File / Tally sheet / Upload
   --------------------------- */
export interface FileUploadDto {
  uploadId: UUID;
  orgId: UUID;
  relatedTable?: string | null;
  relatedId?: UUID | null;
  fileName: string;
  fileUrl: string;
  mimeType?: string | null;
  sha256?: string | null;
  dateUploaded?: string | null;
}

/** Tally sheet record */
export interface TallySheetDto {
  uploadId: UUID;
  organizationId: UUID;
  submissionId: UUID;
  imageUrl: string;
  fileSha256?: string | null;
  dateUploaded?: string | null;
}

/* ---------------------------
   Small helpers
   --------------------------- */

/** Utility: typed paginated response alias used widely in hooks/pages. */
export type Paginated<T> = PageResponse<T>;

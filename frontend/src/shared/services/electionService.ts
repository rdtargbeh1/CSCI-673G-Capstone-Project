// src/shared/services/electionService.ts

import { apiClient } from "../lib/apiClient";

// ============================================================================
// ELECTION TYPE
// ============================================================================

export type ElectionType =
  | "PRESIDENTIAL"
  | "LEGISLATIVE"
  | "SENATORIAL"
  | "REPRESENTATIVE"
  | "REFERENDUM"
  | "PRESIDENTIAL_GENERAL"
  | "BY_ELECTION"
  | "LOCAL";

// ============================================================================
// ELECTION ACCESS STATUS
// ============================================================================

export type ElectionAccessStatus =
  | "DRAFT"
  | "AVAILABLE"
  | "ARCHIVED"
  | "CANCELLED";

// ============================================================================
// DTO
// ============================================================================

export type ElectionDto = {
  // ==========================================================================
  // ELECTION
  // ==========================================================================

  electionId: string;

  electionName: string;

  year: number;

  electionType: ElectionType;

  /**
   * Administrative / technical enable-disable flag.
   *
   * This is separate from accessStatus.
   */
  isActive: boolean;

  // ==========================================================================
  // LIFECYCLE
  // ==========================================================================

  /**
   * Broad election lifecycle state.
   */
  accessStatus: ElectionAccessStatus;

  /**
   * When NEC makes the election visible to permitted tenant organizations.
   */
  availableAt?: string | null;

  /**
   * Start of the operational election window.
   */
  startAt?: string | null;

  /**
   * End of the operational election window.
   */
  endAt?: string | null;

  /**
   * Final availability deadline before archive eligibility.
   */
  availableUntil?: string | null;

  /**
   * Actual backend-controlled archive timestamp.
   */
  archivedAt?: string | null;

  /**
   * Optional archive / cancellation explanation.
   */
  archivedReason?: string | null;

  // ==========================================================================
  // COMPUTED LIFECYCLE STATE
  // ==========================================================================

  beforeOperationalWindow?: boolean;

  withinOperationalWindow?: boolean;

  afterOperationalWindow?: boolean;

  archiveDue?: boolean;

  availableTimeReached?: boolean;

  // ==========================================================================
  // BALLOT POLICY
  // ==========================================================================

  ballotSparePercent?: number | null;

  enforceBallotsGteRegistered?: boolean | null;

  // ==========================================================================
  // AUDIT DATES
  // ==========================================================================

  dateCreated?: string | null;

  dateUpdated?: string | null;

  // ==========================================================================
  // RAW AUDIT VALUES
  //
  // Keep these for backend traceability.
  // UI should normally display createdByName / updatedByName.
  // ==========================================================================

  createdBy?: string | null;

  updatedBy?: string | null;

  // ==========================================================================
  // HUMAN-READABLE AUDIT NAMES
  // ==========================================================================

  createdByName?: string | null;

  updatedByName?: string | null;

  // ==========================================================================
  // OPTIMISTIC LOCKING
  // ==========================================================================

  version?: number | null;
};

// ============================================================================
// CREATE REQUEST
// ============================================================================

export type ElectionCreateRequest = {
  electionName: string;

  year: number;

  electionType: ElectionType;

  /**
   * Administrative / technical state.
   *
   * A newly created election still begins as DRAFT on the backend.
   */
  isActive: boolean;

  ballotSparePercent?: number | null;

  enforceBallotsGteRegistered?: boolean;
};

// ============================================================================
// NORMAL UPDATE REQUEST
// ============================================================================

export type ElectionUpdateRequest = {
  electionName?: string;

  year?: number;

  electionType?: ElectionType;

  isActive?: boolean;

  ballotSparePercent?: number | null;

  enforceBallotsGteRegistered?: boolean;
};

// ============================================================================
// LIFECYCLE REQUEST
// ============================================================================

/**
 * Dedicated request for NEC-controlled election lifecycle changes.
 *
 * This is intentionally separate from ElectionUpdateRequest.
 */
export type ElectionLifecycleRequest = {
  accessStatus?: ElectionAccessStatus;

  availableAt?: string | null;

  startAt?: string | null;

  endAt?: string | null;

  availableUntil?: string | null;

  archivedReason?: string | null;
};

// ============================================================================
// SEARCH REQUEST
// ============================================================================

export type ElectionSearchParams = {
  page: number;

  size: number;

  q?: string;

  year?: number;

  type?: ElectionType;

  active?: boolean;

  // ==========================================================================
  // LIFECYCLE FILTERS
  // ==========================================================================

  accessStatus?: ElectionAccessStatus;

  /**
   * Filters elections whose availability window is currently open.
   */
  availableNow?: boolean;

  /**
   * Filters elections currently between startAt and endAt.
   */
  operationalNow?: boolean;

  /**
   * Filters elections after endAt but before availableUntil.
   */
  postElection?: boolean;

  /**
   * Filters AVAILABLE elections whose availableUntil has expired.
   */
  archiveDue?: boolean;
};

// ============================================================================
// PAGE RESPONSE
// ============================================================================

type PageResp<T> = {
  content: T[];

  totalElements: number;

  totalPages: number;

  number: number;

  size: number;

  first?: boolean;

  last?: boolean;

  numberOfElements?: number;

  empty?: boolean;
};

// ============================================================================
// SEARCH RESULT
// ============================================================================

export type ElectionSearchResult = {
  items: ElectionDto[];

  totalPages: number;

  totalElements: number;

  page: number;

  size: number;
};

// ============================================================================
// GET ONE
// ============================================================================

export async function fetchElectionById(id: string): Promise<ElectionDto> {
  const { data } = await apiClient.get<ElectionDto>(`/elections/${id}`);

  return data;
}

// ============================================================================
// LIST ACTIVE
// ============================================================================

/**
 * Returns active elections visible to the current caller.
 *
 * Backend ElectionAccessPolicy decides what the caller may actually see.
 *
 * NEC/system users may see a broader lifecycle set than regular tenants.
 */
export async function listActiveElections(): Promise<ElectionDto[]> {
  const { data } = await apiClient.get<ElectionDto[]>("/elections", {
    params: {
      activeOnly: true,
    },
  });

  return Array.isArray(data) ? data : [];
}

// ============================================================================
// LIST ALL VISIBLE
// ============================================================================

/**
 * "All" means all elections visible to the authenticated caller.
 *
 * It does not bypass backend lifecycle authorization.
 */
export async function listAllElections(): Promise<ElectionDto[]> {
  const { data } = await apiClient.get<ElectionDto[]>("/elections", {
    params: {
      activeOnly: false,
    },
  });

  return Array.isArray(data) ? data : [];
}

// ============================================================================
// SEARCH
// ============================================================================

/**
 * Searches elections using optional election and lifecycle filters.
 *
 * IMPORTANT:
 *
 * These filters only narrow the backend-authorized result set.
 *
 * Example:
 *
 * A political-party tenant sending:
 *
 * accessStatus=DRAFT
 *
 * still cannot access NEC draft elections.
 */
export async function searchElections(
  params: ElectionSearchParams,
): Promise<ElectionSearchResult> {
  const { data } = await apiClient.get<PageResp<ElectionDto>>(
    "/elections/search",
    {
      params: {
        // ==================================================================
        // PAGINATION
        // ==================================================================

        page: params.page,

        size: params.size,

        // ==================================================================
        // BASIC FILTERS
        // ==================================================================

        q: params.q?.trim() ? params.q.trim() : undefined,

        year: params.year ?? undefined,

        type: params.type || undefined,

        active: params.active ?? undefined,

        // ==================================================================
        // LIFECYCLE FILTERS
        // ==================================================================

        accessStatus: params.accessStatus || undefined,

        availableNow: params.availableNow ?? undefined,

        operationalNow: params.operationalNow ?? undefined,

        postElection: params.postElection ?? undefined,

        archiveDue: params.archiveDue ?? undefined,
      },
    },
  );

  return {
    items: data?.content ?? [],

    totalPages: data?.totalPages ?? 1,

    totalElements: data?.totalElements ?? 0,

    page: data?.number ?? params.page,

    size: data?.size ?? params.size,
  };
}

// ============================================================================
// CREATE
// ============================================================================

/**
 * Creates the election master record.
 *
 * Backend creates the election in DRAFT lifecycle state.
 *
 * Lifecycle release happens separately through updateElectionLifecycle().
 */
export async function createElection(
  req: ElectionCreateRequest,
): Promise<ElectionDto> {
  const { data } = await apiClient.post<ElectionDto>("/elections", req);

  return data;
}

// ============================================================================
// UPDATE NORMAL ELECTION DATA
// ============================================================================

/**
 * Updates normal election configuration.
 *
 * Lifecycle changes are intentionally excluded from this request.
 */
export async function updateElection(
  id: string,
  req: ElectionUpdateRequest,
): Promise<ElectionDto> {
  const { data } = await apiClient.put<ElectionDto>(`/elections/${id}`, req);

  return data;
}

// ============================================================================
// UPDATE LIFECYCLE
// ============================================================================

/**
 * Updates election lifecycle configuration.
 *
 * Backend route:
 *
 * PUT /api/elections/{id}/lifecycle
 *
 * Backend authorization:
 *
 * - SYSTEM_ADMIN
 * - NEC tenant NEC_ADMIN
 *
 * Party/coalition tenant administrators are not authorized.
 */
export async function updateElectionLifecycle(
  id: string,
  req: ElectionLifecycleRequest,
): Promise<ElectionDto> {
  const { data } = await apiClient.put<ElectionDto>(
    `/elections/${id}/lifecycle`,
    req,
  );

  return data;
}

// ============================================================================
// DELETE
// ============================================================================

/**
 * Physical deletion is backend restricted.
 *
 * Normally only eligible DRAFT elections may be deleted.
 */
export async function deleteElection(id: string): Promise<void> {
  await apiClient.delete(`/elections/${id}`);
}

// ============================================================================
// ACTIVATE / DEACTIVATE
// ============================================================================

/**
 * Technical/admin enable-disable switch.
 *
 * This does NOT change accessStatus.
 */
export async function setElectionActive(
  id: string,
  active: boolean,
): Promise<ElectionDto> {
  const { data } = await apiClient.patch<ElectionDto>(
    `/elections/${id}/active`,
    null,
    {
      params: {
        active,
      },
    },
  );

  return data;
}

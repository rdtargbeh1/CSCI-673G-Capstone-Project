package election.ems_backend.enums;

/**
 * Controls the broad access state of an election.
 *
 * This does NOT represent NEC result publication.
 * Official result publication is controlled independently by NECResult.
 *
 * DRAFT:
 * - NEC is still configuring the election.
 * - Tenant organizations should not access it.
 *
 * AVAILABLE:
 * - Election has been released for permitted tenant access.
 * - The actual operational stage is determined by the election timestamps.
 *
 * ARCHIVED:
 * - Election is historical/read-only for normal operations.
 * - Historical information may remain visible.
 *
 * CANCELLED:
 * - Election was cancelled.
 * - Access is limited according to authorization policy.
 */
public enum ElectionAccessStatus {

    DRAFT,

    AVAILABLE,

    ARCHIVED,

    CANCELLED
}

package election.ems_backend.utility;


import election.ems_backend.entity.ObserverReport;
import election.ems_backend.enums.ObserverReportVerificationStatus;
import election.ems_backend.enums.ObserverReportVisibility;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;

import java.time.LocalDateTime;
import java.util.UUID;


public final class ObserverReportSpecs {
    private ObserverReportSpecs() {}

    // ============================================================
    // BASIC FILTERS
    // ============================================================

    public static Specification<ObserverReport> orgEquals(UUID orgId) {
        return (root, cq, cb) -> orgId == null ? cb.conjunction()
                : cb.equal(root.get("organization").get("orgId"), orgId);
    }

    public static Specification<ObserverReport> observerEquals(UUID observerId) {
        return (root, cq, cb) -> observerId == null ? cb.conjunction()
                : cb.equal(root.get("observer").get("userId"), observerId);
    }

    public static Specification<ObserverReport> countyEquals(UUID countyId) {
        return (root, cq, cb) -> countyId == null ? cb.conjunction()
                : cb.equal(root.get("county").get("countyId"), countyId);
    }

    public static Specification<ObserverReport> centerEquals(UUID centerId) {
        return (root, cq, cb) -> centerId == null ? cb.conjunction()
                : cb.equal(root.get("pollingCenter").get("centerId"), centerId);
    }

    public static Specification<ObserverReport> typeEquals(String type) {
        return (root, cq, cb) -> (type == null || type.isBlank()) ? cb.conjunction()
                : cb.equal(root.get("type"), Enum.valueOf(election.ems_backend.enums.ReportType.class, type));
    }

    // ✅ UPDATED: Changed from 'resolved' to 'isResolved'
    public static Specification<ObserverReport> resolvedEquals(Boolean resolved) {
        return (root, cq, cb) -> resolved == null ? cb.conjunction()
                : cb.equal(root.get("isResolved"), resolved);
    }

    public static Specification<ObserverReport> verificationStatusEquals(String status) {
        return (root, cq, cb) -> (status == null || status.isBlank()) ? cb.conjunction()
                : cb.equal(root.get("verificationStatus"),
                Enum.valueOf(ObserverReportVerificationStatus.class, status));
    }

    public static Specification<ObserverReport> visibilityEquals(String visibility) {
        return (root, cq, cb) -> (visibility == null || visibility.isBlank()) ? cb.conjunction()
                : cb.equal(root.get("visibility"),
                Enum.valueOf(ObserverReportVisibility.class, visibility));
    }

    // ✅ NEW: Filter by isCritical flag
    public static Specification<ObserverReport> isCriticalEquals(Boolean isCritical) {
        return (root, cq, cb) -> isCritical == null ? cb.conjunction()
                : cb.equal(root.get("isCritical"), isCritical);
    }

    public static Specification<ObserverReport> between(LocalDateTime from, LocalDateTime to) {
        return (root, cq, cb) -> {
            if (from == null && to == null) return cb.conjunction();
            if (from != null && to != null) return cb.between(root.get("timestamp"), from, to);
            return from != null ? cb.greaterThanOrEqualTo(root.get("timestamp"), from)
                    : cb.lessThanOrEqualTo(root.get("timestamp"), to);
        };
    }

    public static Specification<ObserverReport> textSearch(String q) {
        return (root, cq, cb) -> {
            if (q == null || q.isBlank()) return cb.conjunction();
            String like = "%" + q.toLowerCase() + "%";
            return cb.like(cb.lower(root.get("description")), like);
        };
    }

    // ============================================================
    // ✅ MODEL 2: LOCKED & EDITABLE STATUS CHECKS
    // ============================================================

    /**
     * ✅ Check if report is in a LOCKED state (cannot edit)
     * Locked states: INTERNAL_VERIFIED, NEC_VERIFIED
     */
    public static Specification<ObserverReport> isLockedStatus() {
        return (root, query, cb) -> cb.in(root.get("verificationStatus"))
                .value(ObserverReportVerificationStatus.INTERNAL_VERIFIED)
                .value(ObserverReportVerificationStatus.NEC_VERIFIED);
    }

    /**
     * ✅ Check if report is in an EDITABLE state
     * Editable states: PENDING, UNDER_INVESTIGATION, REJECTED
     */
    public static Specification<ObserverReport> isEditableStatus() {
        return (root, query, cb) -> cb.in(root.get("verificationStatus"))
                .value(ObserverReportVerificationStatus.PENDING)
                .value(ObserverReportVerificationStatus.UNDER_INVESTIGATION)
                .value(ObserverReportVerificationStatus.REJECTED);
    }

    // ============================================================
    // ✅ MODEL 2: VISIBILITY RULES
    // ============================================================

    /**
     * ✅ MODEL 2: COMPLETE VISIBILITY HIERARCHY
     *
     * PRIVATE (Tenant-Only Decision):
     *   ├─ Only reported tenant sees ✅
     *   ├─ NEC sees ❌
     *   └─ Other tenants see ❌
     *   └─ Use case: Minor issue, internal handling
     *
     * SHARED (Tenant Escalates to NEC):
     *   ├─ Reported tenant sees ✅
     *   ├─ NEC sees ✅
     *   └─ Other tenants see ❌
     *   └─ Use case: Tenant wants NEC investigation
     *
     * PUBLIC (Full Transparency):
     *   ├─ Reported tenant sees ✅
     *   ├─ NEC sees ✅
     *   ├─ Other tenants see ✅
     *   └─ General public sees ✅
     *   └─ Use case: Major incident, everyone must know
     *
     * ============================================================
     * TENANT CAN SEE:
     * ============================================================
     * 1. Own tenant's ALL reports (any status/visibility)
     *    - PENDING reports they submitted
     *    - INTERNAL_VERIFIED (handled internally)
     *    - UNDER_INVESTIGATION (escalated to NEC)
     *    - NEC_VERIFIED (NEC verified)
     *    - REJECTED (NEC rejected, can re-escalate)
     *
     * 2. Other tenants' NEC_VERIFIED + SHARED reports only
     *    - Must be verified by NEC (not pending from other tenant)
     *    - Must be SHARED visibility
     *
     * 3. Any tenant's NEC_VERIFIED + PUBLIC reports only
     *    - Must be verified by NEC (final status)
     *    - Must be PUBLIC visibility
     */
    public static Specification<ObserverReport> visibleToTenant(UUID orgId) {
        return (root, query, cb) -> {
            if (orgId == null) {
                return cb.disjunction(); // No results
            }

            // ✅ Own org: ALL
            Predicate ownOrgAll = cb.equal(
                    root.get("organization").get("orgId"),
                    orgId
            );

            // ✅ Other orgs: Only NEC_VERIFIED + SHARED/PUBLIC
            Predicate otherOrgNecSharedPublic = cb.and(
                    cb.notEqual(root.get("organization").get("orgId"), orgId),
                    cb.equal(root.get("verificationStatus"), ObserverReportVerificationStatus.NEC_VERIFIED),
                    cb.or(
                            cb.equal(root.get("visibility"), ObserverReportVisibility.SHARED),
                            cb.equal(root.get("visibility"), ObserverReportVisibility.PUBLIC)
                    )
            );

            return cb.or(ownOrgAll, otherOrgNecSharedPublic);
        };
    }



    /**
     * ✅ NEC DASHBOARD - See own org ALL + SHARED/PUBLIC from others
     *
     * NEC can see:
     * - ALL reports from their own org (NEC is a tenant with orgId)
     * - SHARED reports from other orgs
     * - PUBLIC reports from other orgs
     * - NOT PRIVATE reports from other orgs
     *
     * RULE: PRIVATE reports only from own org
     */
    public static Specification<ObserverReport> forNec(UUID necOrgId) {
        return (root, query, cb) -> {
            if (necOrgId == null) {
                return cb.or(
                        cb.equal(root.get("visibility"), ObserverReportVisibility.SHARED),
                        cb.equal(root.get("visibility"), ObserverReportVisibility.PUBLIC)
                );
            }

            // ✅ Own org: ALL reports
            Predicate ownOrgAll = cb.equal(
                    root.get("organization").get("orgId"),
                    necOrgId
            );

            // ✅ Other orgs: Only SHARED + PUBLIC
            Predicate otherOrgSharedPublic = cb.and(
                    cb.notEqual(root.get("organization").get("orgId"), necOrgId),
                    cb.or(
                            cb.equal(root.get("visibility"), ObserverReportVisibility.SHARED),
                            cb.equal(root.get("visibility"), ObserverReportVisibility.PUBLIC)
                    )
            );

            return cb.or(ownOrgAll, otherOrgSharedPublic);
        };
    }


    /**
     * ✅ SYSTEM ADMIN - See ALL reports without restrictions
     */
    public static Specification<ObserverReport> forSystem() {
        return (root, query, cb) -> cb.conjunction(); // No restrictions
    }



    /**
     * ✅ Find reports awaiting tenant admin action (PENDING only)
     * Used for tenant dashboard to show: "Reports awaiting your review"
     */
    public static Specification<ObserverReport> pendingTenantAction(UUID orgId) {
        return (root, query, cb) -> cb.and(
                cb.equal(root.get("organization").get("orgId"), orgId),
                cb.equal(root.get("verificationStatus"), ObserverReportVerificationStatus.PENDING)
        );
    }

    /**
     * ✅ Find reports escalated to NEC (UNDER_INVESTIGATION)
     * Used for NEC dashboard to show: "Reports awaiting investigation"
     */
    public static Specification<ObserverReport> awaitingNecInvestigation() {
        return (root, query, cb) -> cb.equal(
                root.get("verificationStatus"),
                ObserverReportVerificationStatus.UNDER_INVESTIGATION
        );
    }

    /**
     * ✅ Find critical escalated reports (isCritical = true AND UNDER_INVESTIGATION)
     * Used for NEC to prioritize critical incidents
     */
    public static Specification<ObserverReport> criticalEscalations() {
        return (root, query, cb) -> cb.and(
                cb.equal(root.get("isCritical"), true),
                cb.equal(root.get("verificationStatus"), ObserverReportVerificationStatus.UNDER_INVESTIGATION)
        );
    }

    /**
     * ✅ Find tenant's internal (non-escalated) reports
     * INTERNAL_VERIFIED + PRIVATE: Tenant resolved internally
     */
    public static Specification<ObserverReport> internalVerified(UUID orgId) {
        return (root, query, cb) -> cb.and(
                cb.equal(root.get("organization").get("orgId"), orgId),
                cb.equal(root.get("verificationStatus"), ObserverReportVerificationStatus.INTERNAL_VERIFIED)
        );
    }

    /**
     * ✅ Find NEC verified reports ready for public viewing
     * NEC_VERIFIED + (SHARED or PUBLIC)
     */
    public static Specification<ObserverReport> necVerifiedReports() {
        return (root, query, cb) -> cb.and(
                cb.equal(root.get("verificationStatus"), ObserverReportVerificationStatus.NEC_VERIFIED),
                cb.in(root.get("visibility")).value(ObserverReportVisibility.SHARED).value(ObserverReportVisibility.PUBLIC)
        );
    }

    /**
     * ✅ Find rejected reports (tenant can re-escalate)
     */
    public static Specification<ObserverReport> rejectedReports(UUID orgId) {
        return (root, query, cb) -> cb.and(
                cb.equal(root.get("organization").get("orgId"), orgId),
                cb.equal(root.get("verificationStatus"), ObserverReportVerificationStatus.REJECTED)
        );
    }

    /**
     * ✅ Find resolved reports (case closed)
     * Only true if status is INTERNAL_VERIFIED or NEC_VERIFIED
     */
    public static Specification<ObserverReport> resolvedCases(UUID orgId) {
        return (root, query, cb) -> cb.and(
                cb.equal(root.get("organization").get("orgId"), orgId),
                cb.equal(root.get("isResolved"), true)
        );
    }

    /**
     * ✅ Find unresolved reports (still open)
     */
    public static Specification<ObserverReport> unresolvedCases(UUID orgId) {
        return (root, query, cb) -> cb.and(
                cb.equal(root.get("organization").get("orgId"), orgId),
                cb.equal(root.get("isResolved"), false)
        );
    }

    // ============================================================
    // DEPRECATED: Kept for backward compatibility only
    // ============================================================

    /**
     * ⚠️ DEPRECATED - Use visibleToTenant() or visibleToOrgOrNec() instead
     * Kept for backward compatibility
     *
     * Old logic using VERIFIED status (no longer exists)
     */
    @Deprecated(since = "2.0", forRemoval = true)
    public static Specification<ObserverReport> visibleToOrg(UUID orgId) {
        return (root, query, cb) -> cb.or(
                // Own tenant's PENDING reports
                cb.and(
                        cb.equal(root.get("organization").get("orgId"), orgId),
                        cb.equal(root.get("verificationStatus"), ObserverReportVerificationStatus.PENDING)
                ),

                // Own tenant's NEC_VERIFIED reports (all visibility levels)
                cb.and(
                        cb.equal(root.get("organization").get("orgId"), orgId),
                        cb.equal(root.get("verificationStatus"), ObserverReportVerificationStatus.NEC_VERIFIED)
                ),

                // Other tenants' NEC_VERIFIED SHARED reports
                cb.and(
                        cb.notEqual(root.get("organization").get("orgId"), orgId),
                        cb.equal(root.get("verificationStatus"), ObserverReportVerificationStatus.NEC_VERIFIED),
                        cb.equal(root.get("visibility"), ObserverReportVisibility.SHARED)
                ),

                // NEC_VERIFIED PUBLIC reports (from any tenant)
                cb.and(
                        cb.equal(root.get("verificationStatus"), ObserverReportVerificationStatus.NEC_VERIFIED),
                        cb.equal(root.get("visibility"), ObserverReportVisibility.PUBLIC)
                )
        );
    }


}






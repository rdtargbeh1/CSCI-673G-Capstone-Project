package election.ems_backend.utility;


import election.ems_backend.entity.VoteSubmission;
import election.ems_backend.enums.ContestCategory;
import election.ems_backend.enums.ContestScopeType;
import election.ems_backend.enums.VoteStatus;
import jakarta.persistence.criteria.JoinType;
import org.springframework.data.jpa.domain.Specification;

import java.time.LocalDateTime;
import java.util.UUID;

public final class VoteSubmissionSpecs {

    private VoteSubmissionSpecs(){}

    public static Specification<VoteSubmission> orgEquals(UUID orgId){
        return (r, q, cb) -> orgId == null
                ? cb.conjunction()
                : cb.equal(r.get("organization").get("orgId"), orgId);
    }

    public static Specification<VoteSubmission> electionEquals(UUID electionId){
        return (r, q, cb) -> electionId == null
                ? cb.conjunction()
                : cb.equal(r.get("election").get("electionId"), electionId);
    }

    public static Specification<VoteSubmission> centerEquals(UUID centerId){
        return (r, q, cb) -> centerId == null
                ? cb.conjunction()
                // ✅ FIX: PollingCenter entity typically has "centerId"
                : cb.equal(r.get("pollingCenter").get("centerId"), centerId);
        // If your PollingCenter uses pollingCenterId, change to:
        // : cb.equal(r.get("pollingCenter").get("pollingCenterId"), centerId);
    }

    public static Specification<VoteSubmission> agentEquals(UUID agentId){
        return (r, q, cb) -> agentId == null
                ? cb.conjunction()
                : cb.equal(r.get("agent").get("userId"), agentId);
    }

    public static Specification<VoteSubmission> statusEquals(VoteStatus status, UUID currentUserId) {
        return (root, query, cb) -> {

            // If user explicitly asked for status, obey it.
            if (status != null) {
                // If they asked for DRAFT, enforce ownership
                if (status == VoteStatus.DRAFT) {
                    if (currentUserId == null) return cb.disjunction(); // no user => see nothing
                    return cb.and(
                            cb.equal(root.get("status"), VoteStatus.DRAFT),
                            cb.equal(root.get("agent").get("userId"), currentUserId)
                    );
                }
                return cb.equal(root.get("status"), status);
            }

            // Default (status == null):
            // include all non-draft, and include drafts ONLY for the current agent
            if (currentUserId == null) {
                return cb.notEqual(root.get("status"), VoteStatus.DRAFT);
            }

            return cb.or(
                    cb.notEqual(root.get("status"), VoteStatus.DRAFT),
                    cb.and(
                            cb.equal(root.get("status"), VoteStatus.DRAFT),
                            cb.equal(root.get("agent").get("userId"), currentUserId)
                    )
            );
        };
    }


//    public static Specification<VoteSubmission> statusEquals(VoteStatus status){
//        return (r, q, cb) -> status == null
//                ? cb.conjunction()
//                : cb.equal(r.get("status"), status);
//    }

    public static Specification<VoteSubmission> between(LocalDateTime from, LocalDateTime to){
        return (r, q, cb) -> {
            if (from == null && to == null) return cb.conjunction();
            if (from != null && to != null) return cb.between(r.get("submissionTime"), from, to);
            return from != null
                    ? cb.greaterThanOrEqualTo(r.get("submissionTime"), from)
                    : cb.lessThanOrEqualTo(r.get("submissionTime"), to);
        };
    }

    public static Specification<VoteSubmission> textSearch(String q){
        return (r, qy, cb) -> {
            if (q == null || q.isBlank()) return cb.conjunction();
            String like = "%" + q.toLowerCase() + "%";
            return cb.like(cb.lower(r.get("comments")), like);
        };
    }

    public static Specification<VoteSubmission> orderByStatusPriorityThenDateDesc() {
        return (root, query, cb) -> {

            // Avoid messing with count queries
            if (Long.class.equals(query.getResultType()) || long.class.equals(query.getResultType())) {
                return cb.conjunction();
            }

            var statusPath = root.get("status");

            // CASE status WHEN ... THEN ...
            var statusRank = cb.selectCase(statusPath)
                    .when(VoteStatus.FLAGGED, 0)
                    .when(VoteStatus.PENDING, 1)
                    .when(VoteStatus.VERIFIED, 2)
                    .when(VoteStatus.REJECTED, 3)
                    .when(VoteStatus.DRAFT, 4)
                    .otherwise(9);

            // Primary: status priority, Secondary: latest first
            query.orderBy(
                    cb.asc(statusRank),
                    cb.desc(root.get("submissionTime")),
                    cb.desc(root.get("dateCreated"))
            );

            return cb.conjunction();
        };
    }


    // ------------------------------------------------------------------
    // ✅ Contest linkage filters (requires vote_submission.contestId + relation "contest")
    // ------------------------------------------------------------------

//    /** Filter direct contest_id on VoteSubmission (fast, no join needed). */
//    public static Specification<VoteSubmission> contestEquals(UUID contestId) {
//        return (root, query, cb) ->
//                contestId == null ? cb.conjunction() : cb.equal(root.get("contestId"), contestId);
//    }

    /** Filter by Contest.category via join. */
    public static Specification<VoteSubmission> contestCategoryEquals(ContestCategory category) {
        return (root, query, cb) -> {
            if (category == null) return cb.conjunction();
            return cb.equal(root.join("contest", JoinType.INNER).get("category"), category);
        };
    }

    /** Filter by Contest.scopeType via join. */
    public static Specification<VoteSubmission> contestScopeEquals(ContestScopeType scopeType) {
        return (root, query, cb) -> {
            if (scopeType == null) return cb.conjunction();
            return cb.equal(root.join("contest", JoinType.INNER).get("scopeType"), scopeType);
        };
    }

    /** Optional: Filter by Contest.countyId (useful for SENATE by county). */
    public static Specification<VoteSubmission> contestCountyEquals(UUID countyId) {
        return (root, query, cb) -> {
            if (countyId == null) return cb.conjunction();
            return cb.equal(root.join("contest", JoinType.INNER).get("countyId"), countyId);
        };
    }

    /** Optional: Filter by Contest.districtId (useful for REPRESENTATIVE by district). */
    public static Specification<VoteSubmission> contestDistrictEquals(UUID districtId) {
        return (root, query, cb) -> {
            if (districtId == null) return cb.conjunction();
            return cb.equal(root.join("contest", JoinType.INNER).get("districtId"), districtId);
        };
    }



    /**
     * ✅ Filter submission by LOCATION county:
     * VoteSubmission -> pollingCenter -> district -> county
     */
    public static Specification<VoteSubmission> countyEquals(UUID countyId) {
        return (root, query, cb) -> {
            if (countyId == null) return cb.conjunction();

            // Avoid duplicates when joining
            query.distinct(true);

            return cb.equal(
                    root.join("pollingCenter", JoinType.LEFT)
                            .join("district", JoinType.LEFT)
                            .join("county", JoinType.LEFT)
                            .get("countyId"),
                    countyId
            );
        };
    }

    /**
     * ✅ Filter submission by LOCATION district:
     * VoteSubmission -> pollingCenter -> district
     */
    public static Specification<VoteSubmission> districtEquals(UUID districtId) {
        return (root, query, cb) -> {
            if (districtId == null) return cb.conjunction();

            query.distinct(true);

            return cb.equal(
                    root.join("pollingCenter", JoinType.LEFT)
                            .join("district", JoinType.LEFT)
                            .get("districtId"),
                    districtId
            );
        };
    }

    /**
     * ✅ Contest dropdown filter:
     * Use ONE of the two options depending on your entity mapping.
     */
    public static Specification<VoteSubmission> contestEquals(UUID contestId) {
        return (root, query, cb) -> {
            if (contestId == null) return cb.conjunction();

            // OPTION A: if VoteSubmission has a UUID contestId column field:
            // return cb.equal(root.get("contestId"), contestId);

            // OPTION B: if VoteSubmission has @ManyToOne Contest contest;
            return cb.equal(root.join("contest", JoinType.INNER).get("contestId"), contestId);
        };
    }


}

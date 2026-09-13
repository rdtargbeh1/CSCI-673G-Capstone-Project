package election.ems_backend.utility;

import election.ems_backend.entity.VoteTally;
import org.springframework.data.jpa.domain.Specification;

import java.util.UUID;

public final class VoteTallySpecs {

    private VoteTallySpecs(){}

    public static Specification<VoteTally> orgEquals(UUID orgId) {
        return (r, q, cb) -> orgId == null ? cb.conjunction()
                : cb.equal(r.get("organization").get("orgId"), orgId);
    }

    public static Specification<VoteTally> electionEquals(UUID electionId) {
        return (r, q, cb) -> electionId == null ? cb.conjunction()
                : cb.equal(r.get("election").get("electionId"), electionId);
    }

    /**
     * ✅ NEW: election-scoped candidate (elect_id) filter.
     * Uses raw column electId (recommended).
     */
    public static Specification<VoteTally> electEquals(UUID electId) {
        return (r, q, cb) -> electId == null ? cb.conjunction()
                : cb.equal(r.get("electId"), electId);
    }

    /**
     * ✅ NEW: election-scoped party filter.
     * Uses raw column partyId (recommended).
     */
    public static Specification<VoteTally> partyIdEquals(UUID partyId) {
        return (r, q, cb) -> partyId == null ? cb.conjunction()
                : cb.equal(r.get("partyId"), partyId);
    }

    /**
     * ✅ NEW: contest filter.
     * Uses raw column contestId (recommended).
     */
    public static Specification<VoteTally> contestEquals(UUID contestId) {
        return (r, q, cb) -> contestId == null ? cb.conjunction()
                : cb.equal(r.get("contestId"), contestId);
    }


}


package election.ems_backend.utility;

import election.ems_backend.entity.Election;
import election.ems_backend.enums.ElectionType;
import org.springframework.data.jpa.domain.Specification;

public final class ElectionSpecs {
    private ElectionSpecs() {}

    public static Specification<Election> nameContains(String q) {
        return (root, cq, cb) ->
                (q == null || q.isBlank())
                        ? cb.conjunction()
                        : cb.like(cb.lower(root.get("electionName")), "%" + q.toLowerCase() + "%");
    }

    public static Specification<Election> yearEquals(Integer year) {
        return (root, cq, cb) ->
                (year == null)
                        ? cb.conjunction()
                        : cb.equal(root.get("year"), year);
    }

    public static Specification<Election> typeEquals(ElectionType type) {
        return (root, cq, cb) ->
                (type == null)
                        ? cb.conjunction()
                        : cb.equal(root.get("electionType"), type);
    }

    public static Specification<Election> activeEquals(Boolean active) {
        return (root, cq, cb) ->
                (active == null)
                        ? cb.conjunction()
                        : cb.equal(root.get("isActive"), active);
    }
}
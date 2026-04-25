//package election.ems_backend.service.implement;
//
//import election.ems_backend.repository.DiscrepancyReconcileRepository;
//import jakarta.persistence.EntityManager;
//import lombok.RequiredArgsConstructor;
//import org.springframework.stereotype.Repository;
//
//import java.util.ArrayList;
//import java.util.List;
//import java.util.UUID;
//
//@Repository
//@RequiredArgsConstructor
//public class DiscrepancyReconcileRepositoryImpl implements DiscrepancyReconcileRepository {
//
//    private final EntityManager em;
//
//    @Override
//    @SuppressWarnings("unchecked")
//    public List<Row> findMismatches(UUID orgId, UUID electionId) {
//        String sql = """
//            SELECT p.election_id,
//                   p.center_id,
//                   p.valid_votes     AS party_valid,
//                   p.invalid_total   AS party_invalid,
//                   o.valid_votes     AS official_valid,
//                   o.invalid_total   AS official_invalid
//            FROM v_center_stats_party    p
//            JOIN v_center_stats_official o
//              ON o.election_id = p.election_id AND o.center_id = p.center_id
//            WHERE p.org_id = :orgId
//              AND p.election_id = :electionId
//              AND (p.valid_votes   IS DISTINCT FROM o.valid_votes
//                   OR p.invalid_total IS DISTINCT FROM o.invalid_total)
//            """;
//
//        List<Object[]> rows = em.createNativeQuery(sql)
//                .setParameter("orgId", orgId)
//                .setParameter("electionId", electionId)
//                .getResultList();
//
//        List<Row> out = new ArrayList<>(rows.size());
//        for (Object[] r : rows) {
//            out.add(new Row(
//                    (UUID) r[0],
//                    (UUID) r[1],
//                    ((Number) r[2]).intValue(),
//                    ((Number) r[3]).intValue(),
//                    ((Number) r[4]).intValue(),
//                    ((Number) r[5]).intValue()
//            ));
//        }
//        return out;
//    }
//
//
//    /**
//     * Integrity helper: Count mismatch rows used by reconciliation logic.
//     * Mirrors findMismatches(...) but returns a count for fast Overview stats.
//     *
//     * @param orgId tenant scope
//     * @param electionId election scope
//     * @return number of centers where party stats differ from official stats
//     */
//    @Override
//    public long countMismatches(UUID orgId, UUID electionId) {
//        String sql = """
//            SELECT COUNT(*)
//            FROM v_center_stats_party    p
//            JOIN v_center_stats_official o
//              ON o.election_id = p.election_id AND o.center_id = p.center_id
//            WHERE p.org_id = :orgId
//              AND p.election_id = :electionId
//              AND (p.valid_votes      IS DISTINCT FROM o.valid_votes
//                   OR p.invalid_total IS DISTINCT FROM o.invalid_total)
//            """;
//
//        Object result = em.createNativeQuery(sql)
//                .setParameter("orgId", orgId)
//                .setParameter("electionId", electionId)
//                .getSingleResult();
//
//        return (result instanceof Number n) ? n.longValue() : 0L;
//    }
//
//}

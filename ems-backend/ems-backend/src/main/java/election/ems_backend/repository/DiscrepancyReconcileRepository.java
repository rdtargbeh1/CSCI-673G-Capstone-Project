package election.ems_backend.repository;

import lombok.Value;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface DiscrepancyReconcileRepository {

    @Value
    class Row {
        UUID electionId;
        UUID centerId;
        Integer partyValid;
        Integer partyInvalid;
        Integer officialValid;
        Integer officialInvalid;
    }
    List<Row> findMismatches(UUID orgId, UUID electionId);


    /**
     * Integrity helper: Count mismatch rows used by reconciliation logic.
     * Optional if you want an Overview stat like "Unreconciled mismatches".
     *
     * Implementation should mirror findMismatches(...) query but as COUNT(*).
     *
     * @param orgId tenant scope (or null if your impl supports global)
     * @param electionId election scope
     * @return number of mismatches
     */
    long countMismatches(UUID orgId, UUID electionId);

}

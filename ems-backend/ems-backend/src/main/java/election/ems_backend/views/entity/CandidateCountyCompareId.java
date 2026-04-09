package election.ems_backend.views.entity;

import jakarta.persistence.Embeddable;
import lombok.AllArgsConstructor;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.util.UUID;

/**
 * Composite id for v_candidate_county_compare:
 * election + county + candidate
 */
@Embeddable
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode
public class CandidateCountyCompareId implements Serializable {
    private UUID electionId;
    private UUID countyId;
    private UUID candidateId;

    public UUID getElectionId() { return electionId; }
    public void setElectionId(UUID electionId) { this.electionId = electionId; }

    public UUID getCountyId() { return countyId; }
    public void setCountyId(UUID countyId) { this.countyId = countyId; }

    public UUID getCandidateId() { return candidateId; }
    public void setCandidateId(UUID candidateId) { this.candidateId = candidateId; }
}
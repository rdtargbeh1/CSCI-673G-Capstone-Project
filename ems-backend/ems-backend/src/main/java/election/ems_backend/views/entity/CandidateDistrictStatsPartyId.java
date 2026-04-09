package election.ems_backend.views.entity;


import jakarta.persistence.Embeddable;
import lombok.AllArgsConstructor;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.util.UUID;

/**
 * Composite id for v_candidate_district_stats_party view rows.
 */
@Embeddable
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode
public class CandidateDistrictStatsPartyId implements Serializable {
    private UUID orgId;
    private UUID electionId;
    private UUID districtId;
    private UUID candidateId;

    public UUID getOrgId() { return orgId; }
    public void setOrgId(UUID orgId) { this.orgId = orgId; }

    public UUID getElectionId() { return electionId; }
    public void setElectionId(UUID electionId) { this.electionId = electionId; }

    public UUID getDistrictId() { return districtId; }
    public void setDistrictId(UUID districtId) { this.districtId = districtId; }

    public UUID getCandidateId() { return candidateId; }
    public void setCandidateId(UUID candidateId) { this.candidateId = candidateId; }
}
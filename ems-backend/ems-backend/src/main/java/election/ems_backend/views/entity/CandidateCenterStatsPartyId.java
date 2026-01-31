package election.ems_backend.views.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import lombok.AllArgsConstructor;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.util.UUID;

/**
 * Composite id for v_candidate_center_stats_party view rows.
 */
@Embeddable
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode
public class CandidateCenterStatsPartyId implements Serializable {

    @Column(name = "org_id")
    private UUID orgId;

    @Column(name = "election_id")
    private UUID electionId;

    @Column(name = "contest_id")
    private UUID contestId;

    @Column(name = "center_id")
    private UUID centerId;

    @Column(name = "candidate_id")
    private UUID candidateId;

    public UUID getOrgId() { return orgId; }
    public void setOrgId(UUID orgId) { this.orgId = orgId; }

    public UUID getElectionId() { return electionId; }
    public void setElectionId(UUID electionId) { this.electionId = electionId; }

    public UUID getCenterId() { return centerId; }
    public void setCenterId(UUID centerId) { this.centerId = centerId; }

    public UUID getCandidateId() { return candidateId; }
    public void setCandidateId(UUID candidateId) { this.candidateId = candidateId; }

    public UUID getContestId() {return contestId;}
    public void setContestId(UUID contestId) {this.contestId = contestId;}

}

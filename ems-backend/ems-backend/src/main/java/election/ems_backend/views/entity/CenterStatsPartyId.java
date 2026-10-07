package election.ems_backend.views.entity;

import jakarta.persistence.Embeddable;
import lombok.AllArgsConstructor;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.Immutable;

import java.io.Serializable;
import java.util.UUID;

/**
 * Composite key for the view v_center_stats_party:
 *   (org_id, election_id, center_id)
 *
 * This is an @Embeddable used as the @EmbeddedId on the entity mapping the view.
 */

@Immutable // Hibernate must treat this entity as read-only
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode
@Embeddable
public class CenterStatsPartyId implements Serializable {

    private static final long serialVersionUID = 1L;

    private UUID orgId;
    private UUID electionId;
    private UUID contestId;
    private UUID centerId;

    public UUID getOrgId() {return orgId;}
    public void setOrgId(UUID orgId) {this.orgId = orgId;}

    public UUID getElectionId() {return electionId;}
    public void setElectionId(UUID electionId) {this.electionId = electionId;}

    public UUID getContestId() { return contestId; }
    public void setContestId(UUID contestId) { this.contestId = contestId; }

    public UUID getCenterId() {return centerId;}
    public void setCenterId(UUID centerId) {this.centerId = centerId;}


}
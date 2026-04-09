package election.ems_backend.views.entity;


import jakarta.persistence.Embeddable;
import lombok.AllArgsConstructor;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.util.UUID;

/**
 * Composite id for v_center_stats_official (election + center).
 * Note: view does NOT contain org_id so id is electionId + centerId.
 */
@Embeddable
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode
public class CenterStatsOfficialId implements Serializable {
    private UUID electionId;
    private UUID centerId;

    public UUID getElectionId() { return electionId; }
    public void setElectionId(UUID electionId) { this.electionId = electionId; }

    public UUID getCenterId() { return centerId; }
    public void setCenterId(UUID centerId) { this.centerId = centerId; }
}
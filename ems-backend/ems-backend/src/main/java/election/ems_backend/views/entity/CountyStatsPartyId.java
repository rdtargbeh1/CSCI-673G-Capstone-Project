package election.ems_backend.views.entity;


import jakarta.persistence.Embeddable;
import lombok.AllArgsConstructor;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.util.UUID;

/**
 * Composite id for v_county_stats_party view rows.
 */
@Embeddable
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode
public class CountyStatsPartyId implements Serializable {
    private UUID orgId;
    private UUID electionId;
    private UUID countyId;

    public UUID getOrgId() { return orgId; }
    public void setOrgId(UUID orgId) { this.orgId = orgId; }

    public UUID getElectionId() { return electionId; }
    public void setElectionId(UUID electionId) { this.electionId = electionId; }

    public UUID getCountyId() { return countyId; }
    public void setCountyId(UUID countyId) { this.countyId = countyId; }
}

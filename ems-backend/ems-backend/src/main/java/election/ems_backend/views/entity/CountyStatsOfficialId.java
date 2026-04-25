package election.ems_backend.views.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import lombok.AllArgsConstructor;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.util.UUID;

/**
 * Composite id for v_county_stats_official (election + county)
 */
@Embeddable
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode
public class CountyStatsOfficialId implements Serializable {

    @Column(name = "election_id")
    private UUID electionId;

    @Column(name = "contest_id")
    private UUID contestId;

    @Column(name = "county_id")
    private UUID countyId;

    public UUID getElectionId() { return electionId; }
    public void setElectionId(UUID electionId) { this.electionId = electionId; }

    public UUID getContestId() { return contestId; }
    public void setContestId(UUID contestId) { this.contestId = contestId; }

    public UUID getCountyId() { return countyId; }
    public void setCountyId(UUID countyId) { this.countyId = countyId; }
}
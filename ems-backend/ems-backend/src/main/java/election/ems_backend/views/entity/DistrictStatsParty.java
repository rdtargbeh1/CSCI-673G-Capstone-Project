
package election.ems_backend.views.entity;

import jakarta.persistence.Column;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.Immutable;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * Read-only JPA mapping of the database view v_district_stats_party.
 *
 * View columns:
 *  - org_id, election_id, contest_id, district_id (PK)
 *  - district_name, county_id, county_name
 *  - registered_voters, ballots_cast, valid_votes, invalid_total
 *  - turnout_pct, invalid_pct
 *  - centers_reported, centers_total, reporting_pct
 *  - centers_started
 */
@Entity
@Table(name = "v_district_stats_party")
@Immutable
@Getter
@NoArgsConstructor
public class DistrictStatsParty {

    @EmbeddedId
    private DistrictStatsPartyId id;

    @Column(name = "district_name")
    private String districtName;

    @Column(name = "county_id")
    private UUID countyId;

    @Column(name = "county_name")
    private String countyName;

    @Column(name = "registered_voters")
    private Long registeredVoters;

    @Column(name = "ballots_cast")
    private Long ballotsCast;

    @Column(name = "valid_votes")
    private Long validVotes;

    @Column(name = "invalid_total")
    private Long invalidTotal;

    @Column(name = "turnout_pct", precision = 10, scale = 6)
    private BigDecimal turnoutPct;

    @Column(name = "invalid_pct", precision = 10, scale = 6)
    private BigDecimal invalidPct;

    @Column(name = "centers_reported")
    private Long centersReported;

    @Column(name = "centers_total")
    private Long centersTotal;

    @Column(name = "reporting_pct", precision = 10, scale = 6)
    private BigDecimal reportingPct;

    @Column(name = "centers_started")
    private Long centersStarted;
}

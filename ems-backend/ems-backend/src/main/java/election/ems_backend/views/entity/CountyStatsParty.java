
package election.ems_backend.views.entity;

import jakarta.persistence.Column;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.Immutable;

import java.math.BigDecimal;

/**
 * Read-only JPA mapping of the database view v_county_stats_party.
 */
@Entity
@Table(name = "v_county_stats_party")
@Immutable
@Getter
@NoArgsConstructor
public class CountyStatsParty {

    @EmbeddedId
    private CountyStatsPartyId id;

    @Column(name = "county_name")
    private String countyName;

    // view uses bigint
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

    // reporting
    @Column(name = "centers_reported")
    private Long centersReported;

    @Column(name = "centers_total")
    private Long centersTotal;

    @Column(name = "reporting_pct", precision = 10, scale = 6)
    private BigDecimal reportingPct;

    // district rollups
    @Column(name = "districts_reported")
    private Long districtsReported;

    @Column(name = "districts_total")
    private Long districtsTotal;

    @Column(name = "districts_completed")
    private Long districtsCompleted;

    @Column(name = "districts_started")
    private Long districtsStarted;

    // extra UI metric
    @Column(name = "centers_started")
    private Long centersStarted;
}

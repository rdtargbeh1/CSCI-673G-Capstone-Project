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
 * Read-only JPA mapping of the database view v_election_stats_official.
 */
@Entity
@Table(name = "v_election_stats_official")
@Immutable
@Getter
@NoArgsConstructor
public class ElectionStatsOfficial {

    @EmbeddedId
    private ElectionStatsOfficialId id;

    // bigint totals
    @Column(name = "registered_voters")
    private Long registeredVoters;

    @Column(name = "ballots_cast")
    private Long ballotsCast;

    @Column(name = "valid_votes")
    private Long validVotes;

    @Column(name = "invalid_total")
    private Long invalidTotal;

    // fn_pct numeric
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

    // progress
    @Column(name = "centers_started")
    private Long centersStarted;
}

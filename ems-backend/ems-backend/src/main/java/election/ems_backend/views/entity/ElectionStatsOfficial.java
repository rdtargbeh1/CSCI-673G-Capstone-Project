package election.ems_backend.views.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.Immutable;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * Read-only mapping of v_election_stats_official.
 * One row per election (FULL election basis + reporting coverage).
 */
@Entity
@Table(name = "v_election_stats_official")
@Immutable
@Getter
@NoArgsConstructor
public class ElectionStatsOfficial {


    @EmbeddedId
    private ElectionStatsOfficialId id;

    @Column(name = "registered_voters")
    private Integer registeredVoters; // ✅ FULL election basis

    @Column(name = "ballots_cast")
    private Integer ballotsCast; // ✅ reported so far (published)

    @Column(name = "valid_votes")
    private Integer validVotes;

    @Column(name = "invalid_total")
    private Integer invalidTotal;

    @Column(name = "turnout_pct", precision = 10, scale = 6)
    private BigDecimal turnoutPct;

    @Column(name = "invalid_pct", precision = 10, scale = 6)
    private BigDecimal invalidPct;

    // ✅ NEW: reporting coverage
    @Column(name = "centers_reported")
    private Integer centersReported;

    @Column(name = "centers_total")
    private Integer centersTotal;

    @Column(name = "reporting_pct", precision = 10, scale = 6)
    private BigDecimal reportingPct;
}

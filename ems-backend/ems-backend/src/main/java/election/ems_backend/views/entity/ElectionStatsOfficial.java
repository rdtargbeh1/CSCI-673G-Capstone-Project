package election.ems_backend.views.entity;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.Immutable;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * Read-only mapping of v_election_stats_official.
 * The view contains one row per election (published NEC results aggregated).
 */
@Entity
@Table(name = "v_election_stats_official")
@Immutable
@Getter
@NoArgsConstructor
public class ElectionStatsOfficial {

    @Id
    private UUID electionId;

    private Integer registeredVoters;
    private Integer ballotsCast;
    private Integer validVotes;
    private Integer invalidTotal;

    private BigDecimal turnoutPct;
    private BigDecimal invalidPct;
}
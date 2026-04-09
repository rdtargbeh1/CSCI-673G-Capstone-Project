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
 * Read-only mapping of v_candidate_county_stats_official.
 */
@Entity
@Table(name = "v_candidate_county_stats_official")
@Immutable
@Getter
@NoArgsConstructor
public class CandidateCountyStatsOfficial {

    @EmbeddedId
    private CandidateCountyStatsOfficialId id;

    @Column(name = "county_name")
    private String countyName;

    @Column(name = "candidate_name")
    private String candidateName;

    @Column(name = "party_id")
    private UUID partyId;

    @Column(name = "party_name")
    private String partyName;

    @Column(name = "abbreviation")
    private String abbreviation;

    @Column(name = "candidate_votes")
    private Integer candidateVotes;

    @Column(name = "ballots_cast")
    private Integer ballotsCast;

    @Column(name = "total_valid_votes")
    private Integer totalValidVotes;

    @Column(name = "total_invalid_votes")
    private Integer totalInvalidVotes;

    @Column(name = "vote_share_pct", precision = 10, scale = 6)
    private BigDecimal voteSharePct;
}
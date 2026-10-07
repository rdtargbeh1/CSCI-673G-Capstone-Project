
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
 * Read-only mapping of v_candidate_election_stats_official
 */
@Entity
@Table(name = "v_candidate_election_stats_official")
@Immutable
@Getter
@NoArgsConstructor
public class CandidateElectionStatsOfficial {

    @EmbeddedId
    private CandidateElectionStatsOfficialId id;

    @Column(name = "candidate_name")
    private String candidateName;

    @Column(name = "party_id")
    private UUID partyId;

    @Column(name = "party_name")
    private String partyName;

    @Column(name = "abbreviation")
    private String partyCode;

    // ✅ SUM() -> BIGINT
    @Column(name = "candidate_votes")
    private Long candidateVotes;

    @Column(name = "ballots_cast")
    private Long ballotsCast;

    @Column(name = "total_valid_votes")
    private Long totalValidVotes;

    @Column(name = "total_invalid_votes")
    private Long totalInvalidVotes;

    @Column(name = "vote_share_pct", precision = 10, scale = 6)
    private BigDecimal voteSharePct;

    // ✅ window outputs
    @Column(name = "rank_in_election")
    private Long rankInElection;

    @Column(name = "winner_votes")
    private Long winnerVotes;

    @Column(name = "winner_vote_share_pct", precision = 10, scale = 6)
    private BigDecimal winnerVoteSharePct;

    @Column(name = "margin_votes")
    private Long marginVotes;

    @Column(name = "margin_pct", precision = 10, scale = 6)
    private BigDecimal marginPct;

    @Column(name = "is_election_winner")
    private Boolean isElectionWinner;
}

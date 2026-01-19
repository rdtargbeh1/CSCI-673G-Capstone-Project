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
 * Read-only mapping of v_candidate_election_stats_party.
 */
@Entity
@Table(name = "v_candidate_election_stats_party")
@Immutable
@Getter
@NoArgsConstructor
public class CandidateElectionStatsParty {

    @EmbeddedId
    private CandidateElectionStatsPartyId id;

    @Column(name = "candidate_name")
    private String candidateName;

    @Column(name = "party_id")
    private UUID partyId;

    @Column(name = "party_name")
    private String partyName;

    @Column(name = "party_code")
    private String partyCode;

    @Column(name = "candidate_votes")
    private Integer candidateVotes;

    @Column(name = "registered_voters")
    private Integer registeredVoters;

    @Column(name = "ballots_cast")
    private Integer ballotsCast;

    @Column(name = "valid_votes")
    private Integer validVotes;

    @Column(name = "invalid_total")
    private Integer invalidTotal;

    @Column(name = "vote_share_pct", precision = 10, scale = 6)
    private BigDecimal voteSharePct;
}
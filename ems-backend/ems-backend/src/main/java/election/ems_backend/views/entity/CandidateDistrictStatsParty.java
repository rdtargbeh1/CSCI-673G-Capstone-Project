
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

@Entity
@Table(name = "v_candidate_district_stats_party")
@Immutable
@Getter
@NoArgsConstructor
public class CandidateDistrictStatsParty {

    @EmbeddedId
    private CandidateDistrictStatsPartyId id;

    @Column(name = "county_id")
    private UUID countyId;

    @Column(name = "county_name")
    private String countyName;

//    @Column(name = "district_id")
//    private UUID districtId;

    @Column(name = "district_name")
    private String districtName;

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
    @Column(name = "rank_in_district")
    private Long rankInDistrict;

    @Column(name = "winner_votes")
    private Long winnerVotes;

    @Column(name = "winner_vote_share_pct", precision = 10, scale = 6)
    private BigDecimal winnerVoteSharePct;

    @Column(name = "margin_votes")
    private Long marginVotes;

    @Column(name = "margin_pct", precision = 10, scale = 6)
    private BigDecimal marginPct;

    @Column(name = "is_district_winner")
    private Boolean isDistrictWinner;
}

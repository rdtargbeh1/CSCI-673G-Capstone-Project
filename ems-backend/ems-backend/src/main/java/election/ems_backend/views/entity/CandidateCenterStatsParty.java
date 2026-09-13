
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
 * Read-only mapping of v_candidate_center_stats_party
 */
@Entity
@Table(name = "v_candidate_center_stats_party")
@Immutable
@Getter
@NoArgsConstructor
public class CandidateCenterStatsParty {

    @EmbeddedId
    private CandidateCenterStatsPartyId id;

    @Column(name = "county_id")
    private UUID countyId;

    @Column(name = "county_name")
    private String countyName;

    @Column(name = "district_id")
    private UUID districtId;

    @Column(name = "district_name")
    private String districtName;

    @Column(name = "center_code")
    private String centerCode;

    @Column(name = "center_name")
    private String centerName;

    @Column(name = "candidate_name")
    private String candidateName;

    @Column(name = "party_id")
    private UUID partyId;

    @Column(name = "party_name")
    private String partyName;

    // column name is "abbreviation" in view
    @Column(name = "abbreviation")
    private String partyCode;

    // ✅ BIGINT in view (SUM/COUNT outputs)
    @Column(name = "candidate_votes")
    private Long candidateVotes;

    @Column(name = "registered_voters")
    private Long registeredVoters;

    @Column(name = "ballots_cast")
    private Long ballotsCast;

    @Column(name = "center_valid_votes")
    private Long centerValidVotes;

    @Column(name = "center_invalid_total")
    private Long centerInvalidTotal;

    @Column(name = "vote_share_pct", precision = 10, scale = 6)
    private BigDecimal voteSharePct;

    // ✅ outcomes/insights
    @Column(name = "rank_in_center")
    private Long rankInCenter;

    @Column(name = "winner_votes")
    private Long winnerVotes;

    @Column(name = "winner_vote_share_pct", precision = 10, scale = 6)
    private BigDecimal winnerVoteSharePct;

    @Column(name = "margin_votes")
    private Long marginVotes;

    @Column(name = "margin_pct", precision = 10, scale = 6)
    private BigDecimal marginPct;

    @Column(name = "is_center_winner")
    private Boolean isCenterWinner;

    @Column(name = "rank_center_in_district_for_candidate")
    private Long rankCenterInDistrictForCandidate;
}

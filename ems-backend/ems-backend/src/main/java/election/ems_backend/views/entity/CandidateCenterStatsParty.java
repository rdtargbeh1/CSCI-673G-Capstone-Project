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

    @Column(name = "abbreviation")
    private String partyCode;

    @Column(name = "candidate_votes")
    private Integer candidateVotes;

    @Column(name = "registered_voters")
    private Integer registeredVoters;

    @Column(name = "ballots_cast")
    private Integer ballotsCast;

    @Column(name = "center_valid_votes")
    private Integer centerValidVotes;

    @Column(name = "center_invalid_total")
    private Integer centerInvalidTotal;

    @Column(name = "vote_share_pct", precision = 10, scale = 6)
    private BigDecimal voteSharePct;
}
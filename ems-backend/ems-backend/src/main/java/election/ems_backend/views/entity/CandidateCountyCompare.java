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
 * Read-only mapping of v_candidate_county_compare.
 */
@Entity
@Table(name = "v_candidate_county_compare")
@Immutable
@Getter
@NoArgsConstructor
public class CandidateCountyCompare {

    @EmbeddedId
    private CandidateCountyCompareId id;

    // p.org_id (party org) may be null for official-only rows
    @Column(name = "org_id")
    private UUID orgId;

    @Column(name = "county_name")
    private String countyName;

    @Column(name = "candidate_name")
    private String candidateName;

    @Column(name = "party_id")
    private UUID partyId;

    @Column(name = "party_name")
    private String partyName;

    @Column(name = "party_code")
    private String partyCode;

    @Column(name = "party_candidate_votes")
    private Integer partyCandidateVotes;

    @Column(name = "official_candidate_votes")
    private Integer officialCandidateVotes;

    @Column(name = "diff_votes")
    private Integer diffVotes;

    @Column(name = "party_vote_share_pct", precision = 10, scale = 6)
    private BigDecimal partyVoteSharePct;

    @Column(name = "official_vote_share_pct", precision = 10, scale = 6)
    private BigDecimal officialVoteSharePct;

}
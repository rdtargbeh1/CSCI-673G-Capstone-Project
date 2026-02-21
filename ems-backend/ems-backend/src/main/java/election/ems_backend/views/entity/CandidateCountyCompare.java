
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

    @Column(name = "county_name")
    private String countyName;

    @Column(name = "candidate_name")
    private String candidateName;

    @Column(name = "party_id")
    private UUID partyId;

    @Column(name = "party_name")
    private String partyName;

    // ✅ view column name is "abbreviation"
    @Column(name = "abbreviation")
    private String partyCode;

    // ✅ Party side (BIGINT)
    @Column(name = "party_candidate_votes")
    private Long partyCandidateVotes;

    @Column(name = "party_vote_share_pct", precision = 10, scale = 6)
    private BigDecimal partyVoteSharePct;

    // ✅ Official side (BIGINT)
    @Column(name = "official_candidate_votes")
    private Long officialCandidateVotes;

    @Column(name = "official_vote_share_pct", precision = 10, scale = 6)
    private BigDecimal officialVoteSharePct;

    // ✅ Diffs (BIGINT)
    @Column(name = "diff_votes")
    private Long diffVotes;

    @Column(name = "diff_vote_share_pct", precision = 10, scale = 6)
    private BigDecimal diffVoteSharePct;

    /* -------------------------
       PARTY COVERAGE
       ------------------------- */
    @Column(name = "party_centers_reported")
    private Long partyCentersReported;

    @Column(name = "party_centers_total")
    private Long partyCentersTotal;

    @Column(name = "party_reporting_pct", precision = 10, scale = 6)
    private BigDecimal partyReportingPct;

    @Column(name = "party_districts_reported")
    private Long partyDistrictsReported;

    @Column(name = "party_districts_total")
    private Long partyDistrictsTotal;

    @Column(name = "party_centers_started")
    private Long partyCentersStarted;

    @Column(name = "party_districts_started")
    private Long partyDistrictsStarted;

    @Column(name = "party_county_status")
    private String partyCountyStatus;

    /* -------------------------
       OFFICIAL COVERAGE
       ------------------------- */
    @Column(name = "official_centers_reported")
    private Long officialCentersReported;

    @Column(name = "official_centers_total")
    private Long officialCentersTotal;

    @Column(name = "official_reporting_pct", precision = 10, scale = 6)
    private BigDecimal officialReportingPct;

    @Column(name = "official_districts_reported")
    private Long officialDistrictsReported;

    @Column(name = "official_districts_total")
    private Long officialDistrictsTotal;

    @Column(name = "official_centers_started")
    private Long officialCentersStarted;

    @Column(name = "official_districts_started")
    private Long officialDistrictsStarted;

    @Column(name = "official_county_status")
    private String officialCountyStatus;

    /* -------------------------
       FLAGS
       ------------------------- */
    @Column(name = "is_comparable")
    private Boolean isComparable;

    @Column(name = "is_coverage_aligned")
    private Boolean isCoverageAligned;
}

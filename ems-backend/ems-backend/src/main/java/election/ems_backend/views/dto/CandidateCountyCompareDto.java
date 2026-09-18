
package election.ems_backend.views.dto;

import lombok.Data;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * DTO for candidate county-level comparison (party vs official).
 */
@Data
public class CandidateCountyCompareDto {

    private UUID orgId;

    private UUID electionId;
    private UUID contestId;

    private UUID countyId;
    private String countyName;

    private UUID candidateId;
    private String candidateName;

    private UUID partyId;
    private String partyName;

    // ✅ maps view column "abbreviation"
    private String partyCode;

    // ✅ votes are BIGINT (from candidate_*_stats views)
    private Long partyCandidateVotes;
    private Long officialCandidateVotes;
    private Long diffVotes;

    private BigDecimal partyVoteSharePct;
    private BigDecimal officialVoteSharePct;
    private BigDecimal diffVoteSharePct;

    /* -------------------------
       PARTY COVERAGE
       ------------------------- */
    private Long partyCentersReported;
    private Long partyCentersTotal;
    private BigDecimal partyReportingPct;

    private Long partyDistrictsReported;
    private Long partyDistrictsTotal;

    private Long partyCentersStarted;
    private Long partyDistrictsStarted;

    private String partyCountyStatus; // NOT_STARTED | PARTIAL | COMPLETED

    /* -------------------------
       OFFICIAL COVERAGE
       ------------------------- */
    private Long officialCentersReported;
    private Long officialCentersTotal;
    private BigDecimal officialReportingPct;

    private Long officialDistrictsReported;
    private Long officialDistrictsTotal;

    private Long officialCentersStarted;
    private Long officialDistrictsStarted;

    private String officialCountyStatus; // NOT_STARTED | PARTIAL | COMPLETED

    /* -------------------------
       UI SAFETY FLAGS
       ------------------------- */
    private Boolean isComparable;
    private Boolean isCoverageAligned;
}

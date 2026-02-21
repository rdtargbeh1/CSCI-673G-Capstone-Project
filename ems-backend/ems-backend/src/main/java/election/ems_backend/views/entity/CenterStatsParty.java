

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
 * Read-only JPA mapping for the DB view: v_center_stats_party
 *
 * Composite key: (org_id, election_id, contest_id, center_id)
 *
 * IMPORTANT:
 * - The SQL view casts most numeric aggregates to BIGINT -> map as Long in Java.
 * - Percent fields (turnout_pct, invalid_pct, places_reporting_pct) map to BigDecimal.
 */
@Entity
@Table(name = "v_center_stats_party")
@Immutable
@Getter
@NoArgsConstructor
public class CenterStatsParty {

    @EmbeddedId
    private CenterStatsPartyId id;

    @Column(name = "center_code")
    private String centerCode;

    @Column(name = "center_name")
    private String centerName;

    @Column(name = "district_id")
    private UUID districtId;

    @Column(name = "district_name")
    private String districtName;

    @Column(name = "county_id")
    private UUID countyId;

    @Column(name = "county_name")
    private String countyName;

    @Column(name = "registered_voters")
    private Long registeredVoters;

    @Column(name = "ballots_issued")
    private Long ballotsIssued;

    @Column(name = "ballots_cast")
    private Long ballotsCast;

    @Column(name = "valid_votes")
    private Long validVotes;

    @Column(name = "invalid_total")
    private Long invalidTotal;

    @Column(name = "turnout_pct", precision = 10, scale = 6)
    private BigDecimal turnoutPct;

    @Column(name = "invalid_pct", precision = 10, scale = 6)
    private BigDecimal invalidPct;

    // ✅ place-coverage (center completeness)
    @Column(name = "places_total")
    private Long placesTotal;

    @Column(name = "places_reported")
    private Long placesReported;

    @Column(name = "places_reporting_pct", precision = 10, scale = 6)
    private BigDecimal placesReportingPct;

    @Column(name = "has_place_allocation")
    private Long hasPlaceAllocation;

    @Column(name = "center_started")
    private Long centerStarted;

    @Column(name = "center_partial")
    private Long centerPartial;

    @Column(name = "center_completed")
    private Long centerCompleted;

    @Override
    public String toString() {
        return "CenterStatsParty{" +
                "id=" + id +
                ", centerCode='" + centerCode + '\'' +
                ", centerName='" + centerName + '\'' +
                ", districtId=" + districtId +
                ", districtName='" + districtName + '\'' +
                ", countyId=" + countyId +
                ", countyName='" + countyName + '\'' +
                ", registeredVoters=" + registeredVoters +
                ", ballotsIssued=" + ballotsIssued +
                ", ballotsCast=" + ballotsCast +
                ", validVotes=" + validVotes +
                ", invalidTotal=" + invalidTotal +
                ", turnoutPct=" + turnoutPct +
                ", invalidPct=" + invalidPct +
                ", placesTotal=" + placesTotal +
                ", placesReported=" + placesReported +
                ", placesReportingPct=" + placesReportingPct +
                ", hasPlaceAllocation=" + hasPlaceAllocation +
                ", centerStarted=" + centerStarted +
                ", centerPartial=" + centerPartial +
                ", centerCompleted=" + centerCompleted +
                '}';
    }
}

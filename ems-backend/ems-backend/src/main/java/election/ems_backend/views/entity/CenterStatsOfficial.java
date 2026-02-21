
package election.ems_backend.views.entity;

import jakarta.persistence.Column;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.Immutable;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/**
 * Read-only mapping of v_center_stats_official.
 */
@Entity
@Table(name = "v_center_stats_official")
@Immutable
@Getter
@NoArgsConstructor
public class CenterStatsOfficial {

    @EmbeddedId
    private CenterStatsOfficialId id;

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

    // bigint in view
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

    // coverage/allocation metrics
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

    // meta from nec_result
    @Column(name = "source")
    private String source;

    @Column(name = "upload_time")
    private Instant uploadTime;
}

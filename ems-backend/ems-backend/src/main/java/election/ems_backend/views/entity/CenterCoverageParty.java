
package election.ems_backend.views.entity;

import jakarta.persistence.Column;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.Immutable;

import java.math.BigDecimal;

/**
 * Read-only mapping for v_center_coverage_party.
 */
@Entity
@Table(name = "v_center_coverage_party")
@Immutable
@Getter
@NoArgsConstructor
public class CenterCoverageParty {

    @EmbeddedId
    private CenterCoveragePartyId id;

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

    @Column(name = "registered_voters_expected")
    private Long registeredVotersExpected;

    @Column(name = "ballots_issued_expected")
    private Long ballotsIssuedExpected;
}

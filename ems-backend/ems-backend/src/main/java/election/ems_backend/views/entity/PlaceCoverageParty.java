
package election.ems_backend.views.entity;

import jakarta.persistence.Column;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.Immutable;

import java.util.UUID;

/**
 * Read-only JPA mapping of the database view v_place_coverage_party.
 */
@Entity
@Table(name = "v_place_coverage_party")
@Immutable
@Getter
@NoArgsConstructor
public class PlaceCoverageParty {

    @EmbeddedId
    private PlaceCoveragePartyId id;

    @Column(name = "center_id")
    private UUID centerId;

    @Column(name = "registered_voters_expected")
    private Long registeredVotersExpected;

    @Column(name = "ballots_issued_expected")
    private Long ballotsIssuedExpected;

    /**
     * 0/1 from SQL CASE
     */
    @Column(name = "is_place_reported")
    private Long isPlaceReported;
}

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
 * Notes:
 * - The view is read-only; annotate with @Immutable.
 * - Use an @EmbeddedId for the composite (org_id, election_id, center_id).
 * - Field names match the view columns; types chosen to map SQL -> Java reasonably.
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
    private Integer registeredVoters;

    @Column(name = "ballots_cast")
    private Integer ballotsCast;

    @Column(name = "valid_votes")
    private Integer validVotes;

    @Column(name = "invalid_total")
    private Integer invalidTotal;

    @Column(name = "turnout_pct", precision = 10, scale = 6)
    private BigDecimal turnoutPct;

    @Column(name = "invalid_pct", precision = 10, scale = 6)
    private BigDecimal invalidPct;


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
                ", ballotsCast=" + ballotsCast +
                ", validVotes=" + validVotes +
                ", invalidTotal=" + invalidTotal +
                ", turnoutPct=" + turnoutPct +
                ", invalidPct=" + invalidPct +
                '}';
    }
}
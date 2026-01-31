package election.ems_backend.views.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.Immutable;

import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Read-only mapping of v_nec_result_geo view.
 * Note: primary key is result_id (serial) so map as Long.
 */
@Entity
@Table(name = "v_nec_result_geo")
@Immutable
@Getter
@NoArgsConstructor
public class NecResultGeo {

    @Id
    @Column(name = "result_id")
    private Long resultId;

    @Column(name = "election_id")
    private UUID electionId;

    @Column(name = "contest_id")
    private UUID contestId;

    @Column(name = "center_id")
    private UUID centerId;

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

    // candidate_votes stored as jsonb in DB; represent as String in DTO
    @Column(name = "candidate_votes")
    private String candidateVotes;

    @Column(name = "total_registered_voters")
    private Integer totalRegisteredVoters;

    @Column(name = "ballots_cast")
    private Integer ballotsCast;

    @Column(name = "invalid_ballots")
    private Integer invalidBallots;

    @Column(name = "blank_ballots")
    private Integer blankBallots;

    @Column(name = "rejected_ballots")
    private Integer rejectedBallots;

    @Column(name = "spoiled_ballots")
    private Integer spoiledBallots;

    @Column(name = "ballots_issued")
    private Integer ballotsIssued;

    @Column(name = "source")
    private String source;

    @Column(name = "upload_time")
    private OffsetDateTime uploadTime;
}
package election.ems_backend.views.dto;

import lombok.Data;

import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * DTO for NEC geospatial result rows (v_nec_result_geo).
 */
@Data
public class NecResultGeoDto {
    private Long resultId;
    private UUID electionId;

    private UUID centerId;
    private String centerCode;
    private String centerName;

    private UUID districtId;
    private String districtName;

    private UUID countyId;
    private String countyName;

    private String candidateVotes; // JSON string

    private Integer totalRegisteredVoters;
    private Integer ballotsCast;
    private Integer invalidBallots;
    private Integer blankBallots;
    private Integer rejectedBallots;
    private Integer spoiledBallots;

    private Integer ballotsIssued;

    private String source;
    private OffsetDateTime uploadTime;
}
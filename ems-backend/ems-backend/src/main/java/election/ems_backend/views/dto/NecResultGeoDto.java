package election.ems_backend.views.dto;

import lombok.Data;

import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * DTO for NEC geospatial result rows (v_nec_result_geo).
 */
@Data
public class NecResultGeoDto {

    private UUID resultId; // ✅ match entity

    private UUID electionId;
    private UUID contestId;

    private UUID centerId;
    private String centerCode;
    private String centerName;

    private UUID districtId;
    private String districtName;

    private UUID countyId;
    private String countyName;

    private String candidateVotes;

    private Integer totalRegisteredVoters;
    private Integer ballotsCast;
    private Integer invalidBallots;

    private Integer unmarkedBallots; // ✅ was blankBallots
    private Integer rejectedBallots;
    private Integer spoiledBallots;

    private Integer unusedBallots;   // ✅ NEW
    private Integer ballotsIssued;

    private String source;
    private OffsetDateTime uploadTime;

}
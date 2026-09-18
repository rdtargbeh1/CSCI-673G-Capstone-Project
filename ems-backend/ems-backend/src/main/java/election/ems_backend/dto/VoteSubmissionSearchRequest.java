package election.ems_backend.dto;

import lombok.Getter;
import lombok.Setter;

import java.util.UUID;

@Getter
@Setter
public class VoteSubmissionSearchRequest {

    private UUID orgId;
    private UUID electionId;

    private UUID contestId;
    private UUID countyId;
    private UUID districtId;
    private UUID centerId;
    private UUID placeId;

    private String status;

    private Integer page = 0;
    private Integer size = 20;

    /**
     * ✅ NEW:
     * - default: ACTIVE ONLY (exclude deleted)
     * - if deletedOnly=true => return only deleted
     */
    private Boolean deletedOnly = false;
}

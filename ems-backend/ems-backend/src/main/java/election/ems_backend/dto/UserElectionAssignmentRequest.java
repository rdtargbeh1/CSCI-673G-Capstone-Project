package election.ems_backend.dto;

import election.ems_backend.enums.AssignmentScope;
import lombok.*;

import java.util.List;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserElectionAssignmentRequest {

    private UUID userId;

    private UUID orgId;

    private UUID electionId;

    private AssignmentScope scopeType;


    // ========================================================================
    // SINGLE / PARENT GEOGRAPHY
    // ========================================================================

    private UUID countyId;

    private UUID districtId;

    private UUID centerId;

    private UUID placeId;


    // ========================================================================
    // MULTI ASSIGNMENTS
    // ========================================================================

    private List<UUID> countyIds;

    private List<UUID> centerIds;
}
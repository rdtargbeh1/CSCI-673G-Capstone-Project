package election.ems_backend.dto;

import election.ems_backend.enums.AssignmentScope;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserElectionAssignmentDto {

    private UUID assignmentId;

    private UUID userId;

    private String userName;

    private String userDisplayName;

    private UUID orgId;

    private String orgName;

    private UUID electionId;

    private String electionName;

    private AssignmentScope scopeType;

    private UUID countyId;

    private String countyName;

    private UUID districtId;

    private String districtName;

    private UUID centerId;

    private String centerName;

    private UUID placeId;

    private String placeName;

    private boolean active;

    private LocalDateTime dateCreated;

    private LocalDateTime dateUpdated;
}
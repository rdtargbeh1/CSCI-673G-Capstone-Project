package election.ems_backend.views.dto;


import lombok.*;

import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PlaceCoveragePartyDto {

    private UUID orgId;
    private UUID electionId;
    private UUID contestId;

    private UUID centerId;
    private UUID placeId;

    private long registeredVotersExpected;
    private long ballotsIssuedExpected;
    private Long isPlaceReported;

}

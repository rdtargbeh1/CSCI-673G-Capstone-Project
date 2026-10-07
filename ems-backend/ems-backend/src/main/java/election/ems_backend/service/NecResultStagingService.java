package election.ems_backend.service;

import election.ems_backend.dto.NecResultStagingDto;

import java.util.List;
import java.util.UUID;

public interface NecResultStagingService {
    NecResultStagingDto submitStaging(NecResultStagingDto dto);
    List<NecResultStagingDto> listStagingByElection(UUID electionId);
    int validateStagingByElection(UUID electionId, UUID validatorUserId);
    int promoteValidatedStaging(UUID electionId, UUID actorUserId); // promote to authoritative NECResult
}
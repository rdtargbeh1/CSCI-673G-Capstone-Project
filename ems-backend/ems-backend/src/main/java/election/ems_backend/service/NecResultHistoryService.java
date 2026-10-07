package election.ems_backend.service;

import election.ems_backend.dto.NecResultHistoryDto;

import java.util.List;
import java.util.UUID;

public interface NecResultHistoryService {

    List<NecResultHistoryDto> listByResultId(UUID resultId);

    List<NecResultHistoryDto> listByElectionId(UUID electionId);

    List<NecResultHistoryDto> listByContest(UUID electionId, UUID contestId);

    List<NecResultHistoryDto> listByScope(UUID electionId, UUID contestId, UUID centerId);


}

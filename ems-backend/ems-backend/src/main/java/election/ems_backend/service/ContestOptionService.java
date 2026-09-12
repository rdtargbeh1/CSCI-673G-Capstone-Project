package election.ems_backend.service;

import election.ems_backend.dto.ContestCandidateBulkAssignRequest;
import election.ems_backend.dto.ContestOptionCreateRequest;
import election.ems_backend.dto.ContestOptionDto;
import election.ems_backend.dto.ContestOptionUpdateRequest;

import java.util.List;
import java.util.UUID;

public interface ContestOptionService {


    ContestOptionDto createOption(ContestOptionCreateRequest req);

    ContestOptionDto updateOption(UUID optionId, ContestOptionUpdateRequest req);

    ContestOptionDto getOption(UUID optionId);

    List<ContestOptionDto> listByContest(UUID contestId, boolean onlyActive);

    void deleteOption(UUID optionId);

    List<ContestOptionDto> findByCandidateId(UUID candidateId);


    /**
     * Bulk attach many candidates to a contest.
     * - Adds missing candidates as active candidate-options
     * - Order is assigned sequentially after current max order
     * - If replace=true, deactivates existing candidate options not in request
     */
    List<ContestOptionDto> bulkAssignCandidates(ContestCandidateBulkAssignRequest req);
}
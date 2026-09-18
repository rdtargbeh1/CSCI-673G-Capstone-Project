package election.ems_backend.service;

import election.ems_backend.dto.ContestCreateRequest;
import election.ems_backend.dto.ContestDto;
import election.ems_backend.dto.ContestUpdateRequest;

import java.util.List;
import java.util.UUID;

public interface ContestService {

    ContestDto create(ContestCreateRequest req);

    ContestDto update(UUID contestId, ContestUpdateRequest req);

    ContestDto getContest(UUID contestId);

    List<ContestDto> listByElection(UUID electionId);

    void deleteContest(UUID contestId);


}
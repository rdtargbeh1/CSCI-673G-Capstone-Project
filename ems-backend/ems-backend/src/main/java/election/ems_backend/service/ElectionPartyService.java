package election.ems_backend.service;

import election.ems_backend.dto.ElectionPartyAssignRequest;
import election.ems_backend.dto.ElectionPartyDto;
import election.ems_backend.dto.ElectionPartyUpdateRequest;

import java.util.List;
import java.util.UUID;

public interface ElectionPartyService {

    ElectionPartyDto addPartyToElection(ElectionPartyAssignRequest req);

    ElectionPartyDto updateElectionParty(UUID electionId, UUID partyId, ElectionPartyUpdateRequest req);

    void removePartyFromElection(UUID electionId, UUID partyId);

    List<ElectionPartyDto> listPartiesForElection(UUID electionId);

    ElectionPartyDto setQualificationStatus(
            UUID electionId,
            UUID partyId,
            boolean isQualified
    );



}

package election.ems_backend.service;

import election.ems_backend.dto.VoterRegistrationCreateRequest;
import election.ems_backend.dto.VoterRegistrationDto;

import java.util.List;
import java.util.UUID;

public interface VoterRegistrationService {
    VoterRegistrationDto create(VoterRegistrationCreateRequest req);
    VoterRegistrationDto findByLookupHash(String lookupHash);
    VoterRegistrationDto getById(UUID voterId);
    VoterRegistrationDto transferToCenter(UUID voterId, UUID newCenterId, UUID actorUserId);
    List<VoterRegistrationDto> listByCenter(UUID centerId);
    List<VoterRegistrationDto> listByDistrict(UUID districtId);
    List<VoterRegistrationDto> listByCounty(UUID countyId);
    VoterRegistrationDto assignToElection(UUID voterId, UUID electionId, UUID actorUserId);
}
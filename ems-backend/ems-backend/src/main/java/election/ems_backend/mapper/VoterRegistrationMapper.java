package election.ems_backend.mapper;

import election.ems_backend.dto.VoterRegistrationDto;
import election.ems_backend.entity.VoterRegistration;
import org.springframework.stereotype.Component;

@Component
public class VoterRegistrationMapper {

    public VoterRegistrationDto toDto(VoterRegistration v) {
        if (v == null) return null;
        VoterRegistrationDto d = new VoterRegistrationDto();
        d.setVoterId(v.getVoterId());
        d.setAssignedCenterId(v.getAssignedCenterId());
        d.setCountyId(v.getCountyId());
        d.setDistrictId(v.getDistrictId());
        d.setPollingPlace(v.getPollingPlace());
        d.setElectionId(v.getElectionId());
        d.setGeoLat(v.getGeoLat());
        d.setGeoLon(v.getGeoLon());
        d.setRegisteredBy(v.getRegisteredBy() != null ? v.getRegisteredBy().getUserId() : null);
        d.setRegistrationSource(v.getRegistrationSource());
        d.setEffectiveFrom(v.getEffectiveFrom());
        d.setEffectiveTo(v.getEffectiveTo());
        d.setLookupHash(v.getLookupHash());
        d.setDateRegistered(v.getDateRegistered());
        d.setDateUpdated(v.getDateUpdated());
        d.setRegistrationStatus(v.getRegistrationStatus());
        d.setVoterCardId(v.getVoterCardId());
        d.setPictureUrl(v.getPictureUrl());
        return d;
    }


}
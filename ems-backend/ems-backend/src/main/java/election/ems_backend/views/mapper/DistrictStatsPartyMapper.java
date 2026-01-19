package election.ems_backend.views.mapper;

import election.ems_backend.views.dto.DistrictStatsPartyDto;
import election.ems_backend.views.entity.DistrictStatsParty;

public class DistrictStatsPartyMapper {
    public DistrictStatsPartyDto toDto(DistrictStatsParty e) {
        if (e == null) return null;
        DistrictStatsPartyDto d = new DistrictStatsPartyDto();
        if (e.getId() != null) {
            d.setOrgId(e.getId().getOrgId());
            d.setElectionId(e.getId().getElectionId());
            d.setDistrictId(e.getId().getDistrictId());
        }
        d.setDistrictName(e.getDistrictName());
        d.setCountyId(e.getCountyId());
        d.setCountyName(e.getCountyName());
        d.setRegisteredVoters(e.getRegisteredVoters());
        d.setBallotsCast(e.getBallotsCast());
        d.setValidVotes(e.getValidVotes());
        d.setInvalidTotal(e.getInvalidTotal());
        d.setTurnoutPct(e.getTurnoutPct());
        d.setInvalidPct(e.getInvalidPct());
        return d;
    }
}
package election.ems_backend.views.mapper;

import election.ems_backend.views.dto.CountyStatsPartyDto;
import election.ems_backend.views.entity.CountyStatsParty;

public class CountyStatsPartyMapper {
    public CountyStatsPartyDto toDto(CountyStatsParty e) {
        if (e == null) return null;
        CountyStatsPartyDto d = new CountyStatsPartyDto();
        if (e.getId() != null) {
            d.setOrgId(e.getId().getOrgId());
            d.setElectionId(e.getId().getElectionId());
            d.setCountyId(e.getId().getCountyId());
        }
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
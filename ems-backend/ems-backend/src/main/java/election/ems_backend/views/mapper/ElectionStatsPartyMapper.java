package election.ems_backend.views.mapper;

import election.ems_backend.views.dto.ElectionStatsPartyDto;
import election.ems_backend.views.entity.ElectionStatsParty;

public class ElectionStatsPartyMapper {
    public ElectionStatsPartyDto toDto(ElectionStatsParty e) {
        if (e == null) return null;
        ElectionStatsPartyDto d = new ElectionStatsPartyDto();
        if (e.getId() != null) {
            d.setOrgId(e.getId().getOrgId());
            d.setElectionId(e.getId().getElectionId());
        }
        d.setRegisteredVoters(e.getRegisteredVoters());
        d.setBallotsCast(e.getBallotsCast());
        d.setValidVotes(e.getValidVotes());
        d.setInvalidTotal(e.getInvalidTotal());
        d.setTurnoutPct(e.getTurnoutPct());
        d.setInvalidPct(e.getInvalidPct());
        return d;
    }
}
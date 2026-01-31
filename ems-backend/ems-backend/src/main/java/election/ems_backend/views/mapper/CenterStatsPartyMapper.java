package election.ems_backend.views.mapper;

import election.ems_backend.views.dto.CenterStatsPartyDto;
import election.ems_backend.views.entity.CenterStatsParty;

public class CenterStatsPartyMapper {
    public CenterStatsPartyDto toDto(CenterStatsParty e) {
        if (e == null) return null;
        CenterStatsPartyDto d = new CenterStatsPartyDto();
        if (e.getId() != null) {
            d.setOrgId(e.getId().getOrgId());
            d.setElectionId(e.getId().getElectionId());
            d.setContestId(e.getId().getContestId());
            d.setCenterId(e.getId().getCenterId());
        }
        d.setCenterCode(e.getCenterCode());
        d.setCenterName(e.getCenterName());
        d.setDistrictId(e.getDistrictId());
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
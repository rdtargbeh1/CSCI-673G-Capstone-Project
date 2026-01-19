package election.ems_backend.views.mapper;

import election.ems_backend.views.dto.DistrictStatsOfficialDto;
import election.ems_backend.views.entity.DistrictStatsOfficial;

public class DistrictStatsOfficialMapper {
    public DistrictStatsOfficialDto toDto(DistrictStatsOfficial e) {
        if (e == null) return null;
        DistrictStatsOfficialDto d = new DistrictStatsOfficialDto();
        if (e.getId() != null) {
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